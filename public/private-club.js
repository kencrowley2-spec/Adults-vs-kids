'use strict';
(()=>{try{const saved=JSON.parse(localStorage.getItem('avk-private-club-v1')||'{}');const count=document.getElementById('privateMatchCount');if(count&&Array.isArray(saved.matches))count.textContent=String(saved.matches.length);}catch{}})();
