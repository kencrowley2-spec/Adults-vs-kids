export const socialProfiles = [
  { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61596213304278', icon: '<path d="M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A25 25 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8Z"/>' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@adultsvskidsofficial', icon: '<path d="M14 2h3c.3 2 1.6 3.5 4 4v3a9 9 0 0 1-4-1v8a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3Z"/>' },
  { name: 'YouTube', url: 'https://www.youtube.com/channel/UCs9AHRWMy5Rj2wBxa0aJ8Fg', icon: '<path d="M21 6c-.3-1-1-1.7-2-2-3-.5-11-.5-14 0-1 .3-1.7 1-2 2-.5 3-.5 9 0 12 .3 1 1 1.7 2 2 3 .5 11 .5 14 0 1-.3 1.7-1 2-2 .5-3 .5-9 0-12ZM10 16V8l7 4Z" fill-rule="evenodd"/>' },
] as const;

export function socialLinks() {
  return `<section class="avk-social" aria-labelledby="avk-social-title"><style>
.avk-social{box-sizing:border-box;width:100%;padding:32px 20px;text-align:center;background:#101216;color:#fff;border-top:1px solid #ffffff24;border-bottom:1px solid #ffffff24}
.avk-social h2{margin:0 0 8px;color:#fff;font:800 clamp(23px,4vw,32px)/1.15 system-ui,sans-serif;letter-spacing:-.5px}
.avk-social p{margin:0 0 20px;color:#d0d2d5;font:400 15px/1.5 system-ui,sans-serif}
.avk-social nav{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.avk-social a{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:11px 18px;border:1px solid #ffd006;border-radius:999px;background:#ffd006;color:#111;text-decoration:none;font:750 15px/1.2 system-ui,sans-serif;transition:background .15s,transform .15s}
.avk-social a:hover{background:#fff0a8;transform:translateY(-2px)}
.avk-social a:focus-visible{outline:3px solid #fff;outline-offset:4px}
.avk-social svg{display:block;width:22px;height:22px;fill:currentColor;flex:none}
@media(max-width:400px){.avk-social nav{gap:9px}.avk-social a{padding:11px 14px;font-size:14px}}
@media(prefers-reduced-motion:reduce){.avk-social a{transition:none}.avk-social a:hover{transform:none}}
</style><h2 id="avk-social-title">Connect with us</h2><p>Family fun. Friendly rivalry. Follow along.</p><nav aria-label="Adults vs. Kids social profiles">${socialProfiles.map(profile => `<a href="${profile.url}" target="_blank" rel="noopener noreferrer" aria-label="Adults vs. Kids on ${profile.name} (opens in a new tab)"><svg viewBox="0 0 24 24" aria-hidden="true">${profile.icon}</svg><span>${profile.name}</span><span aria-hidden="true">↗</span></a>`).join('')}</nav></section>`;
}

export function addSocialLinks(html: string) {
  const withoutPlaceholder = html.replace(/<section class="social-connect"[\s\S]*?<\/section>/g, '');
  return withoutPlaceholder.includes('class="avk-social"') ? withoutPlaceholder : withoutPlaceholder.replace(/<footer\b/, socialLinks() + '<footer');
}
