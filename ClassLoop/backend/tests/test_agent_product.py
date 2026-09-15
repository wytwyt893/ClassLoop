from __future__ import annotations

import sqlite3
import unittest
import uuid

from fastapi import HTTPException

from app.main import (
    PUBLIC_AGENT_REQUESTS,
    PUBLIC_AGENT_REQUESTS_LOCK,
    enforce_public_agent_rate_limit,
    presentation_evidence,
)


class ProductAgentTests(unittest.TestCase):
    def test_presentation_evidence_keeps_page_locator_and_current_page_first(self):
        connection = sqlite3.connect(":memory:")
        connection.row_factory = sqlite3.Row
        connection.executescript(
            """
            CREATE TABLE document_pages(id TEXT, document_id TEXT, page_number INTEGER, title TEXT);
            CREATE TABLE document_chunks(page_id TEXT, chunk_index INTEGER, text_content TEXT);
            INSERT INTO document_pages VALUES('p11','doc',11,'上一页');
            INSERT INTO document_pages VALUES('p12','doc',12,'AVL旋转');
            INSERT INTO document_pages VALUES('p13','doc',13,'下一页');
            INSERT INTO document_chunks VALUES('p11',0,'二叉搜索树');
            INSERT INTO document_chunks VALUES('p12',0,'AVL树通过旋转恢复平衡');
            INSERT INTO document_chunks VALUES('p13',0,'旋转复杂度');
            """
        )
        state = {"documentId": "doc", "pageNumber": 12, "filename": "AVL.pdf", "pageText": ""}
        evidence = presentation_evidence(connection, state, include_neighbors=True)
        self.assertEqual("page-12-chunk-0", evidence[0]["id"])
        self.assertIn("第 12 页", evidence[0]["locator"])
        self.assertNotIn("participant", str(evidence).lower())

    def test_public_agent_is_limited_to_eight_requests_per_minute(self):
        session_id = f"session-{uuid.uuid4()}"
        participant_id = "student"
        for _ in range(8):
            enforce_public_agent_rate_limit(session_id, participant_id)
        with self.assertRaises(HTTPException) as context:
            enforce_public_agent_rate_limit(session_id, participant_id)
        self.assertEqual(429, context.exception.status_code)
        with PUBLIC_AGENT_REQUESTS_LOCK:
            PUBLIC_AGENT_REQUESTS.pop((session_id, participant_id), None)


if __name__ == "__main__":
    unittest.main()
