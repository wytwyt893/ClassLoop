"""Create reproducible live RAG and cache evidence without printing prompt contents."""

import asyncio
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import AcceptanceRunRequest, run_acceptance_agent


REQUEST = AcceptanceRunRequest(
    flow="F1",
    input=(
        "请解释为什么页级匿名反馈比课后泛化问卷更容易保留课堂上下文，并给出理解检查。"
        "性能验收编号 V22-RAG-CACHE-001。"
    ),
    standard="internet_plus",
    prefer_live_model=True,
    use_cache=True,
    evidence_items=[
        {
            "id": "classloop-page-feedback",
            "title": "ClassLoop 页级反馈设计",
            "content": (
                "ClassLoop 把匿名反馈绑定到课件页码和课堂会话。教师切页时同步查看该页的"
                "不理解、过快和具体疑问，因此反馈保留发生时的课件上下文。"
            ),
            "sourceType": "design_record",
            "locator": "ClassLoop 课堂闭环设计 / 页级反馈",
        }
    ],
)


def summary(result: dict) -> dict:
    return {
        "runId": result.get("runId"),
        "status": result.get("status"),
        "mode": result.get("mode"),
        "durationMs": result.get("durationMs"),
        "performance": result.get("performance"),
        "validation": result.get("validation"),
        "citations": result.get("citations"),
        "rawLogPath": result.get("rawLogPath"),
    }


async def main() -> None:
    live = None
    for _ in range(3):
        candidate = await run_acceptance_agent(REQUEST)
        print("attempt=", summary(candidate))
        if candidate.get("mode") == "live_model":
            live = candidate
            break
    if not live:
        raise SystemExit("No protocol-compliant live result after three attempts")
    cached = await run_acceptance_agent(REQUEST)
    print("live=", summary(live))
    print("cached=", summary(cached))
    if cached.get("mode") != "live_model_cache":
        raise SystemExit("Repeated request did not hit live reply cache")


if __name__ == "__main__":
    asyncio.run(main())
