import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPolicy, assertPublicPath, assertPublicText, assertDownload, assertReleaseAsset, assertDesktopDownload} from '../scripts/public-boundary.mjs';
import {readConfig} from '../src/lib/config.mjs';
test('private Android policy keeps public website and APK distribution', () => {
  assertPolicy(); assertPublicPath('src/pages/about.astro'); assertPublicPath('public/images/og.png');
  for (const p of ['android/app/src/main/A.kt','backend/providers.py','assets/prompt.kt','key.jks','.env.local','data.sqlite','source.zip','build/cache']) assert.throws(() => assertPublicPath(p));
});

test('Windows binary has its own release channel and never exposes desktop source', () => {
  assertReleaseAsset('LUOXU-Desktop-v0.1.0-win-x64.exe');
  assertReleaseAsset('DESKTOP-SHA256SUMS.txt');
  assertDesktopDownload('https://github.com/shunyoudeng/luoxu-web/releases/download/desktop-v0.1.0/LUOXU-Desktop-v0.1.0-win-x64.exe');
  for (const p of ['luoxu-desktop/desktop.py','luoxu_bridge/server.py','luoxu_desktop/app.py']) assert.throws(() => assertPublicPath(p));
  for (const p of ['client.exe','desktop-source.zip','settings.json']) assert.throws(() => assertReleaseAsset(p));
  assert.throws(() => assertDesktopDownload('https://github.com/shunyoudeng/luoxu-android/releases/download/desktop-v0.1.0/client.exe'));
});
test('stale environment cannot expose the private Android source or release', () => {
  const c=readConfig({PUBLIC_GITHUB_URL:'https://github.com/shunyoudeng/luoxu-android',PUBLIC_GITHUB_RELEASES_URL:'https://github.com/shunyoudeng/luoxu-android/releases'});
  assert.equal(c.github,'https://github.com/shunyoudeng/luoxu-web'); assert.equal(c.githubReleases,'https://github.com/shunyoudeng/luoxu-web/releases');
});
test('public download and upload reject source archives and private URLs', () => {
  assertDownload('../downloads/LUOXU-v0.6.5.apk'); assertDownload('https://github.com/shunyoudeng/luoxu-web/releases/download/v0.6.5/LUOXU-v0.6.5-performance.apk');
  assert.throws(() => assertDownload('https://github.com/shunyoudeng/luoxu-android/releases/download/v0.6.5/app.apk'));
  assertReleaseAsset('LUOXU-v0.6.5-performance.apk'); assertReleaseAsset('SHA256SUMS.txt');
  for(const p of ['source.zip','app.jks','development.db','internal-prompt.txt']) assert.throws(() => assertReleaseAsset(p));
});
test('secret detection blocks credentials without logging their values', () => {
  const fake='sk-'+('x'.repeat(30)); assert.throws(() => assertPublicText(fake,'fixture'), error => !error.message.includes(fake));
  assertPublicText('PUBLIC_FEEDBACK_EMAIL=luoxufeedback@163.com','fixture');
});
