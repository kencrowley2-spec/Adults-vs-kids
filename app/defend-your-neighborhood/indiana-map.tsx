"use client";
import {useState} from "react";
import styles from "./indiana-map.module.css";
// State outline: johan/world.geo.json, countries/USA/IN.geo.json.
const outline="M288.7,43.6 L414.1,43.6 L414.1,52.8 L414.6,220.0 L412.9,415.5 L404.8,421.7 L413.5,460.0 L394.9,460.8 L375.2,473.8 L347.9,467.7 L349.0,495.3 L331.0,506.8 L324.1,524.4 L305.5,531.3 L295.6,566.6 L283.4,575.8 L259.6,562.7 L255.6,546.6 L232.3,564.3 L234.1,579.6 L210.3,585.0 L203.3,571.2 L176.6,585.0 L167.9,599.5 L141.2,578.8 L127.3,583.4 L118.0,573.5 L109.3,583.4 L82.6,585.0 L72.7,598.0 L69.2,588.8 L75.6,555.8 L83.7,548.9 L80.8,531.3 L93.0,529.0 L112.2,499.1 L115.6,480.7 L129.0,460.8 L127.3,436.2 L113.9,406.3 L125.5,381.0 L126.1,50.5 L136.5,59.7 L169.1,59.7 L200.4,43.6 L288.7,43.6 Z";
const samples=[
 {id:"river",name:"River City Royals",city:"South Bend",lat:41.6764,lon:-86.252,color:"#67b8ff",zone:31},
 {id:"fort",name:"Fort Wayne Defenders",city:"Fort Wayne",lat:41.0793,lon:-85.1394,color:"#b894ff",zone:37},
 {id:"wild",name:"Wabash Wildcats",city:"Lafayette",lat:40.4167,lon:-86.8753,color:"#65dfad",zone:33},
 {id:"bloom",name:"Bloomington Bravehearts",city:"Bloomington",lat:39.1653,lon:-86.5264,color:"#ff9587",zone:36},
];
const point=(lat:number,lon:number)=>({x:65+(lon+88.1)*106,y:38+(41.8-lat)*140});
export default function IndianaMap({name,lat,lon,claimed}:{name:string;lat:number;lon:number;claimed:boolean}){
 const [selected,setSelected]=useState("you");
 const inside=lat>=37.78&&lat<=41.77&&lon>=-88.07&&lon<=-84.8;
 const yours={id:"you",name:claimed?name:"Your Family",city:inside?(Math.abs(lat-39.9568)<.08&&Math.abs(lon+86.0139)<.08?"Fishers":"Your selected location"):"Fishers · example location",lat:inside?lat:39.9568,lon:inside?lon:-86.0139,color:"#ffd34d",zone:28};
 const families=[yours,...samples];
 const active=families.find(f=>f.id===selected)||yours;
 return <section className={styles.panel} aria-labelledby="indiana-heading">
 <div className={styles.heading}><div><p>THE HOOSIER SHOWDOWN</p><h2 id="indiana-heading">Indiana Territory Map</h2></div><span className={styles.badge}>EXAMPLE WORLD</span></div>
 <p className={styles.intro}>Five families. Five colors. One state full of bragging rights.</p>
 <div className={styles.layout}>
 <div className={styles.map}>
 <svg viewBox="0 0 480 660" role="img" aria-labelledby="indiana-title indiana-desc">
 <title id="indiana-title">Indiana with your territory and four example families</title><desc id="indiana-desc">Your family is gold near Fishers by default. Sample territories appear near South Bend, Fort Wayne, Lafayette, and Bloomington. Colored zones are illustrative and not to scale. Select a family in the legend for details.</desc>
 <defs><clipPath id="indiana-boundary"><path d={outline}/></clipPath><pattern id="indiana-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#ffffff" strokeOpacity=".045"/></pattern></defs>
 <rect width="480" height="660" fill="url(#indiana-grid)"/>
 <text x="33" y="29" fill="#92a3b9" fontSize="10" letterSpacing="3">INDIANA / USA</text>
 <path d={outline} fill="#203247" stroke="#7c91a6" strokeWidth="2"/>
 <g clipPath="url(#indiana-boundary)">
 {families.map(f=>{const p=point(f.lat,f.lon);return <g key={f.id}><circle cx={p.x} cy={p.y} r={f.zone+10} fill={f.color} opacity=".06"/><circle cx={p.x} cy={p.y} r={f.zone} fill={f.color} fillOpacity={selected===f.id ? .38 : .2} stroke={f.color} strokeWidth={selected===f.id?3:1.5} strokeDasharray={f.id==='you'?undefined:'5 4'}/></g>})}
 </g>
 {families.map((f,i)=>{const p=point(f.lat,f.lon);return <g key={f.id}>
 <circle cx={p.x} cy={p.y} r="6" fill={f.color} stroke="#0c1728" strokeWidth="2"/>
 <text x={p.x} y={p.y-f.zone-12} textAnchor="middle" fill={f.color} fontSize="11" fontWeight="800">{i===0?'♛ YOUR TERRITORY':String(i+1).padStart(2,'0')}</text>
 <text x={p.x} y={p.y+f.zone+18} textAnchor="middle" fill="#e8edf4" fontSize="11">{f.city}</text>
 </g>})}
 <circle cx={point(39.7684,-86.1581).x} cy={point(39.7684,-86.1581).y} r="2" fill="#e2e8f0"/>
 <text x="333" y="349" fill="#9cadc1" fontSize="10">Indianapolis</text>
 <text x="410" y="61" fill="#e8edf4" fontSize="15" textAnchor="middle">N</text><path d="M410 70v28m-5-20 5-8 5 8" stroke="#d4af4c" fill="none"/>
 <text x="240" y="635" textAnchor="middle" fill="#93a6bb" fontSize="10" letterSpacing="2">COLORED ZONES ARE ILLUSTRATIVE</text>
 </svg>
 </div>
 <div className={styles.sidebar}><h3>Families on the map</h3><p className={styles.hint}>Select a family to highlight its territory.</p>
 <div className={styles.legend}>{families.map((f,i)=><button type="button" key={f.id} aria-pressed={selected===f.id} onClick={()=>setSelected(f.id)} className={styles.family} style={{borderColor:selected===f.id?f.color:undefined}}><span className={styles.dot} style={{background:f.color}}>{i===0?'♛':i+1}</span><span><strong>{f.name}</strong><small>{f.city} · {i===0?'YOU':'SAMPLE FAMILY'}</small></span></button>)}</div>
 <div className={styles.details} style={{borderColor:active.color}}><small style={{color:active.color}}>{selected==='you'?'YOUR GOLD TERRITORY':'EXAMPLE TERRITORY'}</small><h3>{active.name}</h3><p>{selected==='you'?(claimed?'Your saved territory is highlighted in gold.':'Your family preview starts in Fishers. Claim a territory below to update it.'):'A sample rival family showing how a colorful neighborhood competition could look.'}</p></div>
 </div></div>
 <p className={styles.note}>Your territory plus four fictional examples. Zones are enlarged for visibility, not actual claimed boundaries or live players. {!inside&&'Your selected location is outside this Indiana overview; use the close-up map below to see it.'}</p>
 </section>
}
