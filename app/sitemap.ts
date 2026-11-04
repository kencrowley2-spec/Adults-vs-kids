import type {MetadataRoute} from 'next';
import {ORIGIN,publicPages} from '../lib/seo';
export default function sitemap():MetadataRoute.Sitemap{return Object.keys(publicPages).map(path=>({url:ORIGIN+(path==='/'?'/':path)}));}
