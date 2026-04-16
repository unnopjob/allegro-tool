import { NextRequest, NextResponse } from 'next/server';
import { getDevices, addDevice, deleteDevice } from '@/lib/db';
import type { Device } from '@/lib/db';

export async function GET() {
  const devices = getDevices().map(({ password: _pw, ...d }) => d);
  return NextResponse.json({ devices });
}

export async function POST(req: NextRequest) {
  const { name, url, username, password, verify_ssl } = await req.json();
  if (!name || !url || !username || !password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  }
  const id = Date.now().toString();
  const device: Device = {
    id,
    name,
    url,
    username,
    password,
    verify_ssl: verify_ssl ? 1 : 0,
    is_active: 0,
    created_at: new Date().toISOString(),
  };
  addDevice(device);
  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteDevice(id);
  return NextResponse.json({ success: true });
}
