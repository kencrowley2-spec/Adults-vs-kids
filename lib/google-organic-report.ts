import {analyticsReport,searchConsoleReport} from './google-reporting';
import {organicBusinessReport} from './organic-business';
import {googleMeasurementId} from './google-measurement';
const cache=new Map<number,{until:number;value:Record<string,unknown>}>();
const pending=new Map<number,Promise<Record<string,unknown>>>();
export async function googleOrganicReport(days:number){
 if(![7,28,90].includes(days))throw Error('Unsupported reporting period');
 const prior=cache.get(days);if(prior&&prior.until>Date.now())return prior.value;
 if(pending.has(days))return pending.get(days)!;
 const request=(async()=>{
  const [search,analytics,business]=await Promise.all([searchConsoleReport(days),analyticsReport(days),organicBusinessReport(days)]);
  const result={generatedAt:new Date().toISOString(),days,search,analytics,business,collection:{status:googleMeasurementId()?'Configured; live receipt not verified':'Not Yet Available',scope:'Optional consented public acquisition pages only; member/child/gameplay pages excluded. Business conversions remain in private first-party reporting.'},definitions:['Search Console uses final Web data and Pacific dates; GA4 uses the configured property time zone; first-party reporting uses Indiana dates. All windows exclude today.','Previous period is the immediately preceding equal-length period. Small samples and Search Console-suppressed queries do not establish a ranking trend.','GA4 Google-organic sessions, first-party Google-referral sessions and Search Console clicks are distinct measurements; never combine their denominators.','An Amazon outbound click is not a confirmed paperback purchase. No individual customer data or credentials are returned by this reporting section.']};
  cache.set(days,{value:result,until:Date.now()+120000});return result;
 })();pending.set(days,request);
 try{return await request;}finally{pending.delete(days);}
}
