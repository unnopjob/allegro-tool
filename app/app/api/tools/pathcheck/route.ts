import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { getActiveDevice } from '@/lib/db';
import { fetchAllegro, fetchAllegroRaw } from '@/lib/allegro';
import { parsePcap } from '@/lib/pcap-parser';
import { geminiAnalyze } from '@/lib/gemini';

const execAsync = promisify(exec);
const isWindows = process.platform === 'win32';

// ── Validation ────────────────────────────────────────────────────────────────
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false;
  return ip.split('.').every(n => parseInt(n) <= 255);
}

// ── Ping ──────────────────────────────────────────────────────────────────────
async function runPing(ip: string): Promise<{ alive: boolean; avgMs: number | null; loss: number }> {
  try {
    const cmd = isWindows ? `ping -n 4 ${ip}` : `ping -c 4 -W 2 ${ip}`;
    const { stdout } = await execAsync(cmd, { timeout: 15000 });
    const alive = isWindows ? /Reply from/i.test(stdout) : /\d+ received/i.test(stdout);
    const avgMatch = isWindows
      ? stdout.match(/Average = (\d+)ms/)
      : stdout.match(/min\/avg\/max.*?[\d.]+\/([\d.]+)/);
    const lossMatch = isWindows
      ? stdout.match(/\((\d+)% loss\)/)
      : stdout.match(/(\d+)% packet loss/);
    return {
      alive,
      avgMs: avgMatch ? parseFloat(avgMatch[1]) : null,
      loss: lossMatch ? parseInt(lossMatch[1]) : 100,
    };
  } catch {
    return { alive: false, avgMs: null, loss: 100 };
  }
}

// ── Traceroute ────────────────────────────────────────────────────────────────
async function runTraceroute(ip: string): Promise<{ hop: number; ip: string; rttMs: number | null }[]> {
  try {
    const cmd = isWindows ? `tracert -d -h 15 -w 2000 ${ip}` : `traceroute -n -m 15 -w 2 ${ip}`;
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const hops: { hop: number; ip: string; rttMs: number | null }[] = [];
    for (const line of stdout.split('\n')) {
      if (isWindows) {
        // Windows tracert line: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
        // Capture: group 1 = hop, group 2 = first RTT (may be "<1" or digits), group 3 = IP
        const m = line.match(/^\s*(\d+)\s+[<\d]+\s*ms.*?([\d.]+)\s*$/);
        if (m) {
          // Try to extract the first numeric RTT from the line
          const rttMatch = line.match(/(\d+)\s*ms/);
          hops.push({ hop: parseInt(m[1]), ip: m[2], rttMs: rttMatch ? parseFloat(rttMatch[1]) : null });
        }
      } else {
        // Unix traceroute line: "  1  192.168.1.1  0.456 ms"
        const m = line.match(/^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s*ms/);
        if (m) hops.push({ hop: parseInt(m[1]), ip: m[2], rttMs: m[3] ? parseFloat(m[3]) : null });
      }
    }
    return hops;
  } catch {
    return [];
  }
}

// ── TCP Port Check ────────────────────────────────────────────────────────────
async function checkTcpPort(
  host: string,
  port: number,
  timeoutMs = 3000
): Promise<{ open: boolean; latencyMs: number | null; banner: string | null }> {
  return new Promise(resolve => {
    const start = Date.now();
    let banner: string | null = null;
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const latencyMs = Date.now() - start;
      // Wait briefly for a service banner
      socket.setTimeout(500);
      socket.once('data', data => {
        banner = data.toString('utf8').slice(0, 100).replace(/[\r\n]+/g, ' ').trim();
        socket.destroy();
        resolve({ open: true, latencyMs, banner });
      });
      // No banner received
      socket.once('timeout', () => { socket.destroy(); resolve({ open: true, latencyMs, banner: null }); });
    });

    socket.on('error', () => { socket.destroy(); resolve({ open: false, latencyMs: null, banner: null }); });
    socket.on('timeout', () => { socket.destroy(); resolve({ open: false, latencyMs: null, banner: null }); });
  });
}

// ── Allegro port-flow lookup ──────────────────────────────────────────────────
interface AllegroConn {
  protocol?: string;
  l7Protocol?: string;
  clientIp?: string;
  clientPort?: number;
  serverIp?: string;
  serverPort?: number;
  responseMs?: number | null;
  score?: string;
  bytes?: number;
  packets?: number;
}

async function getAllegroPortFlows(
  srcIp: string | undefined,
  dstIp: string,
  dstPort: number
): Promise<AllegroConn[]> {
  const device = getActiveDevice();
  if (!device) return [];

  try {
    const ip = srcIp || dstIp;
    const raw = await fetchAllegro(device, `API/stats/modules/ip/ips/${ip}/connections`, {
      sort: 'bytes', reverse: true, page: 0, count: 200, timespan: 300,
    }) as { displayedItems?: AllegroConn[] } | AllegroConn[];

    const items: AllegroConn[] = Array.isArray(raw) ? raw : (raw?.displayedItems || []);
    return items.filter(c =>
      c.serverPort === dstPort || c.clientPort === dstPort
    ).slice(0, 20);
  } catch {
    return [];
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { srcIp, dstIp, dstPort, protocol = 'TCP' } = await req.json();

  if (!dstIp) return NextResponse.json({ error: 'กรุณาระบุ Destination IP' }, { status: 400 });
  if (!isValidIp(dstIp)) return NextResponse.json({ error: 'Destination IP ไม่ถูกต้อง' }, { status: 400 });
  if (srcIp && !isValidIp(srcIp)) return NextResponse.json({ error: 'Source IP ไม่ถูกต้อง' }, { status: 400 });

  const port = dstPort ? parseInt(String(dstPort)) : null;
  if (port !== null && (isNaN(port) || port < 1 || port > 65535)) {
    return NextResponse.json({ error: 'Port ต้องเป็นตัวเลข 1–65535' }, { status: 400 });
  }

  // Run ping + traceroute + port check in parallel
  const tasks: Promise<unknown>[] = [runPing(dstIp), runTraceroute(dstIp)];
  if (port !== null && protocol === 'TCP') {
    tasks.push(checkTcpPort(dstIp, port));
  }

  const [ping, traceroute, portResult] = await Promise.all(tasks) as [
    Awaited<ReturnType<typeof runPing>>,
    Awaited<ReturnType<typeof runTraceroute>>,
    Awaited<ReturnType<typeof checkTcpPort>> | undefined,
  ];

  // Allegro data
  const device = getActiveDevice();
  let allegroData: unknown = null;
  let pcapSummary = null;
  let allegroPortFlows: AllegroConn[] = [];

  if (device && srcIp) {
    try {
      const conns = await fetchAllegro(device, `API/stats/modules/ip/ips/${srcIp}/connections`, {
        sort: 'bytes', reverse: true, page: 0, count: 100,
      });
      allegroData = conns;
    } catch { /* ignore */ }

    try {
      const now = Math.floor(Date.now() / 1000);
      const filterProto = protocol === 'UDP' ? 'UDP' : 'TCP';
      const res = await fetchAllegroRaw(device, 'API/data/modules/capture', {
        expression: `ip==${srcIp} and ip==${dstIp} and l4Protocol==${filterProto}${port ? ` and port==${port}` : ''}`,
        starttime: `${now - 120}000000`,
        endtime: 'now',
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        pcapSummary = parsePcap(buf);
      }
    } catch { /* ignore */ }
  }

  if (port !== null) {
    allegroPortFlows = await getAllegroPortFlows(srcIp, dstIp, port);
  }

  // Build AI prompt
  const portSection = port !== null && portResult
    ? `
TCP Port ${port} Check (จาก monitoring server → ${dstIp}:${port}):
- สถานะ  : ${portResult.open ? `✅ OPEN (latency ${portResult.latencyMs}ms)` : '❌ CLOSED / FILTERED'}
- Banner  : ${portResult.banner || 'ไม่มี'}
`
    : '';

  const allegroPortSection = allegroPortFlows.length > 0
    ? `
Allegro พบ traffic ผ่าน port ${port} (5 นาทีล่าสุด):
${allegroPortFlows.slice(0, 5).map(c =>
  `  ${c.clientIp}:${c.clientPort} → ${c.serverIp}:${c.serverPort} [${c.l7Protocol || c.protocol || 'TCP'}] ${c.responseMs != null ? c.responseMs + 'ms' : ''} ${c.score || ''}`
).join('\n')}
`
    : port !== null ? `\nAllegro: ไม่พบ traffic ผ่าน port ${port} ใน 5 นาทีล่าสุด\n` : '';

  const prompt = `คุณเป็น Network Engineer
ตรวจสอบ connectivity: ${srcIp || 'server'} → ${dstIp}${port ? `:${port}` : ''}

Ping จาก monitoring server:
- Alive       : ${ping.alive ? '✅ ตอบสนอง' : '❌ ไม่ตอบสนอง'}
- Avg RTT     : ${ping.avgMs !== null ? ping.avgMs + 'ms' : 'N/A'}
- Packet Loss : ${ping.loss}%

Traceroute:
${traceroute.length ? traceroute.map(h => `  Hop ${h.hop}: ${h.ip} ${h.rttMs != null ? h.rttMs + 'ms' : '*'}`).join('\n') : '  ไม่ได้ข้อมูล'}
${portSection}${allegroPortSection}
${allegroData ? `Allegro Connections (${srcIp}):\n${JSON.stringify(allegroData).slice(0, 2000)}` : ''}
${pcapSummary ? `PCAP: TCP SYN ${pcapSummary.tcpSyn}, SYN-ACK ${pcapSummary.tcpSynAck}, RST ${pcapSummary.tcpRst}, RTT avg ${pcapSummary.avgRttMs?.toFixed(1) ?? 'N/A'}ms` : ''}

วิเคราะห์:
## 🔗 สถานะ Connectivity
## 🔌 สถานะ Port ${port || ''}
## ⚠️ ปัญหาที่พบ (ถ้ามี)
## 🔧 ขั้นตอนแก้ไข
ตอบเป็นภาษาไทย`;

  const aiAnalysis = await geminiAnalyze(prompt).catch(e =>
    `ไม่สามารถวิเคราะห์ AI: ${e instanceof Error ? e.message : e}`
  );

  return NextResponse.json({ ping, traceroute, portResult: portResult ?? null, allegroPortFlows, pcapSummary, aiAnalysis });
}
