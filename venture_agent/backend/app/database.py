import json
import os
import sqlite3
from datetime import datetime
from typing import Optional

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "venture.db")


def get_db_connection():
    return sqlite3.connect(DB_PATH, timeout=10)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. 项目表 (扩展阶段)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id TEXT,
        competition TEXT,    -- 所属比赛
        track TEXT,          -- 赛道
        college TEXT,        -- 所属书院/学院
        advisor_name TEXT,   -- 指导老师姓名
        advisor_info TEXT,   -- 指导老师简介
        advisor_id TEXT,     -- 指导老师工号
        content TEXT,        -- 项目计划书正文 (解析后内容)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. 截止日期 (DDL) 表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deadlines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL, -- 格式: YYYY-MM-DD
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)
    
    # 3. 演进日志表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evolution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        event TEXT NOT NULL,
        log_level TEXT DEFAULT 'info',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 4. 会话 (Conversations) 表 
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 5. 消息 (Messages) 表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        agent TEXT,
        content TEXT NOT NULL,
        reasoning_trace TEXT,
        reasoning_graph TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
    """)

    # 6. 成员表 (Phase 4 & 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT NOT NULL,
        student_id TEXT,    -- 学号
        role TEXT,          -- 身份/角色
        position TEXT,      -- 职务
        college TEXT,       -- 学院
        major TEXT,         -- 专业
        grade TEXT,         -- 年级
        info TEXT,          -- 个人背景
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 7. 项目提交日志 (Commits)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        content TEXT NOT NULL,
        author TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 8. 项目评估表 (Phase 6)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER UNIQUE,
        r1_score REAL, r2_score REAL, r3_score REAL, r4_score REAL, r5_score REAL, 
        r6_score REAL, r7_score REAL, r8_score REAL, r9_score REAL,
        overall_risk TEXT,
        audit_summary TEXT,
        evidence_trace TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 9. 教师干预指令表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teacher_interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        teacher_name TEXT,
        content TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 10. 项目文件表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        filename TEXT NOT NULL,
        file_url TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # # 插入一些初始 Mock 数据
    # cursor.execute("SELECT COUNT(*) FROM projects")
    # if cursor.fetchone()[0] == 0:
    #     # 项目 1：归属给“张老师” (工号: 123456)
    #     cursor.execute("""
    #         INSERT INTO projects (name, description, owner_id, advisor_name, advisor_id, college, competition) 
    #         VALUES (?, ?, ?, ?, ?, ?, ?)
    #     """, ("蘑菇基环保包装盒", "利用真菌菌丝体制作的生物可降解包装材料", "1120230571", "张老师", "123456", "智慧双创学院", "互联网+"))
    #     p1_id = cursor.lastrowid
        
    #     # 项目 2：归属给“王老师” (用于测试联动)
    #     cursor.execute("""
    #         INSERT INTO projects (name, description, owner_id, advisor_name, advisor_id, college, competition) 
    #         VALUES (?, ?, ?, ?, ?, ?, ?)
    #     """, ("二手课本流转平台", "基于校园信用的二手书循环系统", "2230440999", "王老师", "654321", "经管学院", "挑战杯"))
    #     p2_id = cursor.lastrowid

    #     # 为项目 1 插入模拟评估数据
    #     cursor.execute("""
    #         INSERT INTO project_assessments (project_id, r1_score, r2_score, r3_score, r4_score, r5_score, r6_score, r7_score, r8_score, r9_score, overall_risk, audit_summary, evidence_trace)
    #         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    #     """, (p1_id, 4.5, 4.0, 3.5, 3.0, 4.0, 2.5, 4.0, 5.0, 4.5, "Medium", "技术路线清晰，但财务模型中 LTV/CAC 比率偏低，建议加强盈利点深度。", "原文：『我们采用环保材料...』"))

    #     # 为项目 2 插入高危评估数据
    #     cursor.execute("""
    #         INSERT INTO project_assessments (project_id, r1_score, r2_score, r3_score, r4_score, r5_score, r6_score, r7_score, r8_score, r9_score, overall_risk, audit_summary, evidence_trace)
    #         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    #     """, (p2_id, 2.0, 1.5, 4.0, 2.0, 3.0, 1.0, 2.0, 3.0, 3.0, "High", "严重缺乏真实用户访谈证据，且单位经济模型不成立。", "原文：『预计第一个月盈利100万』"))

    conn.commit()
    conn.close()

def migrate_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(projects)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    new_cols = [
        ("competition", "TEXT"), ("track", "TEXT"), ("college", "TEXT"),
        ("advisor_name", "TEXT"), ("advisor_info", "TEXT"), ("advisor_id", "TEXT")
    ]
    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
    
    # 增加 content 列
    cursor.execute("PRAGMA table_info(projects)")
    if "content" not in [row[1] for row in cursor.fetchall()]:
        cursor.execute("ALTER TABLE projects ADD COLUMN content TEXT")
    
    # 更新 members 表 (平滑迁移)
    cursor.execute("PRAGMA table_info(members)")
    mem_cols = [row[1] for row in cursor.fetchall()]
    for col_name, col_type in [("student_id", "TEXT"), ("role", "TEXT"), ("college", "TEXT"), ("major", "TEXT"), ("grade", "TEXT")]:
        if col_name not in mem_cols:
            cursor.execute(f"ALTER TABLE members ADD COLUMN {col_name} {col_type}")
            
    # 更新 project_assessments 表 
    cursor.execute("PRAGMA table_info(project_assessments)")
    if "evidence_trace" not in [row[1] for row in cursor.fetchall()]:
        cursor.execute("ALTER TABLE project_assessments ADD COLUMN evidence_trace TEXT")

    # 创建项目日志表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        content TEXT NOT NULL,
        author TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 为项目文件补充 content 字段，用于保存每个文件各自解析出的正文
    cursor.execute("PRAGMA table_info(project_files)")
    if "content" not in [row[1] for row in cursor.fetchall()]:
        cursor.execute("ALTER TABLE project_files ADD COLUMN content TEXT")

    # 为消息表补充 reasoning_trace 字段，用于保存项目教练的“模拟图谱推理过程”
    cursor.execute("PRAGMA table_info(messages)")
    if "reasoning_trace" not in [row[1] for row in cursor.fetchall()]:
        cursor.execute("ALTER TABLE messages ADD COLUMN reasoning_trace TEXT")
    cursor.execute("PRAGMA table_info(messages)")
    if "reasoning_graph" not in [row[1] for row in cursor.fetchall()]:
        cursor.execute("ALTER TABLE messages ADD COLUMN reasoning_graph TEXT")

    conn.commit()
    conn.close()

def get_dashboard_data(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. 获取用户参与的所有项目 (作为 Owner 或 成员)
    cursor.execute("""
        SELECT DISTINCT p.*,
               (
                   SELECT MAX(datetime(pf.created_at))
                   FROM project_files pf
                   WHERE pf.project_id = p.id
               ) AS latest_file_created_at
        FROM projects p
        LEFT JOIN members m ON p.id = m.project_id
        WHERE p.owner_id = ? OR m.student_id = ?
        ORDER BY
            CASE WHEN latest_file_created_at IS NULL THEN 1 ELSE 0 END,
            latest_file_created_at DESC,
            datetime(p.created_at) DESC,
            p.id DESC
    """, (user_id, user_id))
    projects_rows = cursor.fetchall()
    
    if not projects_rows:
        conn.close()
        return {
            "projects": [],
            "deadlines": [],
            "evolution_logs": [],
            "members": []
        }
    
    projects = [dict(p) for p in projects_rows]
    project_ids = [p['id'] for p in projects]
    placeholders = ','.join(['?'] * len(project_ids))
    
    # 2. 聚合这些项目下的所有 DDL (带项目名)
    cursor.execute(f"""
        SELECT d.title, d.due_date, p.name as project_name 
        FROM deadlines d 
        JOIN projects p ON d.project_id = p.id 
        WHERE d.project_id IN ({placeholders})
    """, project_ids)
    ddls = [dict(row) for row in cursor.fetchall()]
    
    # 3. 获取所有项目的演进日志
    cursor.execute(f"SELECT event, timestamp FROM evolution_logs WHERE project_id IN ({placeholders}) ORDER BY timestamp DESC", project_ids)
    logs = [dict(row) for row in cursor.fetchall()]

    # 4. 获取项目成员 (Phase 4)
    cursor.execute(f"SELECT * FROM members WHERE project_id IN ({placeholders})", project_ids)
    members = [dict(row) for row in cursor.fetchall()]
    
    # 5. 获取项目提交日志 (Commits)
    cursor.execute(f"SELECT * FROM project_commits WHERE project_id IN ({placeholders}) ORDER BY timestamp DESC", project_ids)
    commits = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "projects": projects,
        "deadlines": ddls,
        "evolution_logs": logs,
        "members": members,
        "commits": commits
    }

# --- 会话管理函数 ---

def get_conversations(user_id: str):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title FROM conversations WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_conversation_messages(conv_id: str):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, role, agent, content as text, reasoning_trace, reasoning_graph FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC",
        (conv_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    messages = []
    for row in rows:
        item = dict(row)
        raw_graph = item.get("reasoning_graph")
        if raw_graph:
            try:
                item["reasoning_graph"] = json.loads(raw_graph)
            except (TypeError, ValueError, json.JSONDecodeError):
                item["reasoning_graph"] = None
        else:
            item["reasoning_graph"] = None
        messages.append(item)
    return messages

def save_message(
    conv_id: str,
    role: str,
    content: str,
    agent: Optional[str] = None,
    user_id: Optional[str] = None,
    reasoning_trace: Optional[str] = None,
    reasoning_graph: Optional[dict] = None,
):
    conn = get_db_connection()
    cursor = conn.cursor()
    # 仅在显式提供 user_id 时才允许兜底创建会话，避免消息误写入错误用户
    cursor.execute("SELECT COUNT(*) FROM conversations WHERE id = ?", (conv_id,))
    exists = cursor.fetchone()[0] > 0
    
    if not exists:
        if not user_id:
            conn.close()
            return False
        title = f"新对话 {datetime.now().strftime('%H:%M:%S')}"
        cursor.execute("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                       (conv_id, user_id, title))
    
    cursor.execute(
        "INSERT INTO messages (conversation_id, role, content, agent, reasoning_trace, reasoning_graph) VALUES (?, ?, ?, ?, ?, ?)",
        (
            conv_id,
            role,
            content,
            agent,
            reasoning_trace,
            json.dumps(reasoning_graph, ensure_ascii=False) if reasoning_graph else None,
        )
    )
    message_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return message_id


def update_message_reasoning_graph(message_id: int, reasoning_graph: Optional[dict]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE messages SET reasoning_graph = ? WHERE id = ?",
        (
            json.dumps(reasoning_graph, ensure_ascii=False) if reasoning_graph else None,
            message_id,
        ),
    )
    conn.commit()
    conn.close()

def create_conversation(conv_id: str, user_id: str, title: str, greeting: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM conversations WHERE id = ?", (conv_id,))
    exists = cursor.fetchone()[0] > 0

    if not exists:
        cursor.execute("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                       (conv_id, user_id, title))
        cursor.execute("INSERT INTO messages (conversation_id, role, content, agent) VALUES (?, ?, ?, ?)",
                       (conv_id, "coach", greeting, "系统助手"))

    conn.commit()
    conn.close()

def rename_conversation(conv_id: str, new_title: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE conversations SET title = ? WHERE id = ?", (new_title, conv_id))
    conn.commit()
    conn.close()

def delete_conversation(conv_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    migrate_db()
    print(f"Database initialized and migrated at {DB_PATH}")
