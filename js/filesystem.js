// js/filesystem.js
// 가상 파일시스템 모듈 — 게임 세계관 파일들을 관리합니다.

let _fs = null;
let _currentPath = "/home";

export async function loadFilesystem() {
  const resp = await fetch("data/filesystem.json");
  _fs = await resp.json();
}

export function getCurrentPath() {
  return _currentPath;
}

export function listDir(path, phase) {
  const fullPath = resolvePath(path);
  const node = _fs[fullPath];
  if (!node) return { error: `디렉터리를 찾을 수 없습니다: ${fullPath}` };
  if (node.type !== "dir") return { error: `${fullPath}: 디렉터리가 아닙니다` };
  if (node.phase_required && phase < node.phase_required) {
    return { error: "접근 거부: 권한이 부족합니다." };
  }
  return { entries: node.children || [], path: fullPath };
}

export function readFile(path, phase) {
  const fullPath = resolvePath(path);
  const node = _fs[fullPath];
  if (!node) return { error: `파일을 찾을 수 없습니다: ${fullPath}` };
  if (node.type !== "file") return { error: `${fullPath}: 파일이 아닙니다 (디렉터리)` };
  if (node.phase_required && phase < node.phase_required) {
    return { error: "접근 거부: 보안 등급 부족." };
  }
  // 특별 잠금 해제 체크
  if (node.unlock_phase && phase >= node.unlock_phase) {
    return { content: node.unlocked_content, path: fullPath };
  }
  return { content: node.content, path: fullPath };
}

export function changeDir(path) {
  const fullPath = resolvePath(path);
  const node = _fs[fullPath];
  if (!node) return { error: `디렉터리를 찾을 수 없습니다: ${fullPath}` };
  if (node.type !== "dir") return { error: `${fullPath}: 디렉터리가 아닙니다` };
  _currentPath = fullPath;
  return { success: true, path: _currentPath };
}

export function resolvePath(input) {
  if (!input || input === "~") return "/home";
  if (input.startsWith("/")) return input;
  if (input === "..") {
    const parts = _currentPath.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/") || "/";
  }
  const base = _currentPath === "/" ? "" : _currentPath;
  return base + "/" + input;
}
