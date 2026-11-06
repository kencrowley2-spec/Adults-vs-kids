import {createHash} from 'node:crypto';
export const CLUB_SCENES=['alpine','coast','dusk'] as const;
export type ClubPlayer={key:string;name:string;role:string};
// Name-derived keys retain a player's customization if the roster is reordered.
export function clubPlayers(accountName:string,roster:{adults?:string[];kids?:string[]}|null):ClubPlayer[]{
 const players:ClubPlayer[]=[{key:'account',name:accountName.slice(0,60)||'Family Captain',role:'Family administrator'}];
 for(const [group,role] of [['adults','Adult player'],['kids','Young player']] as const){
  const occurrences=new Map<string,number>();
  for(const name of roster?.[group]||[]){const occurrence=occurrences.get(name)||0;occurrences.set(name,occurrence+1);players.push({key:group+'-'+createHash('sha256').update(name+'\0'+occurrence).digest('hex').slice(0,24),name,role});}
 }
 return players;
}
function imageData(value:unknown,max:number){
 if(value===''||value===undefined)return '';
 if(typeof value!=='string'||value.length>max||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Choose a JPG, PNG, or WebP photo and try again.');
 const bytes=Buffer.from(value.split(',')[1],'base64');if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('That image could not be read. Choose another photo.');
 return value;
}
export function cleanClubProfile(value:unknown,players:ClubPlayer[]){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Check your profile.');
 const p=value as Record<string,unknown>;
 if(!players.some(player=>player.key===p.key))throw Error('Choose a player from your family roster.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>60)throw Error('Use a player name of 1–60 characters.');
 if(!CLUB_SCENES.includes(p.scene as typeof CLUB_SCENES[number]))throw Error('Choose a scenic background.');
 return {profile_key:p.key as string,display_name:p.name.trim(),scene:p.scene as string,headshot:imageData(p.headshot,90000),backdrop:imageData(p.backdrop,330000)};
}
