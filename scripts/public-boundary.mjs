import { readFileSync } from 'node:fs';

export const policy = JSON.parse(readFileSync(new URL('../PUBLISHING_POLICY.json', import.meta.url), 'utf8'));
export function assertPolicy() {
  for (const [key, value] of Object.entries({androidSource:'PRIVATE', website:'PUBLIC', websiteSource:'PUBLIC', apkDistribution:'PUBLIC', desktopSource:'PRIVATE', desktopDistribution:'PUBLIC_BINARY_ONLY', apkRepository:'shunyoudeng/luoxu-web'})) {
    if (policy[key] !== value) throw new Error('Publishing policy changed: owner approval required (' + key + ')');
  }
}
export function assertPublicPath(path) {
  if (/(^|\/)(android|backend|luoxu-desktop|luoxu_desktop|luoxu_bridge|build|\.gradle|\.git|device-logs)(\/|$)/i.test(path) || /\.(kt|kts|java|jks|keystore|pem|key|p12|pfx|enc|dpapi|db|sqlite\w*|zip|tar|gz)$/i.test(path) || /(^|\/)\.env(?!\.example$)/i.test(path)) {
    throw new Error('Private development artifact cannot enter website: ' + path);
  }
}
export function assertPublicText(text, path) {
  const secrets = [/\bsk-[A-Za-z0-9_-]{20,}/, /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})/, /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/];
  if (secrets.some(pattern => pattern.test(text))) throw new Error('Credential pattern in public candidate: ' + path);
}
export function assertDownload(url) {
  if (/^(?:\/|\.\.\/)downloads\/[A-Za-z0-9._-]+\.apk$/.test(url)) return;
  const target = new URL(url);
  if (target.username || target.password || target.origin !== 'https://github.com' || !target.pathname.startsWith('/' + policy.apkRepository + '/releases/download/') || !target.pathname.endsWith('.apk')) {
    throw new Error('APK must use public website distribution, never the private Android repository');
  }
}
export function assertReleaseAsset(name) {
  if (!/^LUOXU-v[0-9]+\.[0-9]+\.[0-9]+(?:-performance)?\.apk$/.test(name) && !/^LUOXU-Desktop-v[0-9]+\.[0-9]+\.[0-9]+-win-x64\.exe$/.test(name) && !['SHA256SUMS.txt','DESKTOP-SHA256SUMS.txt'].includes(name)) throw new Error('Public release asset outside binary/checksum allowlist');
}

export function assertDesktopDownload(url) {
  const target = new URL(url);
  if (target.username || target.password || target.origin !== 'https://github.com' ||
      !/^\/shunyoudeng\/luoxu-web\/releases\/download\/desktop-v\d+\.\d+\.\d+\/LUOXU-Desktop-v\d+\.\d+\.\d+-win-x64\.exe$/.test(target.pathname)) {
    throw new Error('Windows binary must use the public website release repository');
  }
}
