import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('history retains confirmed early versions and identifies the combined release',async()=>{
  const history=JSON.parse(await readFile('src/data/history.json','utf8'));
  const latest=JSON.parse(await readFile('public/releases/latest.json','utf8'));
  assert.equal(history[0].id,'latest');
  const covered=history.flatMap(entry=>entry.id==='latest'?(entry.mergedVersions||[latest.version]):[entry.id]);
  assert.equal(new Set(covered).size,covered.length);
  const confirmed=['0.1.0','0.2.0','0.2.1','0.2.2','0.2.3','0.2.4','0.2.5','0.2.6','0.3.0','0.3.1','0.3.2','0.3.3','0.4.0','0.4.1','0.4.2','0.5.0','0.5.1','0.6.0','0.6.1','0.6.2','0.6.3','0.6.4','0.6.5','0.6.6','0.6.7','0.6.8','0.7.0'];
  for(const version of confirmed) assert.ok(covered.includes(version),`Missing confirmed version ${version}`);
  assert.ok(history[0].mergedVersions.includes(latest.version));
  for(const version of history[0].mergedVersions) assert.ok(history[0].improved.some(line=>line.startsWith('v'+version+'：')));
  const key=version=>version.split('.').reduce((value,part)=>value*1000+Number(part),0);
  for(let i=2;i<history.length;i++) assert.ok(key(history[i-1].id)>key(history[i].id));
  for(const entry of history) for(const field of ['added','improved','fixed']) assert.ok(Array.isArray(entry[field]));
  assert.equal(history.at(-1).id,'0.1.0');
});
