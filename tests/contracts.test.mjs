import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readConfig,feedbackHref} from '../src/lib/config.mjs';
import {validateRelease,formatDate,formatBytes,localApkPath} from '../src/lib/release.mjs';
import {official} from '../src/lib/official.mjs';
test('confirmed public feedback mailbox creates mail drafts with safe instructions',()=>{
  assert.equal(official.feedbackEmail,'luoxufeedback@163.com');
  const href=feedbackHref(official.feedbackEmail,'Bug','0.6.3');
  assert.ok(href.startsWith('mailto:luoxufeedback@163.com?subject='));
  assert.match(decodeURIComponent(href),/珞序版本：0\.6\.3/);
  assert.match(decodeURIComponent(href),/请勿附上 API Key/);
});
test('unknown public addresses stay absent rather than fake links',()=>{const c=readConfig();assert.equal(c.github,'');assert.equal(c.siteUrl,'');assert.equal(c.feedbackEmail,'');assert.equal(feedbackHref(''),'');});
test('configured GitHub and feedback retain real destinations and safe encoded content',()=>{const c=readConfig({PUBLIC_GITHUB_URL:'https://github.com/example/project',PUBLIC_FEEDBACK_EMAIL:'owner@example.org',PUBLIC_SITE_URL:'https://example.org'});assert.equal(c.githubReleases,'https://github.com/example/project/releases');assert.ok(feedbackHref(c.feedbackEmail,'Bug','0.6.0').startsWith('mailto:owner@example.org?subject='));assert.match(decodeURIComponent(feedbackHref(c.feedbackEmail)),/API Key/);});
test('reject active schemes, credentials and malformed mail addresses',()=>{for(const value of ['javascript:alert(1)','http://example.org','https://user:pass@example.org'])assert.throws(()=>readConfig({PUBLIC_GITHUB_URL:value}));assert.throws(()=>readConfig({PUBLIC_FEEDBACK_EMAIL:'a@example.org?bad'}));});
test('release contract rejects path traversal and accidental website version',()=>{const base={version:'0.6.0',build:19,status:'candidate',channel:'Internal Beta',minSdk:26,changelogUrl:'/changelog',downloadUrl:'/downloads/LUOXU-v0.6.0.apk'};assert.equal(validateRelease(base).build,19);assert.throws(()=>validateRelease({...base,downloadUrl:'/downloads/../../private.apk'}));assert.throws(()=>validateRelease({...base,version:'Luoxu Web 0.1'}));assert.equal(formatDate(null),'尚未正式发布');assert.equal(formatBytes(64880317),'61.9 MB');});
test('official release metadata describes an APK from a local artifact or official Releases',async()=>{
  const r=validateRelease(JSON.parse(await readFile('public/releases/latest.json','utf8')));
  const local=localApkPath(r.downloadUrl);
  if(local){const bytes=await readFile(local);assert.equal(bytes.length,r.sizeBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}
  else{const url=new URL(r.downloadUrl);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,`/shunyoudeng/luoxu-android/releases/download/v${r.version}/LUOXU-v${r.version}-performance.apk`);assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.ok(r.sizeBytes>1000000);assert.match(r.releaseDate,/^\d{4}-\d{2}-\d{2}$/);}
  assert.equal(r.applicationId,'com.campusai.app');assert.equal(r.minSdk,26);
});
