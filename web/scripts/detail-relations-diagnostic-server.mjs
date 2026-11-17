import {createServer} from '/Users/leonardodiazvidal/Documents/dev-projects/spec-pm/web/node_modules/vite/dist/node/index.js';
import {readFile} from 'node:fs/promises';
process.env.SPM_PROJECT_ROOT=JSON.parse(await readFile('/private/tmp/spm-task138-fixture.json','utf8')).root;
const server=await createServer({server:{host:'127.0.0.1',port:5297,strictPort:true,fs:{allow:['/private/tmp/spm-task138-diagnostic','/Users/leonardodiazvidal/Documents/dev-projects/spec-pm/node_modules','/Users/leonardodiazvidal/Documents/dev-projects/spec-pm/web/node_modules',process.env.SPM_PROJECT_ROOT]}}});await server.listen();server.printUrls();
