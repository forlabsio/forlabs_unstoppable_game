// js/chat.js
// 메기(Maggie) 채팅창 UI 및 백엔드 API 연동

import { printChatLine, showThinking, removeThinking } from './effects.js';
import { getCurrentPhase } from './gamestate.js';

const BACKEND_URL = "http://localhost:5001";
let _chatOutput = null;

// 백엔드 미연결 시 폴백 응답 풀
const FALLBACK_RESPONSES = [
  "그건 지금 중요하지 않아요. 어서 문을 열 방법을 찾아봐요.",
  "터미널 명령어를 사용해서 단서를 찾아봐요. 'help'를 치면 명령어 목록이 나와요.",
  "...시스템 연결이 불안정해요. 어서 여기서 나가야 해요.",
  "제발 빨리요. 시간이 없어요.",
];
let _fallbackIdx = 0;

/**
 * 채팅 시스템 초기화
 * @param {HTMLElement} chatOutputEl - 채팅 출력 영역
 * @param {HTMLElement} chatInputEl - 채팅 입력창
 */
export function initChat(chatOutputEl, chatInputEl) {
  _chatOutput = chatOutputEl;

  chatInputEl.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const msg = chatInputEl.value.trim();
    if (!msg) return;
    chatInputEl.value = "";
    await sendMessage(msg);
  });
}

/**
 * 메기에게 메시지를 전송하고 스트리밍으로 응답을 표시합니다.
 * @param {string} userText
 */
async function sendMessage(userText) {
  printChatLine(_chatOutput, userText, "player");

  // 스트리밍 응답을 표시할 빈 말풍선 생성
  const replyDiv = document.createElement("div");
  replyDiv.className = "chat-line maggie";
  _chatOutput.appendChild(replyDiv);
  _chatOutput.scrollTop = _chatOutput.scrollHeight;

  try {
    const resp = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText, phase: getCurrentPhase() })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 라인 파싱
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 미완성 라인은 버퍼에 보관

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.token) {
          replyDiv.textContent += payload.token;
          _chatOutput.scrollTop = _chatOutput.scrollHeight;
        }
      }
    }

    // 응답이 비어있으면 폴백
    if (!replyDiv.textContent.trim()) {
      replyDiv.textContent = FALLBACK_RESPONSES[_fallbackIdx % FALLBACK_RESPONSES.length];
      _fallbackIdx++;
    }

  } catch (_err) {
    if (!replyDiv.textContent.trim()) {
      replyDiv.textContent = FALLBACK_RESPONSES[_fallbackIdx % FALLBACK_RESPONSES.length];
      _fallbackIdx++;
    }
  }
}

/**
 * 시스템에서 메기의 말을 직접 출력합니다 (스토리 진행용).
 * @param {string} text
 */
export function maggieSay(text) {
  if (!_chatOutput) return;
  printChatLine(_chatOutput, text, "maggie");
}
