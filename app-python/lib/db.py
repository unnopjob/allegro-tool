import json
import os
import time
import uuid
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

DEVICES_FILE    = DATA_DIR / "devices.json"
KNOWLEDGE_FILE  = DATA_DIR / "knowledge.json"
CHAT_FILE       = DATA_DIR / "chat_history.json"
SETTINGS_FILE   = DATA_DIR / "settings.json"


# ── low-level helpers ────────────────────────────────────────────────────────

def _read(path: Path, default):
    try:
        text = path.read_text(encoding="utf-8").strip()
        return json.loads(text) if text else default
    except Exception:
        return default

def _write(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)          # atomic on all platforms


# ── settings ─────────────────────────────────────────────────────────────────

def get_setting(key: str) -> Optional[str]:
    return _read(SETTINGS_FILE, {}).get(key)

def set_setting(key: str, value: str) -> None:
    data = _read(SETTINGS_FILE, {})
    data[key] = value
    _write(SETTINGS_FILE, data)

def get_all_settings() -> dict:
    return _read(SETTINGS_FILE, {})


# ── devices ──────────────────────────────────────────────────────────────────

def get_devices() -> list:
    return _read(DEVICES_FILE, [])

def get_active_device() -> Optional[dict]:
    return next((d for d in get_devices() if d.get("is_active")), None)

def add_device(device: dict) -> None:
    devices = get_devices()
    devices.append(device)
    _write(DEVICES_FILE, devices)

def update_device(device_id: str, updates: dict) -> None:
    devices = get_devices()
    for d in devices:
        if d["id"] == device_id:
            d.update(updates)
    _write(DEVICES_FILE, devices)

def delete_device(device_id: str) -> None:
    devices = [d for d in get_devices() if d["id"] != device_id]
    _write(DEVICES_FILE, devices)

def set_active_device(device_id: str) -> bool:
    devices = get_devices()
    if not any(d["id"] == device_id for d in devices):
        return False
    for d in devices:
        d["is_active"] = 1 if d["id"] == device_id else 0
    _write(DEVICES_FILE, devices)
    return True


# ── knowledge ────────────────────────────────────────────────────────────────

def get_knowledge_files() -> list:
    return _read(KNOWLEDGE_FILE, [])

def add_knowledge_file(file: dict) -> None:
    files = get_knowledge_files()
    files.append(file)
    _write(KNOWLEDGE_FILE, files)

def delete_knowledge_file(file_id: int) -> None:
    files = [f for f in get_knowledge_files() if f["id"] != file_id]
    _write(KNOWLEDGE_FILE, files)


# ── chat history ─────────────────────────────────────────────────────────────

def get_chat_history(session_id: str) -> list:
    return [m for m in _read(CHAT_FILE, []) if m["session_id"] == session_id]

def add_chat_message(msg: dict) -> None:
    history = _read(CHAT_FILE, [])
    history.append(msg)
    _write(CHAT_FILE, history)

def prune_old_chat_history(days: int = 30) -> None:
    cutoff = time.time() - days * 86400
    history = [m for m in _read(CHAT_FILE, []) if m.get("ts", 0) > cutoff]
    _write(CHAT_FILE, history)


# ── id helper ────────────────────────────────────────────────────────────────

def next_id(items: list) -> int:
    return max((item.get("id", 0) for item in items), default=0) + 1

def new_uuid() -> str:
    return str(uuid.uuid4())
