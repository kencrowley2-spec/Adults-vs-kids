import items from '../config/merch.json';

export const delivery = 'Once payment is received, please allow 2 to 4 weeks for delivery. We promise the quality will be worth the wait.';
export const slogans = [
 'My bedtime is under review.',
 'I pay the Wi-Fi bill. I pick the rules.',
 'The rematch was my idea.',
 'My parents raised a tough opponent.',
 'Ask the replay guy. That was in.',
 'I taught you that move. Unfortunately.',
 'Currently undefeated against Dad.*',
 'The asterisk is for snack breaks.',
];
export const sizes = ['Youth S','Youth M','Youth L','Youth XL','Adult XS','Adult S','Adult M','Adult L','Adult XL','Adult 2XL','Adult 3XL'];
export const catalog = [...items, {id:'matchday-duo',name:'Matchday Duo',kind:'Bundles',color:'White tee / White & grey cap',price:76.80,collection:'Team bundle'}];
export const hasShirt = (kind:string) => ['Tees','Team Tees','Hoodies','Bundles'].includes(kind);
export const hasSize = (kind:string) => hasShirt(kind) || ['Bottoms','Outerwear'].includes(kind);
export const backPrice = 9.60;
export function orderOptions(raw: Record<string,unknown>) {
 const item = catalog.find(p=>p.id===raw.product);
 if (!item) throw new Error('Choose a catalog item.');
 const size=String(raw.size||''), front=String(raw.front||''), back=String(raw.back||'').trim();
 if (hasSize(item.kind) ? !sizes.includes(size) : size!=='') throw new Error('Choose a listed size.');
 if ((front && (!hasShirt(item.kind)||!slogans.includes(front))) || (back && (!hasShirt(item.kind)||back.length>24||/[\x00-\x1f\x7f]/.test(back)))) throw new Error('Check your print selections.');
 return {item,size,front,back,amount:Math.round((item.price+(back?backPrice:0))*100)/100};
}
