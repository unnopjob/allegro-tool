import { getSetting } from './db';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string {
  // Priority: DB settings → env var
  const fromDb = getSetting('gemini_api_key');
  if (fromDb) return fromDb;
  return process.env.GEMINI_API_KEY || '';
}

export async function geminiChat(
  messages: { role: string; content: string }[],
  systemPrompt?: string
): Promise<ReadableStream> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ไม่พบ Gemini API Key — กรุณาตั้งค่าใน Settings หรือ .env.local');

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  return res.body!;
}

export async function geminiAnalyze(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ไม่พบ Gemini API Key — กรุณาตั้งค่าใน Settings หรือ .env.local');

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'ไม่มีผลลัพธ์จาก AI';
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
