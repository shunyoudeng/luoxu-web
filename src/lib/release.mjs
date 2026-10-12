export function validateRelease(r) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(r.version)) throw new Error('Invalid App version');
  if (!Number.isInteger(r.build) || r.build < 1) throw new Error('Invalid App build');
  if (!['candidate','beta','stable'].includes(r.status)) throw new Error('Invalid release status');
  if (!r.channel || !r.changelogUrl || !Number.isInteger(r.minSdk)) throw new Error('Incomplete release');
  if (r.downloadUrl && !/^(?:\/|\.\.\/)downloads\/[A-Za-z0-9._-]+\.apk$/.test(r.downloadUrl) && !/^https:\/\//.test(r.downloadUrl)) throw new Error('Unsafe APK URL');
  if (r.releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate)) throw new Error('Invalid release date');
  if (!Array.isArray(r.highlights) || r.highlights.length < 1 || !r.highlights.every(line => typeof line === 'string' && line.trim())) throw new Error('Release needs user-facing highlights');
  const internal = findInternalCopy(r.highlights);
  if (internal) throw new Error(`Release highlights must be user-facing, found internal wording: ${internal}`);
  return r;
}
// Engineering and release-process wording that should never appear in public product copy.
export const INTERNAL_COPY = /Lint|联调|签名|真机|\bCI\b|Debug|候选构建|\bRoom\b|包名|测试\s*\d+\s*项|验收|补造|build\s*\d+|Mock|Provider/i;
export function findInternalCopy(lines) {
  for (const line of [lines].flat()) { const m = typeof line === 'string' && line.match(INTERNAL_COPY); if (m) return m[0]; }
  return '';
}
export function localApkPath(url) {
  if (!/^(?:\/|\.\.\/)downloads\/[A-Za-z0-9._-]+\.apk$/.test(url)) return '';
  return 'public/' + url.replace(/^(?:\/|\.\.\/)/, '');
}
export function formatBytes(bytes) { return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '待提供'; }
export function formatDate(date) { return date ? date.replaceAll('-', '.') : '尚未正式发布'; }
