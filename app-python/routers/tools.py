import asyncio
import re
import socket
import subprocess
import sys
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from lib.allegro import allegro_get

router = APIRouter(prefix="/api/tools", tags=["tools"])

IP_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")


def valid_ip(ip: str) -> bool:
    return bool(IP_RE.match(ip))


class PathCheckIn(BaseModel):
    src_ip: Optional[str] = None
    dst_ip: str
    dst_port: Optional[int] = None
    protocol: Optional[str] = "TCP"


@router.post("/pathcheck")
async def pathcheck(body: PathCheckIn):
    if not valid_ip(body.dst_ip):
        raise HTTPException(400, "Invalid destination IP")
    if body.src_ip and not valid_ip(body.src_ip):
        raise HTTPException(400, "Invalid source IP")

    results = {}

    # ── Ping ──────────────────────────────────────────────────────────────────
    results["ping"] = await _ping(body.dst_ip)

    # ── Traceroute ────────────────────────────────────────────────────────────
    results["traceroute"] = await _traceroute(body.dst_ip)

    # ── TCP Port check ────────────────────────────────────────────────────────
    if body.dst_port:
        results["port_check"] = await _tcp_port(body.dst_ip, body.dst_port)

    # ── Allegro flow lookup ───────────────────────────────────────────────────
    try:
        if body.dst_port:
            flows = await allegro_get(
                "/API/stats/modules/ip/globalConnections",
                {"filter": f"port:{body.dst_port}"},
            )
        elif body.src_ip:
            flows = await allegro_get(
                f"/API/stats/modules/ip/ips/{body.dst_ip}/connections",
            )
        else:
            flows = None
        if flows:
            results["allegro_flows"] = flows
    except Exception:
        pass

    return results


# ── helpers ───────────────────────────────────────────────────────────────────

async def _ping(ip: str) -> dict:
    is_win = sys.platform == "win32"
    cmd    = ["ping", "-n" if is_win else "-c", "4", ip]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=15)
        output = stdout.decode("utf-8", errors="ignore")

        # Extract avg RTT
        rtt = None
        if is_win:
            m = re.search(r"Average = (\d+)ms", output)
        else:
            m = re.search(r"min/avg/max[^=]+=\s*[\d.]+/([\d.]+)/", output)
        if m:
            rtt = float(m.group(1))

        loss = None
        m2 = re.search(r"(\d+)%\s*(?:packet\s*)?loss", output, re.IGNORECASE)
        if m2:
            loss = int(m2.group(1))

        return {"success": proc.returncode == 0, "rtt_ms": rtt,
                "packet_loss": loss, "output": output[:800]}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _traceroute(ip: str) -> list:
    is_win = sys.platform == "win32"
    cmd    = ["tracert", "-d", "-w", "1000", ip] if is_win else \
             ["traceroute", "-n", "-w", "2", ip]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=45)
        output = stdout.decode("utf-8", errors="ignore")
        return _parse_traceroute(output, is_win)
    except Exception as e:
        return [{"hop": 0, "ip": "error", "rtt_ms": None, "error": str(e)}]


def _parse_traceroute(output: str, is_win: bool) -> list:
    hops = []
    for line in output.splitlines():
        if is_win:
            m = re.match(r"\s*(\d+)\s+(?:<1|(\d+))\s*ms.*?([\d.]+)\s*$", line)
            if m:
                rtt = float(m.group(2)) if m.group(2) else 0.5
                hops.append({"hop": int(m.group(1)), "ip": m.group(3), "rtt_ms": rtt})
        else:
            m = re.match(r"\s*(\d+)\s+(?:\* |(\d+\.?\d*)\s*ms\s+)([\d.]+)", line)
            if m:
                hops.append({"hop": int(m.group(1)),
                              "ip": m.group(3),
                              "rtt_ms": float(m.group(2)) if m.group(2) else None})
    return hops


async def _tcp_port(ip: str, port: int) -> dict:
    loop = asyncio.get_event_loop()
    try:
        import time
        t0 = time.monotonic()
        conn = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(conn, timeout=5)
        latency = round((time.monotonic() - t0) * 1000, 1)
        # Try grab banner
        banner = ""
        try:
            data = await asyncio.wait_for(reader.read(256), timeout=2)
            banner = data.decode("utf-8", errors="ignore").strip()
        except Exception:
            pass
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return {"open": True, "latency_ms": latency, "banner": banner}
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return {"open": False, "latency_ms": None, "banner": ""}
