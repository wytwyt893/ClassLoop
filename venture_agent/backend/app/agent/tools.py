from app.ingestion.db_config import db

def query_neo4j_for_projects(keyword: str) -> str:
    """
    RAG 工具：根据用户项目描述中的关键字去 Neo4j 搜索相似项目及价值闭环。
    如果没查到，则返回空提示。
    """
    # 极简模式：利用关键字粗略匹配图数据库中的项目名称或标签
    query = """
    MATCH (p:Project)-[:PART_OF_LOOP]->(vl:Value_Loop)
    WHERE p.name CONTAINS $keyword OR vl.description CONTAINS $keyword
    MATCH (m:Market)-[:TARGETED_BY_LOOP]->(vl)
    MATCH (t:Technology)-[:ENABLES_LOOP]->(vl)
    RETURN p.name AS project, 
           vl.loop_id AS loop_id, 
           vl.description AS loop_desc,
           m.name AS market,
           t.name AS tech
    LIMIT 3
    """
    
    try:
        results = db.execute_query(query, {"keyword": keyword})
        if not results:
            return f"数据库中暂无该领域（关键字：{keyword}）的成功案例对照。"
            
        context_lines = [f"[图谱搜索结果 (关键字: {keyword})]:"]
        for r in results:
            context_lines.append(
                f"- 对标项目: 【{r['project']}】 (位于市场: {r['market']}, 核心技术: {r['tech']})\n"
                f"  已验证的价值闭环: {r['loop_desc']}"
            )
        return "\n".join(context_lines)
        
    except Exception as e:
        print(f"⚠️ 图谱检索失败: {e}")
        return "此时无法连接到 Neo4j 底层知识库。"
