import {expect,test} from 'bun:test';
import {GET} from '../web/src/routes/favicon.ico/+server.ts';

test('favicon GET explicitly returns no content without touching project/request state',async()=>{
 for(const suffix of ['', '?v=1','?v=2']){
  const event={request:new Request('http://local/favicon.ico'+suffix),get locals(){throw Error('Project IO must not be requested');},get url(){throw Error('No project configuration or URL parsing needed');}};
  const response=Reflect.apply(GET,undefined,[event]);
  expect(response.status).toBe(204);expect(response.body).toBeNull();expect(await response.text()).toBe('');
 }
});
