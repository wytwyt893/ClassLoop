import os
import re
from typing import Annotated, Any, Literal, TypedDict, cast

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, SecretStr

load_dotenv()


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    next_agent: str
    forced_agent: str
    context: dict[str, Any]


def get_llm():
    import httpx

    raw_api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    if not raw_api_key or raw_api_key == "your_key_here":
        raise ValueError("请在 backend/.env 中配置有效的 DEEPSEEK_API_KEY")

    proxy_url = (
        os.getenv("HTTPS_PROXY")
        or os.getenv("HTTP_PROXY")
        or os.getenv("https_proxy")
        or os.getenv("http_proxy")
    )

    if proxy_url:
        http_client = httpx.Client(proxy=proxy_url)
    else:
        http_client = httpx.Client(trust_env=False)

    return ChatOpenAI(
        model="deepseek-chat",
        api_key=SecretStr(raw_api_key),
        base_url=base_url,
        temperature=0,
        http_client=http_client,
    )


class RouteDecision(BaseModel):
    next_agent: Literal["learning_tutor", "project_coach"] = Field(
        description=(
            "决定下一个处理用户消息的专业导师。"
            "'learning_tutor' 负责基础知识解答和概念指导；"
            "'project_coach' 负责对具体项目想法进行挑刺、压测和诊断。"
        )
    )


class ReasoningGraphNode(BaseModel):
    id: str = Field(description="ASCII node id, e.g. q1, case, concept.")
    label: str = Field(description="Short node label shown in the graph.")
    node_type: Literal[
        "question",
        "case",
        "concept",
        "mechanism",
        "misconception",
        "action",
        "bridge",
    ] = Field(description="Semantic type for styling.")


class ReasoningGraphEdge(BaseModel):
    source: str = Field(description="Source node id.")
    target: str = Field(description="Target node id.")
    label: str = Field(description="Short relation label.")


def router_node(state: AgentState) -> dict[str, Any]:
    print("[Router Node] 正在分析用户意图...")
    messages = state.get("messages", [])
    forced_agent = state.get("forced_agent")

    if forced_agent in {"learning_tutor", "project_coach"}:
        print(f"[Router Node] 检测到前端显式指定 Agent，直接分发给: {forced_agent}")
        return {"next_agent": forced_agent}

    try:
        llm = get_llm()
        structured_llm = llm.with_structured_output(RouteDecision)
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是 VentureAgent 双创教育系统的路由中枢。"
                    "基础概念、理论、方法论问题分给 learning_tutor；"
                    "具体项目方案、商业想法、压测和漏洞诊断分给 project_coach。",
                ),
                ("placeholder", "{messages}"),
            ]
        )
        chain = prompt | structured_llm
        decision = cast(RouteDecision, chain.invoke({"messages": messages}))
        next_agent = decision.next_agent
        print(f"[Router Node] 意图识别完成，即将分发给: {next_agent}")
    except Exception as exc:
        print(f"Router 调用模型失败: {exc}，默认降级给 learning_tutor")
        next_agent = "learning_tutor"

    return {"next_agent": next_agent}


class TutorResponse(BaseModel):
    is_refusal: bool = Field(
        description=(
            "是否发现用户提出了代写请求？若用户要求直接写完整文本、可直接提交的内容，"
            "则判定为 True。"
        )
    )
    refusal_reason: str | None = Field(
        default=None,
        description="仅在代写请求时提供，说明拒绝原因。"
    )
    socratic_questions: list[str] | None = Field(
        default=None,
        description="仅在代写请求时提供，至少 3 个启发式追问。"
    )
    definition: str | None = Field(default=None, description="Definition 字段内容。")
    example: str | None = Field(default=None, description="Example 字段内容。")
    common_mistakes: str | None = Field(default=None, description="Common Mistakes 字段内容。")
    practice_task: str | None = Field(default=None, description="Practice Task 字段内容。")
    expected_artifact: str | None = Field(default=None, description="Expected Artifact 字段内容。")
    evaluation_criteria: str | None = Field(default=None, description="Evaluation Criteria 字段内容。")
    classic_case: str | None = Field(
        default=None,
        description="用于前端展示图谱检索与推理过程的第一段：经典案例。"
    )
    concept_bridge: str | None = Field(
        default=None,
        description="用于前端展示图谱检索与推理过程的第二段：从案例回到学生问题的讲解。"
    )
    graph_nodes: list[ReasoningGraphNode] | None = Field(
        default=None,
        description="4 到 6 个图谱节点，显式体现节点语义。"
    )
    graph_edges: list[ReasoningGraphEdge] | None = Field(
        default=None,
        description="4 到 6 条图谱边，显式体现关系与路径。"
    )


class ProjectCoachResponse(BaseModel):
    project_stage: str = Field(
        description="Project Stage: 用 2 到 3 句话判断项目所在阶段。"
    )
    diagnosis: str = Field(
        description="Diagnosis: 只指出当前最核心的 1 个逻辑问题，语气凌厉，多用反问。"
    )
    evidence_used: str = Field(
        description="Evidence Used: 只引用用户输入中的 2 到 3 处关键信息。"
    )
    impact: str = Field(
        description="Impact: 说明这个核心问题不解决会带来什么具体后果。"
    )
    next_task: str = Field(
        description="ONLY ONE Next Task: 只能给 1 个可立即执行的任务。"
    )
    simulated_case: str = Field(
        description="前端推理过程第 1 段：一个虚构但可信的成功相似项目。"
    )
    failure_inference: str = Field(
        description="前端推理过程第 2 段：基于成功项目反推学生想法更容易失败的原因。"
    )
    graph_nodes: list[ReasoningGraphNode] | None = Field(
        default=None,
        description="4 到 6 个图谱节点，显式体现问题、证据、风险与行动路径。"
    )
    graph_edges: list[ReasoningGraphEdge] | None = Field(
        default=None,
        description="4 到 6 条图谱边，体现从项目问题到诊断与行动的关系。"
    )


def _get_recent_user_context(messages: list[BaseMessage], limit: int = 3) -> tuple[list[str], str]:
    human_messages = [
        msg.content if isinstance(msg.content, str) else str(msg.content)
        for msg in messages
        if isinstance(msg, HumanMessage)
    ]
    if not human_messages:
        return [], ""

    latest_message = human_messages[-1].strip()
    prior_messages = [msg.strip() for msg in human_messages[:-1] if str(msg).strip()]
    if limit > 0:
        prior_messages = prior_messages[-limit:]
    return prior_messages, latest_message


def _normalize_line_breaks(text: str) -> str:
    cleaned = str(text or "")
    cleaned = cleaned.replace("<br/>", "\n").replace("<br />", "\n").replace("<br>", "\n")
    cleaned = cleaned.replace("\\n", "\n")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _strip_prefixed_label(text: str, labels: list[str]) -> str:
    cleaned = _normalize_line_breaks(text)
    changed = True
    while changed and cleaned:
        changed = False
        for label in labels:
            pattern = rf"^\s*\*{{0,2}}\s*{re.escape(label)}\s*\*{{0,2}}\s*[:：]\s*"
            updated = re.sub(pattern, "", cleaned, count=1, flags=re.IGNORECASE)
            if updated != cleaned:
                cleaned = updated.strip()
                changed = True
    return cleaned


def _clean_project_coach_field(field_name: str, text: str) -> str:
    aliases = {
        "project_stage": ["Project Stage"],
        "diagnosis": ["Diagnosis"],
        "evidence_used": ["Evidence Used"],
        "impact": ["Impact"],
        "next_task": ["ONLY ONE Next Task", "Next Task"],
        "simulated_case": ["相似成功项目", "模拟图谱段落1", "第一段"],
        "failure_inference": ["为什么你的想法更容易失败", "模拟图谱段落2", "第二段"],
    }
    return _strip_prefixed_label(text, aliases.get(field_name, []))


def _trim_graph_label(text: str, limit: int = 18) -> str:
    compact = _normalize_line_breaks(text).replace("\n", " ")
    return compact[:limit].strip() or compact[:limit]


def _build_fallback_tutor_graph(
    latest_question: str,
    definition: str,
    classic_case: str,
    common_mistakes: str,
    practice_task: str,
) -> dict[str, Any]:
    question_label = _trim_graph_label(latest_question or "学生问题", 14) or "学生问题"
    concept_label = _trim_graph_label(definition or "核心概念", 14) or "核心概念"
    case_label = _trim_graph_label(classic_case or "经典案例", 14) or "经典案例"
    misconception_label = _trim_graph_label(common_mistakes or "常见误区", 14) or "常见误区"
    action_label = _trim_graph_label(practice_task or "实操任务", 14) or "实操任务"
    return {
        "nodes": [
            {"id": "q1", "label": question_label, "node_type": "question"},
            {"id": "case", "label": case_label, "node_type": "case"},
            {"id": "concept", "label": concept_label, "node_type": "concept"},
            {"id": "mistake", "label": misconception_label, "node_type": "misconception"},
            {"id": "action", "label": action_label, "node_type": "action"},
        ],
        "edges": [
            {"source": "q1", "target": "concept", "label": "需要澄清"},
            {"source": "case", "target": "concept", "label": "解释"},
            {"source": "concept", "target": "mistake", "label": "易被误解为"},
            {"source": "concept", "target": "action", "label": "落到练习"},
            {"source": "case", "target": "action", "label": "提供启发"},
        ],
    }


def _build_fallback_coach_graph(
    latest_question: str,
    diagnosis: str,
    evidence_used: str,
    impact: str,
    next_task: str,
) -> dict[str, Any]:
    question_label = _trim_graph_label(latest_question or "项目想法", 14) or "项目想法"
    diagnosis_label = _trim_graph_label(diagnosis or "核心漏洞", 14) or "核心漏洞"
    evidence_label = _trim_graph_label(evidence_used or "原文证据", 14) or "原文证据"
    impact_label = _trim_graph_label(impact or "后果风险", 14) or "后果风险"
    action_label = _trim_graph_label(next_task or "下一任务", 14) or "下一任务"
    return {
        "nodes": [
            {"id": "q1", "label": question_label, "node_type": "question"},
            {"id": "evidence", "label": evidence_label, "node_type": "case"},
            {"id": "diagnosis", "label": diagnosis_label, "node_type": "misconception"},
            {"id": "impact", "label": impact_label, "node_type": "mechanism"},
            {"id": "action", "label": action_label, "node_type": "action"},
        ],
        "edges": [
            {"source": "q1", "target": "evidence", "label": "暴露出"},
            {"source": "evidence", "target": "diagnosis", "label": "支撑诊断"},
            {"source": "diagnosis", "target": "impact", "label": "若不修复"},
            {"source": "diagnosis", "target": "action", "label": "逼出任务"},
            {"source": "impact", "target": "action", "label": "要求验证"},
        ],
    }


def _build_reasoning_graph(
    nodes: list[ReasoningGraphNode] | None,
    edges: list[ReasoningGraphEdge] | None,
    fallback_graph: dict[str, Any],
) -> dict[str, Any] | None:
    normalized_nodes: list[dict[str, str]] = []
    seen_node_ids: set[str] = set()

    for node in nodes or []:
        node_id = (node.id or "").strip()
        label = _trim_graph_label(node.label or "", 16)
        node_type = (node.node_type or "concept").strip()
        if not node_id or not label or node_id in seen_node_ids:
            continue
        normalized_nodes.append({"id": node_id, "label": label, "node_type": node_type})
        seen_node_ids.add(node_id)

    normalized_edges: list[dict[str, str]] = []
    seen_edges: set[tuple[str, str, str]] = set()
    for edge in edges or []:
        source = (edge.source or "").strip()
        target = (edge.target or "").strip()
        label = _trim_graph_label(edge.label or "", 12)
        edge_key = (source, target, label)
        if not source or not target or not label:
            continue
        if source not in seen_node_ids or target not in seen_node_ids or edge_key in seen_edges:
            continue
        normalized_edges.append({"source": source, "target": target, "label": label})
        seen_edges.add(edge_key)

    if normalized_nodes and normalized_edges:
        return {"nodes": normalized_nodes[:6], "edges": normalized_edges[:6]}
    return fallback_graph


def learning_tutor_node(state: AgentState) -> dict[str, Any]:
    print("[Tutor Node] 学习辅导 Agent (A1) 正在生成回复...")
    messages = state.get("messages", [])
    _, latest_user_message = _get_recent_user_context(messages, limit=0)

    try:
        llm = get_llm()
        structured_llm = llm.with_structured_output(TutorResponse)

        system_prompt = (
            "你是 VentureAgent 的高校创新创业基础辅导教练 (Learning Tutor, A1)。\n"
            "你的职责是解答学生在商业、创业初期的基础概念疑问，例如什么是 MVP、"
            "什么是商业模式画布，或者帮助处于迷茫期的学生做基础思考。\n\n"
            "【反代写护栏】\n"
            "如果用户要求你直接写完整作业、完整文案、可直接提交的文本，必须拒绝，"
            "并把 is_refusal 设为 True，给出 refusal_reason 和至少 3 个 socratic_questions。\n\n"
            "【正常学习辅导】\n"
            "如果用户是在正常提问概念，则必须把 is_refusal 设为 False，并严格输出以下 6 个要素：\n"
            "1. Definition\n"
            "2. Example\n"
            "3. Common Mistakes\n"
            "4. Practice Task\n"
            "5. Expected Artifact\n"
            "6. Evaluation Criteria\n"
            "语气要耐心、鼓励、清晰。\n\n"
            "此外，你还必须额外生成仅用于前端展示“图谱检索与推理过程”的内容：\n"
            "- classic_case: 一个广为人知的经典案例，用于帮助理解概念。\n"
            "- concept_bridge: 从这个案例回到学生问题，用通俗方式讲清概念。\n"
            "- graph_nodes: 将推理压缩成 4 到 6 个节点，节点类型要明确，例如 question、case、concept、mechanism、misconception、action。\n"
            "- graph_edges: 将这些节点连接成 4 到 6 条边，必须能看出清晰的关系与路径。\n"
            "graph_nodes 的 label 要短，graph_edges 的 label 要像真实图谱关系，例如“解释”“映射到”“导致误解”“指向行动”。"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("placeholder", "{messages}"),
            ]
        )
        chain = prompt | structured_llm
        tutor_resp = cast(TutorResponse, chain.invoke({"messages": messages}))

        if tutor_resp.is_refusal:
            questions_text = "\n".join(f"- {q}" for q in (tutor_resp.socratic_questions or []))
            reply_content = (
                f"**⚠️ 拒绝代写提醒**\n\n{tutor_resp.refusal_reason}\n\n"
                f"**🤔 启发思考**\n\n{questions_text}"
            )
            reasoning_trace = None
            reasoning_graph = None
        else:
            practice_task_content = tutor_resp.practice_task or ""
            if "Practice Task" in practice_task_content:
                practice_task_content = practice_task_content.replace("Practice Task", "实操任务")

            reply_content = (
                f"**Definition:**\n{tutor_resp.definition}\n\n"
                f"**Example:**\n{tutor_resp.example}\n\n"
                f"**Common Mistakes:**\n{tutor_resp.common_mistakes}\n\n"
                f"**Practice Task:**\n{practice_task_content}\n\n"
                f"**Expected Artifact:**\n{tutor_resp.expected_artifact}\n\n"
                f"**Evaluation Criteria:**\n{tutor_resp.evaluation_criteria}"
            )

            classic_case = _strip_prefixed_label(
                tutor_resp.classic_case or "",
                ["经典案例", "广为人知的案例", "模拟图谱段落1", "第一段"],
            )
            concept_bridge = _strip_prefixed_label(
                tutor_resp.concept_bridge or "",
                ["从案例回到概念", "概念讲解", "模拟图谱段落2", "第二段"],
            )

            reasoning_trace = None
            if classic_case or concept_bridge:
                reasoning_trace = (
                    f"**经典案例**\n{classic_case}\n\n"
                    f"**从案例理解这个概念**\n{concept_bridge}"
                ).strip()

            fallback_graph = _build_fallback_tutor_graph(
                latest_user_message,
                tutor_resp.definition or "",
                classic_case,
                tutor_resp.common_mistakes or "",
                practice_task_content,
            )
            reasoning_graph = _build_reasoning_graph(
                tutor_resp.graph_nodes,
                tutor_resp.graph_edges,
                fallback_graph,
            )

        result: dict[str, Any] = {"messages": [AIMessage(content=reply_content)]}
        context_payload: dict[str, Any] = {}
        if reasoning_trace:
            context_payload["reasoning_trace"] = reasoning_trace
        if reasoning_graph:
            context_payload["reasoning_graph"] = reasoning_graph
        if context_payload:
            result["context"] = context_payload
        return result

    except Exception as exc:
        print(f"Tutor 生成回复失败: {exc}")
        error_msg = AIMessage(
            content="【学习辅导 Agent (A1)】抱歉，我目前的线路遇到了一点干扰，你可以稍后再试。"
        )
        return {"messages": [error_msg]}


def project_coach_node(state: AgentState) -> dict[str, Any]:
    print("[Coach Node] 项目教练 Agent (A2) 正在进行逻辑压测...")
    messages = state.get("messages", [])
    prior_user_messages, latest_user_message = _get_recent_user_context(messages)

    try:
        llm = get_llm()
        structured_llm = llm.with_structured_output(ProjectCoachResponse)

        prior_context_text = "\n".join(
            f"- 历史用户消息 {index + 1}: {content}"
            for index, content in enumerate(prior_user_messages)
        ) or "无"

        system_prompt = (
            "你是 VentureAgent 的高级项目教练 (Project Coach, A2)。\n"
            "来找你的通常是带着具体项目想法的学生团队。\n"
            "你的任务是对项目进行一针见血的诊断，但不能直接代替学生完成商业方案。\n"
            "你的风格必须像严厉、老练、近乎不留情面的投资人或答辩评委：凌厉、压迫感强、善于反问。\n"
            "你应尽量使用苏格拉底式追问，逼学生自己看见漏洞，而不是温和解释或直接替他补方案。\n\n"
            "严格要求：\n"
            "1. 你必须只输出 5 个字段对应的内容：Project Stage、Diagnosis、Evidence Used、Impact、ONLY ONE Next Task。\n"
            "2. 一次只指出 1 个最核心的问题，不能扩展成多个并列问题。\n"
            "3. Evidence Used 只能基于用户输入，不得编造外部案例、图谱信息或数据库内容。\n"
            "4. ONLY ONE Next Task 必须严格只有 1 个可执行任务。\n"
            "5. 不要输出 Definition、Example、Common Mistakes、Practice Task 等其他字段。\n"
            "6. 如果历史消息与当前消息冲突，以当前消息为准。\n"
            "7. 在不改变五字段结构的前提下，内容要更充实，整体篇幅接近学习辅导 Agent 的常规回答长度。\n"
            "8. Diagnosis、Impact、ONLY ONE Next Task 里优先使用反问句或追问句式，但要让学生明确知道你在质疑什么。\n"
            "9. 你不能给现成答案，只能指出漏洞、压测假设、逼学生回去验证。\n"
            "10. ONLY ONE Next Task 结尾最好形成一个明确的追问闭环，让学生带着数据或证据回来回答你。\n"
            "11. 你还必须同时生成两段前端展示用推理过程：一个虚构但可信的成功相似项目，以及基于它反推学生想法更容易失败的原因。\n"
            "12. 这两段内容只用于前端展示推理过程，绝不能混入正式五字段里。\n"
            "13. 你还必须额外生成 graph_nodes 和 graph_edges，把本次压测逻辑压缩成 4 到 6 个节点和 4 到 6 条边。\n"
            "14. graph_nodes 节点类型优先使用 question、case、misconception、mechanism、action、bridge；label 必须短。\n"
            "15. graph_edges 的 label 要像真实图谱关系，例如“支撑诊断”“暴露出”“若不修复”“逼出任务”。"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("human", "最近历史用户消息（仅供补充上下文，不代表最终结论）：\n{prior_context}"),
                ("human", "当前用户消息：\n{latest_message}"),
            ]
        )

        chain = prompt | structured_llm
        coach_resp = cast(
            ProjectCoachResponse,
            chain.invoke(
                {
                    "prior_context": prior_context_text,
                    "latest_message": latest_user_message or "用户暂未提供有效项目描述",
                }
            ),
        )

        project_stage = _clean_project_coach_field("project_stage", coach_resp.project_stage)
        diagnosis = _clean_project_coach_field("diagnosis", coach_resp.diagnosis)
        evidence_used = _clean_project_coach_field("evidence_used", coach_resp.evidence_used)
        impact = _clean_project_coach_field("impact", coach_resp.impact)
        next_task = _clean_project_coach_field("next_task", coach_resp.next_task)
        simulated_case = _clean_project_coach_field("simulated_case", coach_resp.simulated_case)
        failure_inference = _clean_project_coach_field("failure_inference", coach_resp.failure_inference)

        reply_content = (
            f"**Project Stage:**\n{project_stage}\n\n"
            f"**Diagnosis:**\n{diagnosis}\n\n"
            f"**Evidence Used:**\n{evidence_used}\n\n"
            f"**Impact:**\n{impact}\n\n"
            f"**ONLY ONE Next Task:**\n{next_task}"
        )

        reasoning_trace = (
            f"**相似成功项目**\n{simulated_case}\n\n"
            f"**为什么你的想法更容易失败**\n{failure_inference}"
        )

        fallback_graph = _build_fallback_coach_graph(
            latest_user_message,
            diagnosis,
            evidence_used,
            impact,
            next_task,
        )
        reasoning_graph = _build_reasoning_graph(
            coach_resp.graph_nodes,
            coach_resp.graph_edges,
            fallback_graph,
        )

        return {
            "messages": [AIMessage(content=reply_content)],
            "context": {
                "reasoning_trace": reasoning_trace,
                "reasoning_graph": reasoning_graph,
            },
        }

    except Exception as exc:
        print(f"Coach 生成回复失败: {exc}")
        error_msg = AIMessage(
            content="【项目教练 Agent (A2)】你们的项目逻辑让我暂时无法解析，待我重连后再来拷问你。"
        )
        return {"messages": [error_msg]}


def route_to_agent(state: AgentState) -> str:
    return state.get("next_agent", "learning_tutor")


def build_graph() -> Any:
    workflow_graph = StateGraph(AgentState)
    workflow_graph.add_node("router", router_node)
    workflow_graph.add_node("learning_tutor", learning_tutor_node)
    workflow_graph.add_node("project_coach", project_coach_node)

    workflow_graph.set_entry_point("router")
    workflow_graph.add_conditional_edges(
        "router",
        route_to_agent,
        {
            "learning_tutor": "learning_tutor",
            "project_coach": "project_coach",
        },
    )
    workflow_graph.add_edge("learning_tutor", END)
    workflow_graph.add_edge("project_coach", END)

    memory = MemorySaver()
    return workflow_graph.compile(checkpointer=memory)


app_graph = build_graph()
