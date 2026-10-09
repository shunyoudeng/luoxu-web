export function optionalHttps(value, name) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error(`${name} must be an HTTPS URL`);
  if (url.username || url.password) throw new Error(`${name} cannot contain credentials`);
  return url.href.replace(/\/$/, '');
}
export function readConfig(env = {}) {
  const email = String(env.PUBLIC_FEEDBACK_EMAIL || '').trim();
  if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) throw new Error('Invalid feedback email');
  const github = optionalHttps(env.PUBLIC_GITHUB_URL, 'PUBLIC_GITHUB_URL');
  return Object.freeze({
    siteUrl: optionalHttps(env.PUBLIC_SITE_URL, 'PUBLIC_SITE_URL'), github,
    hostingProvider: String(env.PUBLIC_HOSTING_PROVIDER || '').trim(),
    githubReleases: optionalHttps(env.PUBLIC_GITHUB_RELEASES_URL || (github ? `${github}/releases` : ''), 'PUBLIC_GITHUB_RELEASES_URL'),
    feedbackEmail: email, icp: String(env.PUBLIC_ICP_NUMBER || '').trim(),
    policeRecord: String(env.PUBLIC_POLICE_RECORD || '').trim(),
    policeUrl: optionalHttps(env.PUBLIC_POLICE_RECORD_URL, 'PUBLIC_POLICE_RECORD_URL')
  });
}
export function feedbackHref(email, kind = 'Bug', version = '') {
  if (!email) return '';
  const body = `设备型号：\nAndroid版本：\n珞序版本：${version}\n\n问题描述：\n复现步骤：\n\n截图可自行添加并先遮住个人信息。请勿附上 API Key、密码或不必要的聊天内容。`;
  return `mailto:${email}?subject=${encodeURIComponent(`珞序 ${kind}反馈`)}&body=${encodeURIComponent(body)}`;
}
