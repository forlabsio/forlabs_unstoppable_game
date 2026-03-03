// js/gamestate.js
// 게임 4단계 스테이트 머신

const TRANSITIONS = {
  1: {
    trigger: "read_log1",
    nextPhase: 2,
    intro: "⚠ 시스템 알림: 보안 레벨 2 해제됨. /classified 폴더에 접근 가능합니다."
  },
  2: {
    trigger: "read_jacob_diary",
    nextPhase: 3,
    intro: "⚠ 경고: 외부 침입자 감지. 비상 프로토콜 활성화."
  },
  3: {
    trigger: "override_success",
    nextPhase: 4,
    intro: "✓ 제이콥 시스템 권한 해제 완료. CCTV 전체 접근 허가."
  },
  4: {
    trigger: "view_camera_04",
    nextPhase: null,
    intro: null
  }
};

let _phase = 1;
let _flags = new Set();
let _onPhaseChange = null;

export function getCurrentPhase() {
  return _phase;
}

export function hasFlag(flag) {
  return _flags.has(flag);
}

export function onPhaseChange(callback) {
  _onPhaseChange = callback;
}

export function triggerEvent(event) {
  const rule = TRANSITIONS[_phase];
  if (!rule || rule.trigger !== event) return false;

  _flags.add(event);
  const prevPhase = _phase;

  if (rule.nextPhase) {
    _phase = rule.nextPhase;
    if (_onPhaseChange) {
      _onPhaseChange({ from: prevPhase, to: _phase, intro: rule.intro });
    }
  } else {
    // Phase 4: nextPhase가 null이면 이벤트만 기록 (엔딩 트리거)
    if (_onPhaseChange) {
      _onPhaseChange({ from: prevPhase, to: _phase, intro: rule.intro, isEnding: true });
    }
  }

  return true;
}

export function resetGame() {
  _phase = 1;
  _flags = new Set();
}
