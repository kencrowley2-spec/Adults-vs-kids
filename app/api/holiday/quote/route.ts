import {holidayShipping,HOLIDAY_PRICE} from '../../../../lib/holiday-shipping';
import {holidayReply} from '../../../../lib/holiday-payments';
export const dynamic='force-dynamic';
export function GET(request:Request){try{const quote=holidayShipping(new URL(request.url).searchParams.get('zip'));return holidayReply({...quote,subtotal:HOLIDAY_PRICE,total:HOLIDAY_PRICE+quote.cents});}catch(e){return holidayReply({error:(e as Error).message},400);}}
