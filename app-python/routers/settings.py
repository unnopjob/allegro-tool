import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from lib.db import get_all_settings, get_setting, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings():
    s = get_all_settings()
    return {
        "gemini_api_key": s.get("gemini_api_key", ""),
        "has_key": bool(s.get("gemini_api_key") or os.getenv("GEMINI_API_KEY")),
    }


class SettingsIn(BaseModel):
    gemini_api_key: Optional[str] = None
    test: Optional[bool] = False


@router.put("")
def update_settings(body: SettingsIn):
    key_to_test = body.gemini_api_key or get_setting("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")

    if body.test:
        if not key_to_test:
            return {"success": False, "error": "No API key provided"}
        try:
            genai.configure(api_key=key_to_test)
            model = genai.GenerativeModel("gemini-2.0-flash")
            resp  = model.generate_content("Say OK")
            if resp.text:
                if body.gemini_api_key:
                    set_setting("gemini_api_key", body.gemini_api_key)
                return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    if body.gemini_api_key:
        set_setting("gemini_api_key", body.gemini_api_key)

    return {"success": True}
