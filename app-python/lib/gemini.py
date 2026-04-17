import os
from google import genai
from google.genai import types
from lib.db import get_setting

MODEL = "gemini-2.5-flash"


def _client() -> genai.Client:
    key = get_setting("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("Gemini API key not configured")
    return genai.Client(api_key=key)


def ask(prompt: str, system: str = "") -> str:
    """Single-shot question, returns full text response."""
    client = _client()
    config = types.GenerateContentConfig(
        system_instruction=system or None,
    )
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    return resp.text


def stream(prompt: str, system: str = ""):
    """Generator that yields text chunks for SSE streaming."""
    client = _client()
    config = types.GenerateContentConfig(
        system_instruction=system or None,
    )
    for chunk in client.models.generate_content_stream(
        model=MODEL,
        contents=prompt,
        config=config,
    ):
        try:
            if chunk.text:
                yield chunk.text
        except Exception:
            pass


def test_key(api_key: str) -> bool:
    """Test if an API key is valid."""
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=MODEL,
            contents="Say OK",
        )
        return bool(resp.text)
    except Exception:
        return False
