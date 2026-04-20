import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
import httpx
from lib.db import get_devices, add_device, update_device, delete_device, set_active_device, new_uuid

router = APIRouter(prefix="/api/devices", tags=["devices"])


class DeviceIn(BaseModel):
    name: str
    url: str
    username: str
    password: str = ""           # optional on edit — empty string = keep existing
    verify_ssl: int = 0

    @field_validator("verify_ssl", mode="before")
    @classmethod
    def coerce_verify_ssl(cls, v):
        # Accept boolean from frontend (true/false) and store as int (1/0)
        if isinstance(v, bool):
            return int(v)
        return int(v)


@router.get("")
def list_devices():
    return get_devices()


@router.post("")
def create_device(body: DeviceIn):
    device = {
        "id": new_uuid(),
        "name": body.name,
        "url": body.url.rstrip("/"),
        "username": body.username,
        "password": body.password,
        "verify_ssl": body.verify_ssl,
        "is_active": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    add_device(device)
    return device


@router.put("/{device_id}")
def update_device_handler(device_id: str, body: DeviceIn):
    devices = get_devices()
    existing = next((d for d in devices if d["id"] == device_id), None)
    if not existing:
        raise HTTPException(404, "ไม่พบ device")
    updates = {
        "name": body.name,
        "url": body.url.rstrip("/"),
        "username": body.username,
        "verify_ssl": body.verify_ssl,
    }
    # Only update password if a new one was provided; otherwise keep existing
    if body.password:
        updates["password"] = body.password
    update_device(device_id, updates)
    return {"success": True}


@router.delete("/{device_id}")
def remove_device(device_id: str):
    if not device_id:
        raise HTTPException(400, "กรุณาระบุ id")
    delete_device(device_id)
    return {"success": True}


@router.post("/{device_id}/activate")
def activate_device(device_id: str):
    if not set_active_device(device_id):
        raise HTTPException(404, "ไม่พบ device")
    return {"success": True}


@router.get("/{device_id}/test")
async def test_device(device_id: str):
    devices = get_devices()
    device  = next((d for d in devices if d["id"] == device_id), None)
    if not device:
        raise HTTPException(404, "ไม่พบ device")

    verify = bool(device.get("verify_ssl", 0))
    try:
        async with httpx.AsyncClient(
            base_url=device["url"],
            auth=(device["username"], device["password"]),
            verify=verify,
            timeout=10,
        ) as client:
            resp = await client.get("/API/info/system")
            if resp.status_code == 200:
                return {"success": True, "data": resp.json()}
            return {"success": False, "status": resp.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}
