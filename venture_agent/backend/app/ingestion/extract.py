import os
from typing import List, cast
from pydantic import BaseModel, Field, SecretStr
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.ingestion.db_config import db

# -----------------------------------------------------------------------------
# 1. 定义期望从商业计划书文本中萃取出的数据结构 (Schema)
# -----------------------------------------------------------------------------
class ProjectInfo(BaseModel):
    name: str = Field(description="项目的名称")
    market: str = Field(description="该项目所针对的市场或目标受众")
    technology: str = Field(description="该项目使用的核心技术或所提供的产品服务形式")
    participant: str = Field(description="项目的参与者或典型用户画像")
    
class ExtractedData(BaseModel):
    projects: List[ProjectInfo] = Field(description="文本中提取出的项目列表")

# -----------------------------------------------------------------------------
# 2. 调用 LLM 进行结构化信息抽取
# -----------------------------------------------------------------------------
def extract_knowledge(text: str) -> ExtractedData:
    """使用大语言模型的 Function Calling 能力将非结构文本提取为图结构对应的数据"""
    print(f"正在分析文本内容... \n({text[:50]}...)")
    
    try:
        # 读取 .env 中配置的 DeepSeek API 信息
        raw_api_key = os.getenv("DEEPSEEK_API_KEY")
        base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        
        if not raw_api_key or raw_api_key == "your_key_here":
            raise ValueError("请在 backend/.env 中配置有效的 DEEPSEEK_API_KEY")
            
        print("🔗 已连接到 DeepSeek 核心，正在尝试结构化抽取...")
        api_key_secret = SecretStr(raw_api_key)
        
        # DeepSeek 的 API 完全兼容 OpenAI 的 Python SDK
        # 使用其实惠聪明的模型 deepseek-chat
        llm = ChatOpenAI(
            model="deepseek-chat",
            api_key=api_key_secret,
            base_url=base_url,
            temperature=0,
            max_retries=2
        )
        
        # 使用 Pydantic 模型作为 structured output，保证 LLM 稳定输出 JSON
        # DeepSeek 的 function calling 能力极强，可无缝对接 langchain 的 with_structured_output
        structured_llm = llm.with_structured_output(ExtractedData)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "作为一个商业分析助手，请你从以下商业计划书摘要中提取出项目名称、核心技术、目标市场以及参与者等信息。如果没有明确提及，可以尝试根据上下文简短概括。"),
            ("user", "{text}")
        ])
        
        chain = prompt | structured_llm
        result = chain.invoke({"text": text})
        
        # 告诉静态类型检查器我们确信 LLM 会遵守 structured_llm 的约定返回正确的 Pydantic 模型
        return cast(ExtractedData, result)
        
    except Exception as e:
        print(f"\n[⚠️ API 连接失败或未配置环境变量 OPENAI_API_KEY] \n详细报错: {str(e)[:100]}...\n")
        # MVP 阶段的 Mock 兜底数据，避免因无 API Key 报错无法体验流程
        print(">> 🚀 自动回退：使用本地 Mock 抽取数据以继续图谱构建流程 🚀\n")
        return ExtractedData(
            projects=[
                ProjectInfo(
                    name="校园绿电猎手",
                    market="江浙沪地区高校宿舍环境",
                    technology="硬件智能插座与自研能耗大模型",
                    participant="关注低碳环保的大学生"
                )
            ]
        )

# -----------------------------------------------------------------------------
# 3. 将萃取出的结果转换为 Cypher 语句写入 Neo4j
# -----------------------------------------------------------------------------
def save_to_neo4j(data: ExtractedData):
    print("\n准备将提取的数据写入 Neo4j 数据库...")
    for proj in data.projects:
        # 使用 MERGE 避免创建重复节点
        query = """
        MERGE (p:Project {name: $p_name})
        MERGE (m:Market {name: $m_name})
        MERGE (t:Technology {name: $t_name})
        MERGE (u:Participant {name: $u_name})
        
        // 建立超边关联该项目的价值闭环
        MERGE (vl:Value_Loop {loop_id: 'VL_' + $p_name})
        ON CREATE SET vl.description = "自动提取的初始价值闭环"
        
        MERGE (p)-[:PART_OF_LOOP]->(vl)
        MERGE (m)-[:TARGETED_BY_LOOP]->(vl)
        MERGE (t)-[:ENABLES_LOOP]->(vl)
        MERGE (u)-[:PARTICIPATES_IN]->(vl)
        
        RETURN p.name AS project, vl.loop_id AS loop_id
        """
        
        params = {
            "p_name": proj.name,
            "m_name": proj.market,
            "t_name": proj.technology,
            "u_name": proj.participant
        }
        
        try:
            res = db.execute_query(query, params)
            print(f"写入成功！-> Project: {res[0]['project']}, Value_Loop: {res[0]['loop_id']}")
        except Exception as e:
            print(f"写入图数据报错: {e}")

if __name__ == "__main__":
    # Mock 的非结构化BP片段
    sample_text = """
    我们的项目名为‘校园绿电猎手’，旨在解决南大校园宿舍闲置电力浪费问题。
    我们开发了一套基于窄带物联网(NB-IoT)的智能插座，通过硬件感知，结合我们自研的能耗大模型，
    让那些平时关注低碳环保的大学生群体能够参与到电力调度中来，最终我们将覆盖整个江浙沪地区的高校市场。
    """
    
    # 1. 抽取
    extracted = extract_knowledge(sample_text)
    print("\n=== LLM 提取结果 ===")
    for p in extracted.projects:
        print(f"项目: {p.name}\n技术: {p.technology}\n市场: {p.market}\n参与者: {p.participant}")
        
    # 2. 写入
    save_to_neo4j(extracted)
    
    # 3. 关闭数据库连接
    db.close()
