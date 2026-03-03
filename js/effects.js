// js/effects.js
// CRT 터미널 시각 효과 유틸리티

const TYPEWRITER_SPEED_MS = 15; // 글자당 ms

/**
 * 텍스트를 타이프라이터 효과로 DOM 요소에 출력합니다.
 * @param {HTMLElement} container - 출력 컨테이너
 * @param {string} text - 출력할 텍스트
 * @param {string} cssClass - 라인 CSS 클래스 ('system' | 'error' | 'warning' | 'phase-change' | 'user-cmd')
 * @returns {Promise<void>} 출력 완료 시 resolve
 */
export function typewrite(container, text, cssClass = "system") {
  return new Promise(resolve => {
    const line = document.createElement("div");
    line.className = `output-line ${cssClass}`;
    container.appendChild(line);
    scrollToBottom(container);

    let i = 0;
    const tick = () => {
      if (i < text.length) {
        line.textContent += text[i++];
        scrollToBottom(container);
        setTimeout(tick, TYPEWRITER_SPEED_MS);
      } else {
        resolve();
      }
    };
    tick();
  });
}

/**
 * 텍스트를 즉시 출력합니다 (타이프라이터 없이). 멀티라인 지원.
 * "__CLEAR__" 전달 시 컨테이너를 비웁니다.
 * @param {HTMLElement} container
 * @param {string} text
 * @param {string} cssClass
 */
export function printLine(container, text, cssClass = "system") {
  if (text === "__CLEAR__") {
    container.innerHTML = "";
    return;
  }
  const lines = text.split("\n");
  lines.forEach(lineText => {
    const div = document.createElement("div");
    div.className = `output-line ${cssClass}`;
    div.textContent = lineText;
    container.appendChild(div);
  });
  scrollToBottom(container);
}

/**
 * 채팅 메시지 한 줄을 출력합니다.
 * @param {HTMLElement} container
 * @param {string} text
 * @param {'maggie'|'player'|'thinking'} sender
 */
export function printChatLine(container, text, sender = "maggie") {
  const div = document.createElement("div");
  div.className = `chat-line ${sender}`;
  div.textContent = text;
  container.appendChild(div);
  scrollToBottom(container);
}

/**
 * "..." 대기 표시를 추가합니다.
 * @param {HTMLElement} container
 * @returns {HTMLElement} 생성된 요소 (removeThinking으로 제거)
 */
export function showThinking(container) {
  const div = document.createElement("div");
  div.className = "chat-line thinking";
  div.id = "thinking-indicator";
  div.textContent = "...";
  container.appendChild(div);
  scrollToBottom(container);
  return div;
}

/**
 * "..." 대기 표시를 제거합니다.
 */
export function removeThinking() {
  const el = document.getElementById("thinking-indicator");
  if (el) el.remove();
}

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}
