"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import IndianaMap from "./indiana-map";
type Territory={name:string;lat:number;lon:number;radius:number;points:number;updated:number};
const KEY="avk-territory-preview-v1";
const DAY=86400000;
function effective(t:Territory,now:number){const idle=Math.max(0,Math.floor((now-t.updated)/DAY)-3);return Math.max(.1,Math.round((t.radius*Math.pow(.9,idle))*10)/10);}
export default function NeighborhoodGame(){
 const [territory,setTerritory]=useState<Territory|null>(null);
 const [name,setName]=useState("My Neighborhood");
 const [place,setPlace]=useState("Fishers, Indiana");
 const [lat,setLat]=useState(39.9568),[lon,setLon]=useState(-86.0139),[radius,setRadius]=useState(1);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw){const t=JSON.parse(raw) as Territory;setTerritory(t);setLat(t.lat);setLon(t.lon);setRadius(t.radius);setName(t.name)}}catch{}},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id)},[]);
 function save(t:Territory){setTerritory(t);localStorage.setItem(KEY,JSON.stringify(t));setNow(Date.now());}
 async function search(){setBusy(true);setNotice("");try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(place));const a=await r.json();if(!a.length)throw Error("Location not found");setLat(Number(a[0].lat));setLon(Number(a[0].lon));setNotice("Location found. Adjust your radius, then claim it.")}catch{setNotice("Could not find that location. Try a city and state.")}finally{setBusy(false)}}
 function locate(){if(!navigator.geolocation){setNotice("Location is unavailable.");return}navigator.geolocation.getCurrentPosition(p=>{setLat(p.coords.latitude);setLon(p.coords.longitude);setNotice("Location selected. Your exact coordinates are not shared publicly.")},()=>setNotice("Location permission was not granted."),{enableHighAccuracy:false,timeout:10000})}
 const active=territory?effective(territory,now):radius;
 const delta=active/69;
 const bbox=[lon-delta*1.4,lat-delta*.9,lon+delta*1.4,lat+delta*.9].join(",");
 return <main style={{minHeight:"100vh",background:"linear-gradient(160deg,#111827,#050507)",color:"white",padding:"24px 16px",fontFamily:"Arial,sans-serif"}}>
 <div style={{maxWidth:920,margin:"auto"}}>
 <Link href="/family/arcade" style={{color:"#ffd43b"}}>← Back to Arcade</Link>
 <p style={{color:"#facc15",fontWeight:800,letterSpacing:3,marginTop:30}}>👑 PREMIUM ARCADE</p>
 <h1 style={{fontSize:"clamp(30px,6vw,56px)",margin:"8px 0"}}>DEFEND YOUR NEIGHBORHOOD™</h1>
 <p style={{fontSize:18,color:"#e5e7eb"}}>Claim your spot. Play games together. Earn points and defend your family's crown!</p>
 <IndianaMap name={territory?.name||name} lat={territory?.lat??lat} lon={territory?.lon??lon} claimed={!!territory}/>
 <div style={{background:"#18181b",border:"1px solid #b98b27",borderRadius:20,padding:20,marginTop:22}}>
 <h2 style={{marginTop:0}}>1. Choose your territory</h2>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input aria-label="Search location" value={place} onChange={e=>setPlace(e.target.value)} style={{flex:"1 1 220px",padding:12,borderRadius:10,color:"#111"}}/><button onClick={search} disabled={busy} style={btn}>{busy?"Searching…":"Search map"}</button><button onClick={locate} style={btn}>📍 Near me</button></div>
 <p style={{fontSize:13,color:"#a1a1aa"}}>Location sharing is optional. Choose any town or neighborhood.</p>
 <div style={{position:"relative",height:300,overflow:"hidden",borderRadius:14,background:"#253647"}}>
 <iframe title="Territory map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`} style={{width:"100%",height:"100%",border:0}} loading="lazy"/>
 <div aria-label="Approximate territory boundary" style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"55%",aspectRatio:"1",border:"4px solid #facc15",borderRadius:"50%",background:"#facc1522",pointerEvents:"none",boxShadow:"0 0 18px #facc15"}}/>
 </div>
 <p style={{fontSize:12,color:"#a1a1aa"}}>The gold circle is a visual preview, not a surveyed geographic boundary.</p>
 <label htmlFor="radius">Territory radius: <strong>{radius.toFixed(1)} miles</strong></label><input id="radius" type="range" min=".2" max="2" step=".1" value={radius} onChange={e=>setRadius(Number(e.target.value))} style={{width:"100%",accentColor:"#facc15"}}/>
 <input aria-label="Territory name" value={name} onChange={e=>setName(e.target.value)} maxLength={50} style={{width:"100%",padding:12,borderRadius:10,color:"#111",margin:"10px 0"}}/>
 <button style={{...btn,width:"100%",padding:15}} onClick={()=>{if(!name.trim())return setNotice("Give your territory a name.");save({name:name.trim(),lat,lon,radius,points:territory?.points||0,updated:Date.now()});setNotice("Territory saved on this device!")}}>👑 Claim territory</button>
 {notice&&<p role="status">{notice}</p>}
 </div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginTop:16}}>
 <Stat label="YOUR TERRITORY" value={territory?.name||"Not claimed"}/><Stat label="CURRENT RADIUS" value={territory?active.toFixed(1)+" mi":"—"}/><Stat label="TERRITORY POINTS" value={String(territory?.points||0)}/></div>
 <div style={{background:"#18181b",border:"1px solid #b98b27",borderRadius:20,padding:20,marginTop:16}}>
 <h2>2. Play and defend</h2><p>Qualifying Arcade games and family challenges will earn territory points. Stay active to protect your radius. After three inactive days, your territory begins shrinking by 10% per day, down to a minimum of 0.1 mile.</p>
 <Link href="/family/arcade" style={{display:"inline-block",...btn,textDecoration:"none"}}>🎮 Play Arcade Games</Link>
 <p style={{color:"#fbbf24",fontSize:13,marginTop:16}}>Preview mode: territory saves only on this device. Cross-family challenges, verified game-point syncing, live territory ownership and premium subscription enforcement are not active yet. Playing Arcade games does not currently change this preview score.</p>
 </div></div></main>;
}
const btn={background:"#facc15",color:"#171717",border:0,borderRadius:10,padding:"12px 18px",fontWeight:800,cursor:"pointer"} as const;
function Stat({label,value}:{label:string;value:string}){return <div style={{background:"#27272a",border:"1px solid #b98b27",borderRadius:14,padding:18}}><small style={{color:"#facc15"}}>{label}</small><h3 style={{margin:"8px 0 0",overflowWrap:"anywhere"}}>{value}</h3></div>}
