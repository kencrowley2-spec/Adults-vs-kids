import {previousHolidaySession,holidayReply} from '../../../../lib/holiday-payments';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const session=await previousHolidaySession(request);return holidayReply({paid:session?.payment_status==='paid',total:session?.payment_status==='paid'?session.amount_total:undefined});}catch{return holidayReply({paid:false});}}
