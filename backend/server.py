# backend/server.py
"""
TERMINAL_KAIMA Flask 백엔드
Qwen3.5-27B (via Ollama) 를 사용하여 메기 캐릭터 응답을 생성합니다.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as http_requests
import json
from maggie import build_maggie_prompt

app = Flask(__name__)
CORS(app)

# Ollama 설정
OLLAMA_BASE_URL = "http://localhost:11434"
# 시스템에 설치된 모델명 (ollama list로 확인)
# 우선순위: qwen3.5:27b > qwen3:27b > qwen2.5:7b > qwen2.5:3b
DEFAULT_MODEL = "qwen3.5:27b"

# 게임 세션 상태 (단일 플레이어 가정)
session_state = {
    "phase": 1,
    "history": [],
    "model": DEFAULT_MODEL
}


def get_available_model() -> str:
    """Ollama에서 사용 가능한 최적 Qwen 모델을 반환합니다."""
    try:
        resp = http_requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        models = [m["name"] for m in resp.json().get("models", [])]

        # 우선순위 순으로 확인
        preferred = ["qwen3.5:27b", "qwen3:27b", "qwen3:8b", "qwen2.5:7b", "qwen2.5:3b", "qwen2.5:latest"]
        for p in preferred:
            if any(p in m for m in models):
                return p

        # 아무 Qwen 모델이나 반환
        qwen_models = [m for m in models if "qwen" in m.lower()]
        if qwen_models:
            return qwen_models[0]

        return DEFAULT_MODEL
    except Exception:
        return DEFAULT_MODEL


@app.route("/health", methods=["GET"])
def health():
    model = get_available_model()
    try:
        resp = http_requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        ollama_ok = resp.status_code == 200
    except Exception:
        ollama_ok = False

    return jsonify({
        "status": "ok",
        "model": model,
        "ollama_connected": ollama_ok,
        "phase": session_state["phase"]
    })


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_msg = data.get("message", "").strip()
    phase = data.get("phase", session_state["phase"])

    if not user_msg:
        return jsonify({"error": "message required"}), 400

    prompt = build_maggie_prompt(
        phase=phase,
        history=session_state["history"],
        user_msg=user_msg
    )

    model = get_available_model()

    try:
        resp = http_requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "num_predict": 200,
                    "stop": ["플레이어:", "플레이어 :"]
                }
            },
            timeout=60
        )
        resp.raise_for_status()
        reply = resp.json().get("response", "").strip()

        # Thinking 모드 태그 제거 (<think>...</think>)
        if "<think>" in reply:
            import re
            reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL).strip()

        if not reply:
            reply = "...잠깐, 시스템이 불안정해요."

    except http_requests.exceptions.Timeout:
        reply = "...연결이 불안정해요. 다시 말해줘요."
    except http_requests.exceptions.ConnectionError:
        reply = "시스템 오류: Ollama 서버에 연결할 수 없습니다. 'ollama serve'를 실행하세요."
    except Exception as e:
        reply = "시스템 오류가 발생했어요."

    # 대화 히스토리 업데이트
    session_state["history"].append({"role": "user", "content": user_msg})
    session_state["history"].append({"role": "assistant", "content": reply})
    # 히스토리 최대 20개 유지
    if len(session_state["history"]) > 20:
        session_state["history"] = session_state["history"][-20:]

    return jsonify({"reply": reply, "phase": phase, "model": model})


@app.route("/phase", methods=["POST"])
def update_phase():
    data = request.get_json()
    new_phase = data.get("phase")
    if new_phase not in [1, 2, 3, 4]:
        return jsonify({"error": "invalid phase (must be 1-4)"}), 400
    session_state["phase"] = new_phase
    session_state["history"] = []  # 새 페이즈에서 히스토리 리셋
    return jsonify({"phase": session_state["phase"]})


@app.route("/reset", methods=["POST"])
def reset():
    session_state["phase"] = 1
    session_state["history"] = []
    return jsonify({"status": "reset"})


if __name__ == "__main__":
    print(f"TERMINAL_KAIMA Backend starting on port 5001...")
    print(f"Using model: {get_available_model()}")
    app.run(port=5001, debug=True)
