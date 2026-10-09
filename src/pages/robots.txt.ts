import type { APIRoute } from 'astro';
import {site} from '../lib/site';
import {absoluteUrl} from '../lib/urls';
export const GET:APIRoute=()=>new Response(site.siteUrl?`User-agent: *\nAllow: /\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
