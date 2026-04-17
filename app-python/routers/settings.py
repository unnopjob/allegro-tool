import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from lib.db import get_all_settings, get_setting, set_setting
from lib.gemini import test_key

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings():
    s = get_all_settings()
    stored_key = s.get("gemini_api_key", "")
    env_key    = os.getenv("GEMINI_API_KEY", "")
    return {
        "gemini_api_key": stored_key,
        "has_key": bool(stored_key or env_key),
    }


class SettingsIn(BaseModel):
    gemini_api_key: Optional[str] = None
    test: Optional[bool] = False


@router.put("")
def update_settings(body: SettingsIn):
    key_to_test = body.gemini_api_key or get_setting("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")

    if body.test:
        if not key_to_test:
            return {"success": False, "error": "ยังไม่ได้ใส่ API Key"}
        if test_key(key_to_test):
            if body.gemini_api_key:
                set_setting("gemini_api_key", body.gemini_api_key)
            return {"success": True}
        else:
            return {"success": False, "error": "API Key ไม่ถูกต้อง หรือ ไม่มีสิทธิ์ใช้งาน"}

    if body.gemini_api_key:
        set_setting("gemini_api_key", body.gemini_api_key)

    return {"success": True}
