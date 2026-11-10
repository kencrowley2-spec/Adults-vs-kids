// Merchant-set shipping estimates, not live carrier quotes. Amounts are cents.
export const HOLIDAY_PRICE=9900;
export function holidayShipping(input:unknown){
 if(typeof input!=='string'||!/^\d{5}$/.test(input))throw new Error('Enter a five-digit U.S. delivery ZIP code.');
 const prefix=Number(input.slice(0,3));
 if(prefix<10||(prefix>=90&&prefix<=98)||prefix===340||(prefix>=962&&prefix<=966))throw new Error('Shipping is available to the 50 U.S. states and Washington, DC. Enter a residential delivery ZIP code.');
 if(prefix>=995||(prefix>=967&&prefix<=968))return {zip:input,cents:3995,zone:'Alaska / Hawaii'};
 if((prefix>=400&&prefix<=499)||(prefix>=530&&prefix<=549))return {zip:input,cents:1495,zone:'Nearby zone'};
 if(prefix>=800)return {zip:input,cents:2495,zone:'Farther zone'};
 return {zip:input,cents:1995,zone:'Middle zone'};
}
