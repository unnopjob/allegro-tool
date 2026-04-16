import { NextRequest, NextResponse } from 'next/server';
import { setActiveDevice } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = setActiveDevice(id);
  if (!found) return NextResponse.json({ error: 'ไม่พบ device' }, { status: 404 });
  return NextResponse.json({ success: true });
}
