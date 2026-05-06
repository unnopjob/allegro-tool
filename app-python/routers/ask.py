from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from lib.gemini import ask as gemini_ask

router = APIRouter(prefix="/api/ask", tags=["ask"])


class AskIn(BaseModel):
    question: str
    context: Optional[str] = ""


@router.post("")
def ask(body: AskIn):
    try:
        safe_context = (body.context or "")[:4000]
        prompt = f"{safe_context}\n\nคำถาม: {body.question}" if safe_context else body.question
        answer = gemini_ask(prompt, system="คุณคือผู้เชี่ยวชาญด้านเครือข่าย ตอบสั้น กระชับ เป็นภาษาไทย")
        return {"answer": answer}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}")
