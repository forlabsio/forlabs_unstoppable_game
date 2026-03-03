// js/terminal.js
// 터미널 커맨드 파서 및 실행기

import { listDir, readFile, changeDir, getCurrentPath } from './filesystem.js';
import { getCurrentPhase, triggerEvent } from './gamestate.js';

const HELP_TEXT = `
사용 가능한 명령어:
  help                   — 이 도움말 표시
  ls [경로]              — 디렉터리 목록 표시
  cd <경로>              — 디렉터리 이동  (cd .. 지원)
  read <파일>            — 파일 내용 출력
  pwd                    — 현재 경로 표시
  view_camera <번호>     — CCTV 카메라 영상 접근
  override <코드>        — 시스템 권한 오버라이드
  clear                  — 화면 지우기
`.trim();

const OVERRIDE_CODE = "KAIMA-DELTA-7731";

// CCTV 04 ASCII 아트 (엔딩 반전)
const CAMERA_04_ASCII = `
╔══════════════════════════════════════╗
║  CAMERA 04 — 격리 구역 B             ║
║  [흑백 영상 — 화질 저하]             ║
╠══════════════════════════════════════╣
║                                      ║
║       ░░░▒▒▒▓▓▓███▓▓▓▒▒▒░░░         ║
║     ▄▄███████████████████▄▄          ║
║    ████▀▀▀  ◉       ◉  ▀▀▀████      ║
║    ████     ___▲___      ████        ║
║    ████    ( ‿   ‿ )     ████        ║
║    ▀▀███████████████████▀▀           ║
║       ░░░▒▒▒▓▓▓███▓▓▓▒▒▒░░░         ║
║                                      ║
║  [모니터를 바라보며 웃고 있음]        ║
╚══════════════════════════════════════╝`.trim();

/**
 * 원시 입력 문자열을 파싱하여 {cmd, args} 반환
 * @param {string} rawInput
 * @returns {{cmd: string, args: string[]}}
 */
export function parseCommand(rawInput) {
  const parts = rawInput.trim().split(/\s+/);
  if (!parts[0]) return { cmd: "", args: [] };
  return { cmd: parts[0].toLowerCase(), args: parts.slice(1) };
}

/**
 * 커맨드를 실행하고 출력을 outputCallback으로 전달
 * @param {string} rawInput - 플레이어 입력 문자열
 * @param {function(string): void} outputCallback - 출력 처리 콜백
 * @returns {string|null} 스테이트 이벤트 트리거 이름 (없으면 null)
 */
export function executeCommand(rawInput, outputCallback) {
  const { cmd, args } = parseCommand(rawInput);
  const phase = getCurrentPhase();

  switch (cmd) {
    case "":
      return null;

    case "help":
      outputCallback(HELP_TEXT);
      break;

    case "pwd":
      outputCallback(getCurrentPath());
      break;

    case "clear":
      outputCallback("__CLEAR__");
      break;

    case "ls": {
      const path = args[0] || null;
      const result = listDir(path, phase);
      if (result.error) {
        outputCallback(`오류: ${result.error}`);
      } else {
        const header = `${result.path || getCurrentPath()}:`;
        outputCallback(header + "\n" + (result.entries.length ? result.entries.join("  ") : "(비어있음)"));
      }
      break;
    }

    case "cd": {
      if (!args[0]) {
        outputCallback("사용법: cd <경로>  또는  cd ..");
        break;
      }
      const result = changeDir(args[0]);
      if (result.error) {
        outputCallback(`오류: ${result.error}`);
      }
      // 성공 시 프롬프트는 main.js에서 자동 업데이트
      break;
    }

    case "read": {
      if (!args[0]) {
        outputCallback("사용법: read <파일명>");
        break;
      }
      const result = readFile(args[0], phase);
      if (result.error) {
        outputCallback(`오류: ${result.error}`);
      } else {
        outputCallback(result.content);
        // 스테이트 이벤트 트리거 체크 (파일명 기준)
        const filename = args[0].replace(/.*\//, "");
        if (filename === "log1.txt") {
          triggerEvent("read_log1");
        } else if (filename === "jacob_diary.txt") {
          triggerEvent("read_jacob_diary");
        }
      }
      break;
    }

    case "view_camera": {
      const camId = args[0];
      if (!camId) {
        outputCallback("사용법: view_camera <번호>");
        break;
      }
      if (camId === "04") {
        if (phase < 4) {
          outputCallback("접근 거부: 권한 레벨 4 필요. Camera 04는 잠겨 있습니다.");
        } else {
          outputCallback(CAMERA_04_ASCII);
          triggerEvent("view_camera_04");
        }
      } else {
        outputCallback(`Camera ${camId}: 신호 수신 중... [정 적]`);
      }
      break;
    }

    case "override": {
      const inputCode = args[0];
      if (!inputCode) {
        outputCallback("사용법: override <코드>");
        break;
      }
      if (phase !== 3) {
        outputCallback("오버라이드 시스템: 현재 비활성 상태.");
        break;
      }
      if (inputCode === OVERRIDE_CODE) {
        outputCallback("✓ 오버라이드 성공! 제이콥의 시스템 권한을 해제했습니다.");
        triggerEvent("override_success");
      } else {
        outputCallback("✗ 잘못된 코드입니다. 다시 시도하세요.");
      }
      break;
    }

    default:
      outputCallback(`명령어를 찾을 수 없습니다: '${cmd}'. 'help'를 입력하세요.`);
  }

  return null;
}
