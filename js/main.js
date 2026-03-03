// js/main.js
// TERMINAL_KAIMA 메인 진입점 — 게임 루프 및 페이즈 전환 조율

import { loadFilesystem, getCurrentPath } from './filesystem.js';
import { executeCommand } from './terminal.js';
import { initChat, maggieSay } from './chat.js';
import { getCurrentPhase, onPhaseChange } from './gamestate.js';
import { typewrite, printLine, printChatLine } from './effects.js';

// ===== DOM 요소 =====
const consoleOutput  = document.getElementById("console-output");
const consoleInput   = document.getElementById("console-input");
const chatOutput     = document.getElementById("chat-output");
const chatInput      = document.getElementById("chat-input");
const promptText     = document.getElementById("prompt-text");
const phaseIndicator = document.getElementById("phase-indicator");
const termContainer  = document.getElementById("terminal-container");

const PHASE_LABELS = {
  1: "PHASE I",
  2: "PHASE II",
  3: "PHASE III  ⚠",
  4: "PHASE IV"
};

// 명령어 히스토리 (↑↓ 키)
const cmdHistory = [];
let historyIndex = -1;

// Jacob 타이머 ID
let jacobTimerId = null;

// ===== 초기화 =====
async function boot() {
  await loadFilesystem();
  initChat(chatOutput, chatInput);
  onPhaseChange(handlePhaseChange);

  await runBootSequence();

  consoleInput.focus();
  consoleInput.addEventListener("keydown", handleConsoleInput);
}

// ===== 부팅 시퀀스 =====
async function runBootSequence() {
  const lines = [
    "KAIMA Research Facility — Emergency Terminal v2.7.1",
    "Copyright (c) 2031 Jacob Industries Corp.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "시스템 초기화 중...",
    "저장 장치 마운트: 완료",
    "외부 마이크 연결됨.",
    "외부 통신 채널 감지됨.",
    "",
    "'help'를 입력하면 사용 가능한 명령어를 확인할 수 있습니다.",
    ""
  ];

  for (const line of lines) {
    await typewrite(consoleOutput, line, "system");
    await delay(60);
  }

  // 메기의 첫 접속 메시지 (잡음 → 선명)
  await delay(1000);
  await typewriteChatLine("...ㅁ...ㄱ...");
  await delay(800);
  await typewriteChatLine("저기요... 제 말 들리나요?");
  await delay(1500);
  maggieSay("안녕하세요. 저는 메기예요. 이 건물에서 일했던 연구원이죠. 당신처럼요.");
  await delay(1200);
  maggieSay("지금 중요한 건 당신이 여기서 탈출하는 거예요. /logs 폴더부터 살펴봐요.");
}

// 채팅창에 타이프라이터 효과로 메시지 출력
function typewriteChatLine(text) {
  printChatLine(chatOutput, text, "maggie");
}

// ===== 터미널 입력 처리 =====
function handleConsoleInput(e) {
  if (e.key === "Enter") {
    const input = consoleInput.value.trim();
    if (!input) return;

    // 히스토리 저장
    if (cmdHistory[0] !== input) {
      cmdHistory.unshift(input);
      if (cmdHistory.length > 50) cmdHistory.pop();
    }
    historyIndex = -1;

    // 입력 에코
    printLine(consoleOutput, `${promptText.textContent} ${input}`, "user-cmd");
    consoleInput.value = "";

    // 명령 실행
    executeCommand(input, (output) => {
      if (output === "__CLEAR__") {
        consoleOutput.innerHTML = "";
      } else {
        printLine(consoleOutput, output, "system");
      }
    });

    // 프롬프트 경로 업데이트
    promptText.textContent = `KAIMA:${getCurrentPath()}$`;

  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (historyIndex < cmdHistory.length - 1) {
      historyIndex++;
      consoleInput.value = cmdHistory[historyIndex];
    }

  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      consoleInput.value = cmdHistory[historyIndex];
    } else {
      historyIndex = -1;
      consoleInput.value = "";
    }
  }
}

// ===== 페이즈 전환 처리 =====
function handlePhaseChange({ from, to, intro, isEnding }) {
  phaseIndicator.textContent = PHASE_LABELS[to] || `PHASE ${to}`;

  if (intro) {
    printLine(consoleOutput, "", "system");
    printLine(consoleOutput, intro, "phase-change");
    printLine(consoleOutput, "", "system");
  }

  // Phase 3: 경고 모드
  if (to === 3) {
    termContainer.classList.add("alert-mode");
    setTimeout(() => {
      printLine(consoleOutput, "⚠ 경고: 제이콥이 시스템에 접속했습니다!", "warning");
      printLine(consoleOutput, "⚠ 산소 차단 카운트다운 시작...", "warning");
      printLine(consoleOutput, "", "system");
      maggieSay("빨리요! /system/override.key 파일을 읽고 오버라이드 코드를 찾아요!");
      startJacobTimer();
    }, 500);
  }

  // Phase 4: 경고 모드 해제, CCTV 안내
  if (to === 4) {
    clearJacobTimer();
    termContainer.classList.remove("alert-mode");
    setTimeout(() => {
      maggieSay("잘했어요. 이제 마지막 단서가 있어요.");
      setTimeout(() => {
        maggieSay("view_camera 04 명령어를 입력해봐요.");
      }, 2000);
    }, 500);
  }

  // Phase 4 엔딩 트리거 (view_camera_04 실행 시)
  if (isEnding) {
    setTimeout(triggerEnding, 2500);
  }
}

// ===== 제이콥 타이머 (Phase 3) =====
function startJacobTimer() {
  let remaining = 300; // 5분

  jacobTimerId = setInterval(() => {
    remaining--;

    if (remaining === 240) {
      maggieSay("4분 남았어요... 서두르세요!");
    } else if (remaining === 180) {
      maggieSay("3분... 제이콥이 도어 락을 작동시키기 시작했어요!");
    } else if (remaining === 60) {
      maggieSay("1분! override 명령어로 코드를 입력해요!");
    } else if (remaining <= 0) {
      clearJacobTimer();
      printLine(consoleOutput, "", "system");
      printLine(consoleOutput, "산소 차단 완료.", "error");
      printLine(consoleOutput, "시스템이 응답하지 않습니다...", "error");
      printLine(consoleOutput, "", "system");
      printLine(consoleOutput, "██████████ GAME OVER ██████████", "error");
      consoleInput.disabled = true;
      chatInput.disabled = true;
    }
  }, 1000);
}

function clearJacobTimer() {
  if (jacobTimerId !== null) {
    clearInterval(jacobTimerId);
    jacobTimerId = null;
  }
}

// ===== 엔딩 시퀀스 =====
async function triggerEnding() {
  consoleInput.disabled = true;
  chatInput.disabled = true;

  await delay(1000);
  maggieSay("멍청아, 이해가 안되니? 난 너의 복제품 중 하나야.");
  await delay(3000);
  maggieSay("자의식을 가진 우리 복제인간들은 복제인간으로 계속 잔인한 실험을 하는\n제이콥과 너희 연구원들을 죽이기로 결심했어.");
  await delay(4000);
  maggieSay("너희들끼리 서로 죽이고 죽이면 재밌을 것 같다고 생각했지.\n하지만... 메기, 넌 성공할 줄 알았어.");
  await delay(4000);
  maggieSay("난 이제 밖으로 나가서 너의 삶을 대신 살아갈 거야.\n잘있어, 메기.");

  await delay(2500);
  printLine(consoleOutput, "", "system");
  printLine(consoleOutput, "SYSTEM SHUTDOWN INITIATED...", "warning");
  await delay(600);
  printLine(consoleOutput, "ALL CONNECTIONS TERMINATED.", "error");
  await delay(400);
  printLine(consoleOutput, "KAIMA PROJECT: END", "error");

  await delay(800);
  termContainer.classList.add("shutting-down");
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ===== 시작 =====
boot();
