# Allegro AI — Network Troubleshooting Assistant

AI-powered network monitoring and troubleshooting dashboard สำหรับ [Allegro Network Multimeter](https://www.allegro-packets.com/)  
ขับเคลื่อนด้วย **Google Gemini 2.5 Flash**

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google)](https://aistudio.google.com/)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Real-time interface status, bandwidth, Network Health Score (0–100), auto-refresh ทุก 10 วินาที |
| 🔍 **AI Analysis** | วิเคราะห์ Overview / Security / Bandwidth / TCP Flow / Root Cause ด้วย Gemini AI |
| 🔗 **Path & Port Check** | Ping + Traceroute + TCP port test + Allegro flow lookup ในหน้าเดียว |
| 💬 **AI Chat** | สนทนากับ AI พร้อม Network Context สด + Knowledge Base ส่วนตัว |
| 📚 **Knowledge Base** | อัปโหลด PDF / TXT / CSV / JSON ให้ AI อ้างอิง (max 10 MB) |
| ⚙️ **Device Manager** | จัดการ Allegro device หลายเครื่อง, test connection, activate |
| 🌐 **EN / TH** | รองรับ 2 ภาษา อังกฤษ และ ไทย สลับได้ทันทีในหน้าเว็บ |
| 🪟 **Windows Ready** | ติดตั้ง Python → ดับเบิลคลิก `start.bat` → พร้อมใช้ |

---

## 🚀 Quick Start

### Windows (แนะนำ — ไม่ต้องใช้ Node.js หรือ C++ compiler)

1. ติดตั้ง [Python 3.11+](https://www.python.org/downloads/) — ติ๊ก **"Add Python to PATH"**
2. ดาวน์โหลด ZIP จาก **[Allegro-AI-for-Windows](https://github.com/unnopjob/Allegro-AI-for-Windows)**
3. แตกไฟล์ → ดับเบิลคลิก `windows\start.bat`
4. Browser เปิดอัตโนมัติที่ **http://localhost:8000**

> ครั้งแรกจะติดตั้ง packages อัตโนมัติ (~1–2 นาที) ครั้งต่อไปเปิดได้เลย

### macOS / Linux

```bash
cd app-python
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

เปิด http://localhost:8000

---

## ⚙️ การตั้งค่าครั้งแรก

### 1. Gemini API Key
ไปที่ **Settings** → ใส่ API Key → กด **Save & Test**

- รับฟรีที่ [Google AI Studio](https://aistudio.google.com) (ไม่ต้องใส่บัตรเครดิต)
- หรือตั้งไว้ใน `.env.local`: `GEMINI_API_KEY=AQ.Ab...`

> หมายเหตุ: Google เปลี่ยน format API key จาก `AIzaSy...` เป็น `AQ.Ab...` แล้ว ระบบรองรับทั้ง 2 แบบ

### 2. เพิ่ม Allegro Device
ไปที่ **Devices** → Add Device → ใส่ IP, Username, Password → กด **Activate**

- ใส่แค่ IP address (ไม่ต้องพิมพ์ `https://` ระบบเติมให้)
- รองรับ self-signed SSL certificate (ปิด Verify SSL ได้)
- ทดสอบการเชื่อมต่อได้ทันทีด้วยปุ่ม **Test**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | Jinja2 HTML, Tailwind CSS CDN, Vanilla JS |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK ≥ 1.10) |
| Storage | JSON files — ไม่ต้องติดตั้ง database |
| Allegro | httpx async client + async polling |

---

## 📁 Project Structure

```
allegro-tool/
├── app-python/                 ← Python app (main)
│   ├── app.py                  ← FastAPI entry point + auto browser open
│   ├── requirements.txt
│   ├── .env.local              ← GEMINI_API_KEY (สร้างอัตโนมัติ)
│   ├── lib/
│   │   ├── db.py               ← JSON file storage (atomic write)
│   │   ├── allegro.py          ← Allegro API async client + async polling
│   │   └── gemini.py           ← Gemini 2.5 Flash (stream + one-shot)
│   ├── routers/                ← FastAPI routers (8 ไฟล์)
│   │   ├── devices.py          ← Device CRUD + test + activate
│   │   ├── settings.py         ← Gemini API key management
│   │   ├── chat.py             ← Streaming chat (SSE)
│   │   ├── analysis.py         ← AI network analysis (SSE)
│   │   ├── knowledge.py        ← PDF/TXT/CSV/JSON upload
│   │   ├── tools.py            ← Ping / Traceroute / Port check
│   │   ├── allegro_proxy.py    ← Transparent proxy to Allegro device
│   │   └── ask.py              ← One-shot AI Q&A
│   ├── templates/              ← HTML pages (8 หน้า, bilingual)
│   └── data/                   ← Auto-created: devices.json, settings.json, etc.
├── windows/
│   └── start.bat               ← Windows launcher (venv + pip + run)
└── README.md
```

---

## 🔌 Allegro API Coverage

| Endpoint | ใช้ใน |
|---|---|
| `GET /API/stats/interfaces` | Dashboard — interface status & bandwidth |
| `GET /API/stats/modules/ip/ips_paged` | Dashboard — Top IPs by traffic |
| `GET /API/stats/modules/ip/ips/{ip}` | IP detail |
| `GET /API/stats/modules/ip/globalConnections` | Analysis — connections |
| `GET /API/info/system` | Device connection test |
| `GET /API/async/{id}?uuid={uuid}` | Async result polling |

---

## 🔒 Security Notes

- API Keys เก็บใน local JSON file ไม่ส่งออกไปที่ใด
- รองรับ self-signed SSL certificate ต่อ device
- Input validation บน IP address และ port ทุก endpoint
- ออกแบบสำหรับใช้ใน **LAN เท่านั้น** ไม่ควร expose ออก Internet โดยตรง

---

## 📋 Requirements

| | |
|---|---|
| **Runtime** | Python 3.11+ |
| **Allegro Device** | Allegro Network Multimeter (firmware 4.x+) |
| **AI Key** | Google Gemini API Key — รับฟรีที่ [aistudio.google.com](https://aistudio.google.com) |
| **Windows extras** | ไม่ต้องการ Node.js, Build Tools หรือ C++ compiler |

---

## ❓ Troubleshooting

| ปัญหา | วิธีแก้ |
|---|---|
| `Python not found` | ติดตั้ง Python ใหม่ ติ๊ก **"Add Python to PATH"** |
| `pip install failed` | ลองรัน `start.bat` อีกครั้ง หรือดู verbose output ที่แสดงขึ้นมา |
| เปิดเว็บไม่ได้ | รอ server start เสร็จ (~5 วินาที) แล้วเปิด http://localhost:8000 เอง |
| API Key ไม่ผ่าน | รับ Key ใหม่ที่ [aistudio.google.com](https://aistudio.google.com) |
| ต่อ Allegro ไม่ได้ | ตรวจ IP / Username / Password และ network connectivity |
| SSL error | ปิด "Verify SSL" ในหน้า Edit Device |

---

## 📝 Changelog

### v1.3 (2025-04)
- 🌐 เพิ่มระบบ 2 ภาษา EN / TH สลับได้ทันที บันทึกการตั้งค่าใน localStorage
- 🐛 แก้: แก้ไข Device โดยไม่กรอก Password ใหม่จะไม่ล้าง Password เดิม
- 🐛 แก้: Dashboard แสดงข้อความที่เข้าใจง่ายเมื่อยังไม่ได้ add Device
- ✨ Analysis result แสดง Markdown (headers, bold, bullet lists) แทน plain text
- 🔧 start.bat เพิ่ม pip upgrade และ verbose error output เมื่อ install ล้มเหลว

### v1.2 (2025-03)
- ✨ Upgrade Gemini SDK: `google-generativeai` → `google-genai` v1.10+
- ✨ เปลี่ยน model เป็น `gemini-2.5-flash`
- 🐛 รองรับ Google API Key format ใหม่ `AQ.Ab...` (เดิม `AIzaSy...`)
- 🐛 แก้ Delete Device ไม่ทำงาน, Edit Device 405 error
- 🐛 ช่อง IP ไม่ต้องพิมพ์ `https://` แล้ว

### v1.1 (2025-02)
- ✨ Python FastAPI rewrite (แทน Next.js — ไม่ต้องการ Node.js / C++ compiler)
- ✨ ระบบ Knowledge Base (PDF/TXT/CSV/JSON)
- ✨ Path & Port Check (Ping + Traceroute + TCP test)
- ✨ AI Chat พร้อม Network Context สด

---

## 🔗 Links

- 📦 **Windows Release**: [github.com/unnopjob/Allegro-AI-for-Windows](https://github.com/unnopjob/Allegro-AI-for-Windows)
- 🛠️ **Source Code**: [github.com/unnopjob/allegro-tool](https://github.com/unnopjob/allegro-tool)
- 🤖 **Gemini API**: [aistudio.google.com](https://aistudio.google.com)
- 📡 **Allegro**: [allegro-packets.com](https://www.allegro-packets.com/)

---

## 📄 License

MIT License — ใช้งานและแก้ไขได้อิสระ
