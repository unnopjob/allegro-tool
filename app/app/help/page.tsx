'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import AskAI from '@/components/AskAI';

const sections = [
  {
    id: 'getting-started',
    title: '🚀 เริ่มต้นใช้งาน',
    items: [
      {
        id: 'install',
        title: 'ติดตั้งและรันแอป',
        content: `ความต้องการของระบบ:
• Node.js v18 ขึ้นไป (nodejs.org)
• Visual Studio Build Tools (Windows เท่านั้น)

วิธีรัน:
1. แตก zip ไฟล์ไปที่ folder ที่ต้องการ
2. Windows: ดับเบิลคลิก windows/start.bat
   macOS/Linux: เปิด Terminal แล้วรัน npm install && npm run dev
3. เปิด browser ไปที่ http://localhost:3000

ครั้งแรกที่รัน start.bat จะ:
• ตรวจสอบ Node.js และ npm
• ติดตั้ง dependencies อัตโนมัติ (ใช้เวลา 2-3 นาที)
• สร้างไฟล์ .env.local
• เปิด dev server`,
      },
      {
        id: 'add-device',
        title: 'เพิ่ม Allegro Device ครั้งแรก',
        content: `1. ไปที่เมนู Devices
2. กดปุ่ม "เพิ่ม Device" (มุมขวาบน)
3. กรอกข้อมูล:
   • ชื่อ Device  : ชื่อที่จำง่าย เช่น "Allegro HQ"
   • URL         : https://IP เช่น https://192.168.1.100
   • Username    : admin (default)
   • Password    : รหัสผ่าน Allegro
   • Verify SSL  : ปิดไว้ถ้าใช้ self-signed certificate
4. กด "บันทึก"
5. กด "ทดสอบ" → ควรขึ้น ✅ พร้อม latency
6. กด "ใช้งาน" เพื่อ activate

⚠️ ต้อง activate device ก่อนถึงจะเห็นข้อมูลใน Dashboard และ Analysis`,
      },
      {
        id: 'gemini-key',
        title: 'ตั้งค่า Gemini API Key',
        content: `ขั้นตอนรับ API Key (ฟรี):
1. ไปที่ https://aistudio.google.com
2. กด "Get API Key" → "Create API key"
3. คัดลอก key (ขึ้นต้นด้วย AIzaSy...)

ตั้งค่าใน App:
1. ไปที่เมนู Settings
2. วาง key ในช่อง "Gemini API Key"
3. กด "บันทึก"
4. กด "ทดสอบ" → ควรขึ้น ✅ เชื่อมต่อสำเร็จ

หมายเหตุ: Key จะถูกเก็บใน database ของแอป
ไม่ได้ส่งออกไปที่อื่น ใช้เฉพาะเรียก Gemini API`,
      },
      {
        id: 'first-use',
        title: 'ลำดับการใช้งานครั้งแรก',
        content: `ลำดับที่แนะนำ:

① Settings → ใส่ Gemini API Key
② Devices  → เพิ่มและ activate Allegro device
③ Dashboard → ตรวจสอบว่าเห็นข้อมูล interface
④ Analysis → ลองวิเคราะห์ภาพรวม
⑤ Chat     → ลองถามปัญหาเครือข่าย

ถ้า Dashboard ไม่แสดงข้อมูล interface:
→ เข้า Allegro Web UI แล้วตั้งค่า capture interface ก่อน`,
      },
    ],
  },
  {
    id: 'dashboard',
    title: '📊 Dashboard',
    items: [
      {
        id: 'health-score',
        title: 'Network Health Score',
        content: `คะแนน 0-100 บ่งบอกสุขภาพเครือข่ายโดยรวม

🟢 80-100  ดี        เครือข่ายทำงานปกติ
🟡 50-79   ควรตรวจ  มีบางอย่างน่าสังเกต
🔴 0-49    มีปัญหา  ควรแก้ไขโดยด่วน

การหักคะแนน:
• Interface DOWN      : -20 คะแนน/interface
• Error rate > 0.5%   : หักตามสัดส่วน (สูงสุด -20)
• Drop rate > 0.5%    : หักตามสัดส่วน (สูงสุด -20)

กดปุ่ม "ถาม AI" ข้างคะแนน เพื่อให้ AI อธิบายสาเหตุ`,
      },
      {
        id: 'interfaces',
        title: 'อ่าน Interface Cards',
        content: `แต่ละ card แสดง interface หนึ่งตัว:

สถานะ:
• UP (เขียว)   : interface เชื่อมต่ออยู่
• DOWN (แดง)   : ไม่มีสัญญาณหรือ cable หลุด

Traffic:
• ↑ Tx  : ส่งออก (upload)
• ↓ Rx  : รับเข้า (download)

ปัญหา (แสดงเมื่อ > 0):
• Errors  : packet เสียหาย (ควรเป็น 0)
• Drops   : packet ถูกทิ้ง เพราะ buffer เต็ม

ข้อมูล refresh ทุก 30 วินาที (นับถอยหลังที่ปุ่ม)`,
      },
      {
        id: 'top-ips',
        title: 'Top IPs by Bandwidth',
        content: `ตารางแสดง IP ที่ใช้ bandwidth สูงสุด 15 อันดับ

คอลัมน์:
• IP    : IP address
• Rx    : bandwidth ขาเข้า
• Tx    : bandwidth ขาออก
• Total : รวม bytes ทั้งหมด

กดปุ่ม "รายละเอียด" เพื่อดู:
• TCP Stats (handshake time, response time, retransmit)
• Top Peers (IP ที่คุยด้วยมากสุด)
• Connections (รายการ connection ทั้งหมด)
• ลิงก์ "วิเคราะห์ IP นี้" → ไปหน้า Analysis`,
      },
    ],
  },
  {
    id: 'analysis',
    title: '🔍 AI Analysis',
    items: [
      {
        id: 'analysis-types',
        title: 'ประเภทการวิเคราะห์ (Tab: AI Analysis)',
        content: `มี 5 แบบให้เลือก:

1. ภาพรวมเครือข่าย
   สรุปสถานะทั้งหมด บอกปัญหาเร่งด่วนและสิ่งที่ควรติดตาม

2. ความปลอดภัย
   ตรวจหา port scan, traffic ผิดปกติ, connection น่าสงสัย

3. Bandwidth Usage
   วิเคราะห์ใครใช้ bandwidth เท่าไหร่ หา bottleneck

4. Connections
   วิเคราะห์ connection patterns, latency, retransmit
   → กรอก IP ด้วยเพื่อผลแม่นยำขึ้น

5. TCP Flow / IP เฉพาะ
   วิเคราะห์ TCP quality ของ IP นั้นโดยละเอียด
   → ต้องกรอก IP address`,
      },
      {
        id: 'incident',
        title: 'ปัญหาสำเร็จรูป (Tab: ปัญหาสำเร็จรูป)',
        content: `4 ปุ่มสำหรับปัญหาที่พบบ่อย — กดแล้วรอผลทันที:

🐢 อินเทอร์เน็ตช้า
   → วิเคราะห์ bandwidth อิ่มตัว หาตัวการที่ดูด bandwidth

🌐 เข้าเว็บไม่ได้
   → ตรวจ DNS, routing, TCP connection ไปยัง port 80/443

📹 Video กระตุก / หลุดบ่อย
   → วิเคราะห์ latency, jitter, packet loss ที่กระทบ video call

❌ เน็ตใช้ไม่ได้เลย
   → ตรวจสอบ interface DOWN, upstream link, DHCP

AI จะดึงข้อมูล network ปัจจุบันและวิเคราะห์ให้เลย`,
      },
      {
        id: 'rootcause',
        title: 'Root Cause Analysis (Tab: วิเคราะห์เหตุการณ์)',
        content: `สำหรับปัญหาที่ระบุอาการได้ชัดเจน:

วิธีใช้:
1. อธิบายอาการที่ผู้ใช้รายงาน เช่น:
   "ผู้ใช้ห้อง A เข้า SAP ไม่ได้ตั้งแต่เช้า แต่ internet ปกติ"
   "ระบบ ERP ช้ามากตั้งแต่ 9 โมง โดยเฉพาะตอนดึง report"
2. กด "วิเคราะห์ Root Cause"

AI จะวิเคราะห์และตอบ:
• Root Cause ที่เป็นไปได้ (เรียงตามความน่าจะเป็น)
• ขั้นตอนตรวจสอบก่อน-หลัง
• คำสั่ง/วิธีแก้ไขเฉพาะ
• วิธีป้องกันไม่ให้เกิดซ้ำ`,
      },
    ],
  },
  {
    id: 'pathcheck',
    title: '🔗 Path & Port Check',
    items: [
      {
        id: 'pathcheck-how',
        title: 'ตรวจเส้นทาง (Path Check)',
        content: `อยู่ด้านล่างของหน้า Analysis

ใส่ข้อมูล:
• Source IP   : IP ต้นทาง (optional) เช่น 192.168.1.50
• Destination : IP ปลายทาง เช่น 8.8.8.8
• Port        : port หมายเลข (optional) เช่น 443
• Protocol    : TCP หรือ UDP

กด "ตรวจสอบ" แล้วรอผล (10-30 วินาที)

ระบบตรวจ 3 ส่วนพร้อมกัน:
1. Ping → เช็ค host alive + packet loss + RTT
2. Traceroute → แสดง path ทุก hop
3. Port check (ถ้าใส่ port) → TCP connect test`,
      },
      {
        id: 'portcheck-how',
        title: 'ตรวจ Port (Port Check)',
        content: `ใส่ Port number เพื่อตรวจสอบว่า service เปิดอยู่หรือไม่

ผลที่ได้:
• ✅ OPEN    : port เปิด service กำลังรับ connection
• ❌ CLOSED  : port ปิด ไม่มี service หรือ firewall block

Latency: เวลาที่ใช้ในการ connect (TCP handshake)
Banner : ข้อความต้อนรับของ service (ถ้ามี) เช่น
         "SSH-2.0-OpenSSH_8.9" หรือ "220 SMTP Ready"

Allegro Port Flows:
แสดง connection จริงที่ Allegro เห็นผ่าน port นั้น
ใน 5 นาทีล่าสุด (ต้องมี Allegro device และ src IP)

ตัวอย่างใช้งาน:
• ตรวจว่า server 10.0.0.5 เปิด port 443 ไหม
• ดูว่า client 192.168.1.10 เชื่อม port 3306 (MySQL) ได้ไหม
• ตรวจ firewall ว่า block port ที่ต้องใช้หรือเปล่า`,
      },
      {
        id: 'interpret-result',
        title: 'ตีความผล Ping และ Traceroute',
        content: `Ping:
• 0% loss        : ปกติดี
• 1-10% loss     : มี packet loss เล็กน้อย ควรติดตาม
• >10% loss      : มีปัญหา อาจเกิด latency หรือ timeout
• ❌ ไม่ตอบสนอง  : host down หรือ ICMP ถูก block โดย firewall

RTT (Round-Trip Time):
• < 5ms    : ใน LAN เดียวกัน ปกติมาก
• 5-50ms   : ข้าม switch/router ไม่กี่ hop
• 50-200ms : ผ่าน internet ปกติ
• > 200ms  : สูง อาจมีปัญหา routing หรือ congestion

Traceroute:
• * (ดอกจัน) : hop นั้น block ICMP ไม่ได้แปลว่าเชื่อมไม่ถึง
• RTT พุ่งขึ้นที่ hop ไหน → congestion หรือปัญหาอยู่ที่ hop นั้น

⚠️ Path Check ทดสอบจาก monitoring server
ไม่ใช่จาก Source IP โดยตรง`,
      },
    ],
  },
  {
    id: 'chat',
    title: '💬 AI Chat',
    items: [
      {
        id: 'chat-basic',
        title: 'พื้นฐานการใช้ Chat',
        content: `Chat กับ AI ผู้เชี่ยวชาญด้าน Network ได้ตลอดเวลา

วิธีใช้:
• พิมพ์คำถาม → กด Enter หรือปุ่มส่ง
• Shift+Enter = ขึ้นบรรทัดใหม่
• กด "ล้างประวัติ" เพื่อเริ่มบทสนทนาใหม่

Toggle บนสุด:
• Knowledge Base    : AI จะอ้างอิงไฟล์ที่อัปโหลดไว้
• Network Context   : AI จะรู้สถานะเครือข่ายตอนนี้ (ต้องมี device)

ตัวอย่างคำถาม:
• "ทำไม latency สูงช่วงเช้า?"
• "อธิบาย TCP retransmission ให้ฟังหน่อย"
• "ควรตั้งค่า QoS ยังไงสำหรับ VoIP?"`,
      },
      {
        id: 'network-context',
        title: 'Network Context คืออะไร',
        content: `เมื่อเปิด "Network Context" AI จะได้รับข้อมูลจริงของเครือข่าย:
• สถานะ interface ทั้งหมด (UP/DOWN, Tx, Rx)
• Top 10 IP ที่ใช้ bandwidth สูงสุด

ทำให้ AI ตอบได้แม่นยำขึ้น เช่น:
• "ตอนนี้ interface ไหน DOWN บ้าง?"
• "IP ไหนดูด bandwidth เยอะสุด?"
• "มีอะไรน่าเป็นห่วงในตอนนี้?"

⚠️ ต้องมี active device และ Allegro ต้อง config interface แล้ว
ข้อมูลจะดึงใหม่ทุกครั้งที่ส่ง message`,
      },
      {
        id: 'knowledge-chat',
        title: 'ใช้ Knowledge Base ใน Chat',
        content: `เมื่อเปิด "Knowledge Base" AI จะอ้างอิงเอกสารที่อัปโหลดไว้

ตัวอย่างการใช้งาน:
• อัปโหลด Network Diagram
  → "gateway ของ VLAN 20 คืออะไร?"
• อัปโหลด IP Allocation Table
  → "IP 10.10.5.x ใช้ทำอะไร?"
• อัปโหลด Runbook/Procedure
  → "วิธี reset port ของ switch ทำยังไง?"
• อัปโหลด Contract/SLA
  → "SLA ของ internet link เราคือเท่าไหร่?"

หมายเหตุ: รองรับไฟล์สูงสุด 10 MB / ไฟล์`,
      },
    ],
  },
  {
    id: 'knowledge',
    title: '📚 Knowledge Base',
    items: [
      {
        id: 'upload-file',
        title: 'อัปโหลดไฟล์',
        content: `รองรับไฟล์:
• PDF  : เอกสาร, manual, diagram (scan)
• TXT  : ข้อความธรรมดา
• MD   : Markdown document
• CSV  : ข้อมูลตาราง เช่น IP list
• JSON : ข้อมูล structured

ขนาดไฟล์: สูงสุด 10 MB / ไฟล์

วิธีอัปโหลด:
1. ไปที่เมนู Knowledge
2. กด "เลือกไฟล์" หรือ drag & drop
3. กด "อัปโหลด"
4. ไฟล์จะถูก extract เป็น text อัตโนมัติ

เพิ่มข้อความโดยตรง:
1. กรอกชื่อและเนื้อหาในช่องด้านล่าง
2. กด "บันทึก"
ใช้สำหรับ IP table, note ต่างๆ`,
      },
      {
        id: 'manage-files',
        title: 'จัดการไฟล์',
        content: `ดูรายการไฟล์ทั้งหมดที่อัปโหลดไว้

แต่ละไฟล์แสดง:
• ชื่อไฟล์และวันที่อัปโหลด

ลบไฟล์:
• กดปุ่มถังขยะ → ยืนยัน → ลบ

Ask AI เกี่ยวกับ Knowledge Base:
• กดปุ่ม "ถาม AI" เพื่อถามคำถามเกี่ยวกับไฟล์ที่มีอยู่

แนะนำไฟล์ที่ควรอัปโหลด:
• IP Address Plan / VLAN Table
• Network Topology / Diagram
• Runbook / SOP
• Vendor Configuration Guide
• SLA / Contract`,
      },
    ],
  },
  {
    id: 'glossary',
    title: '📖 คำศัพท์ Network',
    items: [
      {
        id: 'retransmit',
        title: 'TCP Retransmission',
        content: `การส่ง packet ซ้ำเพราะ packet เดิมสูญหายหรือไม่ได้รับ ACK

ค่าปกติ  : < 1%
ควรตรวจ  : 1-3%
มีปัญหา  : > 3%

สาเหตุ:
• Packet loss ในเครือข่าย (link quality ต่ำ)
• WiFi มี interference หรือ signal อ่อน
• Buffer ล้นในอุปกรณ์เครือข่าย (congestion)
• Server ตอบสนองช้า หรือ overload

ผลกระทบ: ความเร็วลดลง, latency พุ่งสูง`,
      },
      {
        id: 'handshake',
        title: 'TCP Handshake Time',
        content: `เวลาที่ใช้เปิด TCP connection (SYN → SYN-ACK → ACK)

Client Handshake : เวลา client รอ SYN-ACK จาก server
Server Handshake : เวลา server รอ ACK จาก client

ค่าปกติ LAN      : < 5ms
ค่าปกติ internet : 50-200ms

ถ้าสูงผิดปกติ:
• Network latency สูง (congestion หรือ routing ไกล)
• Server overload ตอบ SYN ช้า
• Firewall ตรวจสอบ packet ก่อน forward`,
      },
      {
        id: 'rst',
        title: 'TCP RST (Reset)',
        content: `สัญญาณยกเลิก connection ทันที ไม่มีการปิดแบบปกติ

เกิดจาก:
• Port ปิด ไม่มี service รับ connection
• Firewall / ACL block connection
• Server crash หรือ restart กะทันหัน
• Application ปิด socket โดยไม่ส่ง FIN

RST สูง = มีหลาย connection ถูก reject/block

วิธีตรวจ:
• ดู destination port ที่ถูก RST บ่อย
• ตรวจ firewall rule ของ destination server`,
      },
      {
        id: 'zero-window',
        title: 'TCP Zero Window',
        content: `Receiver แจ้งว่า "buffer เต็ม รับไม่ได้แล้ว" → sender หยุดส่ง

เปรียบเหมือน: "รอก่อน กำลังประมวลผลอยู่"

สาเหตุ:
• Application ประมวลผลช้ากว่า data ที่รับ
• RAM ของ server เต็ม
• CPU สูง server โหลดหนักเกิน

Zero Window บ่อย = ปัญหาที่ server ไม่ใช่เครือข่าย
ตรวจสอบ: CPU, RAM, disk I/O ของ server นั้น`,
      },
      {
        id: 'latency-jitter',
        title: 'Latency และ Jitter',
        content: `Latency (RTT): เวลาที่ packet ใช้เดินทางไปกลับ
• ยิ่งน้อยยิ่งดี
• สำคัญสำหรับ real-time เช่น VoIP, Video Call

Jitter: ความไม่สม่ำเสมอของ latency
• ถ้า ping ได้ 10ms บ้าง 100ms บ้าง = jitter สูง
• VoIP/Video ต้องการ jitter < 30ms

ผลกระทบ jitter สูง:
• เสียงหลุด / กระตุกใน VoIP
• Video call แตกเป็นช่วงๆ
• Online game delay ไม่สม่ำเสมอ`,
      },
      {
        id: 'bandwidth-vs-throughput',
        title: 'Bandwidth vs Throughput',
        content: `Bandwidth: ความจุสูงสุดของ link (ทางทฤษฎี)
เช่น "internet 1Gbps" คือ bandwidth

Throughput: ปริมาณ data จริงที่ส่งได้ (ในทางปฏิบัติ)
มักน้อยกว่า bandwidth เสมอ เพราะ:
• Overhead ของ protocol (TCP header, etc.)
• Packet loss ทำให้ต้อง retransmit
• Congestion ในเครือข่าย
• Half-duplex collision (เครือข่ายเก่า)

Utilization: % ของ bandwidth ที่ใช้จริง
• < 70%  : ปกติดี
• 70-90% : เริ่มหนาแน่น ควรติดตาม
• > 90%  : congested อาจเกิด latency สูง`,
      },
    ],
  },
  {
    id: 'troubleshoot',
    title: '🛠️ แก้ปัญหาการใช้งาน',
    items: [
      {
        id: 'no-data',
        title: 'Dashboard ไม่แสดงข้อมูล',
        content: `ตรวจสอบตามลำดับ:

1. มี active device หรือยัง?
   → ไปที่ Devices → ต้องมีปุ่ม "Active" สีน้ำเงิน

2. ทดสอบการเชื่อมต่อ
   → กดปุ่ม "ทดสอบ" ที่ device → ต้องขึ้น ✅

3. Allegro ตั้งค่า capture interface แล้วหรือยัง?
   → เข้า Allegro Web UI → Configuration
   → เลือก interface ที่ต้องการ monitor → Apply

4. URL ถูกต้องไหม?
   → ต้องเป็น https://IP (ไม่ต้องใส่ /API ต่อท้าย)

5. SSL setting ถูกต้องไหม?
   → ถ้า Allegro ใช้ self-signed cert → ปิด "Verify SSL"`,
      },
      {
        id: 'ai-error',
        title: 'AI ตอบไม่ได้ / Error',
        content: `ปัญหาที่พบบ่อย:

❌ "ไม่พบ Gemini API Key"
→ ไปที่ Settings → ใส่และบันทึก API Key

❌ "Gemini API error 400"
→ API Key ไม่ถูกต้อง หรือ quota หมด
→ ตรวจสอบที่ aistudio.google.com

❌ "Gemini API error 429"
→ เรียก API เร็วเกินไป รอสักครู่แล้วลองใหม่

❌ Analysis ไม่มีข้อมูล network จริง
→ ตรวจสอบ device connection
→ ตรวจสอบว่า Allegro config interface แล้ว`,
      },
      {
        id: 'port-check-error',
        title: 'Port Check ผลไม่ถูกต้อง',
        content: `Port แสดง CLOSED แต่ service ทำงานอยู่:
• Firewall บน monitoring server block outbound
• Firewall ที่ปลายทาง block inbound
• Service bind กับ IP เฉพาะ ไม่ใช่ 0.0.0.0

Port แสดง OPEN แต่ใช้งานไม่ได้:
• Service เปิดรับ connection แต่ return error
• Load balancer รับ แต่ backend ล้มเหลว
• Certificate หมดอายุ (HTTPS)

หมายเหตุสำคัญ:
Port Check ทดสอบจาก monitoring server เท่านั้น
ถ้า client อื่นเชื่อมไม่ได้ อาจเป็น firewall rule
ที่ block เฉพาะ source IP ของ client นั้น`,
      },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeItem, setActiveItem] = useState('install');
  const [search, setSearch] = useState('');

  const currentSection = sections.find(s => s.id === activeSection);
  const currentItem = currentSection?.items.find(i => i.id === activeItem);

  const filteredSections = search.trim()
    ? sections.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.content.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : sections;

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">คู่มือการใช้งาน</h1>
          <AskAI context="คู่มือการใช้งาน Allegro AI Network Troubleshooting App" contextType="knowledge" buttonLabel="ถาม AI" />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาหัวข้อ... เช่น retransmit, port check, API key"
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-60 shrink-0 hidden md:block">
            <nav className="sticky top-4 space-y-0.5">
              {filteredSections.map(section => (
                <div key={section.id} className="mb-2">
                  <div className="text-slate-500 text-xs uppercase tracking-wider px-3 py-1.5 mt-2 first:mt-0 font-medium">
                    {section.title}
                  </div>
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(section.id); setActiveItem(item.id); setSearch(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id && activeItem === item.id
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {search.trim() ? (
              <div className="space-y-4">
                {filteredSections.flatMap(section =>
                  section.items.map(item => (
                    <div key={item.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                      <div className="text-slate-500 text-xs mb-1">{section.title}</div>
                      <h2 className="text-white font-semibold text-base mb-3">{item.title}</h2>
                      <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{item.content}</pre>
                      <button
                        onClick={() => { setActiveSection(section.id); setActiveItem(item.id); setSearch(''); }}
                        className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                      >
                        เปิดหน้านี้ →
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : currentItem ? (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="text-slate-500 text-xs mb-1">{currentSection?.title}</div>
                <h2 className="text-white font-bold text-xl mb-5">{currentItem.title}</h2>
                <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{currentItem.content}</pre>

                {/* Navigation arrows */}
                <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between">
                  {(() => {
                    const allItems = sections.flatMap(s => s.items.map(i => ({ ...i, sectionId: s.id })));
                    const idx = allItems.findIndex(i => i.id === activeItem && i.sectionId === activeSection);
                    const prev = allItems[idx - 1];
                    const next = allItems[idx + 1];
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => { setActiveSection(prev.sectionId); setActiveItem(prev.id); }} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            ← {prev.title}
                          </button>
                        ) : <div />}
                        {next ? (
                          <button onClick={() => { setActiveSection(next.sectionId); setActiveItem(next.id); }} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                            {next.title} →
                          </button>
                        ) : <div />}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {/* Mobile accordion */}
            <div className="md:hidden mt-4 space-y-3">
              {sections.map(section => (
                <div key={section.id}>
                  <h3 className="text-slate-400 font-medium text-sm mb-2 px-1">{section.title}</h3>
                  {section.items.map(item => (
                    <details key={item.id} className="bg-slate-800 rounded-xl mb-2 border border-slate-700">
                      <summary className="px-4 py-3 text-white text-sm cursor-pointer font-medium">{item.title}</summary>
                      <div className="px-4 pb-4 pt-1 border-t border-slate-700">
                        <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{item.content}</pre>
                      </div>
                    </details>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
