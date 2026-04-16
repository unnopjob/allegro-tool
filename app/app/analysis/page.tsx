'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AskAI from '@/components/AskAI';

type AnalysisType = 'general' | 'security' | 'bandwidth' | 'connections' | 'tcpflow';
type IncidentType = 'slow' | 'nowebsite' | 'video' | 'down';
type Tab = 'analysis' | 'incident' | 'rootcause';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('analysis');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('general');
  const [ip, setIp] = useState(searchParams.get('ip') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rootCauseText, setRootCauseText] = useState('');
  const [hasDevice, setHasDevice] = useState<boolean | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/devices').then(r => r.json()).then(d => {
      setHasDevice((d.devices || []).some((dev: { is_active: number }) => dev.is_active === 1));
    }).catch(() => setHasDevice(false));
    fetch('/api/settings').then(r => r.json()).then(d => {
      setHasApiKey(!!d.hasGeminiKey);
    }).catch(() => setHasApiKey(false));
  }, []);

  useEffect(() => {
    const paramIp = searchParams.get('ip');
    if (paramIp) { setIp(paramIp); setTab('analysis'); setAnalysisType('tcpflow'); }
  }, [searchParams]);

  async function runAnalysis(type: string, extraIp?: string, scenario?: string, userDescription?: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ip: extraIp || ip || undefined, scenario, userDescription }),
      });
      const data = await res.json();
      if (data.error) setResult(`❌ ${data.error}`);
      else setResult(data.result || data.analysis || 'ไม่มีผลลัพธ์');
    } catch {
      setResult('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  function renderResult(text: string | null) {
    if (!text) return null;
    return (
      <div className="bg-slate-700/50 rounded-xl p-5 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  const incidentButtons: { type: IncidentType; label: string; icon: string; desc: string }[] = [
    { type: 'slow', label: 'อินเทอร์เน็ตช้า', icon: '🐢', desc: 'วิเคราะห์สาเหตุ bandwidth อิ่มตัว' },
    { type: 'nowebsite', label: 'เข้าเว็บไม่ได้', icon: '🌐', desc: 'ตรวจสอบ DNS / routing ปัญหา' },
    { type: 'video', label: 'Video กระตุก', icon: '📹', desc: 'วิเคราะห์ latency / packet loss' },
    { type: 'down', label: 'เน็ตใช้ไม่ได้เลย', icon: '❌', desc: 'ตรวจสอบ interface / uplink' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">AI Network Analysis</h1>

        {hasApiKey === false && (
          <div className="mb-4 px-4 py-2.5 bg-yellow-900/30 border border-yellow-700 rounded-xl flex items-center justify-between text-sm">
            <span className="text-yellow-300">⚠️ ยังไม่มี Gemini API Key — AI จะยังใช้งานไม่ได้</span>
            <a href="/settings" className="text-yellow-400 hover:text-white underline text-xs">ตั้งค่า</a>
          </div>
        )}
        {hasDevice === false && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl flex items-center justify-between">
            <span className="text-yellow-300 text-sm">⚠️ ยังไม่มี Active Device — ผลการวิเคราะห์จะไม่มีข้อมูล Network จริง</span>
            <a href="/devices" className="text-yellow-400 hover:text-white text-sm underline">เพิ่ม Device</a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-6 w-fit">
          {([['analysis', 'AI Analysis'], ['incident', 'ปัญหาสำเร็จรูป'], ['rootcause', 'วิเคราะห์เหตุการณ์']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: AI Analysis */}
        {tab === 'analysis' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">ประเภทการวิเคราะห์</label>
                  <select
                    value={analysisType}
                    onChange={e => setAnalysisType(e.target.value as AnalysisType)}
                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">ภาพรวมเครือข่าย</option>
                    <option value="security">ความปลอดภัย</option>
                    <option value="bandwidth">Bandwidth Usage</option>
                    <option value="connections">Connections</option>
                    <option value="tcpflow">TCP Flow / IP เฉพาะ</option>
                  </select>
                </div>
                {(analysisType === 'tcpflow' || analysisType === 'connections') && (
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">IP Address (optional)</label>
                    <input
                      value={ip}
                      onChange={e => setIp(e.target.value)}
                      placeholder="192.168.1.x"
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => runAnalysis(analysisType)}
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</span>
                    กำลังวิเคราะห์...
                  </>
                ) : 'วิเคราะห์ →'}
              </button>
            </div>

            {result && (
              <div>
                {renderResult(result)}
                <div className="mt-3 flex justify-end">
                  <AskAI context={result} contextType="analysis" buttonLabel="ถามเพิ่มเติม" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Incident */}
        {tab === 'incident' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incidentButtons.map(btn => (
                <button
                  key={btn.type}
                  onClick={() => runAnalysis('incident', undefined, btn.type)}
                  disabled={loading}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 hover:border-slate-500 rounded-xl p-6 text-left transition-all group"
                >
                  <div className="text-4xl mb-3">{btn.icon}</div>
                  <div className="text-white font-semibold mb-1">{btn.label}</div>
                  <div className="text-slate-400 text-sm">{btn.desc}</div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="bg-slate-800 rounded-xl p-8 flex items-center justify-center gap-3 text-slate-400">
                <span className="flex gap-1.5">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</span>
                กำลังวิเคราะห์ข้อมูลเครือข่าย...
              </div>
            )}

            {result && !loading && (
              <div>
                {renderResult(result)}
                <div className="mt-3 flex justify-end">
                  <AskAI context={result} contextType="analysis" buttonLabel="ถามเพิ่มเติม" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Root Cause */}
        {tab === 'rootcause' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5">
              <label className="block text-slate-300 font-medium mb-2">อธิบายอาการที่พบ</label>
              <textarea
                value={rootCauseText}
                onChange={e => setRootCauseText(e.target.value)}
                rows={4}
                placeholder="เช่น: ผู้ใช้ในห้อง A แจ้งว่าเข้า SAP ไม่ได้ตั้งแต่เช้า แต่ internet ปกติ"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
              />
              <button
                onClick={() => runAnalysis('rootcause', undefined, undefined, rootCauseText)}
                disabled={loading || !rootCauseText.trim()}
                className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</span>
                    กำลังวิเคราะห์ Root Cause...
                  </>
                ) : 'วิเคราะห์ Root Cause →'}
              </button>
            </div>

            {result && !loading && (
              <div>
                {renderResult(result)}
                <div className="mt-3 flex justify-end">
                  <AskAI context={result} contextType="analysis" buttonLabel="ถามเพิ่มเติม" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Path Check Section */}
        <PathCheck />
      </div>
    </div>
  );
}

interface PathCheckResult {
  ping?: { alive: boolean; avgMs: number | null; loss: number };
  traceroute?: { hop: number; ip: string; rttMs: number | null }[];
  portResult?: { open: boolean; latencyMs: number | null; banner: string | null } | null;
  allegroPortFlows?: { protocol?: string; l7Protocol?: string; clientIp?: string; clientPort?: number; serverIp?: string; serverPort?: number; responseMs?: number | null; score?: string }[];
  aiAnalysis?: string;
}

function PathCheck() {
  const [srcIp, setSrcIp] = useState('');
  const [dstIp, setDstIp] = useState('');
  const [dstPort, setDstPort] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PathCheckResult | null>(null);

  async function runCheck() {
    if (!dstIp.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/tools/pathcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srcIp: srcIp || undefined,
          dstIp,
          dstPort: dstPort ? parseInt(dstPort) : undefined,
          protocol,
        }),
      });
      const data = await res.json();
      if (data.error) setResult({ aiAnalysis: `❌ ${data.error}` });
      else setResult(data);
    } catch {
      setResult({ aiAnalysis: '❌ เกิดข้อผิดพลาดในการตรวจสอบ' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border-t border-slate-700 pt-6">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        ตรวจเส้นทาง (Path Check)
      </h2>
      <div className="bg-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Source IP (optional)</label>
            <input
              value={srcIp}
              onChange={e => setSrcIp(e.target.value)}
              placeholder="192.168.1.x"
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-slate-500 pb-2">→</div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Destination IP *</label>
            <input
              value={dstIp}
              onChange={e => setDstIp(e.target.value)}
              placeholder="8.8.8.8"
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-slate-500 pb-2">:</div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Port (optional)</label>
            <input
              value={dstPort}
              onChange={e => setDstPort(e.target.value.replace(/\D/g, ''))}
              placeholder="443"
              maxLength={5}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Protocol</label>
            <select
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
            </select>
          </div>
          <button
            onClick={runCheck}
            disabled={loading || !dstIp.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'กำลังตรวจ...' : 'ตรวจสอบ'}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            {result.ping && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">สถานะ</div>
                  <div className={`font-semibold ${result.ping.alive ? 'text-green-400' : 'text-red-400'}`}>
                    {result.ping.alive ? '✅ ตอบสนอง' : '❌ ไม่ตอบสนอง'}
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Avg RTT</div>
                  <div className="text-white font-semibold">{result.ping.avgMs != null ? `${result.ping.avgMs}ms` : 'N/A'}</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Packet Loss</div>
                  <div className={`font-semibold ${result.ping.loss > 10 ? 'text-red-400' : result.ping.loss > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {result.ping.loss}%
                  </div>
                </div>
              </div>
            )}

            {result.traceroute && result.traceroute.length > 0 && (
              <div>
                <div className="text-slate-400 text-xs mb-2">Traceroute</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.traceroute.map((hop) => (
                    <div key={hop.hop} className="flex items-center gap-3 text-sm">
                      <span className="text-slate-500 w-6 text-right">{hop.hop}</span>
                      <span className="text-white font-mono">{hop.ip}</span>
                      <span className="text-slate-400">{hop.rttMs != null ? `${hop.rttMs}ms` : '*'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Port Check Result */}
            {result.portResult !== undefined && result.portResult !== null && (
              <div>
                <div className="text-slate-400 text-xs mb-2">Port Check</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">สถานะ Port</div>
                    <div className={`font-semibold ${result.portResult.open ? 'text-green-400' : 'text-red-400'}`}>
                      {result.portResult.open ? '✅ OPEN' : '❌ CLOSED'}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Latency</div>
                    <div className="text-white font-semibold">
                      {result.portResult.latencyMs != null ? `${result.portResult.latencyMs}ms` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Banner</div>
                    <div className="text-white text-xs truncate">
                      {result.portResult.banner || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allegro Port Flows */}
            {result.allegroPortFlows && result.allegroPortFlows.length > 0 && (
              <div>
                <div className="text-slate-400 text-xs mb-2">Allegro — Traffic ผ่าน Port นี้ (5 นาทีล่าสุด)</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.allegroPortFlows.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-700/30 rounded-lg px-3 py-2">
                      <span className="text-slate-400 shrink-0">{c.l7Protocol || c.protocol || 'TCP'}</span>
                      <span className="text-white font-mono">{c.clientIp}:{c.clientPort}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white font-mono">{c.serverIp}:{c.serverPort}</span>
                      {c.responseMs != null && <span className="text-slate-400 ml-auto">{c.responseMs}ms</span>}
                      {c.score && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${c.score === 'GOOD' ? 'bg-green-900/50 text-green-400' : c.score === 'BAD' ? 'bg-red-900/50 text-red-400' : 'bg-slate-600 text-slate-300'}`}>
                          {c.score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.aiAnalysis && (
              <div className="bg-slate-700/30 rounded-xl p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-blue-500">
                {result.aiAnalysis}
              </div>
            )}

            {result.aiAnalysis && (
              <div className="flex justify-end">
                <AskAI context={JSON.stringify(result, null, 2).slice(0, 2000)} contextType="path" buttonLabel="ถาม AI" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900"><Navbar /></div>}>
      <AnalysisContent />
    </Suspense>
  );
}
