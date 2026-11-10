import {holidayPage} from '../../lib/holiday-page';
import {trackedHtml} from '../../lib/analytics';
export function GET(){return new Response(trackedHtml(holidayPage()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
