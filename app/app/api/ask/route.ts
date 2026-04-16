import { NextRequest, NextResponse } from 'next/server';
import { geminiChat } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const { question, context, contextType } = await req.json();
  if (!question?.trim()) return new NextResponse('Bad Request', { status: 400 });
  const safeContext = typeof context === 'string' ? context.slice(0, 4000) : '';

  const systemPrompt = `คุณเป็น Senior Network Engineer ผู้เชี่ยวชาญ ตอบเป็นภาษาไทยที่เข้าใจง่าย
${safeContext ? `\nข้อมูล context (${contextType || 'general'}):\n${safeContext}` : ''}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const geminiStream = await geminiChat([{ role: 'user', content: question }], systemPrompt);
        const reader = geminiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            try {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              const data = JSON.parse(raw);
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
