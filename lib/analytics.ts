export const analyticsScript='<script src="/platform-analytics.js?v=3" defer></script>';
export function trackedHtml(html:string){
 // /website always shows the public landing page, including for signed-in families.
 html=html.replace(/<a\b([^>]*)>(\s*<img\b[^>]*\bsrc="\/assets\/brand-logo\.jpg"[^>]*>)/gi,(_match,attributes:string,image:string)=>{
  const homeAttributes=/\bhref="[^"]*"/i.test(attributes)?attributes.replace(/\bhref="[^"]*"/i,'href="/website"'):attributes+' href="/website"';
  return '<a'+homeAttributes.replace(/\baria-label="[^"]*"/i,'aria-label="Adults vs. Kids home"')+'>'+image;
 });
 return html.replace('</body>',analyticsScript+'<script src="/account-navigation.js?v=1" defer></script></body>');
}
