import json
import sqlite3
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.database import DB_PATH
from app.agent.graph import get_llm

class TeamCapabilityScores(BaseModel):
    diversity: int = Field(description="团队多元化评分，0 到 100")
    agility: int = Field(description="迭代敏捷度评分，0 到 100")
    coachability: int = Field(description="听劝指数评分，0 到 100")
    resilience: int = Field(description="抗压韧性评分，0 到 100")
    execution: int = Field(description="调研执行力评分，0 到 100")
    self_correction: int = Field(description="风险自纠能力评分，0 到 100")

class EvidenceItem(BaseModel):
    summary: str = Field(description="关于该维度的描述与评价")
    exact_quote: str = Field(description="从聊天记录或小组成员信息中摘录的原文原话字句，用于呈堂证供，如果无对话则空着")

class TeamCapabilityEvidences(BaseModel):
    diversity: EvidenceItem = Field(description="必须引用成员学科背景的证据或描述")
    agility: EvidenceItem = Field(description="必须引用团队与系统教练交互或者文案修改间隔的证据")
    coachability: EvidenceItem = Field(description="必须引用聊天中团队对批评的反应（比如驳回或接纳的某句话）")
    resilience: EvidenceItem = Field(description="必须评价在高危状态下团队持续尝试或放弃的表现")
    execution: EvidenceItem = Field(description="必须引用项目中是否有真实走访或调研客户的具体记录")
    self_correction: EvidenceItem = Field(description="必须说明团队主动修补逻辑漏洞的事实依据")

class TeamCapabilityProfile(BaseModel):
    scores: TeamCapabilityScores
    evidences: TeamCapabilityEvidences
    overall_comment: str = Field(description="80到160字的中文总结短评，指出核心的执行力或者协作短板。")

def clamp(val):
    try:
        return max(0, min(100, int(val)))
    except:
        return 0

def generate_team_profile(project_id: int) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project_row = cursor.fetchone()
        if not project_row:
            raise ValueError("项目不存在")
        project = dict(project_row)
        
        cursor.execute("SELECT * FROM members WHERE project_id = ?", (project_id,))
        members = [dict(m) for m in cursor.fetchall()]
        
        member_ids = [project["owner_id"]]
        for m in members:
            if m["student_id"]:
                member_ids.append(m["student_id"])
        
        member_ids = list(set(member_ids))
        placeholders = ','.join(['?'] * len(member_ids))
        
        cursor.execute(f"""
            SELECT m.role, m.agent, m.content 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_id IN ({placeholders})
            ORDER BY m.timestamp ASC
        """, member_ids)
        all_messages = [dict(row) for row in cursor.fetchall()]
        
        # 只保留教练和学生的对话（排除系统初始打招呼或其他）
        valid_messages = [msg for msg in all_messages if not (msg["role"] == "coach" and msg["agent"] == "系统助手")]
        
        if len(valid_messages) < 6:
            raise ValueError("团队内成员与系统教练的累计问答不足 3 轮，暂时无法生成可靠的执行力画像。")
            
        messages = valid_messages[-30:]
        
        cursor.execute("SELECT event, timestamp FROM evolution_logs WHERE project_id = ? ORDER BY timestamp DESC LIMIT 5", (project_id,))
        logs = [dict(row) for row in cursor.fetchall()]

    finally:
        conn.close()

    members_str = "\n".join([f"成员姓名: {m['name']}, 学院: {m.get('college','')}, 专业: {m.get('major','')} " for m in members])
    messages_str = "\n".join([f"{'智能体' if msg['role'] == 'coach' else '团队'}：{msg['content'][:150]}..." for msg in reversed(messages)])
    logs_str = "\n".join([f"{l['timestamp']} - {l['event']}" for l in logs])

    prompt = f"""你是一名资深的创业孵化导师。请根据以下某个创业团队的【组织人员信息】、【系统操作记录】以及他们与【AI 教练的对抗问答】，对该团队的“执行力与反脆弱协作特征”进行侧写。

【团队成员】
{members_str}

【最近系统记录】
{logs_str}

【最近对话切片】
{messages_str}

请严格输出 JSON 格式。返回对象结构如下：
{{
  "scores": {{
    "diversity": <0带100的数字>, 
    "agility": <0带100的数字>,
    "coachability": <0带100的数字>,
    "resilience": <0带100的数字>,
    "execution": <0带100的数字>,
    "self_correction": <0带100的数字>
  }},
  "evidences": {{
    "diversity": {{"summary": "一句话证据，描述专业背景", "exact_quote": "张三是软件工程，李四是..."}},
    "agility": {{"summary": "一句话证据，关于反应速度或行为频率", "exact_quote": "我们在今天修改了商业计划..."}},
    "coachability": {{"summary": "一句话证据，引用团队回复AI的话", "exact_quote": "你说的太教条了，完全扼杀了我们的创新，不改了。"}},
    "resilience": {{"summary": "一句话关于抗压韧性的评价", "exact_quote": ""}},
    "execution": {{"summary": "一句话关于实质调研行动力的评价", "exact_quote": ""}},
    "self_correction": {{"summary": "一句话关于自纠错能力的评价", "exact_quote": ""}}
  }},
  "overall_comment": "针对最薄弱短板的一两句导师指导建议"
}}
"""

    llm = get_llm()
    response = llm.invoke(prompt)
    
    text = response.content
    if isinstance(text, list):
         text = "".join(str(p) for p in text)
    text = text.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
    
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
    
    data = json.loads(text)
    
    scores = data.get("scores", {})
    evidences = data.get("evidences", {})
    
    
    # 确保 evidences 里的格式被正确转换
    formatted_evidences = {}
    for k, v in evidences.items():
        if isinstance(v, dict):
            formatted_evidences[k] = {"summary": str(v.get("summary", "")), "exact_quote": str(v.get("exact_quote", ""))}
        elif isinstance(v, str):
            formatted_evidences[k] = {"summary": v, "exact_quote": ""}
        else:
            formatted_evidences[k] = {"summary": "暂未提取到评价", "exact_quote": ""}

    return {
        "scores": {
            "diversity": clamp(scores.get("diversity")),
            "agility": clamp(scores.get("agility")),
            "coachability": clamp(scores.get("coachability")),
            "resilience": clamp(scores.get("resilience")),
            "execution": clamp(scores.get("execution")),
            "self_correction": clamp(scores.get("self_correction")),
        },
        "evidences": formatted_evidences,
        "overall_comment": str(data.get("overall_comment", ""))
    }
