import https from 'https';
import type { Device } from './db';

// Pre-built agents — reused across requests (no env-var mutation)
const secureAgent   = new https.Agent({ rejectUnauthorized: true });
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export interface AllegroInterface {
  name: string;
  linkUp: boolean;
  status: string;
  rxBps: number;
  txBps: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  mac?: string;
}

export interface AllegroIpEntry {
  ip: string;
  rxBps: number;
  txBps: number;
  rxBytes: number;
  txBytes: number;
}

export async function fetchAllegro(
  device: Device,
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<unknown> {
  const url = new URL(`${device.url}/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  const auth = Buffer.from(`${device.username}:${device.password}`).toString('base64');
  const agent = device.verify_ssl ? secureAgent : insecureAgent;

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(15000),
    // @ts-expect-error — Node.js fetch accepts agent for https
    agent,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/** Fetch an Allegro endpoint that may return an async response.
 *  Allegro returns { asyncID, asyncUUID } for heavy queries.
 *  This helper detects that pattern and polls /API/async/{id}?uuid={uuid}
 *  until a result is ready (max 10 attempts, 500 ms apart).
 */
export async function fetchAllegroAsync(
  device: Device,
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<unknown> {
  const data = await fetchAllegro(device, path, params) as Record<string, unknown>;

  // Not async — return as-is
  if (!data || typeof data.asyncID === 'undefined' || typeof data.asyncUUID === 'undefined') {
    return data;
  }

  const { asyncID, asyncUUID } = data;

  // Poll up to 10 times
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const poll = await fetchAllegro(
      device,
      `API/async/${asyncID}`,
      { uuid: String(asyncUUID) }
    ) as Record<string, unknown>;

    if (poll && typeof poll.asyncResult !== 'undefined') {
      return poll.asyncResult;
    }
    // errorCode !== 0 means still processing — keep polling
  }

  return {}; // timeout — return empty
}

export async function fetchAllegroRaw(
  device: Device,
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<Response> {
  const url = new URL(`${device.url}/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const auth = Buffer.from(`${device.username}:${device.password}`).toString('base64');
  const agent = device.verify_ssl ? secureAgent : insecureAgent;

  return await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(30000),
    // @ts-expect-error — Node.js fetch accepts agent for https
    agent,
  });
}

export function formatBps(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
  return `${bps.toFixed(0)} bps`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes.toFixed(0)} B`;
}

/** Calculate Network Health Score 0-100 from interface stats */
export function calcHealthScore(interfaces: AllegroInterface[]): {
  score: number;
  level: 'good' | 'warning' | 'critical';
  reasons: string[];
} {
  let score = 100;
  const reasons: string[] = [];

  for (const iface of interfaces) {
    if (!iface.linkUp) {
      score -= 20;
      reasons.push(`Interface ${iface.name} DOWN`);
    }
    const totalPkts = iface.rxPackets + iface.txPackets;
    if (totalPkts > 0) {
      const errRate = ((iface.rxErrors + iface.txErrors) / totalPkts) * 100;
      const dropRate = ((iface.rxDrops + iface.txDrops) / totalPkts) * 100;
      if (errRate > 0.5) {
        const penalty = Math.min(20, errRate * 2);
        score -= penalty;
        reasons.push(`${iface.name} error rate ${errRate.toFixed(2)}%`);
      }
      if (dropRate > 0.5) {
        const penalty = Math.min(20, dropRate * 2);
        score -= penalty;
        reasons.push(`${iface.name} drop rate ${dropRate.toFixed(2)}%`);
      }
    }
  }

  score = Math.max(0, Math.round(score));
  const level = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'critical';
  return { score, level, reasons };
}
