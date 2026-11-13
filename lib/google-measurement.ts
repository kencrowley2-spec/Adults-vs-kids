// Collection stays disabled until the owner approves the stream and production release.
export function googleMeasurementId(){
 const id=process.env.GA4_MEASUREMENT_ID||'';
 return process.env.GA4_COLLECTION_ENABLED==='true'&&/^G-[A-Z0-9]{6,20}$/.test(id)?id:null;
}
export function googleMeasurementHtml(html:string){
 if(!googleMeasurementId()||html.includes('src="/google-measurement.js'))return '';
 // Account, game, checkout and administrator pages never get the Google collector.
 const canonical=html.match(/<link\s+rel="canonical"\s+href="https:\/\/adultsvskids\.com([^"?]*)"/i)?.[1];
 if(canonical===undefined||/^\/(admin|auth|api|family\/|login|signup|logout|play\/|club-checkout|verify-email|reset-password|forgot-password)/.test(canonical))return '';
 return '<script src="/google-measurement.js?v=1" defer></script>';
}
