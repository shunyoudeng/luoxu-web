import type { APIRoute } from 'astro';
import {site,pagePaths} from '../lib/site';
import {absoluteUrl} from '../lib/urls';
export const GET:APIRoute=()=>{
  const urls=site.siteUrl?pagePaths.map(p=>`<url><loc>${absoluteUrl(p).replaceAll('&','&amp;')}</loc></url>`).join(''):'';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
