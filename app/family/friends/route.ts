import {verifiedMember,memberReply,memberRedirect} from '../../../lib/auth/session';
import {requestOrigin} from '../../../lib/request-origin';
import {htmlEscape as esc} from '../../../lib/member-pages';

export const dynamic='force-dynamic';
type Family={id:string,name:string,status:string,incoming:boolean,connectionId?:string};
function action(label:string,kind:string,id:string){
 return `<form method="post"><input type="hidden" name="action" value="${kind}"><input type="hidden" name="id" value="${esc(id)}"><button>${label}</button></form>`;
}
function row(f:Family,search:boolean){
 const connection=search?f.connectionId:f.id;
 let controls='';
 if(f.status==='pending'&&connection){
  controls=f.incoming?action('Accept','approve',connection)+action('Decline','decline',connection):'<span>Request sent</span>'+action('Cancel request','remove',connection);
 }else if(f.status==='accepted')controls='<span>Friends</span>'+(!search&&connection?action('Remove friend','remove',connection):'');
 else controls=action('Send friend request','request',f.id);
 return `<li><strong>${esc(f.name)}</strong><div>${controls}</div></li>`;
}
export async function GET(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberRedirect('/login',auth.headers);
 const query=new URL(request.url).searchParams.get('q')?.trim()||'';
 const result=await auth.client.rpc('family_friends',{p_action:query?'search':'read',p_data:{query}});
 const data=result.data as {connections:Family[],results:Family[]}|null;
 const section=(title:string,rows:Family[],empty:string,search=false)=>`<section><h2>${title}</h2>${rows.length?`<ul>${rows.map(f=>row(f,search)).join('')}</ul>`:`<p>${empty}</p>`}</section>`;
 const content=data?(query?section('Search results',data.results,'No matching families. Try their team name or last name.',true):'')+
  section('Friend requests',data.connections.filter(f=>f.status==='pending'),'No pending requests.')+
  section('Your friends',data.connections.filter(f=>f.status==='accepted'),'Your accepted family friends will appear here.'):'<p role="alert">Family records could not load. Check your search and try again.</p>';
 return memberReply(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Family &amp; Friends · Adults vs. Kids</title><style>*{box-sizing:border-box}body{margin:0;background:#20190f;color:#fff8eb;font:1rem/1.45 system-ui}main{max-width:48rem;margin:auto;padding:1.25rem}a{color:#ffda74}h1,h2{color:#ffe4a1}section{margin:1rem 0;background:#342819;border:1px solid #795f35;padding:1rem;border-radius:.85rem}button,input{padding:.7rem;border-radius:.5rem;font:inherit}button{background:#ffda74;color:#241c0c;border:0;font-weight:700;cursor:pointer}input{width:min(100%,22rem)}label{display:block;margin-bottom:.35rem}ul{padding:0;list-style:none}li{padding:.75rem 0;border-top:1px solid #705c3f}li div,.search{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}li strong{display:block;margin-bottom:.4rem}</style></head><body><main><a href="/family">← Family dashboard</a><h1>Family &amp; Friends</h1><section><h2>Find a family</h2><form><label for="q">Team or family name</label><div class="search"><input id="q" name="q" minlength="2" maxlength="60" required value="${esc(query)}"><button>Search</button></div></form></section>${content}</main></body></html>`,result.error?503:200,auth.headers);
}
export async function POST(request:Request){
 const auth=await verifiedMember(request);
 if(!auth.user||!auth.client)return memberRedirect('/login',auth.headers);
 if(request.headers.get('Origin')!==requestOrigin(request))return memberReply('Invalid origin',403,auth.headers);
 const data=await request.formData(),kind=String(data.get('action')),id=String(data.get('id'));
 if(!['request','approve','decline','remove'].includes(kind)||! /^[0-9a-f-]{36}$/i.test(id))return memberReply('Invalid request',400,auth.headers);
 const result=await auth.client.rpc('family_friends',{p_action:kind,p_data:kind==='request'?{familyId:id}:{id}});
 if(result.error)return memberReply('This action is unavailable. <a href="/family/friends">Return to your requests</a>',400,auth.headers);
 return memberRedirect('/family/friends',auth.headers);
}
