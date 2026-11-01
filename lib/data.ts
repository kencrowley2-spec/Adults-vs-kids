import { createClient } from '@supabase/supabase-js';
export function publicDataClient() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) throw new Error('Database configuration is unavailable');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function checked<T>(result:{data:T,error:{message:string}|null}):T {
 if(result.error)throw new Error(result.error.message);
 return result.data;
}
