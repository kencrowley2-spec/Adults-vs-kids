export const analyticsScript='<script src="/platform-analytics.js?v=1" defer></script>';
export function trackedHtml(html:string){return html.replace('</body>',analyticsScript+'</body>');}
