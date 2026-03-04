# backend/server.py
"""
TERMINAL_KAIMA Flask 백엔드
mlx_lm (Qwen3.5-9B-4bit) 또는 Ollama 를 사용하여 메기 캐릭터 응답을 생성합니다.
"""
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import re
import json
import requests as http_requests
from maggie import build_maggie_prompt

app = Flask(__name__)
CORS(app)

# mlx_lm 서버 설정 (Qwen3.5-9B, OpenAI 호환 API)
MLX_BASE_URL = "http://127.0.0.1:11435"
MLX_MODEL = "mlx-community/Qwen3.5-9B-4bit"

# Ollama 폴백 설정
OLLAMA_BASE_URL = "http://localhost:11434"

# 게임 세션 상태 (단일 플레이어 가정)
session_state = {
    "phase": 1,
    "history": [],
}


def is_mlx_ready() -> bool:
    """mlx_lm 서버가 준비됐는지 확인합니다."""
    try:
        resp = http_requests.get(f"{MLX_BASE_URL}/v1/models", timeout=2)
        return resp.status_code == 200
    except Exception:
        return False


def get_ollama_model() -> str:
    """Ollama에서 사용 가능한 최적 Qwen 모델을 반환합니다."""
    try:
        resp = http_requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        models = [m["name"] for m in resp.json().get("models", [])]
        preferred = ["qwen3:27b", "qwen3:8b", "qwen2.5:7b", "qwen2.5:3b", "qwen2.5:latest"]
        for p in preferred:
            if any(p in m for m in models):
                return p
        qwen_models = [m for m in models if "qwen" in m.lower()]
        return qwen_models[0] if qwen_models else "qwen2.5:7b"
    except Exception:
        return "qwen2.5:7b"


def call_mlx(prompt: str) -> str:
    """mlx_lm OpenAI 호환 API 호출."""
    resp = http_requests.post(
        f"{MLX_BASE_URL}/v1/chat/completions",
        json={
            "model": MLX_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 200,
            "temperature": 0.8,
        },
        timeout=90,
    )
    resp.raise_for_status()
    reply = resp.json()["choices"][0]["message"]["content"].strip()
    # thinking 태그 제거
    if "<think>" in reply:
        reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL).strip()
    return reply


def call_ollama(prompt: str, model: str) -> str:
    """Ollama API 호출. qwen3 계열은 think:false 옵션으로 thinking 비활성화."""
    is_qwen3 = "qwen3" in model and "qwen3.5" not in model
    options = {"temperature": 0.8, "num_predict": 300, "stop": ["플레이어:", "플레이어 :"]}
    if is_qwen3:
        options["think"] = False

    resp = http_requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": options,
        },
        timeout=90,
    )
    resp.raise_for_status()
    data = resp.json()
    reply = data.get("response", "").strip()
    # <think> 태그 제거
    if "<think>" in reply:
        reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL).strip()
    # "메기:" 접두어 제거
    reply = re.sub(r"^메기\s*:\s*", "", reply).strip()
    return reply


@app.route("/health", methods=["GET"])
def health():
    mlx_ready = is_mlx_ready()
    active_model = MLX_MODEL if mlx_ready else get_ollama_model()
    backend = "mlx_lm" if mlx_ready else "ollama"
    return jsonify({
        "status": "ok",
        "model": active_model,
        "backend": backend,
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
    model = get_ollama_model()
    is_qwen3 = "qwen3" in model and "qwen3.5" not in model
    options = {"temperature": 0.8, "num_predict": 300, "stop": ["플레이어:", "플레이어 :"]}
    if is_qwen3:
        options["think"] = False

    def generate():
        full_reply = ""
        in_think = False
        prefix_buf = ""   # 앞부분 토큰을 모아 접두어 감지
        prefix_done = False
        try:
            with http_requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": True, "options": options},
                stream=True,
                timeout=90,
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    token = chunk.get("response", "")

                    # <think> 태그 필터링
                    if "<think>" in token:
                        in_think = True
                    if in_think:
                        if "</think>" in token:
                            in_think = False
                        continue

                    # 첫 10자 안에서 "메기:" 접두어 제거
                    if not prefix_done:
                        prefix_buf += token
                        if len(prefix_buf) >= 10 or chunk.get("done"):
                            prefix_buf = re.sub(r"^메기\s*:\s*", "", prefix_buf)
                            prefix_done = True
                            token = prefix_buf
                            prefix_buf = ""
                        else:
                            if chunk.get("done"):
                                break
                            continue

                    if token:
                        full_reply += token
                        yield f"data: {json.dumps({'token': token})}\n\n"

                    if chunk.get("done"):
                        break

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            full_reply = "...연결이 불안정해요."

        # 히스토리 저장
        session_state["history"].append({"role": "user", "content": user_msg})
        session_state["history"].append({"role": "assistant", "content": full_reply.strip()})
        if len(session_state["history"]) > 20:
            session_state["history"] = session_state["history"][-20:]
        yield f"data: {json.dumps({'done': True, 'model': model})}\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})



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
    model = MLX_MODEL if is_mlx_ready() else get_ollama_model()
    print(f"Using model: {model}")
    app.run(port=5001, debug=False)
