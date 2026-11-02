import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const origin=new URL(base).origin;
const page=await fetch(base+'/login');
assert.equal(page.status,200);
assert.equal(page.headers.get('referrer-policy'),'same-origin','Native same-origin POST forms must retain their Origin');
const tokenResponse=await fetch(base+'/auth/confirm?token_hash=invalid&type=invite&next=/reset-password',{redirect:'manual'});
assert.equal(tokenResponse.headers.get('referrer-policy'),'no-referrer','Email-token callback must not leak its URL');
const trusted=await fetch(base+'/logout',{method:'POST',headers:{Origin:origin},redirect:'manual'});
assert.equal(trusted.status,303);assert.equal(trusted.headers.get('location'),'/login');
for(const bad of ['null','https://example.test','https://adultsvskids.com.example.test']){
 const response=await fetch(base+'/logout',{method:'POST',headers:{Origin:bad},redirect:'manual'});
 assert.equal(response.status,403,'Untrusted logout origin must remain blocked: '+bad);
}
assert.equal((await fetch(base+'/logout',{redirect:'manual'})).status,405,'GET must not sign out');
console.log('PASS: account form privacy policy, email-token URL privacy, legitimate POST logout, rejected foreign/null origins, and no logout on GET.');
