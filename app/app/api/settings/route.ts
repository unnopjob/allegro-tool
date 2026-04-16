import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, getSetting, setSetting } from '@/lib/db';
import { testApiKey } from '@/lib/gemini';

export async function GET() {
  const raw = getAllSettings();
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    settings[key] = key.includes('key') ? (value ? '••••••••' + value.slice(-4) : '') : value;
  }
  return NextResponse.json({ settings, hasGeminiKey: !!raw['gemini_api_key'] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const allowed = ['gemini_api_key', 'ollama_url'];
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue;
    setSetting(key, value as string);
  }
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const { apiKey } = await req.json();
  const keyToTest = apiKey || getSetting('gemini_api_key') || '';
  if (!keyToTest) return NextResponse.json({ ok: false, error: 'ไม่มี API Key — กรุณาบันทึก key ก่อน' });
  const ok = await testApiKey(keyToTest);
  return NextResponse.json({ ok });
}
