import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const code=readFileSync('public/google-measurement.js','utf8');
function setup(url='https://adultsvskids.com/family-games?email=private@example.test&utm_source=google&utm_medium=organic'){
 const dom=new JSDOM('<!doctype html><html><head><title>Family Games</title><link rel="canonical" href="https://adultsvskids.com/family-games"></head><body><a id="amazon" href="https://link.amazon/Example">Book</a></body></html>',{url,referrer:'https://www.google.com/search?q=private',runScripts:'outside-only'});
 let calls=0;dom.window.fetch=async()=>{calls++;return {ok:true,json:async()=>({enabled:true,measurementId:'G-TEST1234'})};};
 return {dom,get calls(){return calls;}};
}
let c=setup();c.dom.window.eval(code);assert.equal(c.calls,0);assert.equal(c.dom.window.document.querySelectorAll('script[src*="googletagmanager"]').length,0);
const buttons=[...c.dom.window.document.querySelectorAll('#avkGoogleChoices button')];assert.equal(buttons.length,2);buttons[1].click();assert.equal(c.calls,0);assert.equal(c.dom.window.dataLayer,undefined);
c=setup();c.dom.window.eval(code);c.dom.window.document.querySelector('#avkGoogleChoices button').click();for(let i=0;i<10;i++)await Promise.resolve();
assert.equal(c.calls,1);assert.equal(c.dom.window.document.querySelectorAll('script[src*="googletagmanager"]').length,1);
let events=c.dom.window.dataLayer.map(x=>Array.from(x));assert.equal(events.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);assert(!JSON.stringify(events).includes('private'));assert(!JSON.stringify(events).includes('user_id'));
c.dom.window.eval(code);assert.equal(c.calls,1);
c.dom.window.document.getElementById('amazon').addEventListener('click',e=>e.preventDefault());c.dom.window.document.getElementById('amazon').dispatchEvent(new c.dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));events=c.dom.window.dataLayer.map(x=>Array.from(x));assert.equal(events.filter(x=>x[1]==='paperback_outbound').length,1);assert.equal(events.filter(x=>x[1]==='purchase').length,0);
c.dom.window.document.querySelector('.avk-google-settings').click();c.dom.window.document.querySelectorAll('#avkGoogleChoices button')[1].click();assert.equal(c.dom.window['ga-disable-G-TEST1234'],true);
let privatePage=setup('https://adultsvskids.com/family/arcade');privatePage.dom.window.document.querySelector('link').href='https://adultsvskids.com/family/arcade';privatePage.dom.window.eval(code);assert.equal(privatePage.calls,0);assert.equal(privatePage.dom.window.document.querySelector('.avk-google-settings'),null);
let gpc=setup();Object.defineProperty(gpc.dom.window.navigator,'globalPrivacyControl',{value:true});gpc.dom.window.eval(code);assert.equal(gpc.calls,0);assert.equal(gpc.dom.window.document.querySelector('.avk-google-settings'),null);
console.log('PASS: no Google requests before consent/after decline; one configured page_view; sanitized URL/referrer, no user ID, no duplicate install; Amazon click is not purchase; withdrawal disables collection; gameplay and GPC are excluded. Simulated DOM verification only, not live GA4 receipt.');
