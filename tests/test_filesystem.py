# tests/test_filesystem.py
import json
import os

FS_PATH = os.path.join(os.path.dirname(__file__), '../data/filesystem.json')

def load_fs():
    with open(FS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def test_root_exists():
    fs = load_fs()
    assert "/" in fs
    assert fs["/"]["type"] == "dir"

def test_all_dir_children_exist_as_paths():
    """디렉터리의 모든 children이 실제 경로로 존재하는지 검증"""
    fs = load_fs()
    for path, node in fs.items():
        if node["type"] == "dir" and "children" in node:
            for child in node["children"]:
                full = path.rstrip("/") + "/" + child
                assert full in fs, f"Missing: {full} (referenced from {path})"

def test_all_files_have_content():
    fs = load_fs()
    for path, node in fs.items():
        if node["type"] == "file":
            assert "content" in node, f"No content in {path}"
            assert len(node["content"]) > 0, f"Empty content in {path}"

def test_log1_contains_kaima():
    fs = load_fs()
    assert "KAIMA" in fs["/logs/log1.txt"]["content"]

def test_override_key_unlocks_in_phase3():
    fs = load_fs()
    node = fs["/system/override.key"]
    assert node.get("unlock_phase") == 3
    assert "KAIMA-DELTA-7731" in node.get("unlocked_content", "")

def test_phase_gating():
    """phase_required가 있는 파일은 해당 값이 정수인지 확인"""
    fs = load_fs()
    for path, node in fs.items():
        if "phase_required" in node:
            assert isinstance(node["phase_required"], int), f"phase_required must be int: {path}"
            assert 1 <= node["phase_required"] <= 4, f"phase_required out of range: {path}"
