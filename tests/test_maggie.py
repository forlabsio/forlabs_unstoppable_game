# tests/test_maggie.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../backend'))
from maggie import build_maggie_prompt

def test_prompt_contains_character_name():
    prompt = build_maggie_prompt(phase=1, history=[], user_msg="안녕하세요")
    assert "메기" in prompt

def test_prompt_includes_user_message():
    prompt = build_maggie_prompt(phase=1, history=[], user_msg="탈출할 수 있어?")
    assert "탈출할 수 있어?" in prompt

def test_prompt_phase2_contains_kaima_context():
    prompt = build_maggie_prompt(phase=2, history=[], user_msg="")
    assert "KAIMA" in prompt

def test_prompt_phase3_contains_jacob_context():
    prompt = build_maggie_prompt(phase=3, history=[], user_msg="")
    assert "제이콥" in prompt or "Jacob" in prompt

def test_history_injected():
    history = [
        {"role": "user", "content": "이전 질문"},
        {"role": "assistant", "content": "이전 답변"}
    ]
    prompt = build_maggie_prompt(phase=1, history=history, user_msg="새 질문")
    assert "이전 질문" in prompt

def test_phase4_has_cold_tone_context():
    prompt = build_maggie_prompt(phase=4, history=[], user_msg="")
    # Phase 4에서는 복제품 정체 드러남 — 관련 키워드 포함 여부 확인
    assert "복제" in prompt or "clone" in prompt.lower() or "냉소" in prompt or "가면" in prompt
