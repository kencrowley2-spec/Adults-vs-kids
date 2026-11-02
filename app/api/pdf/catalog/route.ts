import {availablePdfs} from '../../../../lib/payments/server';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({products:(await availablePdfs()).map(({id,title,cents,cover,available})=>({id,title,cents,cover,available}))},{headers:{'Cache-Control':'no-store'}});}
