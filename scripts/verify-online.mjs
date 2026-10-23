// Read-only public-site smoke check. No credentials, private repositories or uploads.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const base=new URL(process.argv[2]||'https://shunyoudeng.github.io/luoxu-web/');
if (!['https://shunyoudeng.github.io','http://127.0.0.1:4321'].includes(base.origin)) throw new Error('Use the official website or the local preview');
const out=resolve(process.argv[3]||'docs/screenshots/online');await mkdir(out,{recursive:true});
const android=JSON.parse(await readFile('public/releases/latest.json','utf8'));
const desktop=JSON.parse(await readFile('public/releases/desktop/latest.json','utf8'));
const result={base:base.href,android:android.version,windows:desktop.version,viewports:[]};
for(const [path,expected] of [['releases/latest.json',android],['releases/desktop/latest.json',desktop]]){
  const url=new URL(path,base);url.searchParams.set('verify',String(Date.now()));
  const response=await fetch(url);if(!response.ok)throw new Error('Public metadata HTTP '+response.status);
  const actual=await response.json();for(const key of ['version','downloadUrl','sizeBytes','sha256'])if(actual[key]!==expected[key])throw new Error('Online metadata mismatch: '+key);
}
const browser=await chromium.launch({headless:true});
try{
  for(const width of [375,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const path of ['','download/','changelog/','privacy/','about/']){
      const response=await page.goto(new URL(path,base).href,{waitUntil:'networkidle'});
      if(response.status()!==200)throw new Error('Public route failed: '+path);
      await page.evaluate(()=>document.fonts.ready);
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow: '+path);
      await expect(page.locator('a[href*=luoxu-android],a[href*=luoxu-desktop]')).toHaveCount(0);
    }
    await page.goto(new URL('download/',base).href,{waitUntil:'networkidle'});
    await expect(page.locator('.apk-download')).toHaveAttribute('href',android.downloadUrl);
    await expect(page.locator('.exe-download')).toHaveAttribute('href',desktop.downloadUrl);
    await page.locator('.desktop-release-panel').screenshot({path:join(out,`windows-panel-${width}.png`)});
    await page.locator('#windows').scrollIntoViewIfNeeded();
    await page.screenshot({path:join(out,`download-${width}.png`)});
    if(errors.length)throw new Error('Public page JavaScript error');
    result.viewports.push({width,routes:5,overflow:false,pageErrors:0});await context.close();
  }
}finally{await browser.close();}
await writeFile(join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
