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
| 🪟 **Windows Ready** | ดับเบิลคลิก `install-deps.bat` ติดตั้ง Node.js + Build Tools อัตโนมัติ แล้วรัน `start.bat` |

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

### Windows (แนะนำ)

**ครั้งแรก — ติดตั้ง dependencies อัตโนมัติ:**

1. คลิกขวา `windows\install-deps.bat` → **"Run as administrator"**
2. กด **Y** เพื่อติดตั้ง Node.js + Visual Studio Build Tools
3. รอ 5–15 นาที จนเสร็จ
4. **ปิด CMD แล้วเปิดใหม่** (สำคัญ)

**รันแอป (ทุกครั้ง):**

5. ดับเบิลคลิก `windows\start.bat`
6. เปิด browser → http://localhost:3000

> **หมายเหตุ:** ถ้ามี Node.js อยู่แล้ว ข้ามขั้นตอน 1–4 รัน `start.bat` ได้เลย

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
| Launcher | Batch scripts (Windows) |

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
│   ├── install-deps.bat    # Auto-install Node.js + Build Tools (run first)
│   └── start.bat           # Launch the app
└── .gitignore
```

---

## 🪟 Windows Files

| File | Description |
|---|---|
| `windows\install-deps.bat` | ติดตั้ง Node.js LTS + Visual Studio Build Tools อัตโนมัติ (รันครั้งแรกครั้งเดียว) |
| `windows\start.bat` | รัน npm install + เริ่ม server ทุกครั้ง |

**install-deps.bat ทำอะไร:**
- ตรวจสอบว่ามี Node.js และ Build Tools ครบหรือยัง
- ถ้าขาด → ดาวน์โหลดและติดตั้งอัตโนมัติ (ผ่าน winget หรือ direct download)
- ถ้าครบแล้ว → แจ้งว่าพร้อมใช้งาน ออกทันที

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

| | Requirement |
|---|---|
| **Runtime** | Node.js v18 หรือสูงกว่า |
| **Device** | Allegro Network Multimeter (firmware 4.x ขึ้นไป) |
| **AI** | Google Gemini API Key (ฟรีที่ [aistudio.google.com](https://aistudio.google.com)) |
| **Windows build** | Visual Studio Build Tools (สำหรับ better-sqlite3) — ติดตั้งอัตโนมัติด้วย `install-deps.bat` |

---

## 📄 License

MIT License — ใช้งานและแก้ไขได้อิสระ
