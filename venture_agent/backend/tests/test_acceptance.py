from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from app.acceptance import (
    AGENT_VERSION,
    build_fallback,
    finish_run,
    get_cached_reply,
    list_runs,
    new_run_record,
    persist_run,
    retrieve_evidence,
    set_cached_reply,
    validate_live_reply,
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

    def test_evidence_retrieval_ranks_relevant_slide_first(self):
        evidence = [
            {"id": "market", "title": "市场计划", "content": "计划拓展高校市场", "locator": "计划书第5页"},
            {"id": "feedback", "title": "课堂反馈", "content": "页级匿名反馈能够保留课件上下文", "locator": "课件第3页"},
        ]
        result = retrieve_evidence("页级反馈为什么能保留课堂上下文", evidence, top_k=2)
        self.assertEqual("feedback", result["hits"][0]["id"])
        self.assertEqual("[E1]", result["hits"][0]["citation"])
        self.assertEqual("zh-bigram-keyword-v1", result["strategy"])

    def test_live_reply_requires_traceable_citation_when_evidence_exists(self):
        reply = (
            "[F] 课件说明了页级反馈。共同误区是忽略上下文。教师干预应先回到原页，"
            "再给反例并安排复测。[H] 这只是需要课堂数据验证的教学推断，不能判断单个学生能力。"
            "证据边界：只依据课件和匿名汇总。当前局限：没有干预后的复测数据，效果仍待验证。"
        )
        hits = [{"citation": "[E1]"}]
        self.assertIn("citationTraceable", validate_live_reply("F4", reply, hits)["failedChecks"])
        self.assertTrue(validate_live_reply("F4", f"{reply} [E1]", hits)["passed"])

    def test_repeat_request_cache_avoids_second_model_call(self):
        record = new_run_record(
            "F1", f"缓存测试-{self.id()}", "internet_plus",
            [{"id": "e1", "title": "缓存材料", "content": "缓存测试证据", "locator": "测试夹具"}],
        )
        self.assertIsNone(get_cached_reply(record))
        key = set_cached_reply(record, "cached-live-reply")
        self.assertEqual(24, len(key))
        self.assertEqual("cached-live-reply", get_cached_reply(record))

    def test_f4_provides_intervention_and_retest_loop(self):
        result = build_fallback("F4", SAMPLE, "internet_plus")
        titles = [item["title"] for item in result["sections"]]
        self.assertIn("教师干预", titles)
        self.assertIn("复测题", titles)
        self.assertEqual(3, len(result["nextActions"]))


if __name__ == "__main__":
    unittest.main()
