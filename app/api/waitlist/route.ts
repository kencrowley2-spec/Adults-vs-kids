import {requestOrigin} from '../../../lib/request-origin';
import { publicDataClient } from '../../../lib/data';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export async function POST(request: Request) {
  if (request.headers.get('Origin') !== requestOrigin(request)) return reply({ error: 'Please join from this website.' }, 403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return reply({ error: 'Invalid request.' }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 2048) return reply({ error: 'Request too large.' }, 413);
    let data; try { data = JSON.parse(raw); } catch { return reply({ error: 'Invalid request.' }, 400); }
    if (!data || typeof data !== 'object') return reply({ error: 'Invalid request.' }, 400);
    if (data.website) return reply({ saved: true });
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!name || name.length > 80 || /[\x00-\x1f]/.test(name)) return reply({ error: 'Please enter your name (up to 80 characters).' }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Please enter a valid email address.' }, 400);
    const {error}=await publicDataClient().from('app_waitlist').insert({email,name,consent_version:'app-launch-updates-v1'});
    if(error&&error.code!=='23505')throw error;
    return reply({ saved: true, message: 'You’re on the free app waitlist! We’ll use your email for app launch and waitlist updates. No payment or subscription has been started.' });
  } catch {
    return reply({ error: 'We couldn’t save your signup. Please try again.' }, 503);
  }
}
