import os
from typing import Any, Optional
from urllib.parse import urlparse

from app.ingestion.db_config import db


SUPPORTED_NODE_TYPES = {
    "question",
    "case",
    "concept",
    "mechanism",
    "misconception",
    "action",
    "bridge",
}


def _normalize_reasoning_graph(reasoning_graph: Optional[dict[str, Any]]) -> dict[str, list[dict[str, str]]]:
    if not isinstance(reasoning_graph, dict):
        return {"nodes": [], "edges": []}

    raw_nodes = reasoning_graph.get("nodes")
    raw_edges = reasoning_graph.get("edges")
    nodes: list[dict[str, str]] = []
    seen_node_ids: set[str] = set()

    for raw_node in raw_nodes if isinstance(raw_nodes, list) else []:
        if not isinstance(raw_node, dict):
            continue
        node_id = str(raw_node.get("id", "")).strip()
        label = str(raw_node.get("label", "")).strip()
        node_type = str(raw_node.get("node_type", "bridge")).strip().lower() or "bridge"
        if not node_id or not label or node_id in seen_node_ids:
            continue
        if node_type not in SUPPORTED_NODE_TYPES:
            node_type = "bridge"
        nodes.append(
            {
                "node_id": node_id,
                "label": label,
                "name": label,
                "node_type": node_type,
            }
        )
        seen_node_ids.add(node_id)

    edges: list[dict[str, str]] = []
    seen_edges: set[tuple[str, str, str]] = set()
    for raw_edge in raw_edges if isinstance(raw_edges, list) else []:
        if not isinstance(raw_edge, dict):
            continue
        source = str(raw_edge.get("source", "")).strip()
        target = str(raw_edge.get("target", "")).strip()
        label = str(raw_edge.get("label", "")).strip()
        edge_key = (source, target, label)
        if not source or not target or not label:
            continue
        if source not in seen_node_ids or target not in seen_node_ids or edge_key in seen_edges:
            continue
        edges.append(
            {
                "source": source,
                "target": target,
                "label": label,
                "edge_key": f"{source}|{label}|{target}",
            }
        )
        seen_edges.add(edge_key)

    return {"nodes": nodes, "edges": edges}


def clear_reasoning_graph_in_neo4j(message_id: int) -> None:
    with db.driver.session() as session:
        session.run(
            """
            MATCH (m:ReasoningGraphMessage {message_id: $message_id})
            DETACH DELETE m
            """,
            {"message_id": message_id},
        )
        session.run(
            """
            MATCH (n:ReasoningNode {message_id: $message_id})
            DETACH DELETE n
            """,
            {"message_id": message_id},
        )


def store_reasoning_graph_in_neo4j(
    message_id: int,
    conversation_id: str,
    agent: Optional[str],
    reasoning_graph: Optional[dict[str, Any]],
) -> bool:
    normalized = _normalize_reasoning_graph(reasoning_graph)
    nodes = normalized["nodes"]
    edges = normalized["edges"]

    clear_reasoning_graph_in_neo4j(message_id)
    if not nodes:
        return False

    with db.driver.session() as session:
        session.run(
            """
            MERGE (m:ReasoningGraphMessage {message_id: $message_id})
            SET
                m.conversation_id = $conversation_id,
                m.agent = $agent,
                m.node_count = $node_count,
                m.edge_count = $edge_count,
                m.updated_at = datetime()
            """,
            {
                "message_id": message_id,
                "conversation_id": conversation_id,
                "agent": agent,
                "node_count": len(nodes),
                "edge_count": len(edges),
            },
        )
        session.run(
            """
            UNWIND $nodes AS node
            MATCH (m:ReasoningGraphMessage {message_id: $message_id})
            CREATE (n:ReasoningNode {
                message_id: $message_id,
                node_id: node.node_id,
                label: node.label,
                name: node.name,
                node_type: node.node_type
            })
            CREATE (m)-[:HAS_REASONING_NODE {message_id: $message_id}]->(n)
            """,
            {"message_id": message_id, "nodes": nodes},
        )
        session.run(
            """
            UNWIND $edges AS edge
            MATCH (source:ReasoningNode {message_id: $message_id, node_id: edge.source})
            MATCH (target:ReasoningNode {message_id: $message_id, node_id: edge.target})
            MERGE (source)-[r:REASONING_EDGE {message_id: $message_id, edge_key: edge.edge_key}]->(target)
            SET
                r.label = edge.label,
                r.source_id = edge.source,
                r.target_id = edge.target
            """,
            {"message_id": message_id, "edges": edges},
        )
    return True


def build_reasoning_graph_query(message_id: int) -> str:
    safe_message_id = int(message_id)
    return (
        f"MATCH (n:ReasoningNode {{message_id: {safe_message_id}}})\n"
        f"OPTIONAL MATCH (n)-[r:REASONING_EDGE {{message_id: {safe_message_id}}}]->"
        f"(m:ReasoningNode {{message_id: {safe_message_id}}})\n"
        "RETURN n, r, m"
    )


def get_neo4j_browser_origin() -> str:
    explicit_origin = (os.getenv("NEO4J_BROWSER_URL") or "").strip()
    if explicit_origin:
        return explicit_origin.rstrip("/")

    parsed = urlparse(os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    host = parsed.hostname or "localhost"
    scheme = (os.getenv("NEO4J_BROWSER_SCHEME") or "http").strip() or "http"
    port = (os.getenv("NEO4J_BROWSER_PORT") or "7474").strip() or "7474"
    return f"{scheme}://{host}:{port}"


def get_neo4j_connect_url() -> str:
    return (os.getenv("NEO4J_URI") or "bolt://localhost:7687").strip()
