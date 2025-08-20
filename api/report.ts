// Vercel serverless function (Node.js runtime)
import type { VercelRequest, VercelResponse } from '@vercel/node';

function htmlEscape(s: string) {
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'} as any)[m] || m);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for POSTs from your site only; '*' if you need cross-origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shared-Secret');

  if (req.method === 'OPTIONS') return res.status(204).send('');

  if (req.method !== 'POST') return res.status(405).send('Only POST');

  // Basic shared-secret guard (optional but recommended)
  const expected = process.env.REPORT_SHARED_SECRET || '';
  const got = (req.headers['x-shared-secret'] || '') as string;
  if (expected && got !== expected) return res.status(401).send('Unauthorized');

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // your user or channel ID

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).send('Missing Telegram env vars');
  }

  const { name, time_spent, score, answers } = req.body || {};
  const safeName = htmlEscape(String(name || ''));
  const safeTime = htmlEscape(String(time_spent || ''));
  const safeScore = htmlEscape(String(score || ''));

  const lines = Array.isArray(answers) ? answers.map((a: string) => `• ${a}`) : [];
  const text =
`📝 *IELTS Listening Report*
👤 Name: *${safeName}*
⏱️ Time: *${safeTime}*
✅ Score: *${safeScore}*

*Answers:*
${lines.join('\n')}`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown'
    })
  });

  const jr = await r.json().catch(()=> ({}));
  if (!r.ok || jr.ok === false) {
    console.error('Telegram error:', jr);
    return res.status(502).json({ ok:false, error: jr });
  }
  return res.status(200).json({ ok:true });
}
