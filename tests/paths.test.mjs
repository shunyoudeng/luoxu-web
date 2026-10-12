import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBase,withBase,stripBase,releaseHref} from '../src/lib/paths.mjs';
import {localApkPath,validateRelease} from '../src/lib/release.mjs';
test('project subpaths and custom-domain root paths resolve consistently',()=>{
  assert.equal(normalizeBase('/luoxu-web/'),'/luoxu-web');
  assert.equal(withBase('/download','/luoxu-web/'),'/luoxu-web/download');
  assert.equal(withBase('/','/luoxu-web'),'/luoxu-web/');
  assert.equal(withBase('/icons/luoxu.svg','/'),'/icons/luoxu.svg');
  assert.equal(stripBase('/luoxu-web/download','/luoxu-web'),'/download');
  assert.equal(stripBase('/luoxu-web-other/download','/luoxu-web'),'/luoxu-web-other/download');
  for(const value of ['https://example.org/file.apk','mailto:owner@example.org','#section'])assert.equal(withBase(value,'/luoxu-web'),value);
  for(const bad of ['../secret','/repo/../secret','//host','/repo?query','/repo\\file'])assert.throws(()=>normalizeBase(bad));
});
test('relative release URLs survive both project and root deployments',()=>{
  assert.equal(releaseHref('../downloads/app.apk','/luoxu-web'),'/luoxu-web/downloads/app.apk');
  assert.equal(releaseHref('../changelog','/luoxu-web'),'/luoxu-web/changelog');
  assert.equal(releaseHref('/downloads/app.apk','/luoxu-web'),'/luoxu-web/downloads/app.apk');
  assert.equal(releaseHref('../downloads/app.apk','/'),'/downloads/app.apk');
  assert.equal(releaseHref('https://example.org/app.apk','/luoxu-web'),'https://example.org/app.apk');
  assert.equal(localApkPath('../downloads/app.apk'),'public/downloads/app.apk');
  assert.equal(localApkPath('/downloads/app.apk'),'public/downloads/app.apk');
  assert.equal(localApkPath('../downloads/../private.apk'),'');
  const base={version:'0.6.0',build:19,status:'candidate',channel:'Internal Beta',minSdk:26,changelogUrl:'../changelog',highlights:['课表支持翻周查看。']};
  assert.ok(validateRelease({...base,downloadUrl:'../downloads/app.apk'}));
  assert.throws(()=>validateRelease({...base,downloadUrl:'../../private.apk'}));
});
