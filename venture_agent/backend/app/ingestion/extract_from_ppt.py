import os
import argparse
from langchain_community.document_loaders import PyPDFLoader
from app.ingestion.extract import extract_knowledge, save_to_neo4j
from app.ingestion.db_config import db

def process_pdf_file(file_path: str):
    print(f"\n==================================================")
    print(f"📄 开始处理文件: {os.path.basename(file_path)}")
    print(f"==================================================")
    
    try:
        # 使用 PyPDFLoader 加载 PDF 文件的每一页
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        
        # 将所有页面的文本拼接成一个长字符串
        full_text = "\n".join([page.page_content for page in pages])
        
        print(f"✅ 成功读取 PDF, 共 {len(pages)} 页, 约 {len(full_text)} 个字符。")
        
        if len(full_text.strip()) == 0:
            print("⚠️ 警告：提取到的文本为空，可能是扫描版 PDF 或图片 PPT。请确保 PDF 包含可选中的文本。")
            return
            
        # 考虑到双创 PPT 通常文字密度不高，20-30 页的纯文本通常远在 DeepSeek (32k/64k) 的上下文限制内
        # 直接交由配置好的大模型进行结构化提取
        extracted_data = extract_knowledge(full_text)
        
        # 打印提取结果
        print("\n=== ✨ DeepSeek 提取结果 ✨ ===")
        for p in extracted_data.projects:
            print(f"- 项目: {p.name}")
            print(f"- 技术: {p.technology}")
            print(f"- 市场: {p.market}")
            print(f"- 参与者: {p.participant}")
            print("-" * 30)
            
        # 存入 Neo4j 图数据库
        save_to_neo4j(extracted_data)
        
    except Exception as e:
        print(f"❌ 处理文件 {file_path} 时出现异常: {e}")

def process_directory(directory_path: str):
    if not os.path.exists(directory_path):
        print(f"❌ 目录不存在: {directory_path}")
        return
        
    if not os.path.isdir(directory_path):
        print(f"❌ 路径不是一个文件夹: {directory_path}")
        return

    # 寻找所有的 .pdf 文件
    pdf_files = [f for f in os.listdir(directory_path) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print(f"⚠️ 在目录 {directory_path} 中没有找到任何 PDF 文件。")
        return
        
    print(f"🔍 找到 {len(pdf_files)} 个 PDF 文件，准备批量提取入库...\n")
    
    for filename in pdf_files:
        file_path = os.path.join(directory_path, filename)
        process_pdf_file(file_path)
        
    print("\n🎉 所有 PDF 文件处理完毕！")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="批量从 PDF 格式的商业计划书 (PPT转存) 中抽取知识并存入 Neo4j 图数据库")
    parser.add_argument("--dir", type=str, required=True, help="包含 PDF 文件的目录路径绝对或相对地址")
    
    args = parser.parse_args()
    
    process_directory(args.dir)
    
    # 全部跑完后安全关闭图数据库连接
    db.close()
