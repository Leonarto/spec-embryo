import {readFile,writeFile} from 'node:fs/promises';import {pinSource,stageBuild,prepareRuntime,startRuntime,stopRuntime} from '/Users/leonardodiazvidal/Documents/dev-projects/spec-pm/web/scripts/acceptance-runtime.ts';
const out='/private/tmp/spm-task131-final-run',old=JSON.parse(await readFile('/private/tmp/spm-task131-compiled-owner.json','utf8')),repo='/Users/leonardodiazvidal/Documents/dev-projects/spec-pm';
const [op,id,fixture]=process.argv.slice(2);let value;
if(op==='pin'){value={pin:await pinSource(old.root,old.nonce,repo,'3108b5c4a573e7a5bbbbc8f4f16a6ffb29b32021'),stage:await stageBuild(old.root,old.nonce,repo+'/web/build')};}
else if(op==='start'){await prepareRuntime(old.root,old.nonce,id!,fixture!);value=await startRuntime(old.root,old.nonce,id!);}
else if(op==='stop')value=await stopRuntime(old.root,old.nonce,id!);else throw Error('operation');
await writeFile(out+'/'+op+'-'+(id??'owner')+'.json',JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(value));
