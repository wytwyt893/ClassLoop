from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from app.ingestion.db_config import db

auth_router = APIRouter()

class UserAuth(BaseModel):
    username: str  # 这里对应学号或工号
    password: str

class UserRegister(BaseModel):
    role: str  # 'student' or 'teacher'
    real_name: str
    id_num: str  # 对于学生是学号，对于教师是工号
    password: str
    college: Optional[str] = None
    major: Optional[str] = None  # 仅学生
    grade: Optional[str] = None  # 仅学生

@auth_router.post("/register")
def register(user: UserRegister):
    if not user.id_num or not user.password or not user.real_name:
        raise HTTPException(status_code=400, detail="姓名、ID号或密码不能为空")
    
    # 检查用户是否已存在 (按 ID 号唯一性校验)
    check_query = "MATCH (u:User {username: $id_num}) RETURN u"
    existing_user = db.execute_query(check_query, {"id_num": user.id_num})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="该 ID 号已被注册")
    
    # 创建新用户节点
    create_query = """
    CREATE (u:User {
        username: $id_num, 
        real_name: $real_name,
        password: $password,
        role: $role,
        college: $college,
        major: $major,
        grade: $grade,
        created_at: timestamp()
    })
    RETURN u.username AS username
    """
    params = {
        "id_num": user.id_num,
        "real_name": user.real_name,
        "password": user.password,
        "role": user.role,
        "college": user.college,
        "major": user.major,
        "grade": user.grade
    }
    
    try:
        db.execute_query(create_query, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"数据库写入失败: {str(e)}")
        
    return {"message": "注册成功", "username": user.id_num, "real_name": user.real_name}

@auth_router.post("/login")
def login(user: UserAuth):
    # 登录时 username 对应注册时的 id_num (即存储在 Neo4j 的 username 属性中)
    query = """
    MATCH (u:User {username: $username, password: $password})
    RETURN
        u.username AS username,
        u.real_name AS real_name,
        u.role AS role,
        u.college AS college,
        u.major AS major,
        u.grade AS grade
    """
    result = db.execute_query(query, {"username": user.username, "password": user.password})
    
    if not result:
        raise HTTPException(status_code=401, detail="ID 号或密码错误")
    
    user_data = result[0]
    return {
        "message": "登录成功", 
        "token": user_data["username"], 
        "username": user_data["username"],
        "real_name": user_data.get("real_name") or user_data["username"],
        "role": user_data.get("role"),
        "college": user_data.get("college"),
        "major": user_data.get("major"),
        "grade": user_data.get("grade"),
        "teacher_id": user_data["username"] if user_data.get("role") == 'teacher' else None
    }
