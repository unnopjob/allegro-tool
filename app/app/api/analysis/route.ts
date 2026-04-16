import { NextRequest, NextResponse } from 'next/server';
import { getActiveDevice } from '@/lib/db';
import { fetchAllegro, fetchAllegroAsync } from '@/lib/allegro';
import { geminiAnalyze } from '@/lib/gemini';

const FOCUS_MAP: Record<string, string> = {
  general: 'วิเคราะห์ภาพรวมทั้งหมด',
  security: 'เน้นด้านความปลอดภัย เช่น การเชื่อมต่อผิดปกติ, Port scan, traffic ที่น่าสงสัย',
  bandwidth: 'เน้นด้าน Bandwidth เช่น ใครใช้มากสุด, bottleneck, ความแออัดของเครือข่าย',
  connections: 'เน้น TCP Connections เช่น connection ผิดปกติ, latency, retransmit',
  tcpflow: 'วิเคราะห์ TCP Flow แบบละเอียด: TCP retransmissions, DUP ACKs, Zero Window, Handshake time, HTTP/SSL response time',
};

const INCIDENT_MAP: Record<string, string> = {
  slow: 'ผู้ใช้แจ้งว่า "อินเทอร์เน็ตช้า" — วิเคราะห์ว่าใครใช้ Bandwidth เยอะ และมีปัญหาอะไรที่ทำให้ช้า',
  nowebsite: 'ผู้ใช้แจ้งว่า "เข้าเว็บไม่ได้" — ตรวจสอบ interface และ connection ว่ามีปัญหา link down, TCP error, หรือ DNS',
  video: 'ผู้ใช้แจ้งว่า "Video Call กระตุก/หลุดบ่อย" — วิเคราะห์ TCP quality, packet loss, latency ที่ส่งผลต่อ real-time traffic',
  down: 'ผู้ใช้แจ้งว่า "เน็ตใช้ไม่ได้เลย" — ตรวจสอบ interface ว่ามี link DOWN และสถานะโดยรวมเป็นอย่างไร',
};

export async function POST(req: NextRequest) {
  const { type, ip, scenario, userDescription } = await req.json();
  const device = getActiveDevice();
  if (!device) return NextResponse.json({ error: 'ไม่มี active device — กรุณาเพิ่มและเลือก Allegro device ก่อน' }, { status: 503 });

  try {
    // Fetch base data always
    const [interfaces, topIps] = await Promise.all([
      fetchAllegro(device, 'API/stats/interfaces'),
      fetchAllegro(device, 'API/stats/modules/ip/ips_paged', { sort: 'bps', reverse: true, page: 0, count: 15, timespan: 60 }),
    ]);

    const data: Record<string, unknown> = { interfaces, top_ips_by_bandwidth: topIps };

    // Fetch extra data based on type
    if (ip && (type === 'tcpflow' || type === 'connections')) {
      const [ipStats, peers, tcpStats, connections] = await Promise.allSettled([
        fetchAllegro(device, `API/stats/modules/ip/ips/${ip}`),
        fetchAllegro(device, `API/stats/modules/ip/ips/${ip}/peers`, { sort: 'bytes', reverse: true, page: 0, count: 20, timespan: 60 }),
        fetchAllegro(device, `API/stats/modules/ip/ips/${ip}/tcpStats`),
        fetchAllegro(device, `API/stats/modules/ip/ips/${ip}/connections`, { sort: 'bytes', reverse: true, page: 0, count: 30, timespan: 60 }),
      ]);
      if (ipStats.status === 'fulfilled') data.ip_stats = ipStats.value;
      if (peers.status === 'fulfilled') data.ip_peers = peers.value;
      if (tcpStats.status === 'fulfilled') data.tcp_stats = tcpStats.value;
      if (connections.status === 'fulfilled') data.connections = connections.value;
    }

    if (type === 'incident' && (scenario === 'nowebsite' || scenario === 'video')) {
      const globalConn = await fetchAllegroAsync(device, 'API/stats/modules/ip/globalConnections', { sort: 'bytes', reverse: true, page: 0, count: 50, timespan: 60 });
      data.global_connections = globalConn;
    }

    const raw = JSON.stringify(data, null, 2);
    const dataStr = raw.length > 5000 ? raw.slice(0, raw.lastIndexOf('\n', 5000)) + '\n...' : raw;
    let prompt = '';

    if (type === 'incident') {
      const label = INCIDENT_MAP[scenario] || scenario;
      prompt = `คุณเป็น IT Support ผู้เชี่ยวชาญ กรุณาตอบเป็นภาษาไทยที่เข้าใจง่าย ไม่ใช้ศัพท์เทคนิคมากเกินไป
อาการที่ผู้ใช้รายงาน: ${label}

ข้อมูลจาก Allegro Network Multimeter (JSON):
\`\`\`
${dataStr}
\`\`\`

ตอบในรูปแบบนี้:

## 🔍 สิ่งที่พบจากข้อมูล
(อธิบาย 2-3 ประโยคว่าเครือข่ายตอนนี้เป็นอย่างไร)

## ✅ ขั้นตอนแก้ไข (เรียงจากง่ายไปยาก)
(ระบุเป็นข้อ เขียนให้ทำได้เลย)

## 📞 เมื่อไหร่ควรแจ้ง Network Admin
(บอกสัญญาณที่ต้องขอความช่วยเหลือเพิ่มเติม)`;
    } else if (type === 'rootcause') {
      prompt = `คุณเป็น Senior Network Engineer
อาการที่ผู้ใช้รายงาน: ${userDescription}

ข้อมูลเครือข่ายจาก Allegro Network Multimeter (JSON):
\`\`\`
${dataStr}
\`\`\`

ขอให้:
## 🎯 Root Cause ที่เป็นไปได้ (เรียงตามความน่าจะเป็น)
## 🔬 ขั้นตอนตรวจสอบที่ควรทำก่อน-หลัง
## 🔧 คำสั่ง/วิธีแก้ไขเฉพาะ
## 🛡️ วิธีป้องกันไม่ให้เกิดซ้ำ
ตอบเป็นภาษาไทย`;
    } else {
      const focus = FOCUS_MAP[type] || 'วิเคราะห์ภาพรวมทั้งหมด';
      prompt = `คุณเป็นผู้เชี่ยวชาญด้านเครือข่ายคอมพิวเตอร์ระดับอาวุโส
ผู้ใช้เป็น network engineer ระดับเบื้องต้น กรุณาอธิบายเป็นภาษาไทยที่เข้าใจง่าย ชัดเจน
โจทย์: ${focus}
${ip ? `IP ที่วิเคราะห์: ${ip}` : ''}

ข้อมูล Network (JSON):
\`\`\`
${dataStr}
\`\`\`

ตอบในรูปแบบนี้:

## 📊 สรุปภาพรวม
(อธิบายสถานะเครือข่าย 2-3 ประโยค)

## 🔴 ปัญหาเร่งด่วน
(ปัญหาที่ต้องแก้ไขทันที หากไม่มีให้เขียนว่า "ไม่พบปัญหาเร่งด่วน ✅")

## 🟡 สิ่งที่ควรติดตาม
(สิ่งที่อาจเป็นปัญหาในอนาคต หากไม่มีให้เขียนว่า "ไม่พบ ✅")

## 🟢 สิ่งที่ทำงานปกติดี
(ระบุ 2-3 สิ่งที่ดี)

## 💡 คำแนะนำ
(แนะนำ 2-3 ข้อที่ควรทำ อธิบายเหตุผล)`;
    }

    const result = await geminiAnalyze(prompt);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 500 });
  }
}
