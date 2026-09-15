from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path
from typing import Any


AGENT_VERSION = "classloop-agent-v2.1-acceptance"
KNOWLEDGE_BASE_VERSION = "none-explicit-source-boundary"

FLOW_META: dict[str, dict[str, str]] = {
    "F1": {
        "name": "理论学习",
        "agent": "learning_tutor",
        "promptVersion": "f1-tutor-v2.1",
        "goal": "解释概念、给出标注示例并检查理解",
    },
    "F2": {
        "name": "项目指导",
        "agent": "project_coach",
        "promptVersion": "f2-coach-v2.1",
        "goal": "先澄清，再推进用户、场景、问题、证据和方案",
    },
    "F3": {
        "name": "评审反馈",
        "agent": "project_reviewer",
        "promptVersion": "f3-reviewer-v2.1",
        "goal": "按明确标准给出证据、缺口、风险与修改动作",
    },
}

RUBRICS: dict[str, dict[str, Any]] = {
    "challenge_cup": {
        "name": "挑战杯创业计划赛参考框架",
        "shortName": "挑战杯",
        "disclaimer": "课程验收演示参考框架，不替代当届组委会正式评审细则。",
        "dimensions": [
            {"key": "problem", "name": "问题与社会价值", "weight": 20, "keywords": ["教师", "学生", "课堂", "反馈", "问题", "价值"]},
            {"key": "evidence", "name": "实践与证据", "weight": 20, "keywords": ["数据", "记录", "日志", "测试", "调研", "证据", "运行"]},
            {"key": "innovation", "name": "创新与差异化", "weight": 20, "keywords": ["创新", "差异", "页级", "闭环", "实时", "agent", "图谱"]},
            {"key": "feasibility", "name": "方案与可行性", "weight": 20, "keywords": ["fastapi", "react", "sqlite", "neo4j", "部署", "接口", "原型"]},
            {"key": "growth", "name": "实施、团队与发展", "weight": 20, "keywords": ["团队", "下一步", "风险", "试点", "推广", "迭代", "实施"]},
        ],
    },
    "internet_plus": {
        "name": "中国国际大学生创新大赛参考框架",
        "shortName": "创新大赛（原互联网+）",
        "disclaimer": "课程验收演示参考框架，强调创新、产业/教育价值与落地，不替代当届正式规则。",
        "dimensions": [
            {"key": "innovation", "name": "创新性", "weight": 25, "keywords": ["创新", "差异", "页级", "闭环", "实时", "agent", "图谱"]},
            {"key": "value", "name": "教育与社会价值", "weight": 20, "keywords": ["教师", "学生", "课堂", "学习", "教学", "价值"]},
            {"key": "market", "name": "用户、场景与需求", "weight": 20, "keywords": ["用户", "场景", "痛点", "需求", "高校", "课程"]},
            {"key": "feasibility", "name": "可行性与成果", "weight": 20, "keywords": ["fastapi", "react", "sqlite", "neo4j", "测试", "运行", "原型"]},
            {"key": "team", "name": "团队与发展潜力", "weight": 15, "keywords": ["团队", "分工", "下一步", "迭代", "试点", "计划"]},
        ],
    },
}


def _sentences(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text.strip())
    parts = re.split(r"(?<=[。！？!?；;])\s*", normalized)
    return [part.strip() for part in parts if len(part.strip()) >= 6]


def _short_quote(text: str, fallback: str = "输入未提供足够的可引用事实") -> str:
    candidates = _sentences(text)
    if not candidates:
        return fallback
    return candidates[0][:90]


def _score_dimension(text: str, keywords: list[str]) -> tuple[int, list[str]]:
    lowered = text.lower()
    hits = [keyword for keyword in keywords if keyword.lower() in lowered]
    # The score is deliberately conservative: text coverage is not evidence of
    # real-world validity. This stable rule makes repeated acceptance runs comparable.
    score = min(88, 48 + min(len(set(hits)), 5) * 8)
    return score, hits


def build_rubric_result(text: str, standard: str) -> dict[str, Any]:
    rubric = RUBRICS.get(standard, RUBRICS["internet_plus"])
    dimensions: list[dict[str, Any]] = []
    weighted_total = 0.0
    for item in rubric["dimensions"]:
        score, hits = _score_dimension(text, item["keywords"])
        weighted_total += score * item["weight"]
        dimensions.append(
            {
                "key": item["key"],
                "name": item["name"],
                "weight": item["weight"],
                "score": score,
                "evidence": hits[:4],
                "status": "有文本依据" if hits else "证据不足",
            }
        )
    overall = round(weighted_total / 100, 1)
    return {
        "standard": standard if standard in RUBRICS else "internet_plus",
        "name": rubric["name"],
        "shortName": rubric["shortName"],
        "disclaimer": rubric["disclaimer"],
        "overallScore": overall,
        "grade": "建议进入验证" if overall >= 70 else "建议补证后再评",
        "dimensions": dimensions,
    }


def build_prompt(flow: str, user_input: str, standard: str) -> str:
    meta = FLOW_META[flow]
    common = f"""你是 ClassLoop Agent {AGENT_VERSION} 的{meta['name']}角色。
只能依据用户输入回答；不得编造用户反馈、市场数字、人物故事、引用或运行结果。
所有关键判断必须以前缀 [F]事实、[I]推断、[H]假设、[S]模拟 标记。
没有来源时写“未提供可核验来源”；模拟内容不得作为事实证据。
输出应具体、简洁、可执行，并在结尾单列“证据边界”和“当前局限”。
"""
    if flow == "F1":
        task = """完成理论学习流程：
1. 用初学者能理解的语言解释核心概念；
2. 给一个明确标为 [S] 的正例和反例；
3. 指出常见误区；
4. 给出恰好 3 个理解检查题；
5. 不使用无来源真实品牌故事。"""
    elif flow == "F2":
        task = """完成项目指导流程：
1. 开头先提出至少 2 个澄清问题；
2. 分别梳理目标用户、具体场景、核心问题、已有证据和证据缺口；
3. 在信息不足时只给条件性建议，不替学生补造事实；
4. 给出一个 24 小时内可完成的下一步。"""
    else:
        rubric = RUBRICS.get(standard, RUBRICS["internet_plus"])
        dimension_text = "、".join(f"{item['name']}({item['weight']}%)" for item in rubric["dimensions"])
        task = f"""完成独立项目评审流程，参考“{rubric['name']}”：
1. 逐项覆盖：{dimension_text}；
2. 每一项给出输入证据、证据缺口、风险和可操作修改；
3. 证据不足时明确写“暂不评分/需补证”，不要编造分数依据；
4. 总结 2 个优点、3 个优先整改动作和 1 个剩余风险。
说明：{rubric['disclaimer']}"""
    return f"{common}\n{task}\n\n【用户输入】\n{user_input.strip()}"


def validate_live_reply(flow: str, reply: str) -> dict[str, Any]:
    text = str(reply or "").strip()
    checks = {
        "nonEmpty": len(text) >= 80,
        "claimBoundary": "[F]" in text and ("[H]" in text or "证据不足" in text),
        "limitationVisible": "局限" in text or "证据边界" in text,
        "flowStructure": True,
    }
    if flow == "F1":
        checks["flowStructure"] = "理解检查" in text and (text.count("？") + text.count("?")) >= 3
    elif flow == "F2":
        checks["flowStructure"] = "澄清" in text and (text.count("？") + text.count("?")) >= 2
    elif flow == "F3":
        checks["flowStructure"] = all(keyword in text for keyword in ("优点", "风险", "修改"))
    failed = [name for name, passed in checks.items() if not passed]
    return {"passed": not failed, "checks": checks, "failedChecks": failed}


def build_fallback(flow: str, user_input: str, standard: str) -> dict[str, Any]:
    quote = _short_quote(user_input)
    rubric_result = build_rubric_result(user_input, standard) if flow == "F3" else None
    common_claims = [
        {"tag": "F", "label": "输入事实", "text": quote},
        {"tag": "H", "label": "待验证假设", "text": "输入中的价值与效果陈述仍需真实用户或运行数据验证。"},
        {"tag": "S", "label": "演示边界", "text": "本次结构化兜底用于演示流程稳定性，不等同于真实调研或模型推理证据。"},
    ]

    if flow == "F1":
        sections = [
            {"title": "核心解释", "content": "[F] 当前可核验材料只有本次输入。概念可拆成“对象—发生场景—因果关系—验证方法”四部分理解。"},
            {"title": "正反例（模拟）", "content": "[S] 正例：先限定具体用户和时刻，再选择能嵌入该时刻的方案。[S] 反例：先决定使用 AI，再倒推一个过宽的问题。"},
            {"title": "常见误区", "content": "把宽泛愿景当作问题、把模拟案例当事实、只复述定义而不检查能否迁移应用。"},
            {"title": "理解检查（恰好 3 题）", "content": ["请用一句话复述核心概念。", "给出一个不匹配的反例并说明断点。", "你会用什么可观察证据验证判断？"]},
        ]
        next_actions = ["回答 3 个理解检查题", "把回答与输入中的事实逐项对应"]
        limitations = ["未连接外部知识库，因此不提供真实品牌案例或外部引用。"]
    elif flow == "F2":
        sections = [
            {"title": "先澄清", "content": ["首要用户是教师、学生还是教务管理者？只能先选一个。", "当前已有哪一条真实课堂记录可以证明问题发生？", "本轮目标是验证需求、验证可用性，还是准备竞赛材料？"]},
            {"title": "条件性诊断", "content": f"[F] 输入提到：“{quote}”。[I] 若目标是课堂反馈，则应先证明反馈丢失上下文，而不是先扩展功能。"},
            {"title": "证据缺口", "content": "[H] 用户愿意持续使用、页级反馈优于课后问卷、教师能在课堂内及时处理，这三项尚不能由功能完成度自动证明。"},
            {"title": "24 小时下一步", "content": "选 1 节课、1 位教师、1 个课件页，记录触发反馈—教师查看—采取动作的完整链路；若只能模拟，必须标 [S]。"},
        ]
        next_actions = ["回答三个澄清问题", "补一条可定位的真实或明确标 S 的流程记录"]
        limitations = ["信息不足时不生成确定性市场结论或完整商业计划。"]
    else:
        weak_dimensions = [item for item in rubric_result["dimensions"] if item["score"] < 70]
        weak_names = "、".join(item["name"] for item in weak_dimensions[:3]) or "真实用户验证"
        sections = [
            {"title": "评审结论", "content": f"[F] 文本覆盖度规则得分 {rubric_result['overallScore']} / 100。[I] 当前可进入原型验证，但该分数不代表官方竞赛成绩。"},
            {"title": "可确认优点", "content": ["方案已有明确的软件实现与可演示链路。", "项目主动区分事实、推断、假设与模拟，降低材料失真风险。"]},
            {"title": "关键缺口", "content": f"[H] 当前最需要补证的维度为：{weak_names}。功能存在不等于用户价值已经成立。"},
            {"title": "优先整改", "content": ["补一条目标用户—场景—问题的可核验证据。", "用同一输入保存一次成功和一次异常/降级运行。", "统一 PPT、计划书与系统页面中的关键数字及版本号。"]},
        ]
        next_actions = ["优先补最低分维度的证据", "保留修改前后材料与 run_id"]
        limitations = ["评分仅衡量输入材料覆盖度。", "未核验的市场、用户和效果数字不计为事实证据。"]

    reply_parts: list[str] = []
    for section in sections:
        content = section["content"]
        if isinstance(content, list):
            body = "\n".join(f"- {item}" for item in content)
        else:
            body = str(content)
        reply_parts.append(f"## {section['title']}\n{body}")
    reply_parts.append("## 证据边界\n" + "\n".join(f"- [{item['tag']}] {item['text']}" for item in common_claims))
    reply_parts.append("## 当前局限\n" + "\n".join(f"- {item}" for item in limitations))

    return {
        "reply": "\n\n".join(reply_parts),
        "sections": sections,
        "claims": common_claims,
        "rubric": rubric_result,
        "nextActions": next_actions,
        "limitations": limitations,
    }


def new_run_record(flow: str, user_input: str, standard: str) -> dict[str, Any]:
    meta = FLOW_META[flow]
    started_at = time.time() * 1000
    fallback = build_fallback(flow, user_input, standard)
    return {
        "runId": f"acceptance_{uuid.uuid4()}",
        "version": AGENT_VERSION,
        "flow": flow,
        "flowName": meta["name"],
        "agent": meta["agent"],
        "promptVersion": meta["promptVersion"],
        "knowledgeBaseVersion": KNOWLEDGE_BASE_VERSION,
        "standard": standard if standard in RUBRICS else "internet_plus",
        "status": "running",
        "mode": "pending",
        "startedAt": started_at,
        "finishedAt": None,
        "durationMs": None,
        "input": user_input,
        "prompt": build_prompt(flow, user_input, standard),
        **fallback,
        "error": None,
        "manualIntervention": [],
    }


def finish_run(record: dict[str, Any], *, status: str, mode: str, error: str | None = None) -> dict[str, Any]:
    finished_at = time.time() * 1000
    record["status"] = status
    record["mode"] = mode
    record["modeLabel"] = {
        "live_model": "真实模型调用",
        "deterministic_fallback": "结构化降级",
    }.get(mode, mode)
    record["error"] = error
    record["finishedAt"] = finished_at
    record["durationMs"] = round(finished_at - float(record["startedAt"]), 1)
    return record


def persist_run(record: dict[str, Any], root: Path | None = None) -> Path:
    evidence_root = root or Path(__file__).resolve().parents[2] / "evidence" / "runtime_logs"
    evidence_root.mkdir(parents=True, exist_ok=True)
    path = evidence_root / f"{record['runId']}.json"
    record["rawLogPath"] = f"venture_agent/evidence/runtime_logs/{path.name}"
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def list_runs(root: Path | None = None, limit: int = 20) -> list[dict[str, Any]]:
    evidence_root = root or Path(__file__).resolve().parents[2] / "evidence" / "runtime_logs"
    if not evidence_root.exists():
        return []
    records: list[dict[str, Any]] = []
    for path in sorted(evidence_root.glob("acceptance_*.json"), key=lambda item: item.stat().st_mtime, reverse=True):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            records.append(
                {
                    "runId": data.get("runId"),
                    "version": data.get("version"),
                    "flow": data.get("flow"),
                    "status": data.get("status"),
                    "mode": data.get("mode"),
                    "startedAt": data.get("startedAt"),
                    "durationMs": data.get("durationMs"),
                    "rawLogPath": str(path),
                }
            )
        except (OSError, json.JSONDecodeError):
            continue
        if len(records) >= max(1, min(limit, 100)):
            break
    return records
