import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Neo4jConn:
    def __init__(self):
        # 默认连接到本地 docker 容器
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))

    def close(self):
        self.driver.close()

    def execute_query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record for record in result]

# 提供一个全局可用的简易单例
db = Neo4jConn()

if __name__ == "__main__":
    # 测试连接
    result = db.execute_query("RETURN 1 AS num")
    print(f"Neo4j Connection Test: {result[0]['num'] == 1}")
    db.close()
