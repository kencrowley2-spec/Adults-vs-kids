import type {MetadataRoute} from 'next';
import {ORIGIN} from '../lib/seo';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/family$','/family/','/admin','/api/','/auth/','/login','/signup','/logout','/forgot-password','/reset-password','/verify-email','/member-preview','/play/','/club-checkout','/clubhouse-setup','/defend-your-neighborhood']},sitemap:ORIGIN+'/sitemap.xml',host:ORIGIN};}
