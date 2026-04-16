'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import AskAI from '@/components/AskAI';

interface KnowledgeFile {
  id: number;
  original_name: string;
  filename: string;
  created_at: string;
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [tab, setTab] = useState<'upload' | 'text'>('upload');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFiles(); }, []);

  async function loadFiles() {
    try {
      const r = await fetch('/api/knowledge');
      if (r.ok) {
        const d = await r.json();
        setFiles(d.files);
      }
    } catch {
      // Network error — leave existing file list unchanged
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/knowledge', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) { setMessage('อัปโหลดสำเร็จ'); loadFiles(); }
      else setMessage(`ผิดพลาด: ${d.error}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleTextSave() {
    if (!textName.trim() || !textContent.trim()) return;
    setUploading(true);
    setMessage('');
    const fd = new FormData();
    fd.append('name', textName);
    fd.append('text', textContent);
    try {
      const r = await fetch('/api/knowledge', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) { setMessage('บันทึกสำเร็จ'); setTextName(''); setTextContent(''); loadFiles(); }
      else setMessage(`ผิดพลาด: ${d.error}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('ต้องการลบไฟล์นี้?')) return;
    const r = await fetch('/api/knowledge', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!r.ok) { setMessage('ลบไม่สำเร็จ — กรุณาลองใหม่'); return; }
    loadFiles();
  }

  const filesContext = files.map(f => f.original_name).join(', ');

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <AskAI context={`Knowledge base files: ${filesContext || 'ยังไม่มีไฟล์'}`} contextType="knowledge" buttonLabel="ถาม AI" />
        </div>
        <p className="text-slate-400 text-sm mb-6">อัปโหลดไฟล์หรือข้อมูลที่ต้องการให้ AI อ่านและใช้อ้างอิงในการตอบคำถาม</p>

        {/* Add content */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('upload')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              อัปโหลดไฟล์
            </button>
            <button onClick={() => setTab('text')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              เพิ่มข้อความ
            </button>
          </div>

          {tab === 'upload' && (
            <div>
              <p className="text-slate-400 text-sm mb-3">รองรับ: PDF, TXT, MD, CSV, JSON</p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-slate-400 text-sm">{uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกไฟล์'}</span>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.csv,.json" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          )}

          {tab === 'text' && (
            <div className="space-y-3">
              <input
                value={textName}
                onChange={e => setTextName(e.target.value)}
                placeholder="ชื่อข้อมูล (เช่น: Network Diagram, IP Allocation)"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              />
              <textarea
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder="วางข้อมูลที่ต้องการให้ AI รู้จัก..."
                rows={6}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              />
              <button
                onClick={handleTextSave}
                disabled={uploading || !textName.trim() || !textContent.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                บันทึก
              </button>
            </div>
          )}

          {message && (
            <div className={`mt-3 text-sm px-4 py-2.5 rounded-lg ${message.includes('ผิดพลาด') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
              {message}
            </div>
          )}
        </div>

        {/* File list */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-semibold mb-4">ข้อมูลทั้งหมด ({files.length})</h2>
          {files.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">ยังไม่มีข้อมูลใน Knowledge Base</p>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{f.original_name}</p>
                      <p className="text-slate-400 text-xs">{new Date(f.created_at).toLocaleString('th-TH')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
