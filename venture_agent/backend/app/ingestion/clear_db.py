from app.ingestion.db_config import db

def clear_database():
    """
    清空 Neo4j 数据库中的所有节点和关系。
    使用 DETACH DELETE 删除所有节点及其相连的边。
    注意：这不会删除您创建的约束 (Constraints) 或索引 (Indexes)。
    """
    print("⚠️ 警告：正在准备清空数据库结构中的所有节点和边...")
    query = """
    MATCH (n)
    DETACH DELETE n
    """
    try:
        db.execute_query(query)
        print("✅ 数据库已成功清空。")
    except Exception as e:
        print(f"❌ 清空数据库时发生错误: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # 执行清空逻辑
    # 若需避免误触，可在此加个命令行输入确认 (input("确认清空? Y/N: "))，这里为了方便调试直接删除了。
    response = input("确认清空目前 Neo4j 图数据库中的所有节点与逻辑关系？此操作不可逆。[y/N]: ")
    if response.strip().lower() == 'y':
        clear_database()
    else:
        print("操作已取消。")
        db.close()
