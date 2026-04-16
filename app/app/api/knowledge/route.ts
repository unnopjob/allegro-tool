import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeFiles, addKnowledgeFile, deleteKnowledgeFile, nextId } from '@/lib/db';
import type { KnowledgeFile } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function GET() {
  const files = getKnowledgeFiles().map(({ content: _c, ...f }) => f);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const textContent = formData.get('text') as string | null;
  const textName = formData.get('name') as string | null;

  if (textContent && textName) {
    const existing = getKnowledgeFiles();
    const kf: KnowledgeFile = {
      id: nextId(existing),
      filename: `text_${Date.now()}`,
      original_name: textName,
      content: textContent,
      created_at: new Date().toISOString(),
    };
    addKnowledgeFile(kf);
    return NextResponse.json({ success: true });
  }

  if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 10 MB)' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name).toLowerCase();
  const tmpPath = path.join(os.tmpdir(), `upload_${Date.now()}${ext}`);
  let content = '';

  try {
    await writeFile(tmpPath, buffer);
    if (ext === '.pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (await import('pdf-parse')) as any;
      const parseFn = pdfParse.default || pdfParse;
      const data = await parseFn(buffer);
      content = data.text;
    } else if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'รองรับเฉพาะ .pdf, .txt, .md, .csv, .json' }, { status: 400 });
    }
    const existing = getKnowledgeFiles();
    const kf: KnowledgeFile = {
      id: nextId(existing),
      filename: `file_${Date.now()}`,
      original_name: file.name,
      content,
      created_at: new Date().toISOString(),
    };
    addKnowledgeFile(kf);
    return NextResponse.json({ success: true });
  } finally {
    try { await unlink(tmpPath); } catch { /* ignore */ }
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteKnowledgeFile(Number(id));
  return NextResponse.json({ success: true });
}
