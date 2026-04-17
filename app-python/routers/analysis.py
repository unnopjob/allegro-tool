from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from lib.allegro import allegro_get
from lib.gemini import stream as gemini_stream
from lib.db import get_active_device, get_knowledge_files

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

ANALYSIS_TYPES = {
    "overview":   "วิเคราะห์ภาพรวมเครือข่าย สรุปสถานะ interface, bandwidth, packet loss และ top IP",
    "security":   "วิเคราะห์ความปลอดภัย หา IP น่าสงสัย, port scanning, traffic ผิดปกติ",
    "bandwidth":  "วิเคราะห์ Bandwidth ว่า interface ไหนใช้เยอะสุด, top talker คือใคร",
    "tcp":        "วิเคราะห์ TCP Flow: retransmission, connection failures, latency สูง",
    "rootcause":  "วิเคราะห์ Root Cause ของปัญหาที่พบ พร้อมแนะนำวิธีแก้ไข",
}


class AnalysisIn(BaseModel):
    type: str = "overview"
    question: Optional[str] = None


@router.post("")
async def analyze(body: AnalysisIn):
    device = get_active_device()
    if not device:
        from fastapi import HTTPException
        raise HTTPException(503, "No active device")

    # Gather data
    data_parts = []
    try:
        ifaces = await allegro_get("/API/stats/interfaces")
        data_parts.append(f"Interfaces:\n{str(ifaces)[:3000]}")
    except Exception as e:
        data_parts.append(f"Interfaces: error - {e}")

    try:
        top_ips = await allegro_get("/API/stats/modules/ip/ips_paged",
                                    {"page": 0, "pageSize": 20, "sortBy": "bytes", "sortOrder": "desc"})
        data_parts.append(f"Top IPs:\n{str(top_ips)[:2000]}")
    except Exception:
        pass

    try:
        conns = await allegro_get("/API/stats/modules/ip/globalConnections")
        data_parts.append(f"Connections:\n{str(conns)[:2000]}")
    except Exception:
        pass

    # Knowledge base
    kb = " ".join(f["content"] for f in get_knowledge_files())
    if kb:
        data_parts.append(f"Knowledge base:\n{kb[:4000]}")

    task = ANALYSIS_TYPES.get(body.type, ANALYSIS_TYPES["overview"])
    question = f"\n\nคำถามเพิ่มเติม: {body.question}" if body.question else ""

    prompt = f"""ข้อมูลเครือข่ายจาก Allegro Network Multimeter:

{chr(10).join(data_parts)}

งาน: {task}{question}

กรุณาวิเคราะห์และตอบเป็นภาษาไทย ใช้ bullet points และให้คำแนะนำที่เป็นรูปธรรม"""

    def generate():
        for chunk in gemini_stream(prompt, system="คุณคือผู้เชี่ยวชาญด้าน Network Analysis"):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
