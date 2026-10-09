import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateRelease, localApkPath } from '../src/lib/release.mjs';
const r=validateRelease(JSON.parse(await readFile('public/releases/latest.json','utf8')));
if(localApkPath(r.downloadUrl)) {
  const bytes=await readFile(localApkPath(r.downloadUrl));
  if(bytes.length!==r.sizeBytes || createHash('sha256').update(bytes).digest('hex')!==r.sha256) throw new Error('APK changed: run release:apk to update size and checksum');
}
console.log(`Release metadata verified: Android ${r.version}, ${r.channel}, ${r.status}`);
