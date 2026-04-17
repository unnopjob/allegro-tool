from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from lib.allegro import allegro_request

router = APIRouter(prefix="/api/allegro", tags=["allegro"])


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(path: str, request: Request):
    body = None
    if request.method in ("POST", "PUT"):
        try:
            body = await request.json()
        except Exception:
            pass

    params = dict(request.query_params)
    status, data = await allegro_request(
        request.method, f"/{path}", body=body, params=params
    )
    return JSONResponse(content=data, status_code=status)
