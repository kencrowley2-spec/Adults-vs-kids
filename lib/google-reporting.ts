import {createSign} from 'node:crypto';
export const priorityKeywords=['parents vs kids games','family competition games','free printable family scorecard','family games at home','family games for kids','printable family games','family game night ideas','games to play at home with kids','fun family challenges','screen-free activities for kids'];
export const googleSite='https://adultsvskids.com/';
type Row={keys?:string[];clicks:number;impressions:number;ctr:number;position:number};
type Api={rows?:Row[];metadata?:Record<string,unknown>;dimensionHeaders?:unknown[];rowCount?:number;propertyQuota?:unknown};
export function dateInZone(now:Date,zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function shiftDay(date:string,n:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function reportWindows(days:number,now=new Date(),zone='America/Los_Angeles'){
 if(![7,28,90].includes(days))throw Error('Unsupported reporting period');
 const end=shiftDay(dateInZone(now,zone),-1),start=shiftDay(end,-days+1);
 return {current:{start,end},previous:{start:shiftDay(start,-days),end:shiftDay(start,-1)},timezone:zone,days};
}
const unavailable=(reason:string)=>({status:'Not Yet Available' as const,reason});
let token:{value:string;until:number;key:string}|null=null;
async function accessToken(){
 const source=process.env.GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON;if(!source)throw Error('Reporting credentials not configured');
 if(token&&token.key===source&&token.until>Date.now())return token.value;
 const account=JSON.parse(source);if(!/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(account.client_email)||typeof account.private_key!=='string')throw Error('Invalid reporting credential');
 const at=Math.floor(Date.now()/1000),b64=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',aud:'https://oauth2.googleapis.com/token',iat:at,exp:at+3600});
 const assertion=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(account.private_key,'base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Google authorization unavailable');
 const data=await response.json();if(typeof data.access_token!=='string')throw Error('Google authorization unavailable');
 token={value:data.access_token,until:Date.now()+Math.min(Number(data.expires_in)||3600,3600)*1000-60000,key:source};return token.value;
}
async function post(url:string,body:object,bearer:string){
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Google reporting request unavailable');return response.json();
}
export function brandGroup(query:string){return /\badults?\s*(?:vs\.?|versus)\s*kids?\b|adultsvs|adultsvskids|kenneth\s+crowley/i.test(query)?'Brand-like':'Nonbranded';}
export function keywordRows(current:Row[],previous:Row[],pages:Row[]){
 return priorityKeywords.map(keyword=>{
  const row=current.find(r=>r.keys?.[0]?.toLowerCase()===keyword),old=previous.find(r=>r.keys?.[0]?.toLowerCase()===keyword);
  return {keyword,status:row?'Observed':'Not Yet Available',clicks:row?.clicks??null,impressions:row?.impressions??null,ctr:row?.ctr??null,position:row?.position??null,previousPosition:old?.position??null,movement:row&&old?old.position-row.position:null,pages:[...new Set(pages.filter(r=>r.keys?.[0]?.toLowerCase()===keyword).map(r=>r.keys![1]))].slice(0,10)};
 });
}
export async function searchConsoleReport(days:number,now=new Date(),send=post,bearer?:string){
 const windows=reportWindows(days,now);
 if(process.env.GOOGLE_REPORTING_ENABLED!=='true')return {...unavailable('Google API connection is not activated.'),windows,keywords:keywordRows([],[],[])};
 try{
  const auth=bearer||await accessToken(),url='https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(googleSite)+'/searchAnalytics/query';
  const query=(range:{start:string;end:string},dimensions:string[],limit=25000)=>send(url,{startDate:range.start,endDate:range.end,type:'web',dataState:'final',aggregationType:dimensions.includes('page')?'auto':'byProperty',dimensions,rowLimit:limit},auth) as Promise<Api>;
  const [total,daily,queries,pages,pairs,oldTotal,oldQueries]=await Promise.all([
   query(windows.current,[],1),query(windows.current,['date']),query(windows.current,['query']),query(windows.current,['page']),query(windows.current,['query','page']),query(windows.previous,[],1),query(windows.previous,['query'])
  ]);
  const all=queries.rows||[],previous=oldQueries.rows||[];
  const groups=['Brand-like','Nonbranded'].map(group=>{const rows=all.filter(r=>brandGroup(r.keys?.[0]||'')===group);const impressions=rows.reduce((s,r)=>s+r.impressions,0),clicks=rows.reduce((s,r)=>s+r.clicks,0);return {group,impressions,clicks,ctr:impressions?clicks/impressions:null};});
  const totals=total.rows?.[0]||null;
  return {status:'Connected' as const,windows,totals,previous:oldTotal.rows?.[0]||null,daily:(daily.rows||[]).map(r=>({date:r.keys?.[0],position:r.position,impressions:r.impressions,clicks:r.clicks})),queries:all.slice().sort((a,b)=>b.impressions-a.impressions).slice(0,20),landings:(pages.rows||[]).slice().sort((a,b)=>b.impressions-a.impressions).slice(0,20),groups,keywords:keywordRows(all,previous,pairs.rows||[]),undisclosedImpressions:totals?Math.max(0,totals.impressions-all.reduce((s,r)=>s+r.impressions,0)):null,partial:[all,pages.rows||[],pairs.rows||[],previous].some(r=>r.length>=25000),note:'Final Web data; Pacific dates. Query privacy suppression and API top-row limits apply. No returned row is not a measured keyword position. Brand-like phrases may also have generic intent. Page/query-page impressions must not be added to property totals.'};
 }catch{return {...unavailable('Authorize the reporting service account for the exact Search Console property and enable its API.'),windows,keywords:keywordRows([],[],[])};}
}
type GaRow={dimensionValues?:{value:string}[];metricValues?:{value:string}[]};
type GaResult={rows?:GaRow[];rowCount?:number;metadata?:{timeZone?:string;dataLossFromOtherRow?:boolean;subjectToThresholding?:boolean;samplingMetadatas?:unknown[]}};
export async function analyticsReport(days:number,now=new Date(),send=post,bearer?:string){
 const timezone=process.env.GA4_REPORTING_TIMEZONE||'America/Indiana/Indianapolis';
 let windows;try{windows=reportWindows(days,now,timezone);}catch{return unavailable('Confirm the GA4 reporting time zone.');}
 const property=process.env.GA4_PROPERTY_ID||'';
 if(process.env.GOOGLE_REPORTING_ENABLED!=='true'||!/^\d+$/.test(property))return {...unavailable('Verified GA4 property and read-only API connection are not configured.'),windows};
 try{
  const auth=bearer||await accessToken(),url='https://analyticsdata.googleapis.com/v1beta/properties/'+property+':runReport';
  const run=(range:{start:string;end:string},dimensions:string[])=>send(url,{dateRanges:[{startDate:range.start,endDate:range.end}],dimensions:dimensions.map(name=>({name})),metrics:[{name:'sessions'}],dimensionFilter:{andGroup:{expressions:[{filter:{fieldName:'sessionSource',stringFilter:{matchType:'EXACT',value:'google'}}},{filter:{fieldName:'sessionMedium',stringFilter:{matchType:'EXACT',value:'organic'}}}]}},limit:'10000'},auth) as Promise<GaResult>;
  const [total,daily,pages,previous]=await Promise.all([run(windows.current,[]),run(windows.current,['date']),run(windows.current,['landingPage']),run(windows.previous,[])]);
  if(total.metadata?.timeZone&&total.metadata.timeZone!==timezone)return {...unavailable('Configured reporting time zone does not match the GA4 property. Confirm it before comparing periods.'),windows};
  const count=(r:GaResult)=>r.rows?.length?Number(r.rows[0].metricValues?.[0]?.value||0):0;
  return {status:'Connected' as const,windows,sessions:count(total),previousSessions:count(previous),daily:(daily.rows||[]).map(r=>({date:(r.dimensionValues?.[0]?.value||'').replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),sessions:Number(r.metricValues?.[0]?.value||0)})),landings:(pages.rows||[]).map(r=>({path:(r.dimensionValues?.[0]?.value||'').split('?')[0],sessions:Number(r.metricValues?.[0]?.value||0)})).sort((a,b)=>b.sessions-a.sessions).slice(0,20),timezone:total.metadata?.timeZone||timezone,partial:[total,daily,pages,previous].some(r=>(r.rowCount||0)>10000||r.metadata?.dataLossFromOtherRow||r.metadata?.subjectToThresholding||r.metadata?.samplingMetadatas?.length),note:'GA4 consented public-page sessions filtered to google / organic. Reporting delays, consent and blockers affect coverage. These sessions are not Search Console clicks or first-party conversion denominators.'};
 }catch{return {...unavailable('Authorize GA4 Viewer access and enable the Analytics Data API; verify property identity and stream.'),windows};}
}
