import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
test('configured static build produces real metadata, feedback and record links',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'luoxu-web-config-test-'));
  try {
    const env={...process.env,PUBLIC_BASE_PATH:'/',PUBLIC_SITE_URL:'https://luoxu.test',PUBLIC_GITHUB_URL:'https://github.com/example/luoxu-fixture',PUBLIC_GITHUB_RELEASES_URL:'',PUBLIC_FEEDBACK_EMAIL:'fixture@example.org',PUBLIC_ICP_NUMBER:'TEST-FIXTURE-ICP',PUBLIC_POLICE_RECORD:'TEST-FIXTURE-POLICE',PUBLIC_POLICE_RECORD_URL:'https://example.org/record'};
    const build=spawnSync(process.execPath,['scripts/astro.mjs','build','--outDir',dir],{env,encoding:'utf8'});
    assert.equal(build.status,0,build.stderr||build.stdout);
    const home=await readFile(join(dir,'index.html'),'utf8');
    assert.match(home,/rel="canonical" href="https:\/\/luoxu\.test\/"/);
    assert.match(home,/property="og:image" content="https:\/\/luoxu\.test\/images\/og\.png"/);
    assert.match(home,/href="https:\/\/github\.com\/example\/luoxu-fixture"/);
    assert.match(home,/TEST-FIXTURE-ICP/);
    const about=await readFile(join(dir,'about','index.html'),'utf8');
    assert.match(about,/href="mailto:fixture@example.org\?subject=/);
    assert.match(await readFile(join(dir,'sitemap.xml'),'utf8'),/https:\/\/luoxu\.test\/privacy/);
    assert.match(await readFile(join(dir,'robots.txt'),'utf8'),/Allow: \//);
  } finally {
    // Delete only the temporary directory created by this test; never the project.
    assert.equal(dirname(resolve(dir)),resolve(tmpdir()));
    assert.ok(basename(dir).startsWith('luoxu-web-config-test-'));
    await rm(dir,{recursive:true,force:true});
  }
});
