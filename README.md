# Allegro AI — Network Troubleshooting Assistant

AI-powered network monitoring and troubleshooting dashboard สำหรับ [Allegro Network Multimeter](https://www.allegro-packets.com/)  
ขับเคลื่อนด้วย **Google Gemini 2.5 Flash**

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Real-time interface status, bandwidth, Network Health Score (0–100) |
| 🔍 **AI Analysis** | วิเคราะห์ภาพรวม, Security, Bandwidth, TCP Flow, Root Cause |
| 🔗 **Path & Port Check** | Ping + Traceroute + TCP Port connect test + Allegro flow lookup |
| 💬 **AI Chat** | สนทนากับ AI พร้อม Network Context สด + Knowledge Base |
| 📚 **Knowledge Base** | อัปโหลด PDF/TXT/CSV/JSON ให้ AI อ้างอิง (max 10MB) |
| ⚙️ **Device Manager** | จัดการ Allegro device หลายเครื่อง, test connection |
| 🪟 **Windows Ready** | ติดตั้ง Python → ดับเบิลคลิก `start.bat` → เสร็จ |

---

## 🚀 Quick Start

### Windows (แนะนำ)

1. ติดตั้ง [Python 3.11+](https://www.python.org/downloads/) — ติ๊ก **"Add Python to PATH"**
2. ดาวน์โหลด ZIP จาก [Allegro-AI-for-Windows](https://github.com/unnopjob/Allegro-AI-for-Windows)
3. แตกไฟล์ → ดับเบิลคลิก `windows\start.bat`
4. Browser เปิดอัตโนมัติ → **http://localhost:8000**

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
- รับฟรีที่ [Google AI Studio](https://aistudio.google.com)
- หรือสร้างไฟล์ `app-python/.env.local`: `GEMINI_API_KEY=AIzaSy...`

### 2. เพิ่ม Allegro Device
ไปที่ **Devices** → Add Device → ใส่ IP, Username, Password → Activate

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | HTML, Tailwind CSS CDN, Vanilla JS |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK v1.73+) |
| Storage | JSON files (ไม่ต้องติดตั้ง database) |
| Allegro | httpx async client + async polling |

---

## 📁 Project Structure

```
allegro-tool/
├── app-python/                 ← Python version (แนะนำ)
│   ├── app.py                  ← Entry point
│   ├── requirements.txt
│   ├── lib/
│   │   ├── db.py               ← JSON file storage
│   │   ├── allegro.py          ← Allegro API async client
│   │   └── gemini.py           ← Gemini 2.5 Flash
│   ├── routers/                ← API endpoints (8 routes)
│   ├── templates/              ← HTML pages (8 pages)
│   └── data/                   ← Auto-created JSON data
├── app/                        ← Next.js version (legacy)
├── windows/
│   └── start.bat               ← Windows launcher
└── README.md
```

---

## 🔌 Allegro API Coverage

| Endpoint | ใช้ใน |
|---|---|
| `GET /API/stats/interfaces` | Dashboard — interface status |
| `GET /API/stats/modules/ip/ips_paged` | Dashboard — Top IPs |
| `GET /API/stats/modules/ip/ips/{ip}/*` | IP Detail |
| `GET /API/stats/modules/ip/globalConnections` | Analysis — connections |
| `GET /API/info/system` | Device test |
| `GET /API/async/{id}?uuid={uuid}` | Async result polling |

---

## 🔒 Security Notes

- API Keys เก็บใน local JSON file ไม่ส่งออกไปที่อื่น
- รองรับ self-signed SSL certificate ต่อ device
- Input validation บน IP address และ port ทุก endpoint
- ออกแบบสำหรับใช้ใน LAN เท่านั้น

---

## 📋 Requirements

| | |
|---|---|
| **Runtime** | Python 3.11+ |
| **Device** | Allegro Network Multimeter (firmware 4.x+) |
| **AI Key** | Google Gemini API Key (ฟรีที่ [aistudio.google.com](https://aistudio.google.com)) |
| **Windows** | ไม่ต้องการ Node.js, Build Tools หรือ C++ compiler |

---

## 🔗 Links

- 📦 **Windows Release**: [github.com/unnopjob/Allegro-AI-for-Windows](https://github.com/unnopjob/Allegro-AI-for-Windows)
- 🛠️ **Source Code**: [github.com/unnopjob/allegro-tool](https://github.com/unnopjob/allegro-tool)

---

## 📄 License

MIT License — ใช้งานและแก้ไขได้อิสระ
