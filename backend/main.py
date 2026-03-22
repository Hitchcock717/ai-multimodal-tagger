import os
import sys
from pathlib import Path

# 将当前目录添加到 sys.path 以支持 Vercel 上的相对导入
current_dir = Path(__file__).parent.absolute()
if str(current_dir) not in sys.path:
    sys.path.append(str(current_dir))

from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import pandas as pd
import io
import shutil
import uuid
import asyncio
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from services.pdf_service import extract_pdf_info, get_category_from_filename
    from services.inference_service import get_product_tags, synthesize_report
except ImportError as e:
    print(f"Import error: {e}")
    # 提供 Mock 函数防止初始化失败，但在运行时会报错
    def extract_pdf_info(*args, **kwargs): raise Exception(f"Import failed: {e}")
    def get_category_from_filename(*args, **kwargs): return "Unknown"
    def get_product_tags(*args, **kwargs): raise Exception(f"Import failed: {e}")
    def synthesize_report(*args, **kwargs): raise Exception(f"Import failed: {e}")

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 生产环境判断
IS_VERCEL = os.getenv("VERCEL") == "1"
# Vercel 下使用 /tmp，本地使用 uploads
UPLOAD_DIR = Path("/tmp") if IS_VERCEL else Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 适配 Vercel 的 API 路由
api_router = APIRouter()

# 存储任务状态
tasks: Dict[str, Any] = {}

class ProcessRequest(BaseModel):
    files: List[str]
    models: List[str]
    prompt: str

@api_router.get("/files")
async def list_files():
    try:
        files = []
        for f in UPLOAD_DIR.glob("*.pdf"):
            try:
                stat = f.stat()
                files.append({
                    "name": f.name,
                    "size": stat.st_size,
                    "upload_time": stat.st_mtime,
                    "path": str(f)
                })
            except Exception as e:
                print(f"Error stating file {f}: {e}")
        return files
    except Exception as e:
        print(f"Error listing files: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    print(f"Received upload request with {len(files)} files")
    uploaded = []
    for file in files:
        try:
            # 处理文件夹上传带来的路径问题，只取文件名
            filename = os.path.basename(file.filename)
            if not filename:
                print("Skipping file with empty filename")
                continue
            
            print(f"Uploading file: {filename}")
            file_path = UPLOAD_DIR / filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            size = file_path.stat().st_size
            uploaded.append({"name": filename, "size": size})
            print(f"Successfully uploaded {filename} ({size} bytes)")
        except Exception as e:
            print(f"Error uploading file {file.filename}: {e}")
            
    return uploaded

@api_router.delete("/files")
async def delete_all_files():
    for f in UPLOAD_DIR.glob("*.pdf"):
        f.unlink()
    # 同时清理生成的临时图片
    for f in UPLOAD_DIR.glob("*.png"):
        f.unlink()
    for f in UPLOAD_DIR.glob("*.jpg"):
        f.unlink()
    return {"message": "All files deleted"}

@api_router.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
        return {"message": "Deleted"}
    raise HTTPException(status_code=404, detail="File not found")

async def process_single_file_model(task_id: str, filename: str, model: str, prompt: str, results: dict, total_steps: int, current_step_container: list):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        return

    category = get_category_from_filename(filename)
    product_title = file_path.stem
    
    # 提取PDF信息 (由于 PyMuPDF 不是并行的，这里保持同步调用，但模型调用可以并行)
    img_path, text_info = extract_pdf_info(str(file_path), str(UPLOAD_DIR))
    
    single_product_prompt = "请仅针对当前商品，输出客观标签、主观标签和短标题标签。不要输出品类标题、商品标题和模型名称。"
    final_prompt = f"{prompt}\n\n**本次执行指令**:\n{single_product_prompt}"
    
    # 并行调用模型 (这里是 IO 密集型)
    tags_result = await asyncio.to_thread(get_product_tags, img_path, text_info, final_prompt, model)
    
    if category not in results:
        results[category] = {}
    if product_title not in results[category]:
        results[category][product_title] = {}
        
    results[category][product_title][model] = tags_result
    
    current_step_container[0] += 1
    tasks[task_id]["progress"] = int((current_step_container[0] / total_steps) * 100)
    tasks[task_id]["current_file"] = filename
    tasks[task_id]["current_model"] = model

    # 清理临时图片
    if os.path.exists(img_path):
        os.remove(img_path)

async def run_processing(task_id: str, files: List[str], models: List[str], prompt: str):
    try:
        print(f"Starting optimized parallel task {task_id}")
        tasks[task_id]["status"] = "processing"
        
        results = {}
        total_steps = len(files) * len(models) + 1
        current_step_container = [0]

        # 创建所有待处理的任务列表
        process_tasks = []
        for filename in files:
            for model in models:
                process_tasks.append(process_single_file_model(
                    task_id, filename, model, prompt, results, total_steps, current_step_container
                ))
        
        # 并行执行所有模型推理任务 (大幅提升速度)
        # 使用 return_exceptions=True 确保即使部分失败，整体流程也能继续
        responses = await asyncio.gather(*process_tasks, return_exceptions=True)
        for resp in responses:
            if isinstance(resp, Exception):
                print(f"[ERROR] 子任务失败: {resp}")

        # 3. 汇总报告
        print("Synthesizing final report...")
        tasks[task_id]["current_file"] = "全局总结合成"
        tasks[task_id]["current_model"] = "汇总分析"
        
        summary_data = ""
        for category, products in results.items():
            summary_data += f"品类: {category}\n"
            for title, models_res in products.items():
                summary_data += f"  商品: {title}\n"
                for m_name, tags in models_res.items():
                    # 截断一下防止过长
                    tags_snippet = tags[:300] if isinstance(tags, str) else str(tags)
                    summary_data += f"    模型 {m_name} 的结果:\n{tags_snippet}...\n"

        final_report = await asyncio.to_thread(synthesize_report, summary_data, prompt)
        
        tasks[task_id]["results"] = results
        tasks[task_id]["final_report"] = final_report
        tasks[task_id]["progress"] = 100
        tasks[task_id]["status"] = "completed"
        print(f"Task {task_id} completed successfully")
    except Exception as e:
        import traceback
        print(f"[ERROR] run_processing 整体失败: {e}")
        print(traceback.format_exc())
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)

@api_router.post("/process")
async def start_process(req: ProcessRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "results": {},
        "current_file": "",
        "current_model": ""
    }
    
    # 将处理过程放入后台执行
    background_tasks.add_task(run_processing, task_id, req.files, req.models, req.prompt)
    
    return {"task_id": task_id}

@api_router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]

@api_router.get("/download/{task_id}")
async def download_results(task_id: str, format: str = "json"):
    print(f"[DEBUG] 收到下载请求: task_id={task_id}, format={format}")
    
    if task_id not in tasks:
        print(f"[ERROR] 任务 {task_id} 不存在")
        raise HTTPException(status_code=404, detail="Task not found")
        
    if tasks[task_id]["status"] != "completed":
        print(f"[ERROR] 任务 {task_id} 尚未完成，当前状态: {tasks[task_id]['status']}")
        raise HTTPException(status_code=400, detail=f"Results not ready. Current status: {tasks[task_id]['status']}")
    
    try:
        results = tasks[task_id].get("results", {})
        if not results:
            print(f"[ERROR] 任务 {task_id} 结果为空")
            raise ValueError("Empty results")

        data = []
        for category, products in results.items():
            for title, model_results in products.items():
                row = {"category": category, "product": title}
                for model, res in model_results.items():
                    row[f"{model}_result"] = res
                data.append(row)
        
        df = pd.DataFrame(data)
        print(f"[DEBUG] 成功创建 DataFrame，行数: {len(df)}")
        
        if format == "csv":
            stream = io.StringIO()
            df.to_csv(stream, index=False, encoding='utf-8-sig')
            response = StreamingResponse(
                iter([stream.getvalue()]),
                media_type="text/csv"
            )
            response.headers["Content-Disposition"] = f"attachment; filename=results_{task_id}.csv"
            return response
            
        elif format == "xlsx":
            output = io.BytesIO()
            # 使用 pd.ExcelWriter 显式指定 engine
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Product Tags')
            output.seek(0)
            
            return StreamingResponse(
                output, 
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': f'attachment; filename="results_{task_id}.xlsx"',
                    'Cache-Control': 'no-cache'
                }
            )
            
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"[ERROR] 导出过程中发生异常:\n{error_msg}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error during export: {str(e)}")
    
    raise HTTPException(status_code=400, detail="Unsupported format")

# 注册路由
app.include_router(api_router, prefix="/api" if IS_VERCEL else "")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
