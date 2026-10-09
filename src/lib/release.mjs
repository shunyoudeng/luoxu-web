export function validateRelease(r) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(r.version)) throw new Error('Invalid App version');
  if (!Number.isInteger(r.build) || r.build < 1) throw new Error('Invalid App build');
  if (!['candidate','beta','stable'].includes(r.status)) throw new Error('Invalid release status');
  if (!r.channel || !r.changelogUrl || !Number.isInteger(r.minSdk)) throw new Error('Incomplete release');
  if (r.downloadUrl && !/^(?:\/|\.\.\/)downloads\/[A-Za-z0-9._-]+\.apk$/.test(r.downloadUrl) && !/^https:\/\//.test(r.downloadUrl)) throw new Error('Unsafe APK URL');
  if (r.releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate)) throw new Error('Invalid release date');
  return r;
}
export function localApkPath(url) {
  if (!/^(?:\/|\.\.\/)downloads\/[A-Za-z0-9._-]+\.apk$/.test(url)) return '';
  return 'public/' + url.replace(/^(?:\/|\.\.\/)/, '');
}
export function formatBytes(bytes) { return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '待提供'; }
export function formatDate(date) { return date ? date.replaceAll('-', '.') : '尚未正式发布'; }
