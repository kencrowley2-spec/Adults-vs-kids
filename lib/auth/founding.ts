// Recognition is assigned by the server. Editable profile metadata cannot award it.
export function isFoundingMember(user:{email_confirmed_at?:string;app_metadata?:Record<string,unknown>;user_metadata?:Record<string,unknown>}|null){
 return !!user?.email_confirmed_at&&user.app_metadata?.is_founding_member===true;
}
