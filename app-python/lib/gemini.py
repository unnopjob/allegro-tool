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
    """Generator that yields text chunks for SSE streaming (single-turn)."""
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


def stream_conversation(prev_turns: list, current_message: str, system: str = ""):
    """Multi-turn conversation using Gemini Chat API.
    prev_turns = [{"role": "user"|"model", "text": "..."}]  ← previous turns only
    current_message = the new user message to send now
    """
    client = _client()
    config = types.GenerateContentConfig(
        system_instruction=system or None,
    )
    # Build history from previous turns
    history = [
        types.Content(
            role=t["role"],
            parts=[types.Part(text=t["text"])]
        )
        for t in prev_turns
    ]
    # Create chat session pre-loaded with history
    chat = client.chats.create(model=MODEL, config=config, history=history)
    # Stream the current message
    for chunk in chat.send_message_stream(current_message):
        try:
            if chunk.text:
                yield chunk.text
        except Exception:
            pass


def test_key(api_key: str) -> bool:
    """Test if an API key is valid by listing models (no quota used)."""
    try:
        client = genai.Client(api_key=api_key)
        # Use models.list() — lightweight call, no quota consumed
        models = list(client.models.list())
        return len(models) > 0
    except Exception:
        return False
