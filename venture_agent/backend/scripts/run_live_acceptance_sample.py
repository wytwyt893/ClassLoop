"""Run one reproducible live-model F2 acceptance sample and print only metadata."""

import asyncio
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import AcceptanceRunRequest, run_acceptance_agent


SAMPLE = (
    "ClassLoop面向高校同步理论课堂，已经实现学生对具体课件页反馈、教师实时查看和Agent诊断。"
    "当前只有可运行原型与模拟课堂数据，没有正式用户调研。"
    "请先提出至少2个澄清问题，再给出一个24小时内可以完成的证据补充任务；不要编造用户反馈。"
)


async def main() -> None:
    result = await run_acceptance_agent(
        AcceptanceRunRequest(
            flow="F2",
            input=SAMPLE,
            standard="internet_plus",
            prefer_live_model=True,
        )
    )
    for key in ("runId", "version", "flow", "agent", "status", "mode", "durationMs", "rawLogPath", "error"):
        print(f"{key}={result.get(key)}")


if __name__ == "__main__":
    asyncio.run(main())
