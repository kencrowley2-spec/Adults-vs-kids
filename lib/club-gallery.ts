import {createHash} from 'node:crypto';
export function cleanGalleryImage(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a photo or drawing.');
 const p=value as Record<string,unknown>,image=p.image;
 if(typeof image!=='string'||image.length>1_400_000||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))throw Error('Choose a JPEG or PNG image under 1 MB.');
 const bytes=Buffer.from(image.split(',')[1],'base64');
 const jpeg=image.startsWith('data:image/jpeg;')&&bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=image.startsWith('data:image/png;')&&bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(16)<=4096&&bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=4096;
 if(!jpeg&&!png)throw Error('That image could not be read. Choose another photo.');
 const title=typeof p.title==='string'?p.title.trim():'Family memory';
 if(!title||title.length>100)throw Error('Use a title of 1–100 characters.');
 if(p.source!==undefined&&!['upload','draw','game'].includes(p.source as string))throw Error('Choose a valid image source.');
 return {title,source:typeof p.source==='string'?p.source:'upload',image_data:image,image_hash:createHash('sha256').update(bytes).digest('hex')};
}
