from app.ingestion.db_config import db

def init_ontology():
    """
    初始化 VentureAgent 的核心实体与超边本体约束。
    通过创建约束 (Constraints) 保证核心实体的唯一性。
    """
    print("正在初始化 Neo4j 数据本体约束...")
    
    # 核心节点唯一性约束 (保证同一事物的名称唯一)
    core_constraints = [
        "CREATE CONSTRAINT project_name_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE",
        "CREATE CONSTRAINT tech_name_unique IF NOT EXISTS FOR (t:Technology) REQUIRE t.name IS UNIQUE",
        "CREATE CONSTRAINT market_name_unique IF NOT EXISTS FOR (m:Market) REQUIRE m.name IS UNIQUE",
        "CREATE CONSTRAINT participant_name_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.name IS UNIQUE",
    ]
    
    # 超边节点化 (Hyperedge-as-a-Node) 约束
    # 比如: 价值闭环 (Value_Loop) 作为一个单独的节点存在
    hyperedge_constraints = [
        "CREATE CONSTRAINT value_loop_id_unique IF NOT EXISTS FOR (v:Value_Loop) REQUIRE v.loop_id IS UNIQUE",
        "CREATE CONSTRAINT risk_pattern_id_unique IF NOT EXISTS FOR (r:Risk_Pattern) REQUIRE r.pattern_id IS UNIQUE"
    ]

    for query in core_constraints + hyperedge_constraints:
        try:
            db.execute_query(query)
            print(f"成功执行: {query.split('FOR')[0].strip()} ...")
        except Exception as e:
            print(f"执行约束时报错: {e}")

def create_sample_hyperedge():
    """
    演示如何通过 '节点化超边' 模式在图数据库中关联各个基础节点。
    创建一条 Mock 的价值闭环 (Value_Loop_Edge)。
    """
    print("\n造测数据: 创建 '校园外卖' 项目的价值闭环超图结构...")
    
    query = """
    // 1. 创建独立的核心节点
    MERGE (p:Project {name: "校园跑腿外卖"})
    MERGE (t:Technology {name: "微信小程序LBS定位"})
    MERGE (m:Market {name: "封闭式大学校园"})
    
    // 2. 创建一个超边节点 (Hyperedge-as-a-Node)
    MERGE (vl:Value_Loop {loop_id: "VL_Campus_Delivery_01", description: "利用小程序连接学生骑手与校园周边商家"})
    
    // 3. 将各个维度节点连接到此超边节点，形成闭环
    MERGE (p)-[:PART_OF_LOOP]->(vl)
    MERGE (t)-[:ENABLES_LOOP]->(vl)
    MERGE (m)-[:TARGETED_BY_LOOP]->(vl)
    
    RETURN p.name, vl.loop_id
    """
    result = db.execute_query(query)
    print(f"创建成功，项目: {result[0]['p.name']}, 闭环ID: {result[0]['vl.loop_id']}")

if __name__ == "__main__":
    init_ontology()
    create_sample_hyperedge()
    # 结束后关闭连接
    db.close()
