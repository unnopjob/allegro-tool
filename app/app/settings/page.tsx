'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setHasKey(data.hasGeminiKey || false);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    if (!geminiKey.trim()) return;
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: geminiKey.trim() }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast('บันทึก API Key สำเร็จ', 'success');
      setHasKey(true);
      setGeminiKey('');
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const keyToTest = geminiKey.trim();
    if (!keyToTest && !hasKey) {
      showToast('กรุณาใส่ API Key ก่อนทดสอบ', 'error');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest || undefined }),
      });
      const data = await res.json();
      setTestResult(data.ok
        ? { ok: true, message: 'เชื่อมต่อ Gemini API สำเร็จ ✅' }
        : { ok: false, message: data.error || 'ไม่สามารถเชื่อมต่อได้' }
      );
    } catch {
      setTestResult({ ok: false, message: 'Network error' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm shadow-xl ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

        {/* Gemini API Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold">Gemini API</h2>
              <p className="text-slate-400 text-xs">ใช้สำหรับ AI Analysis ทั้งหมดในแอป</p>
            </div>
            <div className="ml-auto text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-lg">
              gemini-2.0-flash
            </div>
          </div>

          {hasKey && (
            <div className="mb-4 flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              มี API Key บันทึกไว้แล้ว
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-1">
              {hasKey ? 'เปลี่ยน API Key ใหม่' : 'Gemini API Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder={hasKey ? '••••• (กรอกใหม่เพื่อเปลี่ยน)' : 'AIzaSy...'}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-1">Priority: บันทึกใน DB &gt; .env.local (GEMINI_API_KEY)</p>
          </div>

          {testResult && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${testResult.ok ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !geminiKey.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {testing ? 'กำลังทดสอบ...' : 'ทดสอบ'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-800/50 rounded-xl p-5 text-sm text-slate-400">
          <h3 className="text-slate-300 font-medium mb-3">วิธีรับ Gemini API Key</h3>
          <ol className="space-y-2 list-decimal list-inside">
            <li>ไปที่ Google AI Studio (aistudio.google.com)</li>
            <li>กด &quot;Get API Key&quot;</li>
            <li>สร้าง API Key ใหม่หรือใช้ที่มีอยู่</li>
            <li>คัดลอก key และวางในช่องด้านบน</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
