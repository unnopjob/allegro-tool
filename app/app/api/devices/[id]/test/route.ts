import { NextRequest, NextResponse } from 'next/server';
import { getDevices } from '@/lib/db';
import { fetchAllegro } from '@/lib/allegro';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = getDevices().find(d => d.id === id);
  if (!device) return NextResponse.json({ error: 'ไม่พบ device' }, { status: 404 });

  const start = Date.now();
  try {
    await fetchAllegro(device, 'API/stats');
    return NextResponse.json({ ok: true, latencyMs: Date.now() - start });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Connection failed', latencyMs: Date.now() - start });
  }
}
