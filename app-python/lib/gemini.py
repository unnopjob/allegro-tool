import os
import google.generativeai as genai
from lib.db import get_setting

MODEL = "gemini-2.0-flash"

def _configure():
    key = get_setting("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("Gemini API key not configured")
    genai.configure(api_key=key)


def ask(prompt: str, system: str = "") -> str:
    """Single-shot question, returns full text response."""
    _configure()
    model = genai.GenerativeModel(MODEL, system_instruction=system or None)
    resp  = model.generate_content(prompt)
    return resp.text


def stream(prompt: str, system: str = ""):
    """Generator that yields text chunks for SSE streaming."""
    _configure()
    model = genai.GenerativeModel(MODEL, system_instruction=system or None)
    for chunk in model.generate_content(prompt, stream=True):
        try:
            yield chunk.text
        except Exception:
            pass
