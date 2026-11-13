import {googleMeasurementHtml} from './google-measurement';
export const analyticsScript='<script src="/platform-analytics.js?v=4" defer></script>';
export function trackedHtml(html:string){
 return html.replace('</body>',analyticsScript+googleMeasurementHtml(html)+'<script src="/account-navigation.js?v=1" defer></script></body>');
}
