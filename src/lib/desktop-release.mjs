export function validateDesktopRelease(r) {
  if (!/^\d+\.\d+\.\d+$/.test(r.version) || r.platform !== 'windows-x64' || !['preview','beta','stable'].includes(r.status)) throw new Error('Invalid Windows release');
  const filename=`LUOXU-Desktop-v${r.version}-win-x64.exe`;
  const expected=`https://github.com/shunyoudeng/luoxu-web/releases/download/desktop-v${r.version}/${filename}`;
  if (r.filename!==filename || r.downloadUrl!==expected || !/^[a-f0-9]{64}$/.test(r.sha256) || !Number.isInteger(r.sizeBytes) || r.sizeBytes<1000000) throw new Error('Windows binary metadata mismatch');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate) || !/^\d+\.\d+\.\d+$/.test(r.androidVersion) || !Array.isArray(r.highlights) || !r.highlights.length || !r.highlights.every(s=>typeof s==='string'&&s.trim())) throw new Error('Incomplete Windows release');
  return Object.freeze(r);
}
