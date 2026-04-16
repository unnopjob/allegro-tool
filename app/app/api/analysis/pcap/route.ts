import { NextRequest, NextResponse } from 'next/server';
import { getActiveDevice } from '@/lib/db';
import { fetchAllegroRaw } from '@/lib/allegro';
import { geminiAnalyze } from '@/lib/gemini';
import { parsePcap } from '@/lib/pcap-parser';

export async function POST(req: NextRequest) {
  const { ip, minutes = 5 } = await req.json();
  const device = getActiveDevice();
  if (!device) return NextResponse.json({ error: 'ไม่มี active device' }, { status: 503 });

  try {
    const now = Math.floor(Date.now() / 1000);
    const start = now - minutes * 60;
    const res = await fetchAllegroRaw(device, 'API/data/modules/capture', {
      expression: `ip==${ip}`,
      starttime: `${start}000000`,
      endtime: 'now',
    });

    if (!res.ok) throw new Error(`Allegro PCAP error: ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    const summary = parsePcap(buf);

    const convList = summary.conversations
      .map(c => `  ${c.srcIp}:${c.srcPort} → ${c.dstIp}:${c.dstPort} (${c.packets} pkts, ${c.bytes} bytes)`)
      .join('\n');

    const prompt = `คุณเป็น Network Forensic Engineer
PCAP capture ของ IP ${ip} ช่วง ${minutes} นาที:
- Packets: TCP ${summary.tcp}, UDP ${summary.udp}, ICMP ${summary.icmp}
- TCP Flags: SYN ${summary.tcpSyn}, SYN-ACK ${summary.tcpSynAck}, RST ${summary.tcpRst}, FIN ${summary.tcpFin}
- TCP Errors: Zero Window ${summary.zeroWindows}
- Avg RTT: ${summary.avgRttMs !== null ? summary.avgRttMs.toFixed(2) + 'ms' : 'N/A'}
- Duration: ${summary.durationSeconds.toFixed(1)}s
- Top Conversations:
${convList || '  (ไม่มีข้อมูล)'}

วิเคราะห์:
## 🔍 พฤติกรรมที่พบ
## ⚠️ สัญญาณปัญหา
## 💡 คำแนะนำ
ตอบเป็นภาษาไทย`;

    const aiAnalysis = await geminiAnalyze(prompt);
    return NextResponse.json({ pcapSummary: summary, aiAnalysis });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'PCAP analysis failed' }, { status: 500 });
  }
}
