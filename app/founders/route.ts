// Retire the old offer and consolidate any existing search links into the current Club page.
export function GET(){return new Response(null,{status:308,headers:{Location:'/all-access-club'}});}
