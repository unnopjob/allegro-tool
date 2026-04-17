import io
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from lib.db import get_knowledge_files, add_knowledge_file, delete_knowledge_file, next_id

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("")
def list_files():
    files = get_knowledge_files()
    return [{"id": f["id"], "original_name": f["original_name"],
             "created_at": f["created_at"]} for f in files]


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")

    name = file.filename or "upload"
    ext  = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    content = ""

    if ext == "pdf":
        content = _extract_pdf(data)
    elif ext in ("txt", "csv", "json", "md"):
        content = data.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    files   = get_knowledge_files()
    new_id  = next_id(files)
    record  = {
        "id": new_id,
        "filename": f"{new_id}_{name}",
        "original_name": name,
        "content": content[:500_000],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    add_knowledge_file(record)
    return {"id": new_id, "original_name": name}


@router.delete("/{file_id}")
def remove_file(file_id: int):
    delete_knowledge_file(file_id)
    return {"success": True}


# ── PDF extraction ────────────────────────────────────────────────────────────

def _extract_pdf(data: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text
        return extract_text(io.BytesIO(data))
    except Exception as e:
        return f"[PDF extraction error: {e}]"
