import httpx
import json

def test_review():
    url = "http://localhost:8001/api/projects/1/review"
    try:
        resp = httpx.post(url, json={"rubric": "internet_plus"}, timeout=30.0)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_review()
