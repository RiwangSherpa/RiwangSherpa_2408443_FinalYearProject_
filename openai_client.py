import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
API_URL = "https://api.openai.com/v1/chat/completions"


def _call(payload, timeout=20):
    if not OPENAI_KEY:
        return False, {"error": "OPENAI_API_KEY not set"}
    headers = {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type": "application/json"
    }
    try:
        r = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
    except Exception as e:
        return False, {"error": "request_failed", "detail": str(e)}

    if r.status_code != 200:
        try:
            body = r.json()
        except:
            body = r.text
        return False, {"error": f"status_{r.status_code}", "detail": body}

    try:
        data = r.json()
        return True, data["choices"][0]["message"]["content"]
    except Exception:
        return False, {"error": "invalid_response", "raw": r.text}


def _extract(text):
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    candidate = fenced.group(1).strip() if fenced else text.strip()
    start = None
    for i, ch in enumerate(candidate):
        if ch in ("{", "["):
            start = i
            break
    if start is None:
        raise ValueError("no JSON found")

    for end in range(len(candidate), start, -1):
        part = candidate[start:end]
        try:
            return json.loads(part)
        except:
            pass

    return json.loads(candidate)


def generate_roadmap_minimal(goal_text, model="gpt-4o-mini", max_tokens=220):
    system = (
        "Produce JSON with: title, steps (exactly 6 short steps), sources (1-3 URLs). "
        "Return ONLY valid JSON."
    )
    user = f"Goal: {goal_text}\nReturn JSON only."

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens
    }

    ok, resp = _call(payload)
    if not ok:
        return resp

    try:
        parsed = _extract(resp)
        if "steps" in parsed:
            return parsed
        return {"error": "invalid_structure", "raw": resp, "parsed": parsed}
    except Exception as e:
        return {"error": "parse_failed", "raw": resp, "exc": str(e)}


def generate_quiz_minimal(topic_text, num_questions=5, model="gpt-4o-mini", max_tokens=300):
    system = (
        "Generate JSON with: title, questions (array of N). Each question has: "
        "q, options, answer_index. Only return JSON."
    )
    user = f"Topic: {topic_text}\nN={num_questions}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens
    }

    ok, resp = _call(payload)
    if not ok:
        return resp

    try:
        parsed = _extract(resp)
        qs = parsed.get("questions", [])
        if not isinstance(qs, list):
            return {"error": "invalid_structure", "raw": resp}

        cleaned = []
        for q in qs[:num_questions]:
            if (
                isinstance(q, dict)
                and "q" in q
                and "options" in q
                and "answer_index" in q
            ):
                cleaned.append({
                    "q": q["q"],
                    "options": q["options"],
                    "answer_index": int(q["answer_index"])
                })

        if not cleaned:
            return {"error": "invalid_questions", "raw": resp}

        parsed["questions"] = cleaned
        return parsed
    except Exception as e:
        return {"error": "parse_failed", "raw": resp, "exc": str(e)}
