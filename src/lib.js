import { createClient } from '@supabase/supabase-js';
import { translateMessage, currentLanguage } from './appearance.js';
import { unzipSync, strFromU8 } from 'fflate';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
export const configured = Boolean(supabaseUrl && supabaseKey);
export const supabase = configured ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function sourceUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' ? esc(u.href) : '#'; }
  catch { return '#'; }
}
export function date(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat(({kk:'kk-KZ',en:'en-US',ru:'ru-RU'})[currentLanguage()]||'ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }
  catch { return String(value); }
}
export function toast(message, bad = false) {
  const box = document.getElementById('toast');
  box.textContent = translateMessage(message);
  box.style.display = 'block';
  box.style.borderColor = bad ? '#ed91a0' : '#65dec5';
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { box.style.display = 'none'; }, 5000);
}
export function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}
export async function functionCall(name, body) {
  const session = unwrap(await supabase.auth.getSession()).session;
  if (!session) throw new Error('Сначала войдите в аккаунт');
  const response = await fetch('/.netlify/functions/' + name, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}
export async function fileText(file) {
  if (!file) return '';
  if (file.size > 8_000_000) throw new Error('Файл должен быть не больше 8 МБ');
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.(txt|md)$/.test(name)) return new TextDecoder().decode(bytes).slice(0,30000);
  if (name.endsWith('.pdf')) {
    const { extractText } = await import('unpdf');
    const result = await extractText(bytes,{mergePages:true});
    return String(result.text || '').slice(0,30000);
  }
  if (name.endsWith('.docx')) {
    const entries = unzipSync(bytes,{filter:x => x.name === 'word/document.xml'});
    const xml = entries['word/document.xml'] && strFromU8(entries['word/document.xml']);
    if (!xml) throw new Error('Не удалось прочитать DOCX');
    return xml.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').slice(0,30000);
  }
  throw new Error('Поддерживаются PDF, DOCX, TXT и MD');
}
export function fileMime(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.md')) return 'text/markdown';
  return 'text/plain';
}
