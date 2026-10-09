// All website-owned links share this base-path resolver. External URLs stay external.
export function normalizeBase(value = '/') {
  const raw = String(value || '/').trim();
  if (raw.startsWith('//') || raw.includes('\\')) throw new Error('Invalid PUBLIC_BASE_PATH');
  const segments = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (segments.some(s => !/^[A-Za-z0-9._-]+$/.test(s) || s === '.' || s === '..')) throw new Error('Invalid PUBLIC_BASE_PATH');
  return segments.length ? '/' + segments.join('/') : '/';
}
export function withBase(path, base = '/') {
  if (!path || /^(?:https?:|mailto:|#)/.test(path)) return path;
  const prefix = normalizeBase(base);
  return (prefix === '/' ? '' : prefix) + '/' + path.replace(/^\/+/, '');
}
export function stripBase(path, base = '/') {
  const prefix = normalizeBase(base);
  if (prefix === '/') return path;
  return path === prefix ? '/' : path.startsWith(prefix + '/') ? path.slice(prefix.length) : path;
}
// Relative release metadata URLs are resolved against the JSON document, not the page.
export function releaseHref(path, base = '/') {
  if (!path || /^https:\/\//.test(path)) return path;
  if (path.startsWith('/')) return withBase(path, base); // Existing root-path metadata remains compatible.
  return new URL(path, 'https://local.invalid' + withBase('/releases/latest.json', base)).pathname;
}
