import type { APIRoute } from 'astro';
import history from '../../data/history.json';
import {latest} from '../../lib/releases';
export const GET:APIRoute=()=>new Response(JSON.stringify(history.map(e=>e.id==='latest'?{...e,...latest}:e),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
