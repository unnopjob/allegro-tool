import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists (mkdirSync with recursive is idempotent)
fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  verify_ssl: number;
  is_active: number;
  created_at: string;
}

export interface KnowledgeFile {
  id: number;
  filename: string;
  original_name: string;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

// ─── File paths ───────────────────────────────────────────────────────────────

const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat_history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  // Write to a temp file then rename for atomic replacement
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export function getDevices(): Device[] {
  return readJson<Device[]>(DEVICES_FILE, []);
}

export function addDevice(device: Device): void {
  const devices = getDevices();
  devices.push(device);
  writeJson(DEVICES_FILE, devices);
}

export function updateDevice(id: string, updates: Partial<Device>): void {
  const devices = getDevices();
  const idx = devices.findIndex(d => d.id === id);
  if (idx !== -1) {
    devices[idx] = { ...devices[idx], ...updates };
    writeJson(DEVICES_FILE, devices);
  }
}

export function deleteDevice(id: string): void {
  const devices = getDevices().filter(d => d.id !== id);
  writeJson(DEVICES_FILE, devices);
}

export function setActiveDevice(id: string): boolean {
  const devices = getDevices();
  if (!devices.some(d => d.id === id)) return false;
  const updated = devices.map(d => ({ ...d, is_active: d.id === id ? 1 : 0 }));
  writeJson(DEVICES_FILE, updated);
  return true;
}

export function getActiveDevice(): Device | undefined {
  return getDevices().find(d => d.is_active === 1);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getAllSettings(): Record<string, string> {
  return readJson<Record<string, string>>(SETTINGS_FILE, {});
}

export function getSetting(key: string): string | undefined {
  return getAllSettings()[key];
}

export function setSetting(key: string, value: string): void {
  const settings = getAllSettings();
  settings[key] = value;
  writeJson(SETTINGS_FILE, settings);
}

// ─── Knowledge files ──────────────────────────────────────────────────────────

export function getKnowledgeFiles(): KnowledgeFile[] {
  return readJson<KnowledgeFile[]>(KNOWLEDGE_FILE, []);
}

export function addKnowledgeFile(file: KnowledgeFile): void {
  const files = getKnowledgeFiles();
  files.push(file);
  writeJson(KNOWLEDGE_FILE, files);
}

export function deleteKnowledgeFile(id: number): void {
  const files = getKnowledgeFiles().filter(f => f.id !== id);
  writeJson(KNOWLEDGE_FILE, files);
}

// ─── Chat history ─────────────────────────────────────────────────────────────

export function getChatHistory(sessionId: string): ChatMessage[] {
  return readJson<ChatMessage[]>(CHAT_FILE, []).filter(m => m.session_id === sessionId);
}

export function addChatMessage(msg: ChatMessage): void {
  const messages = readJson<ChatMessage[]>(CHAT_FILE, []);
  messages.push(msg);
  writeJson(CHAT_FILE, messages);
}

export function pruneChatHistory(sessionId: string, keepLast = 50): void {
  const all = readJson<ChatMessage[]>(CHAT_FILE, []);
  const others = all.filter(m => m.session_id !== sessionId);
  const session = all.filter(m => m.session_id === sessionId);
  const pruned = session.slice(-keepLast);
  writeJson(CHAT_FILE, [...others, ...pruned]);
}

export function pruneOldChatHistory(daysOld = 30): void {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  const all = readJson<ChatMessage[]>(CHAT_FILE, []);
  const kept = all.filter(m => m.created_at >= cutoff);
  writeJson(CHAT_FILE, kept);
}

// ─── Next ID helper ───────────────────────────────────────────────────────────

export function nextId<T extends { id: number }>(items: T[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map(i => i.id)) + 1;
}
