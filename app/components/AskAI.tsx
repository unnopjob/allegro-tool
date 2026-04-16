'use client';
import { useState, useRef, useEffect } from 'react';

interface AskAIProps {
  context: string;
  contextType: string;
  buttonLabel?: string;
}

export default function AskAI({ context, contextType, buttonLabel = 'ถาม AI' }: AskAIProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(true);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function ask() {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context, contextType }),
      });

      const reader = res.body!.getReader();
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
                updated[updated.length - 1] = { role: 'ai', content: `❌ ${data.error}` };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', content: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setOpenUpward(rect.top > 300);
          }
          setOpen(v => !v);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-medium transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {buttonLabel}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute right-0 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Assistant
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-slate-500 hover:text-slate-300 text-xs">ล้าง</button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: '120px' }}>
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                <p>ถามคำถามเกี่ยวกับข้อมูลนี้ได้เลย</p>
                <p className="text-xs mt-1 text-slate-600">AI จะตอบโดยอ้างอิงข้อมูล context ที่มีอยู่</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                  {msg.role === 'ai' && !msg.content && loading && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      {[0,1,2].map(j => <span key={j} className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${j*150}ms` }} />)}
                    </span>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์คำถาม..."
                disabled={loading}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 disabled:opacity-50"
              />
              <button
                onClick={ask}
                disabled={loading || !question.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
