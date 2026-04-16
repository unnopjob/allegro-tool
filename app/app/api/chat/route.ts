import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeFiles, getActiveDevice, addChatMessage, pruneOldChatHistory, nextId, getChatHistory } from '@/lib/db';
import type { ChatMessage } from '@/lib/db';
import { fetchAllegro } from '@/lib/allegro';
import { geminiChat } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const { messages, sessionId, useKnowledge, useNetworkContext } = await req.json();

  let systemPrompt = 'คุณเป็น Network Engineer ผู้เชี่ยวชาญ ช่วยวิเคราะห์และแก้ไขปัญหาเครือข่าย ตอบเป็นภาษาไทยที่เข้าใจง่าย';

  // Inject knowledge base
  if (useKnowledge) {
    const files = getKnowledgeFiles();
    if (files.length > 0) {
      const MAX_KB = 6000;
      let combined = '';
      for (const f of files) {
        const chunk = `=== ${f.original_name} ===\n${f.content}\n\n`;
        if (combined.length + chunk.length > MAX_KB) break;
        combined += chunk;
      }
      systemPrompt += `\n\nข้อมูลอ้างอิง:\n${combined}`;
    }
  }

  // Inject live network context
  if (useNetworkContext) {
    const device = getActiveDevice();
    if (device) {
      try {
        const [ifaces, topIps] = await Promise.allSettled([
          fetchAllegro(device, 'API/stats/interfaces'),
          fetchAllegro(device, 'API/stats/modules/ip/ips_paged', { sort: 'bps', reverse: true, count: 10, timespan: 60 }),
        ]);
        const ctx: Record<string, unknown> = {};
        if (ifaces.status === 'fulfilled') ctx.interfaces = ifaces.value;
        if (topIps.status === 'fulfilled') ctx.top_ips = topIps.value;
        systemPrompt += `\n\nข้อมูล Network ปัจจุบัน (${new Date().toLocaleTimeString('th-TH')}):\n${JSON.stringify(ctx).slice(0, 3000)}`;
      } catch { /* ignore */ }
    }
  }

  // Prune old history (เก็บแค่ 30 วัน)
  pruneOldChatHistory(30);

  // Save user message
  const lastUserMsg = messages[messages.length - 1];
  const sid = sessionId || 'default';
  if (lastUserMsg?.role === 'user') {
    const existing = getChatHistory(sid);
    const msg: ChatMessage = {
      id: nextId(existing),
      session_id: sid,
      role: 'user',
      content: lastUserMsg.content,
      created_at: new Date().toISOString(),
    };
    addChatMessage(msg);
  }

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const geminiStream = await geminiChat(messages, systemPrompt);
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
              if (text) {
                fullResponse += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
            } catch { /* skip */ }
          }
        }

        if (fullResponse) {
          const existing = getChatHistory(sid);
          const msg: ChatMessage = {
            id: nextId(existing),
            session_id: sid,
            role: 'assistant',
            content: fullResponse,
            created_at: new Date().toISOString(),
          };
          addChatMessage(msg);
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
