'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(false);
  const [useNetworkContext, setUseNetworkContext] = useState(false);
  const [hasDevice, setHasDevice] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/devices').then(r => r.json()).then(d => {
      setHasDevice((d.devices || []).some((dev: { is_active: number }) => dev.is_active === 1));
    }).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then(d => {
      setHasApiKey(!!d.hasGeminiKey);
    }).catch(() => setHasApiKey(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const allMessages = [...messages, userMsg];
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, sessionId, useKnowledge, useNetworkContext }),
      });

      if (!res.body) throw new Error('No response stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.content,
                };
                return updated;
              });
            }
            if (data.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: `❌ ${data.error}` };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sessionId, useKnowledge, useNetworkContext]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 overflow-hidden">
        {/* No API Key Warning */}
        {hasApiKey === false && (
          <div className="mb-3 px-4 py-2.5 bg-yellow-900/30 border border-yellow-700 rounded-xl flex items-center justify-between text-sm">
            <span className="text-yellow-300">⚠️ ยังไม่มี Gemini API Key — AI จะยังใช้งานไม่ได้</span>
            <a href="/settings" className="text-yellow-400 hover:text-white underline text-xs">ตั้งค่า</a>
          </div>
        )}
        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Gemini 2.0 Flash
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <div
              onClick={() => setUseKnowledge(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useKnowledge ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${useKnowledge ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
            Knowledge Base
          </label>

          {hasDevice && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <div
                onClick={() => setUseNetworkContext(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useNetworkContext ? 'bg-green-600' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${useNetworkContext ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
              <span className={useNetworkContext ? 'text-green-400' : ''}>
                Network Context {useNetworkContext ? ': Active' : ''}
              </span>
            </label>
          )}

          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="ml-auto text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors">
              ล้างประวัติ
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-400 text-lg font-medium">Network AI Assistant</p>
              <p className="text-slate-500 text-sm mt-1">ถามปัญหาเครือข่าย หรือเปิด Network Context เพื่อให้ AI รู้สถานะปัจจุบัน</p>
              {hasDevice && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {[
                    'ตอนนี้เครือข่ายเป็นยังไงบ้าง?',
                    'IP ไหนใช้ bandwidth เยอะสุด?',
                    'มี interface ไหน DOWN ไหม?',
                    'วิเคราะห์ปัญหาที่น่าเป็นห่วง',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); setUseNetworkContext(true); }}
                      className="text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-colors border border-slate-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-700 text-slate-100 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Gemini
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {msg.content || (loading && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : '')}
                </pre>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
            rows={2}
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
