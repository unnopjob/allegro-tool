import { NextRequest, NextResponse } from 'next/server';
import { setActiveDevice } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  setActiveDevice(id);
  return NextResponse.json({ success: true });
}
