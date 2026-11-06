import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import {clubPlayers,cleanClubProfile} from '../lib/club-profile.ts';
import {clubPage} from '../lib/club-app.ts';
const players=clubPlayers('Ken',{adults:['Dad','Mom'],kids:['Harper','Chloe']});
assert.equal(players.length,5);assert.equal(players[0].role,'Family administrator');
assert.equal(clubPlayers('Ken',{kids:['Chloe','Harper']})[2].key,players[3].key,'Reordering preserves profiles');
const base={key:'account',name:' Ken ',scene:'alpine',headshot:'',backdrop:''};
assert.equal(cleanClubProfile(base,players).display_name,'Ken');
for(const patch of [{key:'someone-else'},{name:''},{name:'x'.repeat(61)},{scene:'javascript:bad'},{headshot:'data:image/svg+xml;base64,PHN2Zz4='},{headshot:'data:image/jpeg;base64,SGVsbG8='},{backdrop:'x'.repeat(330001)}])assert.throws(()=>cleanClubProfile({...base,...patch},players));
const owner='11111111-1111-4111-8111-111111111111';let user={id:owner,user_metadata:{name:'Ken'}},isAdmin=true,failed=false,writes=0,write=null,filters=[];
const client={from:table=>({
 select(){return this},
 eq(key,value){filters.push([table,key,value]);return this},
 maybeSingle:async()=>({data:{adults:['Dad'],kids:['Harper']},error:failed?{message:'offline'}:null}),
 then(resolve){return Promise.resolve({data:[{profile_key:'account',display_name:'Ken',scene:'coast',headshot:'',backdrop:''}],error:failed?{message:'offline'}:null}).then(resolve)},
 upsert:async value=>{writes++;write=value;return {data:null,error:failed?{message:'offline'}:null}}
})};
const session={verifiedMember:async()=>({user,isAdmin,client,headers:new Headers({'Cache-Control':'private, no-store'})}),memberReply:(body,status,headers)=>new Response(JSON.stringify(body),{status,headers})};
const exports={};const code=ts.transpileModule(readFileSync('app/admin/app/profile-data/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports,require:name=>name.endsWith('/auth/session')?session:name.endsWith('/request-origin')?{requestOrigin:()=> 'https://adultsvskids.com'}:name.endsWith('/club-profile')?{clubPlayers,cleanClubProfile}:name.endsWith('/data')?{checked:r=>{if(r.error)throw Error('offline');return r.data}}:assert.fail(name),Headers,Response,Request,URL,Date});
const post=(body,headers={})=>exports.POST(new Request('https://adultsvskids.com/admin/app/profile-data',{method:'POST',headers:{Origin:'https://adultsvskids.com','Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
user=null;assert.equal((await post(base)).status,401);user={id:owner,user_metadata:{name:'Ken'}};isAdmin=false;assert.equal((await post(base)).status,403);isAdmin=true;
assert.equal((await post(base,{Origin:'https://bad.test'})).status,403);assert.equal((await post(base,{'Content-Type':'text/plain'})).status,415);assert.equal(writes,0);
assert.equal((await post({...base,key:'bad'})).status,400);assert.equal((await post({...base,user_id:'someone-else',role:'administrator'})).status,200);assert.equal(write.user_id,owner);assert.equal(write.role,undefined);
let response=await exports.GET(new Request('https://adultsvskids.com/admin/app/profile-data'));assert.equal(response.status,200);assert.ok(filters.every(([,key,id])=>key==='user_id'&&id===owner));
failed=true;assert.equal((await post(base)).status,503);failed=false;
const dom=new JSDOM(clubPage('home'),{url:'https://adultsvskids.com/admin/app',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
let fixture={players,profiles:[]},posts=0;
w.fetch=async(url,options)=>{if(options?.method==='POST'){posts++;const p=JSON.parse(options.body),profile={profile_key:p.key,display_name:p.name,...p};fixture.profiles=[profile];return {ok:true,json:async()=>({saved:true,profile})}}return{ok:true,json:async()=>structuredClone(fixture)}};
w.eval(readFileSync('public/club-profile.js','utf8'));const flush=()=>new Promise(r=>setTimeout(r,0));await flush();await flush();
assert.equal(d.querySelectorAll('.club-key').length,12);assert.equal(d.querySelectorAll('.club-key-icon svg').length,12);assert.equal(d.querySelectorAll('#profilePlayer option').length,5);
d.getElementById('switchPlayer').click();assert.equal(d.getElementById('playerProfileDialog').open,true);
d.getElementById('profilePlayer').value=players[3].key;d.getElementById('profilePlayer').dispatchEvent(new w.Event('change'));
d.getElementById('profileNameInput').value='<img src=x> Harper';d.getElementById('profileNameInput').dispatchEvent(new w.Event('input'));d.querySelector('[name=scene][value=coast]').checked=true;d.querySelector('[name=scene][value=coast]').dispatchEvent(new w.Event('change'));
d.getElementById('playerProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));d.getElementById('playerProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
assert.equal(posts,1);assert.equal(d.getElementById('playerHero').dataset.scene,'coast');assert.equal(d.getElementById('playerRole').textContent,'YOUNG PLAYER');assert.equal(d.getElementById('playerName').textContent,'<img src=x> Harper');assert.equal(d.getElementById('playerName').querySelector('img'),null);assert.equal(d.getElementById('playerProfileDialog').open,false);assert.equal(w.sessionStorage.getItem('avk-club-player'),players[3].key);
d.getElementById('editScenery').click();d.getElementById('profilePlayer').value='account';d.getElementById('profilePlayer').dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('profileNameInput').value,'Ken');assert.equal(d.querySelector('[name=scene]:checked').value,'alpine');w.close();
console.log('PASS: roster profiles and stable keys, image validation, verified ownership, preview guard, origin checks, failed saves, twelve icon tiles, individual scenery and names, no duplicate writes or HTML injection.');
