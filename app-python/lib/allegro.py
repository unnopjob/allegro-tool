import asyncio
import httpx
from typing import Optional
from lib.db import get_active_device


def _client(device: dict) -> httpx.AsyncClient:
    verify = bool(device.get("verify_ssl", 0))
    auth   = (device["username"], device["password"])
    return httpx.AsyncClient(
        base_url=device["url"].rstrip("/"),
        auth=auth,
        verify=verify,
        timeout=30,
    )


async def allegro_get(path: str, params: dict = None) -> dict:
    """GET from active Allegro device, handles async pattern automatically."""
    device = get_active_device()
    if not device:
        raise ValueError("No active device configured")

    async with _client(device) as client:
        resp = await client.get(path, params=params or {})
        resp.raise_for_status()
        data = resp.json()

    # Handle Allegro async pattern
    if isinstance(data, dict) and "asyncID" in data and "asyncUUID" in data:
        data = await _poll_async(device, data["asyncID"], data["asyncUUID"])

    return data


async def _poll_async(device: dict, async_id, async_uuid: str, retries: int = 10) -> dict:
    async with _client(device) as client:
        for i in range(retries):
            await asyncio.sleep(1 + i * 0.5)
            resp = await client.get(f"/API/async/{async_id}", params={"uuid": async_uuid})
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and data.get("status") == "pending":
                    continue
                return data
        raise TimeoutError("Allegro async request timed out")


async def allegro_request(method: str, path: str, body=None, params: dict = None) -> tuple:
    """Generic proxy request, returns (status_code, data)."""
    device = get_active_device()
    if not device:
        return 503, {"error": "No active device"}

    async with _client(device) as client:
        resp = await client.request(method, path, json=body, params=params or {})
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text}

    # async pattern
    if isinstance(data, dict) and "asyncID" in data and "asyncUUID" in data:
        data = await _poll_async(device, data["asyncID"], data["asyncUUID"])

    return resp.status_code, data
