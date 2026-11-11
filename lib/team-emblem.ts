export const TEAM_MASCOTS=['lion','tiger','fox','wolf','bear','eagle','dragon','unicorn','shark','rocket','crown','star'] as const;
export function cleanTeamEmblem(value:unknown):string{
 if(value==='')return '';
 if(typeof value!=='string')throw Error('Choose a mascot or upload a logo.');
 if(TEAM_MASCOTS.includes(value as typeof TEAM_MASCOTS[number]))return value;
 if(value.length>90000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Choose a JPG, PNG or WebP logo.');
 const bytes=Buffer.from(value.split(',')[1],'base64');
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('That logo could not be read.');
 return value;
}
