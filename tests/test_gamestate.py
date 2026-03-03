# tests/test_gamestate.py
# 스테이트 머신 로직을 Python으로 검증 (JS 로직의 명세 확인용)

class GameStateMachine:
    """JS gamestate.js 로직의 Python 미러 — 테스트용"""
    TRANSITIONS = {
        1: {"trigger": "read_log1",        "next_phase": 2},
        2: {"trigger": "read_jacob_diary", "next_phase": 3},
        3: {"trigger": "override_success", "next_phase": 4},
        4: {"trigger": "view_camera_04",   "next_phase": None}
    }

    def __init__(self):
        self.phase = 1
        self.flags = set()

    def trigger(self, event):
        rule = self.TRANSITIONS.get(self.phase)
        if rule and rule["trigger"] == event:
            self.flags.add(event)
            if rule["next_phase"]:
                self.phase = rule["next_phase"]
            return True
        return False


def test_initial_phase():
    gsm = GameStateMachine()
    assert gsm.phase == 1

def test_phase1_to_2_on_read_log1():
    gsm = GameStateMachine()
    result = gsm.trigger("read_log1")
    assert result is True
    assert gsm.phase == 2

def test_wrong_trigger_does_not_advance():
    gsm = GameStateMachine()
    gsm.trigger("random_event")
    assert gsm.phase == 1

def test_phase2_to_3_on_read_jacob_diary():
    gsm = GameStateMachine()
    gsm.trigger("read_log1")
    gsm.trigger("read_jacob_diary")
    assert gsm.phase == 3

def test_phase3_to_4_on_override():
    gsm = GameStateMachine()
    gsm.trigger("read_log1")
    gsm.trigger("read_jacob_diary")
    gsm.trigger("override_success")
    assert gsm.phase == 4

def test_flags_recorded():
    gsm = GameStateMachine()
    gsm.trigger("read_log1")
    assert "read_log1" in gsm.flags

def test_phase4_no_further_transition():
    gsm = GameStateMachine()
    # Phase 4까지 진행
    gsm.trigger("read_log1")
    gsm.trigger("read_jacob_diary")
    gsm.trigger("override_success")
    assert gsm.phase == 4
    # Phase 4에서 view_camera_04는 플래그만 기록, 다음 페이즈 없음
    gsm.trigger("view_camera_04")
    assert gsm.phase == 4  # 변화 없음
