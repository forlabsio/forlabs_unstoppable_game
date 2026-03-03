# tests/test_terminal_parser.py

def parse_command(raw_input):
    """JS terminal.js parseCommand()의 Python 미러 — 테스트용"""
    parts = raw_input.strip().split()
    if not parts:
        return {"cmd": "", "args": []}
    return {"cmd": parts[0].lower(), "args": parts[1:]}

def test_empty_input():
    result = parse_command("")
    assert result["cmd"] == ""
    assert result["args"] == []

def test_help_command():
    result = parse_command("help")
    assert result["cmd"] == "help"
    assert result["args"] == []

def test_read_with_filename():
    result = parse_command("read log1.txt")
    assert result["cmd"] == "read"
    assert result["args"] == ["log1.txt"]

def test_cd_with_path():
    result = parse_command("cd /logs")
    assert result["cmd"] == "cd"
    assert result["args"] == ["/logs"]

def test_view_camera_with_number():
    result = parse_command("view_camera 04")
    assert result["cmd"] == "view_camera"
    assert result["args"] == ["04"]

def test_override_with_code():
    result = parse_command("override KAIMA-DELTA-7731")
    assert result["cmd"] == "override"
    assert result["args"] == ["KAIMA-DELTA-7731"]

def test_uppercase_normalized():
    result = parse_command("HELP")
    assert result["cmd"] == "help"

def test_ls_no_args():
    result = parse_command("ls")
    assert result["cmd"] == "ls"
    assert result["args"] == []

def test_pwd():
    result = parse_command("pwd")
    assert result["cmd"] == "pwd"
