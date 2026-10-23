import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateDesktopRelease} from '../src/lib/desktop-release.mjs';
import {readConfig} from '../src/lib/config.mjs';

test('Windows release has an independent public binary contract',async()=>{
  const desktop=JSON.parse(await readFile('public/releases/desktop/latest.json','utf8'));
  const android=JSON.parse(await readFile('public/releases/latest.json','utf8'));
  assert.equal(validateDesktopRelease(desktop).version,'0.1.0');
  assert.equal(desktop.androidVersion,android.version);
  for(const change of [{sha256:'x'},{filename:'source.zip'},{downloadUrl:'https://github.com/shunyoudeng/luoxu-desktop/releases/download/v0.1.0/client.exe'},{version:'0.2.0'}]) assert.throws(()=>validateDesktopRelease({...desktop,...change}));
});

test('private Windows repository cannot become the public source entry through environment',()=>{
  const config=readConfig({PUBLIC_GITHUB_URL:'https://github.com/shunyoudeng/luoxu-desktop',PUBLIC_GITHUB_RELEASES_URL:'https://github.com/shunyoudeng/luoxu-desktop/releases'});
  assert.equal(config.github,'https://github.com/shunyoudeng/luoxu-web');
  assert.equal(config.githubReleases,'https://github.com/shunyoudeng/luoxu-web/releases');
});
