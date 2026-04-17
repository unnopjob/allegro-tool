import os
from dotenv import load_dotenv
load_dotenv(".env.local")

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from routers import devices, settings, knowledge, chat, analysis, tools, allegro_proxy, ask

app = FastAPI(title="Allegro AI", docs_url=None, redoc_url=None)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(devices.router)
app.include_router(settings.router)
app.include_router(knowledge.router)
app.include_router(chat.router)
app.include_router(analysis.router)
app.include_router(tools.router)
app.include_router(allegro_proxy.router)
app.include_router(ask.router)

# ── Templates ─────────────────────────────────────────────────────────────────
templates = Jinja2Templates(directory="templates")

PAGES = {
    "/":           "dashboard.html",
    "/dashboard":  "dashboard.html",
    "/analysis":   "analysis.html",
    "/chat":       "chat.html",
    "/devices":    "devices.html",
    "/knowledge":  "knowledge.html",
    "/settings":   "settings.html",
    "/help":       "help.html",
}

for route, tmpl in PAGES.items():
    _tmpl = tmpl  # capture
    def _make_handler(t):
        async def handler(request: Request):
            return templates.TemplateResponse(t, {"request": request})
        return handler
    app.add_route(route, _make_handler(_tmpl), methods=["GET"])


if __name__ == "__main__":
    import uvicorn
    import webbrowser
    import threading

    def open_browser():
        import time; time.sleep(1.5)
        webbrowser.open("http://localhost:8000")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
