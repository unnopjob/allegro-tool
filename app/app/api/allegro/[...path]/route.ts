import { NextRequest, NextResponse } from 'next/server';
import { getActiveDevice } from '@/lib/db';
import { fetchAllegroRaw } from '@/lib/allegro';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const device = getActiveDevice();
  if (!device) return NextResponse.json({ error: 'ไม่มี active device' }, { status: 503 });

  const { path } = await params;
  const allegroPath = path.join('/');
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  try {
    const res = await fetchAllegroRaw(device, allegroPath, searchParams);
    const contentType = res.headers.get('content-type') || 'application/json';

    if (contentType.includes('application/json')) {
      const data = await res.json() as Record<string, unknown>;

      // Handle Allegro async response pattern: poll until result is ready
      if (data && typeof data.asyncID !== 'undefined' && typeof data.asyncUUID !== 'undefined') {
        const { asyncID, asyncUUID } = data;
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          const pollRes = await fetchAllegroRaw(device, `API/async/${asyncID}`, { uuid: String(asyncUUID) });
          if (pollRes.ok) {
            const poll = await pollRes.json() as Record<string, unknown>;
            if (poll && typeof poll.asyncResult !== 'undefined') {
              return NextResponse.json(poll.asyncResult, { status: 200 });
            }
          }
        }
        return NextResponse.json({}, { status: 200 }); // timeout
      }

      return NextResponse.json(data, { status: res.status });
    } else {
      // Binary (PCAP)
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment',
        },
      });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Proxy error' }, { status: 503 });
  }
}

export const GET = handler;
export const POST = handler;
