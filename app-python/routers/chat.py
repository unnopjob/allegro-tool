import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from lib.db import (get_knowledge_files, get_chat_history,
                    add_chat_message, prune_old_chat_history, next_id)
from lib.gemini import stream_conversation
from lib.allegro import allegro_get

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM = """คุณคือ Network AI Assistant ผู้เชี่ยวชาญด้านเครือข่าย
วิเคราะห์ข้อมูลจาก Allegro Network Multimeter และตอบเป็นภาษาไทย
ให้คำแนะนำที่ชัดเจน เป็นรูปธรรม และนำไปใช้ได้จริง
จำบทสนทนาก่อนหน้าและตอบต่อเนื่องได้"""


class ChatIn(BaseModel):
    message: str
    session_id: str = "default"
    include_network_context: Optional[bool] = True


@router.post("")
async def chat(body: ChatIn):
    prune_old_chat_history(30)

    # ── Build system context (injected as first user turn) ───────────────────
    context_parts = []

    if body.include_network_context:
        try:
            ifaces = await allegro_get("/API/stats/interfaces")
            context_parts.append(f"ข้อมูล Network interfaces: {str(ifaces)[:2000]}")
        except Exception:
            pass

    kb_text = " ".join(f["content"] for f in get_knowledge_files())
    if kb_text:
        context_parts.append(f"Knowledge base:\n{kb_text[:6000]}")

    # ── Load previous turns (max 20 messages = 10 back-and-forth) ────────────
    prev = get_chat_history(body.session_id)[-20:]

    # ── Build prev_turns for Gemini Chat history ──────────────────────────────
    # Gemini requires strictly alternating user/model turns.
    # We inject network context as an opening user/model exchange if available.
    prev_turns = []

    if context_parts:
        prev_turns.append({"role": "user",  "text": "ข้อมูลบริบทเพิ่มเติม:\n" + "\n\n".join(context_parts)})
        prev_turns.append({"role": "model", "text": "รับทราบข้อมูลบริบทแล้วครับ พร้อมช่วยเหลือ"})

    for msg in prev:
        role = "user" if msg["role"] == "user" else "model"
        prev_turns.append({"role": role, "text": msg["content"]})

    # ── Save user message to DB now (before streaming) ────────────────────────
    msgs = get_chat_history(body.session_id)
    add_chat_message({
        "id": next_id(msgs),
        "session_id": body.session_id,
        "role": "user",
        "content": body.message,
        "ts": time.time(),
    })

    ai_response = []

    def generate():
        try:
            for chunk in stream_conversation(prev_turns, body.message, system=SYSTEM):
                ai_response.append(chunk)
                yield f"data: {chunk}\n\n"
        except ValueError as e:
            yield f"data: ⚠️ {e}\n\n"
        except Exception as e:
            yield f"data: ⚠️ Error: {e}\n\n"
        finally:
            # Save AI response regardless of success/failure
            if ai_response:
                full_reply = "".join(ai_response)
                all_msgs = get_chat_history(body.session_id)
                add_chat_message({
                    "id": next_id(all_msgs),
                    "session_id": body.session_id,
                    "role": "assistant",
                    "content": full_reply,
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
