(()=>{
 const get=id=>document.getElementById(id);let page=0,total=0,loading=false;
 function controls(){get('galleryPrevious').disabled=loading||page<=0;get('galleryNext').disabled=loading||page>=total-1;get('galleryCount').textContent=total?`${page+1} / ${total}`:'0 photos';}
 async function load(){loading=true;controls();get('galleryStatus').textContent='Opening your gallery…';
  try{const response=await fetch('/api/club/gallery?page='+page,{credentials:'same-origin',cache:'no-store'}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not open gallery.');
   total=result.total;const item=result.items?.[0];get('galleryFrame').hidden=!item;get('galleryEmpty').hidden=!!item;
   if(item){get('galleryPhoto').src=item.image_data;get('galleryPhoto').alt=item.title;get('galleryTitle').textContent=item.title;get('gallerySource').textContent=item.source==='draw'?'DRAW IT! · FAMILY MASTERPIECE':item.source==='game'?'GAME-NIGHT MEMORY':'FAMILY MEMORY';
    const date=new Date(item.created_at);get('galleryDate').dateTime=date.toISOString();get('galleryDate').textContent='Saved '+new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);}
   get('galleryStatus').textContent='';
  }catch(e){get('galleryStatus').textContent=e.message;}finally{loading=false;controls();}
 }
 get('galleryPrevious').onclick=()=>{if(page>0&&!loading){page--;load()}};get('galleryNext').onclick=()=>{if(page<total-1&&!loading){page++;load()}};
 const dialog=get('galleryUploadDialog');get('galleryAdd').onclick=()=>dialog.showModal();get('galleryUploadClose').onclick=()=>dialog.close();
 async function photoData(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP photo up to 10 MB.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let image=canvas.toDataURL('image/jpeg',.85);if(image.length>1400000)image=canvas.toDataURL('image/jpeg',.65);if(image.length>1400000)throw Error('Choose a smaller photo.');return image;
 }
 get('galleryUploadForm').onsubmit=async e=>{e.preventDefault();get('gallerySave').disabled=true;get('galleryUploadStatus').textContent='Saving your memory…';
  try{const image=await photoData(get('galleryPhotoFile').files[0]);const response=await fetch('/api/club/gallery',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,title:get('galleryPhotoTitle').value.trim(),source:'upload'})}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not save photo.');dialog.close();get('galleryUploadStatus').textContent='';get('galleryPhotoFile').value='';page=0;await load();}catch(e){get('galleryUploadStatus').textContent=e.message;}finally{get('gallerySave').disabled=false;}
 };load();
})();
