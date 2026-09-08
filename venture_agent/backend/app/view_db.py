import sqlite3
import os
from tabulate import tabulate # 用户环境若无 tabulate 则回退到简易输出

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "venture.db")

def view_table(table_name):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        print(f"\n=== 表: {table_name} ===")
        try:
            from tabulate import tabulate
            print(tabulate(rows, headers=columns, tablefmt="grid"))
        except ImportError:
            print(f"列名: {columns}")
            for row in rows:
                print(row)
    except Exception as e:
        print(f"读取表 {table_name} 失败: {e}")
    finally:
        conn.close()

def main():
    if not os.path.exists(DB_PATH):
        print(f"数据库文件未找到: {DB_PATH}")
        return

    tables = ["projects", "deadlines", "evolution_logs", "conversations", "messages"]
    for table in tables:
        view_table(table)

if __name__ == "__main__":
    main()
