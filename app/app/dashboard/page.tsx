'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import AskAI from '@/components/AskAI';

interface InterfaceStats {
  name: string;
  status: string;
  rxBps: number;
  txBps: number;
  rxBytes: number;
  txBytes: number;
  errorPackets: number;
  dropPackets: number;
  rxPackets: number;
  txPackets: number;
}

interface IpEntry {
  ip: string;
  rxBps: number;
  txBps: number;
  rxBytes: number;
  txBytes: number;
}

interface IpDetail {
  ip: string;
  tcpStats: {
    clientHandshakeMs: number | null;
    serverHandshakeMs: number | null;
    responseAvgMs: number | null;
    responseMaxMs: number | null;
    retransmitPct: number | null;
  } | null;
  peers: { ip: string; bytes: number; packets: number }[];
  connections: { protocol: string; clientIp: string; clientPort: number; serverIp: string; serverPort: number; responseMs: number | null; score: string }[];
}

interface HealthScore {
  score: number;
  level: 'good' | 'warn' | 'bad';
  reasons: string[];
}

function formatBps(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`;
  return `${bps} bps`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function DashboardPage() {
  const [interfaces, setInterfaces] = useState<InterfaceStats[]>([]);
  const [topIps, setTopIps] = useState<IpEntry[]>([]);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [countdown, setCountdown] = useState(30);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [ipDetail, setIpDetail] = useState<IpDetail | null>(null);
  const [ipDetailLoading, setIpDetailLoading] = useState(false);
  const [hasDevice, setHasDevice] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ifaceRes, ipsRes] = await Promise.all([
        fetch('/api/allegro/API/stats/interfaces'),
        fetch('/api/allegro/API/stats/modules/ip/ips_paged?sort=bps&count=15&timespan=60'),
      ]);

      if (ifaceRes.status === 404 || ifaceRes.status === 503) {
        setHasDevice(false);
        setLoading(false);
        return;
      }
      setHasDevice(true);

      const ifaceData = await ifaceRes.json();
      const ipsData = await ipsRes.json();

      // Parse interfaces
      const ifaces: InterfaceStats[] = [];
      const rawIfaces = Array.isArray(ifaceData) ? ifaceData : (ifaceData?.interfaces || ifaceData?.data || []);
      for (const iface of rawIfaces) {
        ifaces.push({
          name: iface.name || iface.interface || 'Unknown',
          status: iface.link === 1 || iface.status === 'up' || iface.up === true ? 'UP' : 'DOWN',
          rxBps: iface.rxBps || iface.rx_bps || 0,
          txBps: iface.txBps || iface.tx_bps || 0,
          rxBytes: iface.rxBytes || iface.rx_bytes || 0,
          txBytes: iface.txBytes || iface.tx_bytes || 0,
          errorPackets: iface.errorPackets || iface.errors || 0,
          dropPackets: iface.dropPackets || iface.drops || 0,
          rxPackets: iface.rxPackets || iface.rx_packets || 0,
          txPackets: iface.txPackets || iface.tx_packets || 0,
        });
      }
      setInterfaces(ifaces);

      // Parse IPs
      const rawIps = Array.isArray(ipsData) ? ipsData : (ipsData?.data || ipsData?.ips || []);
      const ips: IpEntry[] = rawIps.slice(0, 15).map((ip: Record<string, number | string>) => ({
        ip: String(ip.ip || ip.address || ''),
        rxBps: Number(ip.rxBps || ip.rx_bps || 0),
        txBps: Number(ip.txBps || ip.tx_bps || 0),
        rxBytes: Number(ip.rxBytes || ip.rx_bytes || 0),
        txBytes: Number(ip.txBytes || ip.tx_bytes || 0),
      }));
      setTopIps(ips);

      // Calculate health score
      let score = 100;
      const reasons: string[] = [];
      for (const iface of ifaces) {
        if (iface.status === 'DOWN') { score -= 20; reasons.push(`${iface.name} DOWN`); }
        const totalPkts = iface.rxPackets + iface.txPackets;
        if (totalPkts > 0) {
          const errorPct = (iface.errorPackets / totalPkts) * 100;
          const dropPct = (iface.dropPackets / totalPkts) * 100;
          if (errorPct > 0) { const deduct = Math.min(20, errorPct * 2); score -= deduct; reasons.push(`${iface.name} errors ${errorPct.toFixed(1)}%`); }
          if (dropPct > 0) { const deduct = Math.min(20, dropPct * 2); score -= deduct; reasons.push(`${iface.name} drops ${dropPct.toFixed(1)}%`); }
        }
      }
      score = Math.max(0, Math.round(score));
      const level: 'good' | 'warn' | 'bad' = score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad';
      setHealth({ score, level, reasons });

      setLastUpdate(new Date().toLocaleTimeString('th-TH'));
      setCountdown(30);
    } catch {
      setError('ไม่สามารถเชื่อมต่อ device ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchData(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function openIpDetail(ip: string) {
    setSelectedIp(ip);
    setIpDetail(null);
    setIpDetailLoading(true);
    try {
      const [statsRes, tcpRes, peersRes, connsRes] = await Promise.all([
        fetch(`/api/allegro/API/stats/modules/ip/ips/${ip}`),
        fetch(`/api/allegro/API/stats/modules/ip/ips/${ip}/tcpStats`),
        fetch(`/api/allegro/API/stats/modules/ip/ips/${ip}/peers?sort=bytes&count=10`),
        fetch(`/api/allegro/API/stats/modules/ip/ips/${ip}/connections?sort=bytes&count=20`),
      ]);

      const [stats, tcp, peers, conns] = await Promise.all([
        statsRes.json().catch(() => ({})),
        tcpRes.json().catch(() => ({})),
        peersRes.json().catch(() => ({ data: [] })),
        connsRes.json().catch(() => ({ data: [] })),
      ]);

      const peerList = (Array.isArray(peers) ? peers : peers?.data || []).map((p: Record<string, unknown>) => ({
        ip: String(p.ip || p.address || ''),
        bytes: Number(p.bytes || 0),
        packets: Number(p.packets || 0),
      }));

      const connList = (Array.isArray(conns) ? conns : conns?.data || []).map((c: Record<string, unknown>) => ({
        protocol: String(c.protocol || c.l7Protocol || 'TCP'),
        clientIp: String(c.clientIp || ''),
        clientPort: Number(c.clientPort || 0),
        serverIp: String(c.serverIp || ''),
        serverPort: Number(c.serverPort || 0),
        responseMs: c.responseMs != null ? Number(c.responseMs) : null,
        score: String(c.score || 'NORMAL'),
      }));

      setIpDetail({
        ip,
        tcpStats: {
          clientHandshakeMs: tcp?.clientHandshakeMs || stats?.tcpClientHandshakeMs || null,
          serverHandshakeMs: tcp?.serverHandshakeMs || stats?.tcpServerHandshakeMs || null,
          responseAvgMs: tcp?.responseAvgMs || null,
          responseMaxMs: tcp?.responseMaxMs || null,
          retransmitPct: tcp?.retransmitPct || null,
        },
        peers: peerList,
        connections: connList,
      });
    } catch {
      setIpDetail({ ip, tcpStats: null, peers: [], connections: [] });
    } finally {
      setIpDetailLoading(false);
    }
  }

  const scoreColor = health?.level === 'good' ? 'text-green-400' : health?.level === 'warn' ? 'text-yellow-400' : 'text-red-400';
  const scoreRingColor = health?.level === 'good' ? '#4ade80' : health?.level === 'warn' ? '#facc15' : '#f87171';
  const contextStr = JSON.stringify({ interfaces, topIps, health }, null, 2).slice(0, 3000);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Network Dashboard</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            {lastUpdate && <span>อัปเดตล่าสุด: {lastUpdate}</span>}
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'กำลังโหลด...' : `⟳ ${countdown}s`}
            </button>
          </div>
        </div>

        {/* No Device State */}
        {hasDevice === false && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg font-medium">ยังไม่มี Device</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">เพิ่ม Allegro Device ก่อนเพื่อเริ่มดูข้อมูลเครือข่าย</p>
            <a href="/devices" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">เพิ่ม Device</a>
          </div>
        )}

        {error && hasDevice !== false && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-red-400 hover:text-white text-sm underline">Retry</button>
          </div>
        )}

        {hasDevice !== false && (
          <>
            {/* Network Health Score */}
            {health && (
              <div className="bg-slate-800 rounded-xl p-5 mb-6 flex items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#334155" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={scoreRingColor} strokeWidth="8"
                      strokeDasharray={`${(health.score / 100) * 201} 201`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-bold ${scoreColor}`}>{health.score}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-lg">Network Health Score</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${health.level === 'good' ? 'bg-green-900/50 text-green-400' : health.level === 'warn' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                      {health.level === 'good' ? 'ดี' : health.level === 'warn' ? 'ควรตรวจสอบ' : 'มีปัญหา'}
                    </span>
                  </div>
                  {health.reasons.length > 0
                    ? <p className="text-slate-400 text-sm">{health.reasons.join(', ')}</p>
                    : <p className="text-slate-400 text-sm">ทุกอย่างทำงานปกติ</p>
                  }
                </div>
                <div className="ml-auto">
                  <AskAI context={contextStr} contextType="dashboard" buttonLabel="ถาม AI" />
                </div>
              </div>
            )}

            {/* Interface Cards */}
            {loading && interfaces.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-slate-700 rounded w-1/3 mb-4" />
                    <div className="h-3 bg-slate-700 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {interfaces.map(iface => (
                  <div key={iface.name} className="bg-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-semibold">{iface.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${iface.status === 'UP' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {iface.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-400">
                        <span>↑ Tx</span><span className="text-white">{formatBps(iface.txBps)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>↓ Rx</span><span className="text-white">{formatBps(iface.rxBps)}</span>
                      </div>
                      {iface.errorPackets > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Errors</span><span className="text-yellow-400">{iface.errorPackets}</span>
                        </div>
                      )}
                      {iface.dropPackets > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Drops</span><span className="text-yellow-400">{iface.dropPackets}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top IPs */}
            <div className="bg-slate-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                Top IPs by Bandwidth
                <span className="text-xs text-slate-500 font-normal">(อัปเดตทุก 30 วินาที)</span>
              </h2>

              {loading && topIps.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-700 rounded-lg animate-pulse" />)}
                </div>
              ) : topIps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>ไม่มีข้อมูล IP ในขณะนี้</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-left border-b border-slate-700">
                        <th className="pb-2 pr-4">#</th>
                        <th className="pb-2 pr-4">IP Address</th>
                        <th className="pb-2 pr-4">Rx</th>
                        <th className="pb-2 pr-4">Tx</th>
                        <th className="pb-2 pr-4">Total</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {topIps.map((ip, i) => (
                        <tr key={ip.ip} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="py-2.5 pr-4 text-slate-500">{i + 1}</td>
                          <td className="py-2.5 pr-4 text-white font-mono">{ip.ip}</td>
                          <td className="py-2.5 pr-4 text-blue-400">{formatBps(ip.rxBps)}</td>
                          <td className="py-2.5 pr-4 text-green-400">{formatBps(ip.txBps)}</td>
                          <td className="py-2.5 pr-4 text-slate-300">{formatBytes(ip.rxBytes + ip.txBytes)}</td>
                          <td className="py-2.5">
                            <button
                              onClick={() => openIpDetail(ip.ip)}
                              className="px-2.5 py-1 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
                            >
                              รายละเอียด
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* IP Detail Modal */}
      {selectedIp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedIp(null)}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg font-mono">IP: {selectedIp}</h3>
              <button onClick={() => setSelectedIp(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ipDetailLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="flex gap-2">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              </div>
            ) : ipDetail ? (
              <div className="p-5 space-y-5">
                {/* TCP Stats */}
                {ipDetail.tcpStats && (
                  <div>
                    <h4 className="text-slate-300 font-medium mb-3">TCP Stats</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {ipDetail.tcpStats.clientHandshakeMs != null && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Client Handshake</div>
                          <div className="text-white font-semibold">{ipDetail.tcpStats.clientHandshakeMs}ms</div>
                        </div>
                      )}
                      {ipDetail.tcpStats.serverHandshakeMs != null && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Server Handshake</div>
                          <div className="text-white font-semibold">{ipDetail.tcpStats.serverHandshakeMs}ms</div>
                        </div>
                      )}
                      {ipDetail.tcpStats.responseAvgMs != null && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Response avg</div>
                          <div className="text-white font-semibold">{ipDetail.tcpStats.responseAvgMs}ms</div>
                        </div>
                      )}
                      {ipDetail.tcpStats.responseMaxMs != null && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Response max</div>
                          <div className="text-white font-semibold">{ipDetail.tcpStats.responseMaxMs}ms</div>
                        </div>
                      )}
                      {ipDetail.tcpStats.retransmitPct != null && (
                        <div className="bg-slate-700/50 rounded-lg p-3 col-span-2">
                          <div className="text-slate-400 text-xs mb-1">Retransmit</div>
                          <div className={`font-semibold ${ipDetail.tcpStats.retransmitPct > 3 ? 'text-red-400' : ipDetail.tcpStats.retransmitPct > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {ipDetail.tcpStats.retransmitPct.toFixed(2)}%
                            {ipDetail.tcpStats.retransmitPct > 3 && ' ⚠️'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Peers */}
                {ipDetail.peers.length > 0 && (
                  <div>
                    <h4 className="text-slate-300 font-medium mb-3">Top Peers</h4>
                    <div className="space-y-2">
                      {ipDetail.peers.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-white font-mono">{p.ip}</span>
                          <span className="text-slate-400">{formatBytes(p.bytes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connections */}
                {ipDetail.connections.length > 0 && (
                  <div>
                    <h4 className="text-slate-300 font-medium mb-3">Connections</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ipDetail.connections.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-slate-700/30 rounded-lg px-3 py-2">
                          <span className="text-slate-400">{c.protocol}</span>
                          <span className="text-white font-mono">{c.serverIp}:{c.serverPort}</span>
                          {c.responseMs != null && <span className="text-slate-400">{c.responseMs}ms</span>}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.score === 'GOOD' ? 'bg-green-900/50 text-green-400' : c.score === 'BAD' ? 'bg-red-900/50 text-red-400' : 'bg-slate-600 text-slate-300'}`}>
                            {c.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <a href={`/analysis?ip=${selectedIp}`} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm text-center transition-colors">
                    วิเคราะห์ IP นี้
                  </a>
                  <AskAI
                    context={JSON.stringify(ipDetail, null, 2).slice(0, 2000)}
                    contextType="ip_detail"
                    buttonLabel="ถาม AI"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
