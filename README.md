# TERMINAL_KAIMA

텍스트 기반 터미널 심리 호러 게임

## LLM 설정 (Qwen3.5-27B)

### Apple Silicon (mlx_lm)
```bash
pip install mlx-lm
mlx_lm.server --model Qwen/Qwen3.5-27B --port 8000
```

### NVIDIA GPU (vLLM)
```bash
pip install vllm
vllm serve Qwen/Qwen3.5-27B --port 8000 --max-model-len 32768
```

## 게임 실행
```bash
# 1. LLM 서버 시작 (위 중 하나)
# 2. Flask 백엔드 실행
cd backend && pip install -r requirements.txt && python server.py

# 3. 프론트엔드 서빙
cd .. && python3 -m http.server 8080
# http://localhost:8080 접속
```

## 시스템 LLM 추론 도구 상태 (2026-03-03 기준)

| 도구 | 설치 여부 | 서버 실행 여부 | 비고 |
|------|-----------|----------------|------|
| Ollama | 있음 (`/opt/homebrew/bin/ollama`) | 미실행 | `ollama serve` 로 시작 가능 |
| mlx-lm | 없음 | - | Apple Silicon용, `pip install mlx-lm` 으로 설치 |
| vLLM | 없음 | - | NVIDIA GPU용, `pip install vllm` 으로 설치 |
| 로컬 추론서버 (port 8000) | - | 다른 서비스 실행 중 | ForLabs AutoTrade가 8000 포트 점유 |

### 권장 설정

현재 시스템에 **Ollama가 설치**되어 있으므로, Ollama를 활용하는 것을 권장합니다.

```bash
# Ollama 서버 시작
ollama serve

# Qwen 모델 다운로드 (별도 터미널)
ollama pull qwen2.5:latest

# 또는 OpenAI 호환 엔드포인트 사용 시 (port 11434)
# OLLAMA_BASE_URL=http://localhost:11434/v1 로 설정
```

> **주의**: 현재 port 8000은 다른 서비스가 사용 중입니다.
> Flask 백엔드 기본 포트를 5000으로 변경하거나, LLM 서버 포트를 조정하세요.
