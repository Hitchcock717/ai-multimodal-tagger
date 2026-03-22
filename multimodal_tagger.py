import os
import fitz  # PyMuPDF
from openai import OpenAI
import json
import base64
from pathlib import Path

# 设置API信息
api_key = os.getenv("DASHSCOPE_API_KEY")
base_url = "https://coding.dashscope.aliyuncs.com/v1"
model_name = "qwen3.5-plus"

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

def encode_image(image_path):
    """将本地图像文件编码为base64字符串"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_pdf_info(pdf_path, output_dir):
    """
    从PDF中提取最有价值的图像和相关文本。
    遍历页面，找到最大的图像作为核心视觉输入，并提取该页的文本。
    """
    doc = fitz.open(pdf_path)
    max_image_area = 0
    best_page_num = 0
    best_image_info = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            # 简单的以字节长度作为面积的代理
            if len(image_bytes) > max_image_area:
                max_image_area = len(image_bytes)
                best_page_num = page_num
                best_image_info = base_image

    # 如果没有找到图像，则默认使用第一页
    if not best_image_info:
        page = doc[0]
        pix = page.get_pixmap(dpi=150)
        img_name = f"{Path(pdf_path).stem}_page1.png"
        img_path = os.path.join(output_dir, img_name)
        pix.save(img_path)
        text = doc[0].get_text()
        doc.close()
        return img_path, text

    # 保存找到的最大图像
    img_ext = best_image_info["ext"]
    img_name = f"{Path(pdf_path).stem}_best_image.{img_ext}"
    img_path = os.path.join(output_dir, img_name)
    with open(img_path, "wb") as f:
        f.write(best_image_info["image"])

    # 提取该页的文本
    text = doc[best_page_num].get_text()
    doc.close()
    return img_path, text

def get_product_tags(img_path, text_info, prompt_text, model_name):
    """
    调用百炼Coding Plan的多模态API生成标签。
    """
    base64_image = encode_image(img_path)
    
    # 构造消息
    system_prompt = "你是一名具备资深电商知识的导购专家与市场分析师。请严格按照Prompt要求，基于输入的图片和文本信息，生成综合性分析报告的一部分。"
    # 将商品标题和PDF文本结合，作为输入
    product_title = Path(img_path).stem.replace('_best_image', '').replace('_page1', '')
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
    
    try:
        # 注意：为了让模型专注于生成每个商品的部分，我们只把单个商品的信息发过去
        # 最终的聚合和报告生成在Python端完成
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            top_p=0.9
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"模型 {model_name} API调用发生错误: {e}")
        return f"模型 {model_name} 处理失败。"

def get_category_from_filename(filename):
    """从文件名中提取品类信息"""
    if '冲锋衣' in filename:
        return '冲锋衣'
    if '连衣裙' in filename:
        return '连衣裙'
    if 'T恤' in filename:
        return 'T恤'
    # 可以根据需要添加更多品类规则
    return '其他'

def synthesize_final_sections(all_results, prompt_text):
    """
    汇总所有结果，并调用模型生成全局的评测结论和业务应用说明。
    """
    print("正在进行全局总结合成...")
    
    # 构造一个汇总后的结果字符串，方便模型阅读
    summary_data = ""
    for category, products in all_results.items():
        summary_data += f"品类: {category}\n"
        for title, models in products.items():
            summary_data += f"  商品: {title}\n"
            for model_name, tags in models.items():
                summary_data += f"    模型 {model_name} 的结果:\n{tags[:300]}...\n" # 截断一下防止过长
    
    synthesis_prompt = f"""
你现在是一名资深的电商行业分析师。请基于以下所有商品的识别结果（由不同模型生成），完成报告的最后两个章节。

### 输入数据概要:
{summary_data}

### 任务要求:
请严格按照以下结构输出 Markdown 内容：

## 跨品类模型效果横向评测
### 1. 评测结论
- **qwen3.5-plus**: [基于结果，总结该模型的整体表现、标签准确度、创意度等优缺点]
- **kimi-k2.5**: [基于结果，总结该模型的整体表现、标签准确度、创意度等优缺点]
### 2. 思考过程
[详细阐述你是如何得出上述结论的，例如：在客观属性提取上谁更准？在主观风格（如Mob Wife, 静奢风）的理解上谁更有趣？]

## 标签策略应用与验证总览
### 1. 思考与说明 (Reasoning)
[宏观总结本次标签生成工作背后的核心逻辑、消费洞察和市场趋势。]
### 2. 电商搜索业务应用方向
[结合生成的标签（客观、主观、短标题），综合阐述它们在电商搜索业务中的落地措施、目标和指标。]
### 3. 生产环境验证方法
[提供一个统一的、科学的标签上线验证流程（如A/B测试、人工评测等）。]

请直接输出上述 Markdown 章节内容。
"""

    try:
        response = client.chat.completions.create(
            model="qwen3.5-plus", # 使用qwen3.5-plus进行总结
            messages=[
                {"role": "system", "content": "你是一名资深的电商行业分析师。"},
                {"role": "user", "content": synthesis_prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"全局总结合成失败: {e}")
        return "\n## 跨品类模型效果横向评测\n[合成失败]\n\n## 标签策略应用与验证总览\n[合成失败]\n"

def generate_composite_report(all_results, output_path, final_sections):
    """根据聚合的结果和最后生成的合成内容，输出最终的Markdown报告"""
    report_content = "# 多模态商品标签策略综合分析报告\n\n"

    # 按品类组织内容
    for category, products in all_results.items():
        report_content += f"## 品类：{category}\n\n"
        for product_title, models_results in products.items():
            report_content += f"### {product_title}\n"
            for model_name, result in models_results.items():
                report_content += f"#### 模型对比分析：{model_name}\n"
                report_content += f"{result}\n\n"
            report_content += "\n"
    
    # 插入最后合成的全局分析部分
    report_content += final_sections

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    print(f"综合报告已生成: {output_path}")


def main():
    base_dir = "/Users/felix.zhao/Downloads/AI挖掘-多模态"
    demo_dir = os.path.join(base_dir, "demo")
    prompt_file = os.path.join(base_dir, "prompt.md")
    
    with open(prompt_file, 'r', encoding='utf-8') as f:
        prompt_text = f.read()
    
    pdf_files = [os.path.join(root, file) for root, _, files in os.walk(demo_dir) for file in files if file.endswith(".pdf")]
    
    if not pdf_files:
        print("未找到PDF文件。")
        return

    print(f"找到 {len(pdf_files)} 个PDF文件，开始处理...")

    models_to_compare = ["qwen3.5-plus", "kimi-k2.5"]
    all_results = {}
    temp_images = []

    for pdf_path in pdf_files:
        pdf_name = Path(pdf_path).name
        print(f"--- 正在处理: {pdf_name} ---")
        
        category = get_category_from_filename(pdf_name)
        product_title = Path(pdf_path).stem

        if category not in all_results:
            all_results[category] = {}
        if product_title not in all_results[category]:
            all_results[category][product_title] = {}

        img_path, text_info = extract_pdf_info(pdf_path, base_dir)
        temp_images.append(img_path)

        for model_name in models_to_compare:
            print(f"  - 调用模型: {model_name}...")
            # 为了让模型专注于生成每个商品的部分，我们修改prompt，让它只输出标签部分
            single_product_prompt = "请仅针对当前商品，输出客观标签、主观标签和短标题标签。不要输出品类标题、商品标题和模型名称。"
            
            # 将这个临时指令和主prompt结合
            final_prompt_for_api = f"{prompt_text}\n\n**本次执行指令**:\n{single_product_prompt}"

            tags_result = get_product_tags(img_path, text_info, final_prompt_for_api, model_name)
            all_results[category][product_title][model_name] = tags_result if tags_result else "处理失败"

    # 所有文件处理完毕后，先进行全局总结合成
    final_sections = synthesize_final_sections(all_results, prompt_text)

    # 然后生成最终综合报告
    report_path = os.path.join(base_dir, "综合分析报告.md")
    generate_composite_report(all_results, report_path, final_sections)

    # 清理所有临时图像文件
    print("清理临时文件...")
    for img in temp_images:
        if os.path.exists(img):
            os.remove(img)
    print("完成。")

if __name__ == "__main__":
    main()
