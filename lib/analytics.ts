import {googleMeasurementHtml} from './google-measurement';
export const analyticsScript='<script src="/platform-analytics.js?v=5" defer></script>';
export function trackedHtml(html:string){
 const navigation=html.includes('src="/account-navigation.js')?'':'<script src="/account-navigation.js?v=2" defer></script>';
 return html.replaceAll('/account-navigation.js?v=1','/account-navigation.js?v=2').replace('</body>',analyticsScript+googleMeasurementHtml(html)+navigation+'</body>');
}
