from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

from .security import hash_password


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "classloop.db"


def database_path() -> Path:
    configured = os.getenv("CLASSLOOP_DATABASE_PATH")
    path = Path(configured) if configured else DEFAULT_DB_PATH
    if not path.is_absolute():
        path = (BACKEND_DIR / path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(database_path(), timeout=15, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at REAL NOT NULL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chapter TEXT,
    knowledge_point TEXT,
    lesson_number INTEGER,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS class_sessions (
    id TEXT PRIMARY KEY,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    session_code TEXT NOT NULL UNIQUE,
    results_public INTEGER NOT NULL DEFAULT 1,
    results_pin_code TEXT,
    completion_title TEXT,
    completion_subtitle TEXT,
    completion_description TEXT,
    completion_image_id TEXT,
    bg_color TEXT,
    accent_color TEXT,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher ON class_sessions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_sessions_code ON class_sessions(session_code);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_id TEXT,
    display_order INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    choices_json TEXT,
    min_value REAL,
    max_value REAL,
    step REAL,
    conditional_logic_json TEXT,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id, display_order);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    content_type TEXT,
    size INTEGER NOT NULL,
    content BLOB NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS student_responses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    text_value TEXT,
    number_value REAL,
    choice_ids_json TEXT,
    file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    UNIQUE(participant_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_responses_session ON student_responses(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_responses_question ON student_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_participant ON student_responses(participant_id, question_id);

CREATE TABLE IF NOT EXISTS classroom_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    participant_id TEXT,
    target_participant_id TEXT,
    content_json TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_events_session ON classroom_events(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_documents (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    document_type TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    extraction_status TEXT NOT NULL,
    graph_status TEXT NOT NULL,
    graph_error TEXT,
    graph_json TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_documents_teacher ON learning_documents(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_documents_session ON learning_documents(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_pages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    title TEXT,
    text_content TEXT,
    char_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(document_id, page_number)
);
CREATE INDEX IF NOT EXISTS idx_document_pages_document ON document_pages(document_id, page_number);

CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    UNIQUE(page_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id, page_id, chunk_index);

CREATE TABLE IF NOT EXISTS session_presentation_state (
    session_id TEXT PRIMARY KEY REFERENCES class_sessions(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presentation_document ON session_presentation_state(document_id);

CREATE TABLE IF NOT EXISTS page_feedback (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES learning_documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    participant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    UNIQUE(session_id, document_id, page_number, participant_id, category)
);
CREATE INDEX IF NOT EXISTS idx_page_feedback_session_page
    ON page_feedback(session_id, document_id, page_number, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_diagnoses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES learning_documents(id) ON DELETE SET NULL,
    page_number INTEGER,
    provider TEXT NOT NULL,
    model TEXT,
    status TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT,
    error TEXT,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_diagnoses_session
    ON agent_diagnoses(session_id, created_at DESC);

-- Product Agent audit trail shared by student tutor, teacher intervention and
-- future product flows. It intentionally stores anonymous actor roles only.
CREATE TABLE IF NOT EXISTS agent_product_runs (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    flow TEXT NOT NULL,
    agent_name TEXT,
    agent_version TEXT,
    status TEXT NOT NULL,
    mode TEXT,
    input_json TEXT NOT NULL,
    output_json TEXT,
    retrieval_json TEXT,
    citations_json TEXT,
    venture_run_id TEXT,
    error TEXT,
    duration_ms REAL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_product_runs_created
    ON agent_product_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_product_runs_session
    ON agent_product_runs(session_id, created_at DESC);

-- 验收基线运行留痕：与课堂页面诊断 agent_diagnoses 分离，专门保存
-- T1/T2/T3 首次运行及后续复现记录。该表只记录运行证据，不改变 Agent 行为。
CREATE TABLE IF NOT EXISTS agent_baseline_runs (
    id TEXT PRIMARY KEY,
    flow TEXT NOT NULL CHECK(flow IN ('T1','T2','T3')),
    agent_name TEXT NOT NULL,
    agent_version TEXT NOT NULL,
    model TEXT,
    prompt_version TEXT NOT NULL,
    knowledge_base_version TEXT,
    tool_config_json TEXT,
    input_json TEXT NOT NULL,
    output_json TEXT,
    status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
    error TEXT,
    manual_intervention_json TEXT,
    raw_log_path TEXT,
    started_at REAL NOT NULL,
    finished_at REAL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_baseline_runs_flow
    ON agent_baseline_runs(flow, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_baseline_runs_status
    ON agent_baseline_runs(status, started_at DESC);
"""


def init_database() -> None:
    with connect() as connection:
        connection.executescript(SCHEMA)
        seed_demo_data(connection)
        ensure_admin_user(connection)
        # Earlier prototypes offered an option-reservation question type. In a
        # classroom poll every learner must be able to choose independently, so
        # keep existing data compatible by treating it as an ordinary single choice.
        connection.execute("UPDATE questions SET type='single_choice' WHERE type='single_choice_unique'")
        connection.commit()


def ensure_admin_user(connection: sqlite3.Connection) -> None:
    """Create the local read-only administrator without changing an existing account."""
    email = os.getenv("CLASSLOOP_ADMIN_EMAIL", "admin@classloop.local").strip().lower()
    password = os.getenv("CLASSLOOP_ADMIN_PASSWORD", "classloop-admin")
    if connection.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return
    connection.execute(
        "INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(?,?,?,?,?,?)",
        ("user_local_admin", email, hash_password(password), "系统管理员", "admin", time.time() * 1000),
    )
    connection.commit()


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def seed_demo_data(connection: sqlite3.Connection) -> None:
    if connection.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        return

    now = time.time() * 1000
    user_id = "user_demo_teacher"
    session_id = "session_avl_demo"
    connection.execute(
        "INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(?,?,?,?,?,?)",
        (user_id, "teacher@classloop.local", hash_password("classloop123"), "演示教师", "teacher", now),
    )
    connection.execute(
        "INSERT INTO courses(id,title,code,teacher_id,created_at) VALUES(?,?,?,?,?)",
        ("course_data_structures", "数据结构", "DS", user_id, now + 100),
    )
    connection.execute(
        "INSERT INTO lessons(id,course_id,title,chapter,knowledge_point,lesson_number,created_at) VALUES(?,?,?,?,?,?,?)",
        ("lesson_avl", "course_data_structures", "Lesson 05 · AVL 树", "树 / BST / AVL", "树高与查找复杂度", 5, now + 200),
    )
    connection.execute(
        """INSERT INTO class_sessions(
            id,lesson_id,teacher_id,title,description,is_active,session_code,results_public,
            completion_title,completion_subtitle,completion_description,bg_color,accent_color,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            session_id,
            "lesson_avl",
            user_id,
            "数据结构 · Lesson 05 · AVL 树",
            "初测 → 共性误区 → 教学干预 → 变式复测",
            1,
            "240805",
            1,
            "本轮 Micro Check 已完成",
            "请等待教师讲解与变式复测",
            "你可以回看答案，也可以继续向 AI Tutor 提问。",
            "#f8fafc",
            "#2563eb",
            now + 300,
        ),
    )

    questions = [
        (
            "element_bst_complexity",
            "single_choice",
            "在最坏情况下，普通二叉搜索树（BST）的查找复杂度是多少？",
            "Micro Check 01 · 树高与查找复杂度",
            "假设结点按升序依次插入，树没有自动平衡。",
            0,
            [
                {"id": "q1_a", "text": "O(1)"},
                {"id": "q1_b", "text": "O(log n)"},
                {"id": "q1_c", "text": "O(n)", "isCorrect": True},
                {"id": "q1_d", "text": "O(n log n)"},
            ],
        ),
        (
            "element_avl_height",
            "single_choice",
            "为什么 AVL 树能够保证查找复杂度为 O(log n)？",
            "Micro Check 02 · 平衡约束",
            None,
            1,
            [
                {"id": "q2_a", "text": "所有键值都会重新排序"},
                {"id": "q2_b", "text": "左右子树高度差受限，使树高保持 O(log n)", "isCorrect": True},
                {"id": "q2_c", "text": "AVL 树不需要比较键值"},
                {"id": "q2_d", "text": "每个结点最多只有一个孩子"},
            ],
        ),
        (
            "element_avl_mechanism",
            "multiple_choice",
            "AVL 树在插入后可能使用哪些操作恢复平衡？",
            "Micro Check 03 · 旋转机制",
            None,
            2,
            [
                {"id": "q3_a", "text": "单旋", "isCorrect": True},
                {"id": "q3_b", "text": "双旋", "isCorrect": True},
                {"id": "q3_c", "text": "删除所有叶子"},
                {"id": "q3_d", "text": "把树转换为链表"},
            ],
        ),
        (
            "element_explain",
            "text_input",
            "请用一句话说明“BST 不一定总是 O(log n)”的原因。",
            "开放回答 · 误区证据",
            None,
            3,
            None,
        ),
    ]
    for offset, (question_id, qtype, title, subtitle, description, order, choices) in enumerate(questions):
        connection.execute(
            """INSERT INTO questions(
                id,session_id,type,title,subtitle,description,display_order,is_active,choices_json,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (question_id, session_id, qtype, title, subtitle, description, order, 1, _json(choices) if choices else None, now + 1000 + offset),
        )

    demo_answers = [
        ("student_01", "q1_b", "q2_b", ["q3_a", "q3_b"], "BST 退化成链表时树高会达到 n。"),
        ("student_02", "q1_b", "q2_a", ["q3_a"], "我原来以为二叉搜索树都会自动平衡。"),
        ("student_03", "q1_c", "q2_b", ["q3_a", "q3_b"], "查找复杂度取决于树高，极端情况下高度是 n。"),
        ("student_04", "q1_b", "q2_d", ["q3_b"], "不清楚树高和查找有什么关系。"),
        ("student_05", "q1_c", "q2_b", ["q3_a", "q3_b"], "插入顺序可能让 BST 失去平衡。"),
    ]
    response_number = 0
    for participant, answer1, answer2, answer3, answer4 in demo_answers:
        for question_id, payload in (
            ("element_bst_complexity", {"choices": [answer1]}),
            ("element_avl_height", {"choices": [answer2]}),
            ("element_avl_mechanism", {"choices": answer3}),
            ("element_explain", {"text": answer4}),
        ):
            response_number += 1
            created = now + 5000 + response_number
            connection.execute(
                """INSERT INTO student_responses(
                    id,session_id,question_id,participant_id,text_value,choice_ids_json,created_at,updated_at
                ) VALUES(?,?,?,?,?,?,?,?)""",
                (
                    f"response_seed_{response_number}",
                    session_id,
                    question_id,
                    participant,
                    payload.get("text"),
                    _json(payload.get("choices")) if payload.get("choices") else None,
                    created,
                    created,
                ),
            )

    connection.commit()
