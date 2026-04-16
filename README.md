# Allegro AI — Network Troubleshooting Assistant

AI-powered network monitoring and troubleshooting dashboard สำหรับ [Allegro Network Multimeter](https://www.allegro-packets.com/) ขับเคลื่อนด้วย Google Gemini 2.0 Flash

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Real-time interface status, bandwidth, Network Health Score (0–100) |
| 🔍 **AI Analysis** | วิเคราะห์ภาพรวม, Security, Bandwidth, TCP Flow, Root Cause |
| 🐢 **Incident Templates** | กดเดียว — อินเทอร์เน็ตช้า, เข้าเว็บไม่ได้, Video กระตุก, เน็ตดับ |
| 🔗 **Path & Port Check** | Ping + Traceroute + TCP Port connect test + Allegro flow lookup |
| 💬 **AI Chat** | สนทนากับ AI พร้อม Network Context สด + Knowledge Base |
| 📚 **Knowledge Base** | อัปโหลด PDF/TXT/CSV/JSON ให้ AI อ้างอิง |
| ⚙️ **Device Manager** | จัดการ Allegro device หลายเครื่อง, test connection |
| 🪟 **Windows Ready** | ดับเบิลคลิก `start.bat` — ติดตั้ง dependency อัตโนมัติ |

---

## 📸 Screenshots

```
Dashboard                Analysis               Chat
┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
│ Health Score 94 │     │ AI Analysis     │   │ Network AI      │
│ ████████████░░  │     │ ─────────────── │   │ Assistant       │
│                 │     │ ✅ ภาพรวมดี     │   │                 │
│ eth0  UP ↑↓     │     │ 🔴 eth1 ล้น    │   │ > ตอนนี้เน็ต   │
│ eth1  UP ↑↓     │     │ 💡 แนะนำ QoS   │   │   เป็นยังไง?  │
│                 │     │                 │   │                 │
│ Top IPs ────    │     │ [ถามเพิ่มเติม] │   │ < Interface...  │
└─────────────────┘     └─────────────────┘   └─────────────────┘
```

---

## 🚀 Quick Start

### Windows

1. ดาวน์โหลดและแตก zip
2. ดับเบิลคลิก `windows/start.bat`
3. เปิด browser → http://localhost:3000

> **ต้องการ:** [Node.js v18+](https://nodejs.org) และ [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### macOS / Linux

```bash
cd app
npm install
npm run dev
```

เปิด http://localhost:3000

---

## ⚙️ การตั้งค่าครั้งแรก

### 1. Gemini API Key

ไปที่ **Settings** → ใส่ Gemini API Key
- รับฟรีที่ [Google AI Studio](https://aistudio.google.com)
- หรือสร้างไฟล์ `app/.env.local`:

```env
GEMINI_API_KEY=AIzaSy...
```

### 2. เพิ่ม Allegro Device

ไปที่ **Devices** → เพิ่ม Device ใส่:
- URL: `https://IP` เช่น `https://192.168.1.100`
- Username / Password
- ปิด SSL verify ถ้าใช้ self-signed cert

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| AI | Google Gemini 2.0 Flash (streaming) |
| Database | SQLite (better-sqlite3) — local only |
| Backend | Next.js API Routes (Node.js) |
| Launcher | Batch script (Windows) |

---

## 📁 Project Structure

```
allegro-ai/
├── app/                    # Next.js application
│   ├── app/                # Pages & API routes
│   │   ├── dashboard/      # Real-time dashboard
│   │   ├── analysis/       # AI analysis + path/port check
│   │   ├── chat/           # AI chat interface
│   │   ├── devices/        # Device management
│   │   ├── knowledge/      # Knowledge base
│   │   ├── settings/       # API key settings
│   │   ├── help/           # User manual
│   │   └── api/            # Backend API routes
│   ├── components/         # Shared components
│   │   ├── Navbar.tsx
│   │   └── AskAI.tsx       # Floating AI assistant
│   └── lib/                # Core libraries
│       ├── allegro.ts      # Allegro API client
│       ├── gemini.ts       # Gemini AI client
│       ├── db.ts           # SQLite database
│       └── pcap-parser.ts  # PCAP file parser
├── windows/
│   └── start.bat           # Windows launcher
└── .gitignore
```

---

## 🔌 Allegro API Coverage

| Endpoint | ใช้ใน |
|---|---|
| `GET /API/stats/interfaces` | Dashboard — interface status |
| `GET /API/stats/modules/ip/ips_paged` | Dashboard — Top IPs |
| `GET /API/stats/modules/ip/ips/{ip}/*` | IP Detail — TCP stats, peers, connections |
| `GET /API/stats/modules/ip/globalConnections` | Analysis — connection overview |
| `GET /API/info/system` | Device test — system info |
| `GET /API/async/{id}?uuid={uuid}` | Async result polling |
| `GET /API/data/pcap` | Path check — PCAP capture |

> รองรับ Allegro async response pattern โดยอัตโนมัติ

---

## 🔒 Security Notes

- API Keys เก็บใน local SQLite database ไม่ได้ส่งออกไปที่อื่น
- รองรับ self-signed SSL certificate ต่อ device
- Input validation บน IP address และ port ทุก endpoint
- ไม่มี authentication layer — ออกแบบสำหรับใช้ใน LAN เท่านั้น

---

## 📋 Requirements

- Node.js v18 หรือสูงกว่า
- Allegro Network Multimeter (firmware 4.x ขึ้นไป)
- Google Gemini API Key (ฟรีที่ aistudio.google.com)
- Windows: Visual Studio Build Tools (สำหรับ better-sqlite3)

---

## 📄 License

MIT License — ใช้งานและแก้ไขได้อิสระ
