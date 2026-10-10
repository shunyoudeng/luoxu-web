import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { assertPolicy, assertPublicPath, assertPublicText, assertDownload } from './public-boundary.mjs';

assertPolicy();
const names = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean));
let count = 0;
for (const name of names) {
  assertPublicPath(name);
  if (!existsSync(name) || !statSync(name).isFile()) continue;
  if (statSync(name).size < 5000000 && !/\.(png|jpg|jpeg|webp|ico|woff2?|apk)$/i.test(name)) assertPublicText(readFileSync(name, 'utf8'), name);
  count++;
}
const release = JSON.parse(readFileSync('public/releases/latest.json', 'utf8'));
assertDownload(release.downloadUrl);
if (release.githubUrl?.includes('/luoxu-android')) throw new Error('Private Android source entry in release metadata');
console.log('Public boundary verified: ' + count + ' website files; Android source PRIVATE.');
