from __future__ import annotations

import asyncio
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .database import connect, database_path, init_database
from .document_graph import build_document_graph, extract_document, neo4j_store
from .security import hash_password, hash_token, new_token, verify_password


LIVE_PARTICIPANT_TTL_MS = 10 * 60 * 1000
LIVE_PARTICIPANTS: dict[tuple[str, str], dict[str, Any]] = {}
LIVE_PARTICIPANTS_LOCK = Lock()
SESSION_EVENT_SUBSCRIBERS: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}
SESSION_EVENT_SUBSCRIBERS_LOCK = Lock()
PUBLIC_AGENT_REQUESTS: dict[tuple[str, str], list[float]] = {}
PUBLIC_AGENT_REQUESTS_LOCK = Lock()


def now_ms() -> float:
    return time.time() * 1000


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4()}"


def enforce_public_agent_rate_limit(session_id: str, participant_id: str) -> None:
    """Protect the paid model endpoint: at most eight learner calls per minute."""
    current = time.time()
    key = (session_id, participant_id)
    with PUBLIC_AGENT_REQUESTS_LOCK:
        recent = [value for value in PUBLIC_AGENT_REQUESTS.get(key, []) if current - value < 60]
        if len(recent) >= 8:
            raise HTTPException(status_code=429, detail="AI 追问过于频繁，请一分钟后再试")
        recent.append(current)
        PUBLIC_AGENT_REQUESTS[key] = recent


async def publish_session_event(session_id: str, event_type: str, data: dict[str, Any] | None = None) -> None:
    event = {
        "id": make_id("event"),
        "type": event_type,
        "sessionId": session_id,
        "createdAt": now_ms(),
        "data": data or {},
    }
    with SESSION_EVENT_SUBSCRIBERS_LOCK:
        subscribers = list(SESSION_EVENT_SUBSCRIBERS.get(session_id, set()))
    for queue in subscribers:
        if queue.full():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        queue.put_nowait(event)


def decode_json(value: str | None, default: Any = None) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def encode_json(value: Any) -> str | None:
    return None if value is None else json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def file_url(file_id: str | None) -> str | None:
    return f"/api/files/{file_id}" if file_id else None


def serialize_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "_id": row["id"],
        "_creationTime": row["created_at"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
    }


def serialize_session(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "_id": row["id"],
        "_creationTime": row["created_at"],
        "title": row["title"],
        "description": row["description"],
        "teacherId": row["teacher_id"],
        "isActive": bool(row["is_active"]),
        "sessionCode": row["session_code"],
        "resultsPublic": bool(row["results_public"]),
        "resultsPinCode": row["results_pin_code"],
        "completionTitle": row["completion_title"],
        "completionSubtitle": row["completion_subtitle"],
        "completionDescription": row["completion_description"],
        "completionImageId": row["completion_image_id"],
        "completionImageUrl": file_url(row["completion_image_id"]),
        "bgColor": row["bg_color"],
        "accentColor": row["accent_color"],
    }


def serialize_question(row: sqlite3.Row) -> dict[str, Any]:
    choices = decode_json(row["choices_json"], None)
    if choices:
        choices = [{**choice, "imageUrl": file_url(choice.get("imageId"))} for choice in choices]
    return {
        "_id": row["id"],
        "_creationTime": row["created_at"],
        "sessionId": row["session_id"],
        "type": row["type"],
        "title": row["title"],
        "subtitle": row["subtitle"],
        "description": row["description"],
        "imageId": row["image_id"],
        "imageUrl": file_url(row["image_id"]),
        "order": row["display_order"],
        "isActive": bool(row["is_active"]),
        "choices": choices,
        "minValue": row["min_value"],
        "maxValue": row["max_value"],
        "step": row["step"],
        "conditionalLogic": decode_json(row["conditional_logic_json"], None),
    }


def serialize_response(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "_id": row["id"],
        "_creationTime": row["created_at"],
        "sessionId": row["session_id"],
        "elementId": row["question_id"],
        "participantId": row["participant_id"],
        "textValue": row["text_value"],
        "numberValue": row["number_value"],
        "choiceIds": decode_json(row["choice_ids_json"], None),
        "fileId": row["file_id"],
        "fileUrl": file_url(row["file_id"]),
        "fileContentType": row["file_content_type"] if "file_content_type" in row.keys() else None,
    }


def serialize_learning_document(row: sqlite3.Row) -> dict[str, Any]:
    graph = decode_json(row["graph_json"], {})
    return {
        "_id": row["id"],
        "_creationTime": row["created_at"],
        "sessionId": row["session_id"],
        "fileId": row["file_id"],
        "fileUrl": file_url(row["file_id"]),
        "filename": row["filename"],
        "documentType": row["document_type"],
        "mimeType": row["mime_type"],
        "size": row["size"],
        "pageCount": row["page_count"],
        "extractionStatus": row["extraction_status"],
        "graphStatus": row["graph_status"],
        "graphError": row["graph_error"],
        "graphStats": graph.get("stats", {}),
        "updatedAt": row["updated_at"],
    }


def presentation_state(connection: sqlite3.Connection, session_id: str) -> dict[str, Any] | None:
    row = connection.execute(
        """SELECT state.session_id,state.document_id,state.page_number,state.updated_at,
                  document.filename,document.file_id,document.page_count,document.document_type,
                  page.title AS page_title,page.text_content
           FROM session_presentation_state state
           JOIN learning_documents document ON document.id=state.document_id
           JOIN document_pages page ON page.document_id=state.document_id
                                   AND page.page_number=state.page_number
           WHERE state.session_id=?""",
        (session_id,),
    ).fetchone()
    if not row:
        return None
    return {
        "sessionId": row["session_id"],
        "documentId": row["document_id"],
        "filename": row["filename"],
        "fileId": row["file_id"],
        "fileUrl": file_url(row["file_id"]),
        "documentType": row["document_type"],
        "pageNumber": row["page_number"],
        "pageCount": row["page_count"],
        "pageTitle": row["page_title"],
        "pageText": row["text_content"] or "",
        "updatedAt": row["updated_at"],
    }


def venture_agent_settings() -> dict[str, Any]:
    base_url = os.getenv("CLASSLOOP_AGENT_BASE_URL", "").strip().rstrip("/")
    return {
        "configured": bool(base_url),
        "provider": "VentureAgent HTTP Adapter",
        "baseUrl": base_url,
        "model": os.getenv("CLASSLOOP_AGENT_MODEL", "external-configured-model").strip(),
        "timeoutSeconds": max(5, min(int(os.getenv("CLASSLOOP_AGENT_TIMEOUT_SECONDS", "45")), 120)),
    }


def call_venture_agent(message: str, session_id: str, agent: str = "project_coach") -> dict[str, Any]:
    settings = venture_agent_settings()
    if not settings["configured"]:
        raise RuntimeError("尚未配置 CLASSLOOP_AGENT_BASE_URL")
    payload = json.dumps(
        {
            "message": message,
            "session_id": session_id,
            "agent": agent,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib_request.Request(
        f"{settings['baseUrl']}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(request, timeout=settings["timeoutSeconds"]) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"VentureAgent 返回 HTTP {error.code}：{detail}") from error
    except (urllib_error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"无法调用 VentureAgent：{error}") from error
    if not isinstance(result, dict) or not str(result.get("reply", "")).strip():
        raise RuntimeError("VentureAgent 返回格式不完整")
    return result


def call_venture_acceptance(payload_value: dict[str, Any]) -> dict[str, Any]:
    """Call VentureAgent's versioned acceptance API without changing legacy chat."""
    settings = venture_agent_settings()
    if not settings["configured"]:
        raise RuntimeError("尚未配置 CLASSLOOP_AGENT_BASE_URL；请使用根目录 start_classloop.ps1 -Mode Full 启动")
    body = json.dumps(payload_value, ensure_ascii=False).encode("utf-8")
    upstream_request = urllib_request.Request(
        f"{settings['baseUrl']}/api/acceptance/run",
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(upstream_request, timeout=settings["timeoutSeconds"]) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"VentureAgent 验收接口返回 HTTP {error.code}：{detail}") from error
    except (urllib_error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"无法连接 VentureAgent 验收接口：{error}") from error
    if not isinstance(result, dict) or not result.get("runId"):
        raise RuntimeError("VentureAgent 验收接口返回格式不完整")
    return result


def presentation_evidence(connection: sqlite3.Connection, state: dict[str, Any], include_neighbors: bool = True) -> list[dict[str, Any]]:
    """Build source-locatable evidence from parsed slide chunks, never student identity."""
    page_number = int(state["pageNumber"])
    lower = max(1, page_number - 1) if include_neighbors else page_number
    upper = page_number + 1 if include_neighbors else page_number
    rows = connection.execute(
        """SELECT p.page_number,p.title AS page_title,c.chunk_index,c.text_content
           FROM document_pages p LEFT JOIN document_chunks c ON c.page_id=p.id
           WHERE p.document_id=? AND p.page_number BETWEEN ? AND ?
           ORDER BY ABS(p.page_number-?),p.page_number,c.chunk_index LIMIT 24""",
        (state["documentId"], lower, upper, page_number),
    ).fetchall()
    items = [
        {
            "id": f"page-{row['page_number']}-chunk-{row['chunk_index'] or 0}",
            "title": f"{state['filename']} 第 {row['page_number']} 页：{row['page_title'] or '未命名页'}",
            "content": row["text_content"] or "",
            "sourceType": "courseware_chunk",
            "locator": f"{state['filename']} / 第 {row['page_number']} 页 / 文本块 {row['chunk_index'] or 0}",
        }
        for row in rows
        if str(row["text_content"] or "").strip()
    ]
    if not items and str(state.get("pageText", "")).strip():
        items.append(
            {
                "id": f"page-{page_number}",
                "title": f"{state['filename']} 第 {page_number} 页",
                "content": str(state["pageText"])[:8000],
                "sourceType": "courseware_page",
                "locator": f"{state['filename']} / 第 {page_number} 页",
            }
        )
    return items


def save_product_agent_run(
    *,
    session_id: str | None,
    actor_role: str,
    flow: str,
    request_input: dict[str, Any],
    result: dict[str, Any] | None,
    error: str | None = None,
) -> str:
    """Persist an anonymous, reviewer-readable trace for product Agent calls."""
    local_id = make_id("agent_run")
    with connect() as connection:
        connection.execute(
            """INSERT INTO agent_product_runs(
                   id,session_id,actor_role,flow,agent_name,agent_version,status,mode,input_json,
                   output_json,retrieval_json,citations_json,venture_run_id,error,duration_ms,created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                local_id,
                session_id,
                actor_role,
                flow,
                (result or {}).get("agent"),
                (result or {}).get("version"),
                (result or {}).get("status", "failed"),
                (result or {}).get("mode"),
                encode_json(request_input),
                encode_json({
                    "reply": (result or {}).get("reply"),
                    "validation": (result or {}).get("validation"),
                    "performance": (result or {}).get("performance", {}),
                }),
                encode_json((result or {}).get("retrieval", {})),
                encode_json((result or {}).get("citations", [])),
                (result or {}).get("runId"),
                error or (result or {}).get("error"),
                (result or {}).get("durationMs"),
                now_ms(),
            ),
        )
    return local_id


def create_access_token(connection: sqlite3.Connection, user_id: str) -> str:
    token = new_token()
    ttl_hours = int(os.getenv("CLASSLOOP_TOKEN_TTL_HOURS", "168"))
    connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now_ms(),))
    connection.execute(
        "INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
        (hash_token(token), user_id, now_ms() + ttl_hours * 3_600_000, now_ms()),
    )
    return token


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录教师账号")
    raw_token = authorization.split(" ", 1)[1].strip()
    with connect() as connection:
        row = connection.execute(
            """SELECT u.* FROM auth_sessions a
               JOIN users u ON u.id = a.user_id
               WHERE a.token_hash = ? AND a.expires_at > ?""",
            (hash_token(raw_token), now_ms()),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效，请重新登录")
    return serialize_user(row)


def optional_user(authorization: str | None = Header(default=None)) -> dict[str, Any] | None:
    if not authorization:
        return None
    try:
        return current_user(authorization)
    except HTTPException:
        return None


def admin_user(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="仅管理员可以访问数据库视图")
    return user


def baseline_agent_metadata(payload: dict[str, Any], flow: str) -> dict[str, Any]:
    """Return explicit, reproducible metadata for a baseline run.

    Defaults are deliberately visible and are stored with every run so a later
    V2 change cannot be mistaken for the original baseline.
    """
    agent_by_flow = {"T1": "learning_tutor", "T2": "project_coach", "T3": "project_reviewer"}
    return {
        "flow": flow,
        "agent": str(payload.get("agent") or agent_by_flow[flow]).strip(),
        "agentVersion": str(payload.get("agentVersion") or os.getenv("CLASSLOOP_AGENT_VERSION", "v1-baseline")).strip(),
        "model": str(payload.get("model") or os.getenv("CLASSLOOP_AGENT_MODEL", "external-configured-model")).strip(),
        "promptVersion": str(payload.get("promptVersion") or "baseline-v1").strip(),
        "knowledgeBaseVersion": str(payload.get("knowledgeBaseVersion") or "未指定").strip(),
        "toolConfig": payload.get("toolConfig") or {"provider": "VentureAgent HTTP Adapter", "endpoint": "/api/chat"},
    }


def clean_live_participants() -> None:
    cutoff = now_ms() - LIVE_PARTICIPANT_TTL_MS
    with LIVE_PARTICIPANTS_LOCK:
        expired = [key for key, value in LIVE_PARTICIPANTS.items() if value["lastSeen"] < cutoff]
        for key in expired:
            LIVE_PARTICIPANTS.pop(key, None)


def live_participants_for_session(session_id: str) -> dict[str, dict[str, Any]]:
    clean_live_participants()
    with LIVE_PARTICIPANTS_LOCK:
        return {
            participant_id: dict(value)
            for (stored_session_id, participant_id), value in LIVE_PARTICIPANTS.items()
            if stored_session_id == session_id
        }


def owned_session(connection: sqlite3.Connection, session_id: str, user_id: str) -> sqlite3.Row:
    row = connection.execute(
        "SELECT * FROM class_sessions WHERE id=? AND teacher_id=?", (session_id, user_id)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="课堂不存在或无权操作")
    return row


def owned_question(connection: sqlite3.Connection, question_id: str, user_id: str) -> sqlite3.Row:
    row = connection.execute(
        """SELECT q.* FROM questions q JOIN class_sessions s ON s.id=q.session_id
           WHERE q.id=? AND s.teacher_id=?""",
        (question_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="题目不存在或无权操作")
    return row


def unique_session_code(connection: sqlite3.Connection) -> str:
    for _ in range(30):
        code = str(secrets.randbelow(900_000) + 100_000)
        if not connection.execute("SELECT 1 FROM class_sessions WHERE session_code=?", (code,)).fetchone():
            return code
    raise HTTPException(status_code=503, detail="暂时无法生成课堂码，请重试")


def question_values(payload: dict[str, Any]) -> tuple[Any, ...]:
    question_type = payload.get("type", "text_input")
    if question_type == "single_choice_unique":
        question_type = "single_choice"
    return (
        question_type,
        payload.get("title", "未命名题目"),
        payload.get("subtitle"),
        payload.get("description"),
        payload.get("imageId"),
        1 if payload.get("isActive", True) else 0,
        encode_json(payload.get("choices")),
        payload.get("minValue"),
        payload.get("maxValue"),
        payload.get("step"),
        encode_json(payload.get("conditionalLogic")),
    )


def condition_matches(logic: dict[str, Any] | None, response: sqlite3.Row | None) -> bool:
    if not logic or not logic.get("enabled"):
        return True
    if response is None:
        return False
    expected = logic.get("value")
    condition = logic.get("condition")
    choices = decode_json(response["choice_ids_json"], [])
    actual = response["text_value"]
    if condition == "equals":
        return str(actual) == str(expected)
    if condition == "not_equals":
        return str(actual) != str(expected)
    if condition == "contains":
        return str(expected or "").lower() in str(actual or "").lower()
    if condition == "greater_than":
        return response["number_value"] is not None and response["number_value"] > float(expected)
    if condition == "less_than":
        return response["number_value"] is not None and response["number_value"] < float(expected)
    if condition == "choice_selected":
        return expected in choices
    if condition == "choice_not_selected":
        return expected not in choices
    return False


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    yield


app = FastAPI(title="ClassLoop API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "ClassLoop API", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
def health() -> dict[str, Any]:
    with connect() as connection:
        connection.execute("SELECT 1").fetchone()
    return {"status": "ok", "database": "sqlite", "path": str(database_path())}


@app.get("/api/acceptance/status")
def acceptance_status() -> dict[str, Any]:
    settings = venture_agent_settings()
    reachable = False
    upstream_version = None
    error_text = None
    if settings["configured"]:
        try:
            with urllib_request.urlopen(f"{settings['baseUrl']}/api/acceptance/meta", timeout=2) as response:
                meta = json.loads(response.read().decode("utf-8"))
            reachable = isinstance(meta, dict) and bool(meta.get("version"))
            upstream_version = meta.get("version") if isinstance(meta, dict) else None
        except (urllib_error.URLError, urllib_error.HTTPError, TimeoutError, json.JSONDecodeError) as error:
            error_text = f"{type(error).__name__}: {str(error)[:180]}"
    return {
        "configured": settings["configured"],
        "reachable": reachable,
        "provider": settings["provider"],
        "model": settings["model"],
        "version": upstream_version or "classloop-agent-v2.2-evidence-rag",
        "error": error_text,
        "message": (
            "VentureAgent 已连接，可运行 F1/F2/F3/F4 与证据检索"
            if reachable
            else "VentureAgent 地址已配置但服务未连接，请使用完整模式重启"
            if settings["configured"]
            else "尚未配置 VentureAgent，请使用 start_classloop.ps1 -Mode Full 启动"
        ),
    }


@app.post("/api/acceptance/run")
async def proxy_acceptance_run(request: Request) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="请求体必须是 JSON 对象")
    flow = str(payload.get("flow", "")).upper()
    if flow not in {"F1", "F2", "F3", "F4"}:
        raise HTTPException(status_code=422, detail="flow 必须是 F1、F2、F3 或 F4")
    user_input = str(payload.get("input", "")).strip()
    if len(user_input) < 6:
        raise HTTPException(status_code=422, detail="测试输入至少需要 6 个字符")
    standard = str(payload.get("standard", "internet_plus"))
    if standard not in {"challenge_cup", "internet_plus"}:
        raise HTTPException(status_code=422, detail="standard 必须是 challenge_cup 或 internet_plus")
    forwarded = {
        "flow": flow,
        "input": user_input,
        "standard": standard,
        "prefer_live_model": bool(payload.get("prefer_live_model", True)),
        "evidence_items": payload.get("evidence_items", []),
        "top_k": payload.get("top_k", 3),
        "use_cache": bool(payload.get("use_cache", True)),
    }
    try:
        return await asyncio.to_thread(call_venture_acceptance, forwarded)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/auth/register", status_code=201)
async def register(request: Request) -> dict[str, Any]:
    payload = await request.json()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    name = str(payload.get("name", "")).strip() or email.split("@", 1)[0]
    if "@" not in email:
        raise HTTPException(status_code=422, detail="请输入有效邮箱")
    if len(password) < 6:
        raise HTTPException(status_code=422, detail="密码至少需要 6 个字符")
    user_id = make_id("user")
    with connect() as connection:
        try:
            connection.execute(
                "INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(?,?,?,?,?,?)",
                (user_id, email, hash_password(password), name, "teacher", now_ms()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="该邮箱已经注册") from None
        token = create_access_token(connection, user_id)
        row = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(row)}


@app.post("/api/auth/login")
async def login(request: Request) -> dict[str, Any]:
    payload = await request.json()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="邮箱或密码错误")
        token = create_access_token(connection, row["id"])
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(row)}


@app.post("/api/auth/anonymous", status_code=201)
def anonymous() -> dict[str, Any]:
    user_id = make_id("user")
    random_password = secrets.token_urlsafe(24)
    with connect() as connection:
        connection.execute(
            "INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(?,?,?,?,?,?)",
            (user_id, f"{user_id}@temporary.local", hash_password(random_password), "临时教师", "teacher", now_ms()),
        )
        token = create_access_token(connection, user_id)
        row = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(row)}


@app.get("/api/auth/me")
def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return user


@app.post("/api/auth/logout", status_code=204)
def logout(authorization: str | None = Header(default=None)) -> Response:
    if authorization and authorization.lower().startswith("bearer "):
        with connect() as connection:
            connection.execute("DELETE FROM auth_sessions WHERE token_hash=?", (hash_token(authorization.split(" ", 1)[1]),))
    return Response(status_code=204)


@app.get("/api/sessions")
def list_sessions(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM class_sessions WHERE teacher_id=? ORDER BY created_at DESC", (user["_id"],)
        ).fetchall()
    return [serialize_session(row) for row in rows]


@app.post("/api/sessions", status_code=201)
async def create_session(request: Request, user: dict[str, Any] = Depends(current_user)) -> str:
    payload = await request.json()
    session_id = make_id("session")
    with connect() as connection:
        code = unique_session_code(connection)
        connection.execute(
            """INSERT INTO class_sessions(
                id,teacher_id,title,description,is_active,session_code,results_public,results_pin_code,
                completion_title,completion_subtitle,completion_description,completion_image_id,bg_color,accent_color,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                session_id, user["_id"], payload.get("title", "未命名课堂"), payload.get("description"),
                1, code, 1 if payload.get("resultsPublic", True) else 0, payload.get("resultsPinCode"),
                payload.get("completionTitle"), payload.get("completionSubtitle"), payload.get("completionDescription"),
                payload.get("completionImageId"), payload.get("bgColor", "#f8fafc"), payload.get("accentColor", "#2563eb"), now_ms(),
            ),
        )
    return session_id


@app.patch("/api/sessions/{session_id}", status_code=204)
async def update_session(session_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> Response:
    payload = await request.json()
    mapping = {
        "title": "title", "description": "description", "isActive": "is_active",
        "resultsPublic": "results_public", "resultsPinCode": "results_pin_code",
        "completionTitle": "completion_title", "completionSubtitle": "completion_subtitle",
        "completionDescription": "completion_description", "completionImageId": "completion_image_id",
        "bgColor": "bg_color", "accentColor": "accent_color",
    }
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        updates: list[str] = []
        values: list[Any] = []
        for key, column in mapping.items():
            if key in payload:
                updates.append(f"{column}=?")
                value = payload[key]
                if key in {"isActive", "resultsPublic"}:
                    value = 1 if value else 0
                values.append(value)
        if updates:
            connection.execute(f"UPDATE class_sessions SET {', '.join(updates)} WHERE id=?", (*values, session_id))
    return Response(status_code=204)


@app.post("/api/sessions/{session_id}/toggle", status_code=204)
async def toggle_session(session_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> Response:
    payload = await request.json()
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        connection.execute("UPDATE class_sessions SET is_active=? WHERE id=?", (1 if payload.get("isActive") else 0, session_id))
    return Response(status_code=204)


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, user: dict[str, Any] = Depends(current_user)) -> Response:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        connection.execute("DELETE FROM class_sessions WHERE id=?", (session_id,))
    return Response(status_code=204)


@app.post("/api/sessions/{session_id}/clone", status_code=201)
def clone_session(session_id: str, user: dict[str, Any] = Depends(current_user)) -> str:
    new_session_id = make_id("session")
    with connect() as connection:
        source = owned_session(connection, session_id, user["_id"])
        code = unique_session_code(connection)
        connection.execute(
            """INSERT INTO class_sessions(
                id,lesson_id,teacher_id,title,description,is_active,session_code,results_public,results_pin_code,
                completion_title,completion_subtitle,completion_description,completion_image_id,bg_color,accent_color,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                new_session_id, source["lesson_id"], user["_id"], f"{source['title']}（副本）", source["description"],
                0, code, source["results_public"], source["results_pin_code"], source["completion_title"],
                source["completion_subtitle"], source["completion_description"], source["completion_image_id"],
                source["bg_color"], source["accent_color"], now_ms(),
            ),
        )
        questions = connection.execute("SELECT * FROM questions WHERE session_id=? ORDER BY display_order", (session_id,)).fetchall()
        for question in questions:
            connection.execute(
                """INSERT INTO questions(id,session_id,type,title,subtitle,description,image_id,display_order,is_active,
                   choices_json,min_value,max_value,step,conditional_logic_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    make_id("element"), new_session_id, question["type"], question["title"], question["subtitle"],
                    question["description"], question["image_id"], question["display_order"], question["is_active"],
                    question["choices_json"], question["min_value"], question["max_value"], question["step"], None, now_ms(),
                ),
            )
    return new_session_id


@app.get("/api/public/sessions/by-code/{session_code}")
def session_by_code(session_code: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute("SELECT * FROM class_sessions WHERE session_code=?", (session_code,)).fetchone()
    return serialize_session(row) if row else None


@app.get("/api/public/sessions/{session_id}/events")
async def session_event_stream(session_id: str, request: Request) -> StreamingResponse:
    with connect() as connection:
        if not connection.execute("SELECT 1 FROM class_sessions WHERE id=?", (session_id,)).fetchone():
            raise HTTPException(status_code=404, detail="课堂不存在")

    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
    with SESSION_EVENT_SUBSCRIBERS_LOCK:
        SESSION_EVENT_SUBSCRIBERS.setdefault(session_id, set()).add(queue)

    async def event_generator():
        try:
            connected = {
                "id": make_id("event"),
                "type": "stream.connected",
                "sessionId": session_id,
                "createdAt": now_ms(),
                "data": {},
            }
            yield f"retry: 2000\ndata: {json.dumps(connected, ensure_ascii=False)}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                except TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            with SESSION_EVENT_SUBSCRIBERS_LOCK:
                subscribers = SESSION_EVENT_SUBSCRIBERS.get(session_id)
                if subscribers:
                    subscribers.discard(queue)
                    if not subscribers:
                        SESSION_EVENT_SUBSCRIBERS.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/public/sessions/{session_id}/participants/register", status_code=204)
async def register_live_participant(session_id: str, request: Request) -> Response:
    payload = await request.json()
    participant_id = str(payload.get("participantId", "")).strip()
    display_name = str(payload.get("displayName", "")).strip()
    avatar = str(payload.get("avatar", "🙂")).strip()[:8] or "🙂"
    avatar_name = str(payload.get("avatarName", "默认角色")).strip()[:20] or "默认角色"
    if not participant_id:
        raise HTTPException(status_code=422, detail="缺少临时参与者标识")
    if not 1 <= len(display_name) <= 16:
        raise HTTPException(status_code=422, detail="用户名需要 1–16 个字符")
    with connect() as connection:
        session = connection.execute("SELECT is_active FROM class_sessions WHERE id=?", (session_id,)).fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="课堂不存在")
    if not session["is_active"]:
        raise HTTPException(status_code=409, detail="课堂当前未开放")
    timestamp = now_ms()
    with LIVE_PARTICIPANTS_LOCK:
        existing = LIVE_PARTICIPANTS.get((session_id, participant_id))
        LIVE_PARTICIPANTS[(session_id, participant_id)] = {
            "displayName": display_name,
            "avatar": avatar,
            "avatarName": avatar_name,
            "joinedAt": existing["joinedAt"] if existing else timestamp,
            "lastSeen": timestamp,
        }
    await publish_session_event(session_id, "participant.updated", {"participantId": participant_id})
    return Response(status_code=204)


@app.post("/api/public/sessions/{session_id}/participants/{participant_id}/leave", status_code=204)
async def leave_live_participant(session_id: str, participant_id: str) -> Response:
    with LIVE_PARTICIPANTS_LOCK:
        LIVE_PARTICIPANTS.pop((session_id, participant_id), None)
    await publish_session_event(session_id, "participant.left", {"participantId": participant_id})
    return Response(status_code=204)


@app.post("/api/public/sessions/verify-results")
async def verify_results(request: Request) -> dict[str, Any]:
    payload = await request.json()
    with connect() as connection:
        row = connection.execute("SELECT * FROM class_sessions WHERE session_code=?", (payload.get("sessionCode"),)).fetchone()
    if not row:
        return {"success": False, "error": "Session not found"}
    if row["results_public"]:
        return {"success": True}
    if not payload.get("pinCode"):
        return {"success": False, "error": "Pin code required"}
    return {"success": row["results_pin_code"] == payload.get("pinCode"), "error": None if row["results_pin_code"] == payload.get("pinCode") else "Invalid pin code"}


@app.get("/api/sessions/{session_id}/questions")
def list_questions(session_id: str, user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        rows = connection.execute("SELECT * FROM questions WHERE session_id=? ORDER BY display_order", (session_id,)).fetchall()
    return [serialize_question(row) for row in rows]


@app.get("/api/public/sessions/{session_id}/questions")
def visible_questions(session_id: str, participant_id: str = Query(...)) -> list[dict[str, Any]]:
    with connect() as connection:
        session = connection.execute("SELECT * FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="课堂不存在")
        questions = connection.execute(
            "SELECT * FROM questions WHERE session_id=? AND is_active=1 ORDER BY display_order", (session_id,)
        ).fetchall()
        responses = connection.execute(
            "SELECT * FROM student_responses WHERE session_id=? AND participant_id=?", (session_id, participant_id)
        ).fetchall()
    by_question = {row["question_id"]: row for row in responses}
    visible = []
    for row in questions:
        logic = decode_json(row["conditional_logic_json"], None)
        dependency = logic.get("dependsOnElementId") if logic else None
        if condition_matches(logic, by_question.get(dependency)):
            visible.append(serialize_question(row))
    return visible


@app.get("/api/public/sessions/{session_id}/all-questions")
def public_questions(session_id: str) -> list[dict[str, Any]]:
    with connect() as connection:
        if not connection.execute("SELECT 1 FROM class_sessions WHERE id=?", (session_id,)).fetchone():
            raise HTTPException(status_code=404, detail="课堂不存在")
        rows = connection.execute(
            "SELECT * FROM questions WHERE session_id=? ORDER BY display_order", (session_id,)
        ).fetchall()
    return [serialize_question(row) for row in rows]


@app.post("/api/sessions/{session_id}/questions", status_code=201)
async def create_question(session_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> str:
    payload = await request.json()
    question_id = make_id("element")
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        order = connection.execute("SELECT COALESCE(MAX(display_order),-1)+1 FROM questions WHERE session_id=?", (session_id,)).fetchone()[0]
        connection.execute(
            """INSERT INTO questions(id,session_id,type,title,subtitle,description,image_id,display_order,is_active,
               choices_json,min_value,max_value,step,conditional_logic_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (question_id, session_id, *question_values(payload)[:5], order, *question_values(payload)[5:], now_ms()),
        )
    return question_id


@app.patch("/api/questions/{question_id}", status_code=204)
async def update_question(question_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> Response:
    payload = await request.json()
    mapping = {
        "type": "type", "title": "title", "subtitle": "subtitle", "description": "description",
        "imageId": "image_id", "isActive": "is_active", "choices": "choices_json", "minValue": "min_value",
        "maxValue": "max_value", "step": "step", "conditionalLogic": "conditional_logic_json",
    }
    with connect() as connection:
        owned_question(connection, question_id, user["_id"])
        updates: list[str] = []
        values: list[Any] = []
        for key, column in mapping.items():
            if key in payload:
                value = payload[key]
                if key == "isActive": value = 1 if value else 0
                if key in {"choices", "conditionalLogic"}: value = encode_json(value)
                updates.append(f"{column}=?")
                values.append(value)
        if updates:
            connection.execute(f"UPDATE questions SET {', '.join(updates)} WHERE id=?", (*values, question_id))
    return Response(status_code=204)


@app.delete("/api/questions/{question_id}", status_code=204)
def delete_question(question_id: str, user: dict[str, Any] = Depends(current_user)) -> Response:
    with connect() as connection:
        question = owned_question(connection, question_id, user["_id"])
        connection.execute("DELETE FROM questions WHERE id=?", (question_id,))
        rows = connection.execute("SELECT id FROM questions WHERE session_id=? ORDER BY display_order", (question["session_id"],)).fetchall()
        for index, row in enumerate(rows):
            connection.execute("UPDATE questions SET display_order=? WHERE id=?", (index, row["id"]))
    return Response(status_code=204)


@app.post("/api/questions/{question_id}/duplicate", status_code=201)
def duplicate_question(question_id: str, user: dict[str, Any] = Depends(current_user)) -> str:
    new_id = make_id("element")
    with connect() as connection:
        source = owned_question(connection, question_id, user["_id"])
        order = connection.execute("SELECT COALESCE(MAX(display_order),-1)+1 FROM questions WHERE session_id=?", (source["session_id"],)).fetchone()[0]
        connection.execute(
            """INSERT INTO questions(id,session_id,type,title,subtitle,description,image_id,display_order,is_active,
               choices_json,min_value,max_value,step,conditional_logic_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (new_id, source["session_id"], source["type"], f"{source['title']}（副本）", source["subtitle"], source["description"],
             source["image_id"], order, source["is_active"], source["choices_json"], source["min_value"], source["max_value"],
             source["step"], None, now_ms()),
        )
    return new_id


@app.post("/api/questions/{question_id}/move")
async def move_question(question_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> bool:
    direction = (await request.json()).get("direction")
    with connect() as connection:
        question = owned_question(connection, question_id, user["_id"])
        siblings = connection.execute("SELECT id,display_order FROM questions WHERE session_id=? ORDER BY display_order", (question["session_id"],)).fetchall()
        index = next((i for i, row in enumerate(siblings) if row["id"] == question_id), -1)
        target = index - 1 if direction == "up" else index + 1
        if index < 0 or target < 0 or target >= len(siblings):
            return False
        connection.execute("UPDATE questions SET display_order=? WHERE id=?", (siblings[target]["display_order"], question_id))
        connection.execute("UPDATE questions SET display_order=? WHERE id=?", (siblings[index]["display_order"], siblings[target]["id"]))
    return True


@app.post("/api/sessions/{session_id}/questions/import", status_code=204)
async def import_questions(session_id: str, request: Request, user: dict[str, Any] = Depends(current_user)) -> Response:
    payload = await request.json()
    items = payload.get("elements", [])
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        order = connection.execute("SELECT COALESCE(MAX(display_order),-1)+1 FROM questions WHERE session_id=?", (session_id,)).fetchone()[0]
        for item in items:
            connection.execute(
                """INSERT INTO questions(id,session_id,type,title,subtitle,description,image_id,display_order,is_active,
                   choices_json,min_value,max_value,step,conditional_logic_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (make_id("element"), session_id, *question_values(item)[:5], order, *question_values(item)[5:], now_ms()),
            )
            order += 1
    return Response(status_code=204)


@app.post("/api/public/responses", status_code=201)
async def submit_response(request: Request) -> str:
    payload = await request.json()
    session_id = payload.get("sessionId")
    question_id = payload.get("elementId")
    participant_id = str(payload.get("participantId", "")).strip()
    if not participant_id:
        raise HTTPException(status_code=422, detail="缺少参与者标识")
    with LIVE_PARTICIPANTS_LOCK:
        live = LIVE_PARTICIPANTS.get((session_id, participant_id))
        if live:
            live["lastSeen"] = now_ms()
    with connect() as connection:
        question = connection.execute("SELECT * FROM questions WHERE id=? AND session_id=?", (question_id, session_id)).fetchone()
        session = connection.execute("SELECT * FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not question or not session:
            raise HTTPException(status_code=404, detail="课堂或题目不存在")
        if not session["is_active"]:
            raise HTTPException(status_code=409, detail="该课堂当前已暂停答题")
        choice_ids = payload.get("choiceIds")
        existing = connection.execute(
            "SELECT id FROM student_responses WHERE participant_id=? AND question_id=?", (participant_id, question_id)
        ).fetchone()
        if existing:
            connection.execute(
                """UPDATE student_responses SET text_value=?,number_value=?,choice_ids_json=?,file_id=?,updated_at=? WHERE id=?""",
                (payload.get("textValue"), payload.get("numberValue"), encode_json(choice_ids), payload.get("fileId"), now_ms(), existing["id"]),
            )
            response_id = existing["id"]
        else:
            response_id = make_id("response")
            connection.execute(
                """INSERT INTO student_responses(id,session_id,question_id,participant_id,text_value,number_value,
                   choice_ids_json,file_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (response_id, session_id, question_id, participant_id, payload.get("textValue"), payload.get("numberValue"),
                 encode_json(choice_ids), payload.get("fileId"), now_ms(), now_ms()),
            )
    await publish_session_event(
        session_id,
        "response.updated",
        {"questionId": question_id, "participantId": participant_id},
    )
    return response_id


@app.get("/api/public/sessions/{session_id}/participants/{participant_id}/responses")
def participant_responses(session_id: str, participant_id: str) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """SELECT r.*,f.content_type AS file_content_type FROM student_responses r LEFT JOIN files f ON f.id=r.file_id
               WHERE r.session_id=? AND r.participant_id=? ORDER BY r.created_at""", (session_id, participant_id)
        ).fetchall()
    return [serialize_response(row) for row in rows]


@app.get("/api/public/sessions/{session_id}/responses")
def public_session_responses(session_id: str) -> list[dict[str, Any]]:
    with connect() as connection:
        session = connection.execute("SELECT results_public FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="课堂不存在")
        rows = connection.execute(
            """SELECT r.*,f.content_type AS file_content_type FROM student_responses r LEFT JOIN files f ON f.id=r.file_id
               WHERE r.session_id=? ORDER BY r.created_at""", (session_id,)
        ).fetchall()
    return [serialize_response(row) for row in rows]


@app.get("/api/sessions/{session_id}/ownership")
def session_ownership(session_id: str, user: dict[str, Any] | None = Depends(optional_user)) -> bool:
    if not user:
        return False
    with connect() as connection:
        return connection.execute("SELECT 1 FROM class_sessions WHERE id=? AND teacher_id=?", (session_id, user["_id"])).fetchone() is not None


@app.get("/api/sessions/{session_id}/participants")
def session_participants(session_id: str, user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        rows = connection.execute(
            """SELECT participant_id,COUNT(*) AS response_count,MIN(created_at) AS first_response_time
               FROM student_responses WHERE session_id=? GROUP BY participant_id ORDER BY first_response_time""", (session_id,)
        ).fetchall()
    live = live_participants_for_session(session_id)
    combined: dict[str, dict[str, Any]] = {
        row["participant_id"]: {
            "participantId": row["participant_id"],
            "responseCount": row["response_count"],
            "firstResponseTime": row["first_response_time"],
            "displayName": None,
            "avatar": None,
            "avatarName": None,
            "isOnline": False,
        }
        for row in rows
    }
    for participant_id, profile in live.items():
        item = combined.setdefault(participant_id, {
            "participantId": participant_id,
            "responseCount": 0,
            "firstResponseTime": profile["joinedAt"],
        })
        item.update({
            "displayName": profile["displayName"],
            "avatar": profile["avatar"],
            "avatarName": profile["avatarName"],
            "isOnline": True,
        })
    return sorted(combined.values(), key=lambda item: item["firstResponseTime"])


@app.get("/api/public/sessions/{session_id}/broadcasts")
def session_broadcasts(session_id: str, limit: int = Query(default=10, ge=1, le=50)) -> list[dict[str, Any]]:
    with connect() as connection:
        if not connection.execute("SELECT 1 FROM class_sessions WHERE id=?", (session_id,)).fetchone():
            raise HTTPException(status_code=404, detail="课堂不存在")
        rows = connection.execute(
            """SELECT id,content_json,created_at FROM classroom_events
               WHERE session_id=? AND event_type='teacher.broadcast'
               ORDER BY created_at DESC LIMIT ?""",
            (session_id, limit),
        ).fetchall()
    return [
        {
            "_id": row["id"],
            "message": decode_json(row["content_json"], {}).get("message", ""),
            "createdAt": row["created_at"],
        }
        for row in reversed(rows)
    ]


@app.post("/api/sessions/{session_id}/broadcasts", status_code=201)
async def create_session_broadcast(
    session_id: str,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    payload = await request.json()
    message = str(payload.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=422, detail="请输入要发送的课堂提示")
    if len(message) > 280:
        raise HTTPException(status_code=422, detail="课堂提示不能超过 280 个字符")
    event_id = make_id("class_event")
    created_at = now_ms()
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        connection.execute(
            """INSERT INTO classroom_events(
                   id,session_id,event_type,sender_role,participant_id,target_participant_id,content_json,created_at
               ) VALUES(?,?,?,?,?,?,?,?)""",
            (event_id, session_id, "teacher.broadcast", "teacher", None, None, encode_json({"message": message}), created_at),
        )
    result = {"_id": event_id, "message": message, "createdAt": created_at}
    await publish_session_event(session_id, "teacher.broadcast", result)
    return result


@app.get("/api/public/sessions/{session_id}/presentation")
def public_presentation_state(session_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        session = connection.execute("SELECT is_active FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="课堂不存在")
        return presentation_state(connection, session_id)


@app.post("/api/public/sessions/{session_id}/agent/explain", status_code=201)
async def explain_current_page(session_id: str, request: Request) -> dict[str, Any]:
    """Answer a learner question from the current/adjacent slide evidence only."""
    payload = await request.json()
    question = str(payload.get("question", "")).strip()
    participant_id = str(payload.get("participantId", "")).strip()
    if len(question) < 2:
        raise HTTPException(status_code=422, detail="请至少输入 2 个字符的问题")
    if len(question) > 1000:
        raise HTTPException(status_code=422, detail="问题不能超过 1000 个字符")
    with LIVE_PARTICIPANTS_LOCK:
        if (session_id, participant_id) not in LIVE_PARTICIPANTS:
            raise HTTPException(status_code=401, detail="临时课堂身份已失效，请重新加入课堂")
    enforce_public_agent_rate_limit(session_id, participant_id)
    with connect() as connection:
        session = connection.execute("SELECT is_active FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="课堂不存在")
        if not session["is_active"]:
            raise HTTPException(status_code=409, detail="课堂当前未开放")
        state = presentation_state(connection, session_id)
        if not state:
            raise HTTPException(status_code=409, detail="教师尚未选择当前课件页")
        evidence_items = presentation_evidence(connection, state, include_neighbors=True)
    agent_input = {
        "question": question,
        "currentPage": {
            "filename": state["filename"],
            "pageNumber": state["pageNumber"],
            "pageTitle": state["pageTitle"],
        },
    }
    forwarded = {
        "flow": "F1",
        "input": f"学生正在学习《{state['filename']}》第 {state['pageNumber']} 页，问题是：{question}",
        "standard": "internet_plus",
        "prefer_live_model": True,
        "evidence_items": evidence_items,
        "top_k": 3,
        "use_cache": True,
    }
    try:
        result = await asyncio.to_thread(call_venture_acceptance, forwarded)
    except RuntimeError as error:
        save_product_agent_run(
            session_id=session_id, actor_role="student", flow="F1", request_input=agent_input,
            result=None, error=str(error)[:1000],
        )
        raise HTTPException(status_code=503, detail=str(error)) from error
    audit_id = save_product_agent_run(
        session_id=session_id, actor_role="student", flow="F1", request_input=agent_input, result=result,
    )
    return {
        "auditId": audit_id,
        "runId": result.get("runId"),
        "agent": result.get("agent"),
        "version": result.get("version"),
        "status": result.get("status"),
        "mode": result.get("mode"),
        "reply": result.get("reply"),
        "citations": result.get("citations", []),
        "retrieval": result.get("retrieval", {}),
        "performance": result.get("performance", {}),
        "notice": "回答只依据当前课件及相邻页面；请按 [E1] 等编号核对来源。",
    }


@app.post("/api/sessions/{session_id}/presentation")
async def update_presentation_state(
    session_id: str,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    payload = await request.json()
    document_id = str(payload.get("documentId", "")).strip()
    try:
        page_number = int(payload.get("pageNumber", 0))
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail="课件页码必须是整数") from error
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        document = connection.execute(
            """SELECT * FROM learning_documents
               WHERE id=? AND teacher_id=? AND session_id=?""",
            (document_id, user["_id"], session_id),
        ).fetchone()
        if not document:
            raise HTTPException(status_code=404, detail="请选择已绑定到当前课堂的课件")
        if page_number < 1 or page_number > int(document["page_count"]):
            raise HTTPException(status_code=422, detail=f"页码应在 1–{document['page_count']} 之间")
        if not connection.execute(
            "SELECT 1 FROM document_pages WHERE document_id=? AND page_number=?",
            (document_id, page_number),
        ).fetchone():
            raise HTTPException(status_code=404, detail="该课件页尚未完成解析")
        updated_at = now_ms()
        connection.execute(
            """INSERT INTO session_presentation_state(session_id,document_id,page_number,updated_at)
               VALUES(?,?,?,?)
               ON CONFLICT(session_id) DO UPDATE SET
                   document_id=excluded.document_id,
                   page_number=excluded.page_number,
                   updated_at=excluded.updated_at""",
            (session_id, document_id, page_number, updated_at),
        )
        state = presentation_state(connection, session_id)
    await publish_session_event(session_id, "teacher.page_changed", state or {})
    return state or {}


@app.post("/api/public/sessions/{session_id}/page-feedback", status_code=201)
async def create_page_feedback(session_id: str, request: Request) -> dict[str, Any]:
    payload = await request.json()
    participant_id = str(payload.get("participantId", "")).strip()
    document_id = str(payload.get("documentId", "")).strip()
    category = str(payload.get("category", "")).strip()
    message = str(payload.get("message", "")).strip()
    try:
        page_number = int(payload.get("pageNumber", 0))
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail="反馈页码无效") from error
    labels = {"unclear": "不理解", "too_fast": "讲得太快", "question": "有疑问"}
    if not participant_id:
        raise HTTPException(status_code=422, detail="缺少临时参与者标识")
    if category not in labels:
        raise HTTPException(status_code=422, detail="反馈类型无效")
    if category == "question" and not message:
        raise HTTPException(status_code=422, detail="请填写具体疑问")
    if len(message) > 500:
        raise HTTPException(status_code=422, detail="疑问内容不能超过 500 个字符")
    timestamp = now_ms()
    feedback_id = make_id("page_feedback")
    event_id = make_id("class_event")
    with connect() as connection:
        session = connection.execute("SELECT is_active FROM class_sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="课堂不存在")
        if not session["is_active"]:
            raise HTTPException(status_code=409, detail="课堂当前未开放")
        state = presentation_state(connection, session_id)
        if not state:
            raise HTTPException(status_code=409, detail="教师尚未开始课件讲解")
        if state["documentId"] != document_id or state["pageNumber"] != page_number:
            raise HTTPException(status_code=409, detail="教师已经切换页面，请同步后重新反馈")
        existing = connection.execute(
            """SELECT id,created_at FROM page_feedback
               WHERE session_id=? AND document_id=? AND page_number=? AND participant_id=? AND category=?""",
            (session_id, document_id, page_number, participant_id, category),
        ).fetchone()
        if existing:
            feedback_id = existing["id"]
            created_at = existing["created_at"]
            connection.execute(
                "UPDATE page_feedback SET message=?,status='pending',updated_at=? WHERE id=?",
                (message or None, timestamp, feedback_id),
            )
        else:
            created_at = timestamp
            connection.execute(
                """INSERT INTO page_feedback(
                       id,session_id,document_id,page_number,participant_id,category,message,status,created_at,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (
                    feedback_id, session_id, document_id, page_number, participant_id,
                    category, message or None, "pending", timestamp, timestamp,
                ),
            )
        event_content = {
            "feedbackId": feedback_id,
            "documentId": document_id,
            "pageNumber": page_number,
            "category": category,
            "categoryLabel": labels[category],
            "hasMessage": bool(message),
        }
        connection.execute(
            """INSERT INTO classroom_events(
                   id,session_id,event_type,sender_role,participant_id,target_participant_id,content_json,created_at
               ) VALUES(?,?,?,?,?,?,?,?)""",
            (event_id, session_id, "student.page_feedback", "student", participant_id, None, encode_json(event_content), timestamp),
        )
    result = {
        "_id": feedback_id,
        "documentId": document_id,
        "pageNumber": page_number,
        "category": category,
        "categoryLabel": labels[category],
        "message": message or None,
        "status": "pending",
        "createdAt": created_at,
        "updatedAt": timestamp,
    }
    await publish_session_event(session_id, "student.page_feedback", result)
    return result


@app.get("/api/public/sessions/{session_id}/page-feedback")
def participant_page_feedback(
    session_id: str,
    participant_id: str = Query(...),
) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """SELECT * FROM page_feedback WHERE session_id=? AND participant_id=?
               ORDER BY created_at DESC""",
            (session_id, participant_id),
        ).fetchall()
    return [
        {
            "_id": row["id"],
            "documentId": row["document_id"],
            "pageNumber": row["page_number"],
            "category": row["category"],
            "message": row["message"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


@app.get("/api/sessions/{session_id}/page-feedback")
def teacher_page_feedback(
    session_id: str,
    document_id: str | None = Query(default=None),
    page_number: int | None = Query(default=None, ge=1),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        clauses = ["session_id=?"]
        params: list[Any] = [session_id]
        if document_id:
            clauses.append("document_id=?")
            params.append(document_id)
        if page_number is not None:
            clauses.append("page_number=?")
            params.append(page_number)
        rows = connection.execute(
            f"SELECT * FROM page_feedback WHERE {' AND '.join(clauses)} ORDER BY created_at DESC",
            params,
        ).fetchall()
    profiles = live_participants_for_session(session_id)
    labels = {"unclear": "不理解", "too_fast": "讲得太快", "question": "有疑问"}
    return [
        {
            "_id": row["id"],
            "documentId": row["document_id"],
            "pageNumber": row["page_number"],
            "participantId": row["participant_id"],
            "displayName": profiles.get(row["participant_id"], {}).get("displayName", "已离线学生"),
            "avatar": profiles.get(row["participant_id"], {}).get("avatar", "🙂"),
            "category": row["category"],
            "categoryLabel": labels.get(row["category"], row["category"]),
            "message": row["message"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


@app.patch("/api/sessions/{session_id}/page-feedback/{feedback_id}")
async def update_page_feedback_status(
    session_id: str,
    feedback_id: str,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    payload = await request.json()
    feedback_status = str(payload.get("status", "")).strip()
    if feedback_status not in {"pending", "resolved"}:
        raise HTTPException(status_code=422, detail="反馈状态无效")
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        row = connection.execute(
            "SELECT * FROM page_feedback WHERE id=? AND session_id=?",
            (feedback_id, session_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="反馈不存在")
        updated_at = now_ms()
        connection.execute(
            "UPDATE page_feedback SET status=?,updated_at=? WHERE id=?",
            (feedback_status, updated_at, feedback_id),
        )
    result = {"_id": feedback_id, "status": feedback_status, "updatedAt": updated_at}
    await publish_session_event(session_id, "teacher.feedback_status_changed", result)
    return result


@app.get("/api/agent/status")
def agent_adapter_status(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    settings = venture_agent_settings()
    return {key: value for key, value in settings.items() if key != "baseUrl"}


def baseline_prompt(flow: str, user_input: Any) -> str:
    """Build a stable, auditable prompt for the three acceptance flows."""
    body = json.dumps(user_input, ensure_ascii=False, indent=2) if not isinstance(user_input, str) else user_input
    common = (
        "你正在参加 ClassLoop 第一阶段 Agent 基线测试。只能依据输入内容回答，不能编造事实、"
        "引用、用户反馈或运行结果。请把重要判断标记为 F(事实)、I(推断)、H(假设)、S(模拟)，"
        "并指出证据来源或‘未提供来源’。\n\n"
    )
    if flow == "T1":
        task = "你是理论学习辅导 Agent。请输出：核心概念、分层解释、一个例子、常见误区、追问、自检题、证据与不确定项。"
    elif flow == "T2":
        task = "你是项目指导 Agent。先列澄清问题，再给出用户边界、问题定义、替代方案、证据缺口、关键假设和可执行下一步；不要直接替用户编造结论。"
    else:
        task = "你是项目评审 Agent。请按问题定义、用户证据、方案可行性、创新、风险与材料质量逐项评审，给出证据、缺口、暂不评分原因（如证据不足）和具体整改动作。"
    return f"{common}{task}\n\n【测试输入】\n{body}"


@app.post("/api/agent/baseline/run", status_code=201)
async def run_agent_baseline(
    request: Request,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Run and persist one auditable T1/T2/T3 baseline attempt."""
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="请求体必须是 JSON 对象")
    flow = str(payload.get("flow", "")).strip().upper()
    if flow not in {"T1", "T2", "T3"}:
        raise HTTPException(status_code=422, detail="flow 必须是 T1、T2 或 T3")
    if "input" not in payload:
        raise HTTPException(status_code=422, detail="缺少基线测试 input")

    metadata = baseline_agent_metadata(payload, flow)
    run_id = make_id("baseline")
    started_at = now_ms()
    run_input = payload["input"]
    prompt = baseline_prompt(flow, run_input)
    # VentureAgent currently exposes learning_tutor/project_coach. T3 is kept as
    # a distinct acceptance flow while using the project_coach transport role.
    transport_agent = "learning_tutor" if flow == "T1" else "project_coach"
    # Keep raw evidence beside the acceptance materials, not inside the runtime
    # package, so it can be archived without mixing it with application data.
    runtime_dir = Path(__file__).resolve().parents[2] / "evidence" / "runtime_logs"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    raw_log_path = runtime_dir / f"{run_id}.json"
    with connect() as connection:
        connection.execute(
            """INSERT INTO agent_baseline_runs(
                id,flow,agent_name,agent_version,model,prompt_version,knowledge_base_version,
                tool_config_json,input_json,status,manual_intervention_json,raw_log_path,
                started_at,created_by,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                run_id, flow, metadata["agent"], metadata["agentVersion"], metadata["model"],
                metadata["promptVersion"], metadata["knowledgeBaseVersion"], encode_json(metadata["toolConfig"]),
                encode_json({"input": run_input, "prompt": prompt}), "running", encode_json([]),
                str(raw_log_path), started_at, user["_id"], started_at,
            ),
        )

    output: dict[str, Any] | None = None
    error_text: str | None = None
    status_text = "completed"
    try:
        external = await asyncio.to_thread(call_venture_agent, prompt, f"classloop_baseline_{run_id}", transport_agent)
        output = {
            "reply": str(external.get("reply", "")),
            "agent": external.get("agent"),
            "reasoningTrace": external.get("reasoning_trace"),
            "flow": flow,
            "transportAgent": transport_agent,
        }
    except Exception as error:
        status_text = "failed"
        error_text = str(error)[:2000]

    finished_at = now_ms()
    raw_log = {
        "runId": run_id, "flow": flow, "metadata": metadata, "transportAgent": transport_agent,
        "startedAt": started_at, "finishedAt": finished_at, "input": run_input,
        "prompt": prompt, "output": output, "status": status_text, "error": error_text,
    }
    raw_log_path.write_text(json.dumps(raw_log, ensure_ascii=False, indent=2), encoding="utf-8")
    with connect() as connection:
        connection.execute(
            """UPDATE agent_baseline_runs
               SET output_json=?,status=?,error=?,finished_at=? WHERE id=?""",
            (encode_json(output), status_text, error_text, finished_at, run_id),
        )
    return {
        "runId": run_id, "flow": flow, "status": status_text, "agent": metadata["agent"],
        "agentVersion": metadata["agentVersion"], "model": metadata["model"],
        "promptVersion": metadata["promptVersion"], "knowledgeBaseVersion": metadata["knowledgeBaseVersion"],
        "output": output, "error": error_text, "rawLogPath": str(raw_log_path),
        "startedAt": started_at, "finishedAt": finished_at,
    }


@app.get("/api/agent/baseline/runs")
def list_agent_baseline_runs(
    flow: str | None = Query(default=None),
    run_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    clauses = ["created_by=?"]
    params: list[Any] = [user["_id"]]
    if flow:
        normalized = flow.strip().upper()
        if normalized not in {"T1", "T2", "T3"}:
            raise HTTPException(status_code=422, detail="flow 必须是 T1、T2 或 T3")
        clauses.append("flow=?")
        params.append(normalized)
    if run_status:
        if run_status not in {"running", "completed", "failed"}:
            raise HTTPException(status_code=422, detail="status 无效")
        clauses.append("status=?")
        params.append(run_status)
    params.append(limit)
    with connect() as connection:
        rows = connection.execute(
            f"SELECT * FROM agent_baseline_runs WHERE {' AND '.join(clauses)} ORDER BY started_at DESC LIMIT ?",
            params,
        ).fetchall()
    return [
        {
            "runId": row["id"], "flow": row["flow"], "agent": row["agent_name"],
            "agentVersion": row["agent_version"], "model": row["model"], "promptVersion": row["prompt_version"],
            "knowledgeBaseVersion": row["knowledge_base_version"], "status": row["status"],
            "input": decode_json(row["input_json"], {}), "output": decode_json(row["output_json"], None),
            "error": row["error"], "manualIntervention": decode_json(row["manual_intervention_json"], []),
            "rawLogPath": row["raw_log_path"], "startedAt": row["started_at"], "finishedAt": row["finished_at"],
        }
        for row in rows
    ]


@app.get("/api/agent/baseline/runs/{run_id}")
def get_agent_baseline_run(run_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM agent_baseline_runs WHERE id=? AND created_by=?", (run_id, user["_id"])
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="基线运行记录不存在")
    return {
        "runId": row["id"], "flow": row["flow"], "agent": row["agent_name"],
        "agentVersion": row["agent_version"], "model": row["model"], "promptVersion": row["prompt_version"],
        "knowledgeBaseVersion": row["knowledge_base_version"], "toolConfig": decode_json(row["tool_config_json"], {}),
        "input": decode_json(row["input_json"], {}), "output": decode_json(row["output_json"], None),
        "status": row["status"], "error": row["error"],
        "manualIntervention": decode_json(row["manual_intervention_json"], []), "rawLogPath": row["raw_log_path"],
        "startedAt": row["started_at"], "finishedAt": row["finished_at"],
    }


@app.post("/api/sessions/{session_id}/agent/diagnose", status_code=201)
async def diagnose_current_page(
    session_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    diagnosis_id = make_id("diagnosis")
    created_at = now_ms()
    settings = venture_agent_settings()
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        state = presentation_state(connection, session_id)
        if not state:
            raise HTTPException(status_code=409, detail="请先选择正在讲解的课件页")
        feedback_rows = connection.execute(
            """SELECT category,message FROM page_feedback
               WHERE session_id=? AND document_id=? AND page_number=?""",
            (session_id, state["documentId"], state["pageNumber"]),
        ).fetchall()
        response_rows = connection.execute(
            """SELECT q.title,q.type,r.text_value,r.number_value,r.choice_ids_json
               FROM student_responses r JOIN questions q ON q.id=r.question_id
               WHERE r.session_id=? ORDER BY r.created_at DESC LIMIT 100""",
            (session_id,),
        ).fetchall()
        evidence_items = presentation_evidence(connection, state, include_neighbors=False)
    anonymized_input = {
        "page": {
            "document": state["filename"],
            "pageNumber": state["pageNumber"],
            "pageTitle": state["pageTitle"],
            "pageText": state["pageText"][:8000],
        },
        "feedback": [
            {"category": row["category"], "message": row["message"]}
            for row in feedback_rows
        ],
        "responses": [
            {
                "question": row["title"],
                "type": row["type"],
                "text": row["text_value"],
                "number": row["number_value"],
                "choiceIds": decode_json(row["choice_ids_json"], None),
            }
            for row in response_rows
        ],
    }
    if feedback_rows:
        evidence_items.append({
            "id": "anonymous-page-feedback", "title": "当前页匿名反馈汇总",
            "content": json.dumps(anonymized_input["feedback"], ensure_ascii=False),
            "sourceType": "anonymous_feedback",
            "locator": f"课堂 {session_id} / 第 {state['pageNumber']} 页 / 匿名反馈",
        })
    if response_rows:
        evidence_items.append({
            "id": "anonymous-class-responses", "title": "课堂匿名作答样本",
            "content": json.dumps(anonymized_input["responses"], ensure_ascii=False),
            "sourceType": "anonymous_responses",
            "locator": f"课堂 {session_id} / 最近 {len(response_rows)} 条匿名作答",
        })
    forwarded = {
        "flow": "F4",
        "input": (
            f"请针对《{state['filename']}》第 {state['pageNumber']} 页生成课堂干预建议。"
            f"当前收到 {len(feedback_rows)} 条页级反馈和 {len(response_rows)} 条课堂回答。"
        ),
        "standard": "internet_plus", "prefer_live_model": True,
        "evidence_items": evidence_items, "top_k": 5, "use_cache": True,
    }
    try:
        external = await asyncio.to_thread(call_venture_acceptance, forwarded)
        output = {
            "analysisText": str(external.get("reply", "")),
            "agent": external.get("agent"),
            "agentVersion": external.get("version"), "runId": external.get("runId"),
            "mode": external.get("mode"), "citations": external.get("citations", []),
            "retrieval": external.get("retrieval", {}), "performance": external.get("performance", {}),
            "validation": external.get("validation", {}),
            "notice": "AI 只分析课件、匿名反馈和匿名作答；请按 [E1] 等编号核对后再干预。",
        }
        diagnosis_status = str(external.get("status") or "completed")
        diagnosis_error = external.get("error")
    except Exception as error:
        output = None
        diagnosis_status = "failed"
        diagnosis_error = str(error)[:1000]
    with connect() as connection:
        connection.execute(
            """INSERT INTO agent_diagnoses(
                   id,session_id,document_id,page_number,provider,model,status,input_json,output_json,error,created_by,created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                diagnosis_id, session_id, state["documentId"], state["pageNumber"], settings["provider"],
                settings["model"], diagnosis_status, encode_json(anonymized_input), encode_json(output),
                diagnosis_error, user["_id"], created_at,
            ),
        )
    save_product_agent_run(
        session_id=session_id, actor_role="teacher", flow="F4", request_input=anonymized_input,
        result=external if diagnosis_status != "failed" else None, error=diagnosis_error,
    )
    if diagnosis_status == "failed":
        raise HTTPException(status_code=503, detail=diagnosis_error or "Agent诊断失败")
    return {
        "_id": diagnosis_id,
        "sessionId": session_id,
        "documentId": state["documentId"],
        "pageNumber": state["pageNumber"],
        "provider": settings["provider"],
        "model": settings["model"],
        "status": diagnosis_status,
        "inputSummary": {
            "feedbackCount": len(feedback_rows),
            "responseCount": len(response_rows),
            "pageCharacterCount": len(state["pageText"]),
        },
        "output": output,
        "createdAt": created_at,
    }


@app.get("/api/sessions/{session_id}/agent/diagnoses")
def list_agent_diagnoses(
    session_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        rows = connection.execute(
            """SELECT * FROM agent_diagnoses WHERE session_id=?
               ORDER BY created_at DESC LIMIT ?""",
            (session_id, limit),
        ).fetchall()
    return [
        {
            "_id": row["id"],
            "documentId": row["document_id"],
            "pageNumber": row["page_number"],
            "provider": row["provider"],
            "model": row["model"],
            "status": row["status"],
            "input": decode_json(row["input_json"], {}),
            "output": decode_json(row["output_json"], None),
            "error": row["error"],
            "createdAt": row["created_at"],
        }
        for row in rows
    ]


@app.get("/api/admin/overview")
def admin_overview(_: dict[str, Any] = Depends(admin_user)) -> dict[str, Any]:
    clean_live_participants()
    with connect() as connection:
        counts = {
            "teachers": connection.execute("SELECT COUNT(*) FROM users WHERE role='teacher'").fetchone()[0],
            "classes": connection.execute("SELECT COUNT(*) FROM class_sessions").fetchone()[0],
            "questions": connection.execute("SELECT COUNT(*) FROM questions").fetchone()[0],
            "responses": connection.execute("SELECT COUNT(*) FROM student_responses").fetchone()[0],
            "documents": connection.execute("SELECT COUNT(*) FROM learning_documents").fetchone()[0],
            "pageFeedback": connection.execute("SELECT COUNT(*) FROM page_feedback").fetchone()[0],
            "agentDiagnoses": connection.execute("SELECT COUNT(*) FROM agent_diagnoses").fetchone()[0],
            "agentProductRuns": connection.execute("SELECT COUNT(*) FROM agent_product_runs").fetchone()[0],
        }
        teachers = connection.execute(
            """SELECT u.id,u.email,u.name,u.created_at,COUNT(DISTINCT s.id) AS class_count
               FROM users u LEFT JOIN class_sessions s ON s.teacher_id=u.id
               WHERE u.role='teacher' GROUP BY u.id ORDER BY u.created_at DESC"""
        ).fetchall()
        classes = connection.execute(
            """SELECT s.id,s.title,s.session_code,s.is_active,s.created_at,u.name AS teacher_name,u.email AS teacher_email,
                      COUNT(DISTINCT q.id) AS question_count,COUNT(DISTINCT r.id) AS response_count
               FROM class_sessions s JOIN users u ON u.id=s.teacher_id
               LEFT JOIN questions q ON q.session_id=s.id LEFT JOIN student_responses r ON r.session_id=s.id
               GROUP BY s.id ORDER BY s.created_at DESC"""
        ).fetchall()
        questions = connection.execute(
            """SELECT q.id,q.title,q.type,q.display_order,q.is_active,q.created_at,s.title AS class_title,
                      s.session_code,COUNT(r.id) AS response_count
               FROM questions q JOIN class_sessions s ON s.id=q.session_id
               LEFT JOIN student_responses r ON r.question_id=q.id
               GROUP BY q.id ORDER BY q.created_at DESC"""
        ).fetchall()
    with LIVE_PARTICIPANTS_LOCK:
        live_count = len(LIVE_PARTICIPANTS)
    return {
        "counts": {**counts, "liveParticipants": live_count},
        "teachers": [{
            "id": row["id"], "email": row["email"], "name": row["name"],
            "createdAt": row["created_at"], "classCount": row["class_count"],
        } for row in teachers],
        "classes": [{
            "id": row["id"], "title": row["title"], "sessionCode": row["session_code"],
            "isActive": bool(row["is_active"]), "createdAt": row["created_at"],
            "teacherName": row["teacher_name"], "teacherEmail": row["teacher_email"],
            "questionCount": row["question_count"], "responseCount": row["response_count"],
        } for row in classes],
        "questions": [{
            "id": row["id"], "title": row["title"], "type": row["type"],
            "order": row["display_order"], "isActive": bool(row["is_active"]),
            "createdAt": row["created_at"], "classTitle": row["class_title"],
            "sessionCode": row["session_code"], "responseCount": row["response_count"],
        } for row in questions],
    }


@app.get("/api/admin/agent-runs")
def admin_agent_runs(
    limit: int = Query(default=50, ge=1, le=200),
    _: dict[str, Any] = Depends(admin_user),
) -> dict[str, Any]:
    """Read-only audit list for student/teacher product Agent calls."""
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM agent_product_runs ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        aggregates = connection.execute(
            """SELECT COUNT(*) AS total,
                      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                      SUM(CASE WHEN status='degraded' THEN 1 ELSE 0 END) AS degraded,
                      AVG(duration_ms) AS average_ms
               FROM agent_product_runs"""
        ).fetchone()
    items = []
    cache_hits = 0
    for row in rows:
        output = decode_json(row["output_json"], {})
        performance = output.get("performance", {}) if isinstance(output, dict) else {}
        cache_hit = bool(performance.get("cacheHit"))
        cache_hits += int(cache_hit)
        retrieval = decode_json(row["retrieval_json"], {})
        items.append({
            "id": row["id"], "runId": row["venture_run_id"], "sessionId": row["session_id"],
            "actorRole": row["actor_role"], "flow": row["flow"], "agent": row["agent_name"],
            "version": row["agent_version"], "status": row["status"], "mode": row["mode"],
            "evidenceHits": len(retrieval.get("hits", [])) if isinstance(retrieval, dict) else 0,
            "citations": decode_json(row["citations_json"], []), "cacheHit": cache_hit,
            "durationMs": row["duration_ms"], "error": row["error"], "createdAt": row["created_at"],
        })
    return {
        "summary": {
            "total": int(aggregates["total"] or 0), "completed": int(aggregates["completed"] or 0),
            "degraded": int(aggregates["degraded"] or 0),
            "averageMs": round(float(aggregates["average_ms"] or 0), 1),
            "cacheHitsInView": cache_hits,
        },
        "items": items,
    }


@app.get("/api/admin/graph/status")
async def admin_graph_database_status(_: dict[str, Any] = Depends(admin_user)) -> dict[str, Any]:
    return await asyncio.to_thread(neo4j_store.status)


@app.get("/api/admin/documents")
def admin_learning_documents(_: dict[str, Any] = Depends(admin_user)) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """SELECT d.*,u.name AS teacher_name,u.email AS teacher_email,
                      s.title AS class_title,s.session_code
               FROM learning_documents d
               JOIN users u ON u.id=d.teacher_id
               LEFT JOIN class_sessions s ON s.id=d.session_id
               ORDER BY d.created_at DESC"""
        ).fetchall()
    result = []
    for row in rows:
        item = serialize_learning_document(row)
        item.update({
            "teacherName": row["teacher_name"],
            "teacherEmail": row["teacher_email"],
            "classTitle": row["class_title"],
            "sessionCode": row["session_code"],
        })
        result.append(item)
    return result


@app.get("/api/admin/documents/{document_id}/graph")
async def admin_learning_document_graph(
    document_id: str,
    _: dict[str, Any] = Depends(admin_user),
) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            """SELECT d.*,u.name AS teacher_name,u.email AS teacher_email,
                      s.title AS class_title,s.session_code
               FROM learning_documents d
               JOIN users u ON u.id=d.teacher_id
               LEFT JOIN class_sessions s ON s.id=d.session_id
               WHERE d.id=?""",
            (document_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="课件不存在")
    try:
        graph = await asyncio.to_thread(neo4j_store.read_document, document_id)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Neo4j图谱读取失败：{error}") from error
    document = serialize_learning_document(row)
    document.update({
        "teacherName": row["teacher_name"],
        "teacherEmail": row["teacher_email"],
        "classTitle": row["class_title"],
        "sessionCode": row["session_code"],
    })
    return {"source": "neo4j", "document": document, **graph}


@app.delete("/api/sessions/{session_id}/responses", status_code=204)
def delete_responses(session_id: str, user: dict[str, Any] = Depends(current_user)) -> Response:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        connection.execute("DELETE FROM student_responses WHERE session_id=?", (session_id,))
    return Response(status_code=204)


@app.delete("/api/sessions/{session_id}/participants/{participant_id}/responses", status_code=204)
def delete_participant(session_id: str, participant_id: str, user: dict[str, Any] = Depends(current_user)) -> Response:
    with connect() as connection:
        owned_session(connection, session_id, user["_id"])
        connection.execute("DELETE FROM student_responses WHERE session_id=? AND participant_id=?", (session_id, participant_id))
    return Response(status_code=204)


def owned_learning_document(connection: sqlite3.Connection, document_id: str, teacher_id: str) -> sqlite3.Row:
    row = connection.execute(
        "SELECT * FROM learning_documents WHERE id=? AND teacher_id=?",
        (document_id, teacher_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="课件不存在或不属于当前教师")
    return row


def learning_document_detail(connection: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    result = serialize_learning_document(row)
    pages = connection.execute(
        """SELECT p.id,p.page_number,p.title,p.text_content,p.char_count,COUNT(c.id) AS chunk_count
           FROM document_pages p LEFT JOIN document_chunks c ON c.page_id=p.id
           WHERE p.document_id=? GROUP BY p.id ORDER BY p.page_number""",
        (row["id"],),
    ).fetchall()
    result["pages"] = [{
        "_id": page["id"],
        "pageNumber": page["page_number"],
        "title": page["title"],
        "text": page["text_content"],
        "charCount": page["char_count"],
        "chunkCount": page["chunk_count"],
    } for page in pages]
    return result


@app.get("/api/graph/status")
async def graph_database_status(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return await asyncio.to_thread(neo4j_store.status)


@app.post("/api/documents/ingest", status_code=201)
async def ingest_learning_document(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    filename = Path(file.filename or "document").name
    content = await file.read()
    try:
        document_type, pages = await asyncio.to_thread(extract_document, content, filename)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"课件解析失败：{error}") from error

    document_id = make_id("document")
    storage_id = make_id("storage")
    created_at = now_ms()
    graph = build_document_graph(document_id, filename, document_type, pages, session_id, created_at)
    extracted_chars = sum(len(page["text"]) for page in pages)
    extraction_status = "extracted" if extracted_chars else "needs_ocr"
    graph_status = "pending"
    graph_error = "尚未配置ClassLoop Neo4j连接"

    with connect() as connection:
        if session_id:
            owned_session(connection, session_id, user["_id"])
        connection.execute(
            "INSERT INTO files(id,content_type,size,content,created_at) VALUES(?,?,?,?,?)",
            (storage_id, file.content_type or "application/octet-stream", len(content), content, created_at),
        )
        connection.execute(
            """INSERT INTO learning_documents(
                   id,teacher_id,session_id,file_id,filename,document_type,mime_type,size,page_count,
                   extraction_status,graph_status,graph_error,graph_json,created_at,updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                document_id, user["_id"], session_id, storage_id, filename, document_type,
                file.content_type, len(content), len(pages), extraction_status, graph_status,
                graph_error, encode_json(graph), created_at, created_at,
            ),
        )
        for page in pages:
            page_id = f"{document_id}_page_{page['pageNumber']}"
            connection.execute(
                """INSERT INTO document_pages(id,document_id,page_number,title,text_content,char_count)
                   VALUES(?,?,?,?,?,?)""",
                (page_id, document_id, page["pageNumber"], page["title"], page["text"], len(page["text"])),
            )
            for chunk_index, chunk in enumerate(page.get("chunks", []), start=1):
                connection.execute(
                    """INSERT INTO document_chunks(id,document_id,page_id,chunk_index,text_content,char_count)
                       VALUES(?,?,?,?,?,?)""",
                    (f"{page_id}_chunk_{chunk_index}", document_id, page_id, chunk_index, chunk, len(chunk)),
                )

    if neo4j_store.configured:
        try:
            await asyncio.to_thread(neo4j_store.sync, graph)
            graph_status = "synced"
            graph_error = None
        except Exception as error:
            graph_status = "failed"
            graph_error = str(error)[:1000]
    with connect() as connection:
        connection.execute(
            "UPDATE learning_documents SET graph_status=?,graph_error=?,updated_at=? WHERE id=?",
            (graph_status, graph_error, now_ms(), document_id),
        )
        row = owned_learning_document(connection, document_id, user["_id"])
        return learning_document_detail(connection, row)


@app.get("/api/documents")
def list_learning_documents(
    session_id: str | None = Query(default=None),
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    with connect() as connection:
        if session_id:
            owned_session(connection, session_id, user["_id"])
            rows = connection.execute(
                "SELECT * FROM learning_documents WHERE teacher_id=? AND session_id=? ORDER BY created_at DESC",
                (user["_id"], session_id),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM learning_documents WHERE teacher_id=? ORDER BY created_at DESC",
                (user["_id"],),
            ).fetchall()
    return [serialize_learning_document(row) for row in rows]


@app.get("/api/documents/{document_id}")
def get_learning_document(document_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as connection:
        row = owned_learning_document(connection, document_id, user["_id"])
        return learning_document_detail(connection, row)


@app.get("/api/documents/{document_id}/graph")
def get_learning_document_graph(document_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as connection:
        row = owned_learning_document(connection, document_id, user["_id"])
    return decode_json(row["graph_json"], {"nodes": [], "edges": []})


@app.delete("/api/documents/{document_id}", status_code=204)
async def delete_learning_document(
    document_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> Response:
    with connect() as connection:
        row = owned_learning_document(connection, document_id, user["_id"])
        storage_id = row["file_id"]
    if neo4j_store.configured:
        try:
            await asyncio.to_thread(neo4j_store.delete_document, document_id)
        except Exception as error:
            raise HTTPException(status_code=503, detail=f"Neo4j课件节点删除失败：{error}") from error
    with connect() as connection:
        connection.execute("DELETE FROM files WHERE id=?", (storage_id,))
    return Response(status_code=204)


@app.post("/api/documents/{document_id}/sync-graph")
async def retry_learning_document_graph_sync(
    document_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    with connect() as connection:
        row = owned_learning_document(connection, document_id, user["_id"])
        graph = decode_json(row["graph_json"], None)
    if not graph:
        raise HTTPException(status_code=409, detail="该课件尚未生成图谱数据")
    try:
        result = await asyncio.to_thread(neo4j_store.sync, graph)
        graph_status = "synced"
        graph_error = None
    except Exception as error:
        graph_status = "failed" if neo4j_store.configured else "pending"
        graph_error = str(error)[:1000]
        with connect() as connection:
            connection.execute(
                "UPDATE learning_documents SET graph_status=?,graph_error=?,updated_at=? WHERE id=?",
                (graph_status, graph_error, now_ms(), document_id),
            )
        raise HTTPException(status_code=503, detail=f"图数据库同步失败：{graph_error}") from error
    with connect() as connection:
        connection.execute(
            "UPDATE learning_documents SET graph_status=?,graph_error=?,updated_at=? WHERE id=?",
            (graph_status, graph_error, now_ms(), document_id),
        )
    return {"success": True, "graphStatus": graph_status, **result}


@app.post("/api/files", status_code=201)
async def upload_file(request: Request) -> dict[str, str]:
    body = await request.body()
    if len(body) > 1_500_000:
        raise HTTPException(status_code=413, detail="文件不能超过 1.5 MB")
    file_id = make_id("storage")
    with connect() as connection:
        connection.execute(
            "INSERT INTO files(id,content_type,size,content,created_at) VALUES(?,?,?,?,?)",
            (file_id, request.headers.get("content-type", "application/octet-stream"), len(body), body, now_ms()),
        )
    return {"storageId": file_id}


@app.get("/api/files/{file_id}/metadata")
def get_file_metadata(file_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute("SELECT id,content_type,size,created_at FROM files WHERE id=?", (file_id,)).fetchone()
    if not row:
        return None
    return {"_id": row["id"], "_creationTime": row["created_at"], "contentType": row["content_type"], "size": row["size"], "sha256": "server-managed", "dataUrl": file_url(row["id"])}


@app.get("/api/files/{file_id}")
def get_file(file_id: str) -> Response:
    with connect() as connection:
        row = connection.execute("SELECT content_type,content FROM files WHERE id=?", (file_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="文件不存在")
    return Response(content=row["content"], media_type=row["content_type"] or "application/octet-stream")
