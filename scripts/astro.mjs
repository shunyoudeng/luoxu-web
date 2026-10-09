// Disable the build tool's telemetry for this project, without changing global settings.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const require=createRequire(import.meta.url);
const pkgPath=require.resolve('astro/package.json');
const pkg=JSON.parse(readFileSync(pkgPath,'utf8'));
const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro;
const child=spawn(process.execPath,[resolve(dirname(pkgPath),bin),...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
child.on('exit',(code)=>process.exit(code??1));
child.on('error',(error)=>{console.error(error.message);process.exit(1)});
