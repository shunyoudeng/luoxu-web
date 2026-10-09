import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';

// Isolated static-file server for tests only. No Astro preview or production backend.
test('Pages project build serves every route, asset, manifest and APK under its base',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'luoxu-pages-test-'));
  let server;
  try {
    const env={...process.env,PUBLIC_SITE_URL:'https://pages-fixture.github.io',PUBLIC_BASE_PATH:'/luoxu-web',PUBLIC_GITHUB_URL:'https://github.com/pages-fixture/luoxu-web',PUBLIC_GITHUB_RELEASES_URL:'',PUBLIC_FEEDBACK_EMAIL:'',PUBLIC_ICP_NUMBER:'',PUBLIC_POLICE_RECORD:'',PUBLIC_POLICE_RECORD_URL:''};
    const build=spawnSync(process.execPath,['scripts/astro.mjs','build','--outDir',dir],{env,encoding:'utf8'});
    assert.equal(build.status,0,build.stderr||build.stdout);
    const base='/luoxu-web';
    async function walk(parent,prefix=''){const paths=[];for(const e of await readdir(parent,{withFileTypes:true})){const key=prefix+e.name;paths.push(...(e.isDirectory()?await walk(join(parent,e.name),key+'/'):[key]));}return paths;}
    const files=new Set(await walk(dir));
    const responses=[];
    server=createServer(async(req,res)=>{
      const path=decodeURIComponent(new URL(req.url,'http://local.invalid').pathname);
      if(path!==base&&!path.startsWith(base+'/')){res.writeHead(404);res.end();return;}
      const relative=path.slice(base.length).replace(/^\//,'');
      const file=[relative,relative?(relative.replace(/\/$/,'')+'/index.html'):'index.html'].find(f=>files.has(f));
      if(!file){res.writeHead(404);res.end();return;}
      const data=await readFile(join(dir,file));
      res.writeHead(200,{'Content-Length':data.length});res.end(data);
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const origin=`http://127.0.0.1:${server.address().port}`;
    const site='https://pages-fixture.github.io';
    const refs=new Set();
    for(const path of ['/','/download','/privacy','/terms','/about','/changelog']){
      const url=origin+base+path;
      const result=await fetch(url);assert.equal(result.status,200,path);
      const html=await result.text();
      assert.ok(html.includes(`rel="canonical" href="${site+base+path}"`),path+' canonical');
      assert.ok(html.includes(`property="og:image" content="${site+base}/images/og.png"`));
      assert.ok(html.includes('content="index, follow"'));
      for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
        const value=m[1];if(/^(https?:|mailto:|data:)/.test(value))continue;
        const target=new URL(value,url);assert.ok(target.pathname.startsWith(base+'/'),`${path}: ${value}`);refs.add(target.pathname);
      }
      responses.push({path:base+path,status:result.status});
    }
    for(const path of refs){const r=await fetch(origin+path);assert.equal(r.status,200,path);await r.arrayBuffer();}
    const manifestUrl=origin+base+'/manifest.webmanifest';
    const manifest=await(await fetch(manifestUrl)).json();
    for(const target of [manifest.start_url,manifest.scope,...manifest.icons.map(i=>i.src)]){const url=new URL(target,manifestUrl);assert.ok(url.pathname.startsWith(base+'/'));assert.equal((await fetch(url)).status,200);}
    const releaseUrl=origin+base+'/releases/latest.json';
    const release=await(await fetch(releaseUrl)).json();
    const apkUrl=new URL(release.downloadUrl,releaseUrl);
    if(apkUrl.origin===origin){
      assert.ok(apkUrl.pathname.startsWith(base+'/downloads/'));
      const apk=Buffer.from(await(await fetch(apkUrl)).arrayBuffer());
      assert.equal(apk.length,release.sizeBytes);assert.equal(createHash('sha256').update(apk).digest('hex'),release.sha256);
    }else{
      assert.equal(apkUrl.protocol,'https:');
      const downloadHtml=await(await fetch(origin+base+'/download')).text();
      assert.ok(downloadHtml.includes(`href="${apkUrl.href}"`),'Release URL remains absolute under Pages base');
      assert.match(release.sha256,/^[a-f0-9]{64}$/);
    }
    assert.equal((await fetch(new URL(release.changelogUrl,releaseUrl))).status,200);
    const sitemap=await(await fetch(origin+base+'/sitemap.xml')).text();
    for(const path of ['/','/download','/privacy','/terms','/about','/changelog'])assert.ok(sitemap.includes(site+base+path));
    assert.ok((await(await fetch(origin+base+'/robots.txt')).text()).includes(site+base+'/sitemap.xml'));
    assert.equal((await fetch(origin+'/download')).status,404);
    assert.equal((await fetch(origin+base+'/missing')).status,404);
    assert.ok(files.has('404.html'));assert.equal(files.has('server/entry.mjs'),false);
    console.log(`Pages base-path check: ${responses.length} routes, ${refs.size} linked resources, manifest/SEO/APK verified`);
  } finally {
    if(server)await new Promise(r=>server.close(r));
    assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('luoxu-pages-test-'));
    await rm(dir,{recursive:true,force:true});
  }
});
