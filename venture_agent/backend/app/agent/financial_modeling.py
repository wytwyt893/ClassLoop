from pydantic import BaseModel, Field
from typing import List, Dict, Any
import sqlite3
import json
from app.database import DB_PATH
from app.agent.graph import get_llm

class FinanceParamSchema(BaseModel):
    key: str = Field(description="参数的英文键名，例如 `foot_traffic`, `cac`, `hardware_cost` 等")
    label: str = Field(description="参数的前台展示中文名称，例如：人流量/天、单个硬件成本、转化率等")
    prefix: str = Field(description="输入框的单位前缀，例如 `¥`, 或数字后缀 `%`, `个`，无则留空")
    default_value: int = Field(description="预估的中位数默认值，方便学生直接修改")

class FormulaItem(BaseModel):
    name: str = Field(description="公式前缀，例如：宏观创收模型、核心盈亏点等")
    formula: str = Field(description="组合公式，例如：人流量 × 转化率 × 客单价")

class EvidenceTrace(BaseModel):
    summary: str = Field(description="总结为何选择这几个核心参数的风控逻辑")
    exact_quote: str = Field(description="从项目文档、原始简介或赛道主题中提取的【一字不差的原话摘录】，作为推衍参数设计的依据")

class FinancialTemplateResponse(BaseModel):
    parameters: List[FinanceParamSchema] = Field(description="根据当前项目特色生成的4个核心计算变量，必须刚好4个以保留前端布局")
    formulas: List[FormulaItem] = Field(description="底层推测公式，刚好3行以保留前端布局")
    evidence_trace: EvidenceTrace = Field(description="设计这些参数和公式的原话证据追溯")

def generate_financial_template(project_id: int) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name, description, track, college, content FROM projects WHERE id = ?", (project_id,))
    project_row = cursor.fetchone()
    conn.close()

    if not project_row:
        raise ValueError("项目不存在")
        
    project = dict(project_row)
    project_content = project.get('content', '')
    if project_content and len(project_content) > 3000:
        project_content = project_content[:3000] # 截断防止 token 溢出
    
    prompt = f"""你是一名顶级财务建模师，正在为初创项目设计“简易财务沙盘输入面板”。
当前项目信息如下：
项目名称：{project.get('name', '')}
赛道：{project.get('track', '')}
项目简介：{project.get('description', '')}

项目的核心文档/PDF片段内容如下以供深度参考：
---
{project_content}
---

请根据该项目在上述文档片段中体现的实际业务特征（如硬件、SaaS、电商、服务等），设计 4 个高度定制化的核心输入参数，并给出 3 个对应的计算公式，以及1个用于反制幻觉的设计溯源证据链（必须从上述项目简介或核心文档片段中提取一字不差的原话，不要自己概括，必须是完全的复制引用，体现出因为原文档提到了这句话，所以我才选择了某个参数）。
注意：必须要找出能够代表项目差异化的特色参数（例如“充电宝周转率”、“核心设备折旧率”而非万灵药“获客成本”）。参数总量必须精准保留为 4 个，公式 3 条。
【极其重要】：这 3 个计算公式中使用的变量，必须【只能、仅仅、完全】来自于你生成的这 4 个参数的“中文变量名”（不要凭空发明诸如“毛利率”、“总设备数”等未让用户填写的变量）！否则后台无法完成计算！

严格按照以下 JSON Schema 输出：
```json
{{
  "parameters": [
    {{"key": "变量1英文键", "label": "中文变量名", "prefix": "前缀(可选¥等)", "default_value": 数字}},
    {{"key": "...", "label": "...", "prefix": "...", "default_value": ...}},
    {{"key": "...", "label": "...", "prefix": "...", "default_value": ...}},
    {{"key": "...", "label": "...", "prefix": "...", "default_value": ...}}
  ],
  "formulas": [
    {{"name": "输出指标A名称", "formula": "如何用上述参数进行运算的文本表达"}},
    {{"name": "输出指标B名称", "formula": "..."}},
    {{"name": "核心决策指标C", "formula": "..."}}
  ],
  "evidence_trace": {{
    "summary": "系统根据项目属于xxx赛道且提及xxx，定制设计了xxx参数组合",
    "exact_quote": "必须是上述提供项目信息中的原话提取，哪怕是简单的项目名称与赛道名的组合原词"
  }}
}}
```
"""
    llm = get_llm()
    response = llm.invoke(prompt)
    
    text = response.content
    if isinstance(text, list):
         text = "".join(str(p) for p in text)
    text = text.strip()
    
    # 简单的 JSON 抽取
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
        
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
        
    try:
        data = json.loads(text)
    except:
        # Fallback 兜底返回泛型参数
        data = {
            "parameters": [
                {"key": "users", "label": "预估核心用户基数 / 月", "prefix": "", "default_value": 1000},
                {"key": "cac", "label": "获客成本 (CAC) / 人", "prefix": "¥", "default_value": 50},
                {"key": "arpu", "label": "ARPU 单客收入 / 月", "prefix": "¥", "default_value": 200},
                {"key": "fixed_cost", "label": "硬性固定成本 / 月", "prefix": "¥", "default_value": 50000}
            ],
            "formulas": [
                {"name": "宏观创收模型", "formula": "预估用户基数 × ARPU"},
                {"name": "渠道冷启动耗损", "formula": "预估用户基数 × CAC"},
                {"name": "净收益安全阀", "formula": "宏观创收 - (渠道耗损 + 硬性固定成本)"}
            ],
            "evidence_trace": {
                "summary": "基于兜底模版逻辑加载泛用性 SaaS 指标体系。",
                "exact_quote": "无项目数据提取"
            }
        }
    return data

def run_financial_projection(project_id: int, request_body: dict) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name, track FROM projects WHERE id = ?", (project_id,))
    project_row = cursor.fetchone()
    conn.close()

    if not project_row:
        raise ValueError("项目不存在")
        
    project = dict(project_row)
    
    user_inputs = request_body.get("params", request_body)
    formulas_list = request_body.get("formulas", [])
    
    input_str = "\n".join([f"{k}: {v}" for k, v in user_inputs.items()])
    formula_str = "\n".join([f"{f.get('name')}: {f.get('formula')}" for f in formulas_list]) if formulas_list else "未提供明确的公式名称，请自由计算3个核心指标"
    
    prompt = f"""你是一名投资机构的风控总监。面对【{project.get('name', '该项目')}】这个处于核心初创期的项目，学生刚才已经在简易沙盘中提交了他们认为的 4 个关键业务量化指标估算：

【学生提交的预估参数】
{input_str}

【左侧系统已经为他们生成的推演公式名称】
{formula_str}

请根据学生提交的具体数值参数，严格按照上述的推演公式模型进行后台定量计算！必须输出那3个推演公式名称的计算结果（带货币符号或百分号），并生成一份结构化的定性风控回执。不需要返回死板的计算过程，需要基于行业常识一针见血指出他们提交的数据的荒谬之处或挑战点。

请严格输出 JSON，格式如下：
```json
{{
  "metrics": [
    {{"label": "左侧公式1的精准名称", "value": "根据数值严格计算的带单位结果(如 ¥ 150,000)", "trend": "positive(或 neutral/negative 控制颜色)"}},
    {{"label": "左侧公式2的精准名称", "value": "...", "trend": "negative"}},
    {{"label": "左侧公式3的精准名称", "value": "...", "trend": "positive"}}
  ],
  "ai_insight": "一段在主面板上展示的给学生的灯塔忠告（约80字）。重点指出：由于以上哪个参数过高/低导致模型异常或合理？",
  "risk_assessment": "深度的核心危机预警（一段话）",
  "growth_leverage": "下个阶段的增长杠杆（一段话）",
  "next_metric_focus": "你应该马上关注什么指标？（一段话）"
}}
```
"""

    llm = get_llm()
    response = llm.invoke(prompt)
    text = response.content
    if isinstance(text, list): text = "".join(str(p) for p in text)
    text = text.strip()
    
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
        
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1: text = text[start:end+1]
        
    try:
        data = json.loads(text)
    except:
        data = {
            "metrics": [
                {"label": "系统错误", "value": "N/A", "trend": "neutral"},
                {"label": "系统错误", "value": "N/A", "trend": "neutral"},
                {"label": "系统错误", "value": "N/A", "trend": "neutral"}
            ],
            "ai_insight": "参数传递异常，未能计算有效的财务模型结果。",
            "risk_assessment": "无", "growth_leverage": "无", "next_metric_focus": "无"
        }
    return data
