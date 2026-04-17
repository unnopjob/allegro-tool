import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from lib.db import (get_active_device, get_knowledge_files,
                    get_chat_history, add_chat_message,
                    prune_old_chat_history, next_id)
from lib.gemini import stream as gemini_stream
from lib.allegro import allegro_get

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM = """คุณคือ Network AI Assistant ผู้เชี่ยวชาญด้านเครือข่าย
วิเคราะห์ข้อมูลจาก Allegro Network Multimeter และตอบเป็นภาษาไทย
ให้คำแนะนำที่ชัดเจน เป็นรูปธรรม และนำไปใช้ได้จริง"""


class ChatIn(BaseModel):
    message: str
    session_id: str = "default"
    include_network_context: Optional[bool] = True


@router.post("")
async def chat(body: ChatIn):
    prune_old_chat_history(30)

    # Build context
    context_parts = []

    if body.include_network_context:
        try:
            ifaces = await allegro_get("/API/stats/interfaces")
            context_parts.append(f"Network interfaces: {str(ifaces)[:2000]}")
        except Exception:
            pass

    # Knowledge base
    kb_text = " ".join(f["content"] for f in get_knowledge_files())
    if kb_text:
        context_parts.append(f"Knowledge base:\n{kb_text[:6000]}")

    # Chat history
    history = get_chat_history(body.session_id)[-20:]
    history_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}"
        for m in history
    )

    prompt_parts = []
    if context_parts:
        prompt_parts.append("=== Network Context ===\n" + "\n\n".join(context_parts))
    if history_text:
        prompt_parts.append("=== Chat History ===\n" + history_text)
    prompt_parts.append(f"User: {body.message}")

    full_prompt = "\n\n".join(prompt_parts)

    # Save user message
    msgs = get_chat_history(body.session_id)
    add_chat_message({
        "id": next_id(msgs),
        "session_id": body.session_id,
        "role": "user",
        "content": body.message,
        "ts": time.time(),
    })

    collected = []

    def generate():
        for chunk in gemini_stream(full_prompt, system=SYSTEM):
            collected.append(chunk)
            yield f"data: {chunk}\n\n"
        # Save AI response
        all_msgs = get_chat_history(body.session_id)
        add_chat_message({
            "id": next_id(all_msgs),
            "session_id": body.session_id,
            "role": "assistant",
            "content": "".join(collected),
            "ts": time.time(),
        })
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/history/{session_id}")
def get_history(session_id: str):
    return get_chat_history(session_id)


@router.delete("/history/{session_id}")
def clear_history(session_id: str):
    from lib.db import _read, _write, CHAT_FILE
    history = [m for m in _read(CHAT_FILE, []) if m["session_id"] != session_id]
    _write(CHAT_FILE, history)
    return {"success": True}
