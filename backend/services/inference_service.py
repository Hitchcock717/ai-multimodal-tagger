import os
import base64
import json
from openai import OpenAI
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置信息
BASE_URL = "https://coding.dashscope.aliyuncs.com/v1"

def get_client():
    key = os.getenv("DASHSCOPE_API_KEY")
    print(f"[DEBUG] 正在读取 API Key: {'已找到' if key else '未找到'}")
    if key:
        print(f"[DEBUG] API Key 前缀: {key[:8]}...")
    
    if not key:
        print("Warning: DASHSCOPE_API_KEY environment variable is not set.")
        return None
    
    try:
        return OpenAI(
            api_key=key,
            base_url=BASE_URL
        )
    except Exception as e:
        print(f"[ERROR] 初始化 OpenAI 客户端失败: {e}")
        return None

def encode_image(image_path: str) -> str:
    """将本地图像文件编码为base64字符串"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def call_model(model_name: str, system_prompt: str, user_content: List[Dict[str, Any]]) -> str:
    """调用大模型 API 并具备重试机制"""
    client = get_client()
    if not client:
        print("[CRITICAL] API Key 未设置，请在 .env 文件中配置 DASHSCOPE_API_KEY")
        return "API Key 未设置"
    
    print(f"[REAL-MODE] 正在发起真实 API 请求 -> 模型: {model_name}")
    try:
        # 增加 max_tokens 以防结果截断，合成报告任务需要更多 token
        is_synthesis = "分析师" in system_prompt or "综合评估报告" in system_prompt
        max_tokens = 4000 if is_synthesis else 2000
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            top_p=0.9,
            max_tokens=max_tokens
        )
        print(f"[REAL-MODE] 模型 {model_name} 响应成功")
        return response.choices[0].message.content
    except Exception as e:
        print(f"[REAL-MODE-ERROR] 调用模型 {model_name} 失败: {str(e)}")
        raise e

def get_product_tags(img_path: str, text_info: str, prompt_text: str, model_name: str) -> str:
    """获取商品标签 (真实 AI 调用)"""
    print(f"[REAL-MODE] 正在处理商品: {os.path.basename(img_path)}")
    base64_image = encode_image(img_path)
    system_prompt = "你是一名具备资深电商知识的导购专家与市场分析师。你的任务是精准识别商品图片和文本中的属性，并生成符合规范的客观标签、主观标签和短标题。请确保输出完整，不要遗漏任何要求的板块。"
    
    product_title = os.path.basename(img_path).replace('_best_image', '').replace('_page1', '').split('.')[0]
    combined_text_input = f"商品标题: {product_title}\n\nPDF文本摘要:\n{text_info[:1500]}"

    user_content = [
        {
            "type": "text",
            "text": f"{prompt_text}\n\n[当前处理的商品信息]:\n{combined_text_input}"
        },
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{base64_image}"
            }
        }
    ]
    
    return call_model(model_name, system_prompt, user_content)

def synthesize_report(summary_data: str, prompt_text: str, model_name: str = "qwen3.5-plus") -> str:
    """合成最后的全局评估报告 (真实 AI 调用)"""
    client = get_client()
    if not client:
        return "API Key 未设置"
    
    print(f"[REAL-MODE] 正在合成全局报告...")
    system_prompt = "你是一名资深的电商行业分析师。你的任务是根据多模型的识别结果，撰写一份结构严谨、洞察深刻的综合评估报告。请确保报告逻辑清晰，排版专业。"
    
    synthesis_prompt = f"""
请基于以下所有商品的识别结果（由不同模型生成），完成报告的最后两个章节。

### 输入数据概要:
{summary_data}

### 任务要求:
请严格按照以下结构输出 Markdown 内容，并注意排版的美观性：
1. 使用一级标题 (#) 作为报告大标题（如果需要）。
2. 使用二级标题 (##) 作为核心章节。
3. 使用三级标题 (###) 作为子章节。
4. **段落之间请保留空行**。
5. 重要结论请使用 **加粗** 或 > 引用块。
6. 不同大章节之间可以使用 --- 分隔符。

## 跨品类模型效果横向评测
---
### 1. 模型表现量化对比 (表格展示)
| 评测维度 | qwen3.5-plus 表现 | kimi-k2.5 表现 | 优胜模型 |
| :--- | :--- | :--- | :--- |
| 客观属性提取 | [具体描述] | [具体描述] | [模型名] |
| 风格创意度 | [具体描述] | [具体描述] | [模型名] |
| 语义一致性 | [具体描述] | [具体描述] | [模型名] |

### 2. 核心差异化洞察
- **qwen3.5-plus**: [总结其在本次任务中的独特技术优势，例如对复杂参数的解析能力]
- **kimi-k2.5**: [总结其在本次任务中的独特创意优势，例如对营销场景的感知力]

### 3. 深度思考过程 (Reasoning)
> [详细阐述你是如何得出上述结论的。重点分析：在处理模糊图文信息时，哪个模型展现了更强的推理补全能力？]

## 标签策略应用与验证总览
---
### 1. 业务应用矩阵 (表格展示)
| 标签类型 | 应用场景 | 核心价值指标 (KPI) | 建议权重 |
| :--- | :--- | :--- | :--- |
| 客观标签 | 搜索索引/筛选器 | 搜索召回率/准确率 | 高 |
| 主观标签 | 详情页导购/推荐流 | 点击率 (CTR)/停留时长 | 中 |
| 短标题标签 | 列表页展示 | 转化率 (CVR) | 高 |

### 2. 生产环境验证方案
[提供一个科学的、可落地的标签上线验证流程（如A/B测试设计、人工抽检比例等）。]

请直接输出上述 Markdown 章节内容。
"""
    try:
        user_content = [{"type": "text", "text": synthesis_prompt}]
        return call_model(model_name, system_prompt, user_content)
    except Exception as e:
        print(f"[REAL-MODE-ERROR] 报告合成失败: {e}")
        return "报告合成失败"
