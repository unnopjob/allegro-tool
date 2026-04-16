/**
 * Minimal PCAP parser (pure Node.js, no external deps)
 * Supports: pcap classic (magic 0xa1b2c3d4 / 0xd4c3b2a1)
 */

export interface PcapSummary {
  totalPackets: number;
  tcp: number;
  udp: number;
  icmp: number;
  other: number;
  tcpSyn: number;
  tcpSynAck: number;
  tcpRst: number;
  tcpFin: number;
  retransmits: number;
  zeroWindows: number;
  conversations: ConvEntry[];
  avgRttMs: number | null;
  durationSeconds: number;
}

interface ConvEntry {
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  packets: number;
  bytes: number;
}

function readUint32(buf: Buffer, offset: number, le: boolean): number {
  return le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}

function readUint16(buf: Buffer, offset: number, le: boolean): number {
  return le ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
}

function ipToStr(buf: Buffer, offset: number): string {
  return `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
}

export function parsePcap(buffer: Buffer): PcapSummary {
  const summary: PcapSummary = {
    totalPackets: 0, tcp: 0, udp: 0, icmp: 0, other: 0,
    tcpSyn: 0, tcpSynAck: 0, tcpRst: 0, tcpFin: 0,
    retransmits: 0, zeroWindows: 0,
    conversations: [], avgRttMs: null, durationSeconds: 0,
  };

  if (buffer.length < 24) return summary;

  const magic = buffer.readUInt32LE(0);
  if (magic !== 0xa1b2c3d4 && magic !== 0xd4c3b2a1) return summary;

  const le = magic === 0xa1b2c3d4;
  // linktype at offset 20
  const linkType = readUint32(buffer, 20, le);
  const ethOffset = linkType === 1 ? 14 : 0; // Ethernet or raw

  let pos = 24;
  const convMap = new Map<string, ConvEntry>();
  const synMap = new Map<string, number>(); // seq → ts_us for RTT calc
  const rtts: number[] = [];
  let firstTs = 0, lastTs = 0;

  while (pos + 16 <= buffer.length) {
    const tsSec = readUint32(buffer, pos, le);
    const tsUsec = readUint32(buffer, pos + 4, le);
    const inclLen = readUint32(buffer, pos + 8, le);
    pos += 16;

    if (pos + inclLen > buffer.length) break;
    const pkt = buffer.subarray(pos, pos + inclLen);
    pos += inclLen;
    summary.totalPackets++;

    const tsUs = tsSec * 1_000_000 + tsUsec;
    if (firstTs === 0) firstTs = tsUs;
    lastTs = tsUs;

    if (pkt.length < ethOffset + 20) continue;

    // IP layer
    const ipStart = ethOffset;
    if (pkt.length <= ipStart + 1) continue;
    const ipVer = (pkt[ipStart] >> 4) & 0xf;
    if (ipVer !== 4) continue; // IPv4 only

    const ihl = (pkt[ipStart] & 0xf) * 4;
    const proto = pkt[ipStart + 9];
    const srcIp = ipToStr(pkt, ipStart + 12);
    const dstIp = ipToStr(pkt, ipStart + 16);

    if (proto === 6) {
      summary.tcp++;
      const tcpStart = ipStart + ihl;
      if (pkt.length < tcpStart + 20) continue;

      const srcPort = readUint16(pkt, tcpStart, false);
      const dstPort = readUint16(pkt, tcpStart + 2, false);
      const seq = pkt.readUInt32BE(tcpStart + 4);
      const flags = pkt[tcpStart + 13];
      const window = readUint16(pkt, tcpStart + 14, false);
      const dataOff = ((pkt[tcpStart + 12] >> 4) & 0xf) * 4;
      const payloadLen = pkt.length - tcpStart - dataOff;

      const SYN = !!(flags & 0x02);
      const ACK = !!(flags & 0x10);
      const RST = !!(flags & 0x04);
      const FIN = !!(flags & 0x01);

      if (SYN && !ACK) {
        summary.tcpSyn++;
        synMap.set(`${srcIp}:${srcPort}-${dstIp}:${dstPort}-${seq}`, tsUs);
      }
      if (SYN && ACK) {
        summary.tcpSynAck++;
        // Try match SYN for RTT
        const ack = pkt.readUInt32BE(tcpStart + 8);
        const synKey = `${dstIp}:${dstPort}-${srcIp}:${srcPort}-${ack - 1}`;
        const synTs = synMap.get(synKey);
        if (synTs) {
          rtts.push((tsUs - synTs) / 1000);
          synMap.delete(synKey);
        }
      }
      if (RST) summary.tcpRst++;
      if (FIN) summary.tcpFin++;
      if (window === 0) summary.zeroWindows++;

      // Track conversations
      const key = `${srcIp}:${srcPort}-${dstIp}:${dstPort}`;
      const existing = convMap.get(key);
      if (existing) {
        existing.packets++;
        existing.bytes += Math.max(0, payloadLen);
      } else {
        convMap.set(key, { srcIp, srcPort, dstIp, dstPort, packets: 1, bytes: Math.max(0, payloadLen) });
      }
    } else if (proto === 17) {
      summary.udp++;
    } else if (proto === 1) {
      summary.icmp++;
    } else {
      summary.other++;
    }
  }

  summary.durationSeconds = (lastTs - firstTs) / 1_000_000;
  summary.avgRttMs = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : null;

  // Top 10 conversations by bytes
  summary.conversations = Array.from(convMap.values())
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  return summary;
}
