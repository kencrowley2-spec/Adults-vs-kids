import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {clubPage} from '../lib/club-app.ts';
const flush=()=>new Promise(r=>setTimeout(r,0));
for(const blank of [false,true]){
 const dom=new JSDOM(clubPage('home'),{url:'https://adultsvskids.com/admin/app',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 let roster=blank?{adults:[],kids:[],playingAdults:[],playingKids:[]}:{adults:['Daddy'],kids:['Harper','Chloe'],playingAdults:[0],playingKids:[0,1]},posts=0,fail=false;
 w.fetch=async(url,options)=>{assert.equal(url,'/auth/family-roster');assert.equal(options.credentials,'same-origin');if(options.method==='POST'){posts++;if(fail)return {ok:false,json:async()=>({error:'Save unavailable'})};roster=JSON.parse(options.body)}return {ok:true,json:async()=>({roster:structuredClone(roster)})}};
 w.eval(readFileSync('public/family-roster.js','utf8'));w.eval(readFileSync('public/club-roster.js','utf8'));await flush();await flush();
 const trigger=d.querySelector('[data-open-club-roster]');const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});trigger.dispatchEvent(click);assert.equal(click.defaultPrevented,true);assert.equal(d.getElementById('clubRosterDialog').open,true);
 if(blank){assert.equal(d.querySelectorAll('.roster-player').length,0);assert.match(d.getElementById('roster-adults').textContent,/Add your adults/);d.getElementById('manage-family-roster').click();await flush();assert.equal(d.querySelector('#roster-edit-adults input').value,'');assert.equal(d.querySelector('#roster-edit-kids input').value,'');assert.equal(posts,0)}
 else{
  assert.equal(d.querySelectorAll('.roster-player').length,3);assert.match(d.getElementById('roster-playing-status').textContent,/1 ADULT · 2 KIDS/);
  d.querySelector('#roster-adults button').click();await flush();assert.deepEqual(roster.playingAdults,[]);assert.match(d.getElementById('roster-playing-status').textContent,/KIDS vs. KIDS/);
  fail=true;d.querySelector('#roster-kids button').click();await flush();assert.equal(d.querySelector('#roster-kids button').getAttribute('aria-pressed'),'true');assert.match(d.getElementById('roster-load-status').textContent,/Save unavailable/);fail=false;
  d.getElementById('manage-family-roster').click();await flush();assert.equal(d.querySelector('#roster-edit-adults input').value,'Daddy');d.querySelector('#roster-edit-kids input').value='Harper <test>';d.getElementById('roster-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();assert.equal(roster.kids[0],'Harper <test>');assert.equal(d.getElementById('clubRosterDialog').open,true);assert.equal(d.querySelector('.roster-dialog').open,false);assert.equal(d.querySelector('#roster-kids test'),null);
 }
 assert.ok(d.querySelector('.club-roster-actions a[href="/family/arcade?source=club"]'));d.getElementById('closeClubRoster').click();assert.equal(d.getElementById('clubRosterDialog').open,false);w.close();
}
console.log('PASS: Clubhouse popup, existing shared roster, blank new family, selection saves, Kids vs Kids, edit persistence, failed-save rollback, escaped names, and Arcade link.');
