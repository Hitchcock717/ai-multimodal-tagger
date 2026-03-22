import os
import fitz  # PyMuPDF
from pathlib import Path
from typing import Tuple, Optional

def extract_pdf_info(pdf_path: str, output_dir: str) -> Tuple[str, str]:
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

    # 如果没有找到图像，则默认使用第一页生成缩略图
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

def get_category_from_filename(filename: str) -> str:
    """从文件名中提取品类信息"""
    if '冲锋衣' in filename:
        return '冲锋衣'
    if '连衣裙' in filename:
        return '连衣裙'
    if 'T恤' in filename:
        return 'T恤'
    return '其他'
