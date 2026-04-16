'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Device {
  id: string;
  name: string;
  url: string;
  username: string;
  is_active: number;
  verify_ssl: number;
  created_at: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', username: '', password: '', verify_ssl: false });
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; error?: string } | 'loading'>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadDevices() {
    const res = await fetch('/api/devices');
    const data = await res.json();
    setDevices(data.devices || []);
    setLoading(false);
  }

  useEffect(() => { loadDevices(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast('เพิ่ม device สำเร็จ', 'success');
      setForm({ name: '', url: '', username: '', password: '', verify_ssl: false });
      setShowForm(false);
      loadDevices();
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบ device "${name}"?`)) return;
    await fetch('/api/devices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    showToast('ลบ device แล้ว', 'success');
    loadDevices();
  }

  async function handleActivate(id: string) {
    await fetch(`/api/devices/${id}/activate`, { method: 'POST' });
    showToast('เปลี่ยน active device แล้ว', 'success');
    loadDevices();
  }

  async function handleTest(id: string) {
    setTestResults(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(`/api/devices/${id}/test`);
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
    } catch {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: 'Network error' } }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm shadow-xl transition-all ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Allegro Devices</h1>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่ม Device
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-xl p-5 mb-6 border border-slate-700">
            <h2 className="text-white font-medium mb-4">เพิ่ม Allegro Device ใหม่</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">ชื่อ Device</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="เช่น Allegro Main Office"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">URL</label>
                <input
                  required
                  value={form.url}
                  onChange={e => setForm(v => ({ ...v, url: e.target.value }))}
                  placeholder="https://192.168.1.100:8443"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Username</label>
                <input
                  required
                  value={form.username}
                  onChange={e => setForm(v => ({ ...v, username: e.target.value }))}
                  placeholder="admin"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={e => setForm(v => ({ ...v, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <div
                    onClick={() => setForm(v => ({ ...v, verify_ssl: !v.verify_ssl }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${form.verify_ssl ? 'bg-blue-600' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${form.verify_ssl ? 'translate-x-4' : 'translate-x-1'}`} />
                  </div>
                  Verify SSL Certificate
                </label>
                <span className="text-slate-500 text-xs">(ปิดไว้ถ้าใช้ self-signed cert)</span>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Device List */}
        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => <div key={i} className="bg-slate-800 rounded-xl p-5 h-24 animate-pulse" />)}
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium">ยังไม่มี Device</p>
            <p className="text-slate-500 text-sm mt-1">กดปุ่ม "เพิ่ม Device" ด้านบนเพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map(device => {
              const testResult = testResults[device.id];
              return (
                <div key={device.id} className={`bg-slate-800 rounded-xl p-5 border transition-colors ${device.is_active ? 'border-blue-600' : 'border-transparent'}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{device.name}</span>
                        {device.is_active === 1 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-400 rounded-full font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm font-mono">{device.url}</div>
                      <div className="text-slate-500 text-xs mt-1">User: {device.username} · SSL: {device.verify_ssl ? 'เปิด' : 'ปิด'}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Test Result */}
                      {testResult && testResult !== 'loading' && (
                        <span className={`text-xs px-2 py-1 rounded-lg ${testResult.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                          {testResult.ok ? `✅ ${testResult.latencyMs}ms` : `❌ ${testResult.error || 'ล้มเหลว'}`}
                        </span>
                      )}
                      {testResult === 'loading' && (
                        <span className="text-xs text-slate-400 animate-pulse">กำลังทดสอบ...</span>
                      )}

                      <button
                        onClick={() => handleTest(device.id)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
                      >
                        ทดสอบ
                      </button>
                      {device.is_active !== 1 && (
                        <button
                          onClick={() => handleActivate(device.id)}
                          className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs transition-colors"
                        >
                          ใช้งาน
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(device.id, device.name)}
                        className="px-3 py-1.5 bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white rounded-lg text-xs transition-colors"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
