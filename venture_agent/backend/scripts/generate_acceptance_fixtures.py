"""Generate clearly-labelled offline F1/F2/F3 records for acceptance drills."""

import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.acceptance import finish_run, new_run_record, persist_run


SAMPLES = {
    "F1": "请解释问题—场景—方案匹配，给正反例，并用3个问题检查理解。不要编造引用。",
    "F2": "ClassLoop已有页级反馈原型和模拟数据，但没有真实课堂调研。请先澄清，再给24小时内的补证任务。",
    "F3": "ClassLoop面向高校师生，已实现React、FastAPI、SQLite、Neo4j、SSE、页级反馈和Agent日志；真实课堂效果和持续使用意愿仍待验证。",
}


def main() -> None:
    for flow, user_input in SAMPLES.items():
        record = new_run_record(flow, user_input, "internet_plus")
        record["validation"] = {
            "passed": False,
            "checks": {"liveModelRequested": False},
            "failedChecks": ["liveModelDisabled"],
        }
        finish_run(
            record,
            status="degraded",
            mode="deterministic_fallback",
            error="验收前离线回归：显式关闭真实模型，验证降级、边界和日志保存。",
        )
        path = persist_run(record)
        print(f"{flow}\t{record['runId']}\t{path}")


if __name__ == "__main__":
    main()
