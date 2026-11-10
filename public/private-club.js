'use strict';
(()=>{
 const base='/admin/private-club';
 // Retain the private theme for links inserted by the existing app controllers.
 const retarget=root=>root.querySelectorAll('a[href^="/admin/app"]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.origin);if(/^\/admin\/app(?:\/(?:battles|championships|trophies|weekly|leaderboard|printables|charlie|network|lobby|gallery))?\/?$/.test(url.pathname))a.setAttribute('href',url.pathname.replace('/admin/app',base)+url.search+url.hash)});
 retarget(document);
 new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches('a[href^="/admin/app"]'))retarget(node.parentElement);else retarget(node)}}))).observe(document.body,{subtree:true,childList:true});
 try{const saved=JSON.parse(localStorage.getItem('avk-private-club-v1')||'{}');const count=document.getElementById('privateMatchCount');if(count&&Array.isArray(saved.matches))count.textContent=String(saved.matches.length);}catch{}
})();
