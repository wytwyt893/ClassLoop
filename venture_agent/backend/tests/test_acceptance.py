from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from app.acceptance import (
    AGENT_VERSION,
    build_fallback,
    finish_run,
    list_runs,
    new_run_record,
    persist_run,
)


SAMPLE = (
    "ClassLoop面向高校教师和学生，已实现React、FastAPI、SQLite、Neo4j、"
    "SSE实时反馈、Agent调用和运行日志；真实课堂效果仍待试点验证。"
)


class AcceptanceFlowTests(unittest.TestCase):
    def test_f1_has_exactly_three_checks_and_source_boundary(self):
        result = build_fallback("F1", SAMPLE, "internet_plus")
        checks = next(item for item in result["sections"] if item["title"].startswith("理解检查"))
        self.assertEqual(3, len(checks["content"]))
        self.assertIn("[S]", result["reply"])
        self.assertIn("外部知识库", result["limitations"][0])

    def test_f2_starts_with_multiple_clarifying_questions(self):
        result = build_fallback("F2", SAMPLE, "internet_plus")
        self.assertEqual("先澄清", result["sections"][0]["title"])
        self.assertGreaterEqual(len(result["sections"][0]["content"]), 2)
        self.assertIn("不生成确定性市场结论", result["limitations"][0])

    def test_f3_uses_weighted_explicit_rubric(self):
        result = build_fallback("F3", SAMPLE, "challenge_cup")
        rubric = result["rubric"]
        self.assertEqual("challenge_cup", rubric["standard"])
        self.assertEqual(100, sum(item["weight"] for item in rubric["dimensions"]))
        self.assertEqual(5, len(rubric["dimensions"]))
        self.assertIn("不替代", rubric["disclaimer"])

    def test_degraded_run_is_persisted_with_run_id(self):
        with tempfile.TemporaryDirectory() as directory:
            record = new_run_record("F3", SAMPLE, "internet_plus")
            finish_run(record, status="degraded", mode="deterministic_fallback", error="test outage")
            path = persist_run(record, Path(directory))
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(AGENT_VERSION, saved["version"])
            self.assertEqual("degraded", saved["status"])
            self.assertEqual("project_reviewer", saved["agent"])
            self.assertEqual("test outage", saved["error"])
            self.assertEqual(record["runId"], saved["runId"])
            self.assertEqual(1, len(list_runs(Path(directory))))


if __name__ == "__main__":
    unittest.main()
