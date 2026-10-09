import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('public repository connections persist and issue imports are isolated and idempotent', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async t => {
  const url = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(url.pathname, /_(test|verification)$/);
  Object.assign(process.env, { DATABASE_URL: url.href, DATABASE_SSL: 'false', DEV_BYPASS_AUTH: 'false', NODE_ENV: 'development' });
  const { default: app } = await import('../src/app.js');
  const { default: pool } = await import('../src/lib/db.js');
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const networkFetch = globalThis.fetch;
  const users = [];
  let providerStatus = 200;
  const repository = { id: 987654, full_name: 'test-owner/test-repo', private: false, description: 'Repository fixture' };
  const issue = { id: 123456, number: 7, title: 'Import this issue' };
  t.mock.method(globalThis,'fetch',async url => {
    assert.ok(url.startsWith('https://api.github.com/'));
    if (providerStatus !== 200) return Response.json({}, {status:providerStatus});
    if (url.includes('/issues?')) return Response.json([issue,{id:123457,number:8,title:'Exclude pull request',pull_request:{}}]);
    if (url.endsWith('/issues/7')) return Response.json(issue);
    if (url.endsWith('/issues/8')) return Response.json({...issue,pull_request:{}});
    if (url.includes('/repos?')) return Response.json([repository]);
    if (url.includes('/user/')) return Response.json({login:'test-owner'});
    return Response.json(repository);
  });
  async function call(path, cookie, method='GET', body) {
    const response = await networkFetch(`${base}${path}`, {method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:response.status===204?null:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  async function register() {
    const result = await call('/auth/register',null,'POST',{email:`${randomUUID()}@project-test.invalid`,password:randomUUID()});
    assert.equal(result.status,201);users.push(result.data.user.id);return result.cookie;
  }
  try {
    assert.equal((await call('/github/projects')).status,401);
    const owner = await register(); const stranger = await register();
    assert.equal((await call('/github/repositories',owner)).data.needsGithub,true);
    await pool.query('UPDATE users SET github_id=$1 WHERE id=$2',[randomUUID(),users[0]]);
    assert.equal((await call('/github/repositories',owner)).data.repositories[0].fullName,repository.full_name);
    assert.equal((await call('/github/projects',owner,'POST',{repository:'https://evil.invalid/repo'})).status,400);
    assert.equal((await call('/github/projects',owner,'POST',{repository:'https://github.com/test-owner/test-repo/issues/7'})).status,400);
    const project = (await call('/github/projects',owner,'POST',{repository:'https://github.com/test-owner/test-repo.git'})).data;
    assert.equal(project.fullName,repository.full_name);
    assert.equal((await call('/github/projects',owner,'POST',{repository:repository.full_name})).data.id,project.id);
    assert.equal((await call('/github/projects',owner)).data.length,1);
    assert.deepEqual((await call('/github/projects',stranger)).data,[]);
    assert.equal((await call(`/github/projects/${project.id}/issues`,stranger)).status,404);
    assert.equal((await call(`/github/projects/${project.id}/import`,stranger,'POST',{numbers:[7]})).status,404);
    const listing = (await call(`/github/projects/${project.id}/issues`,owner)).data;
    assert.equal(listing.issues.length,1);assert.equal(listing.issues[0].imported,false);
    assert.equal((await call(`/github/projects/${project.id}/import`,owner,'POST',{numbers:[8]})).status,400);
    const imports = await Promise.all([1,2].map(()=>call(`/github/projects/${project.id}/import`,owner,'POST',{numbers:[7]})));
    assert.equal(imports.reduce((count,result)=>count+result.data.imported,0),1);
    const tasks = (await call('/tasks',owner)).data;
    assert.equal(tasks.length,1);assert.equal(tasks[0].status,'inbox');assert.equal(tasks[0].title,issue.title);
    assert.equal(tasks[0].project,repository.full_name);assert.equal(tasks[0].referenceUrl,'https://github.com/test-owner/test-repo/issues/7');
    await call(`/tasks/${tasks[0].id}`,owner,'PATCH',{referenceUrl:'https://example.com/edited'});
    assert.equal((await call(`/github/projects/${project.id}/import`,owner,'POST',{numbers:[7]})).data.imported,0);
    assert.equal((await call(`/github/projects/${project.id}/issues`,owner)).data.issues[0].imported,true);
    assert.deepEqual((await call('/tasks',stranger)).data,[]);
    assert.equal((await call(`/github/projects/${project.id}/import`,owner,'POST',{numbers:[7,7]})).status,400);
    const session = (await call('/sessions',owner,'POST',{taskId:tasks[0].id,durationPlannedSeconds:60})).data;
    await call(`/sessions/${session.id}`,owner,'PATCH',{action:'pause'});
    assert.equal((await call('/tasks/projects',stranger,'DELETE',{name:repository.full_name})).status,404);
    const removed = await call('/tasks/projects',owner,'DELETE',{name:repository.full_name});
    assert.equal(removed.status,200);assert.equal(removed.data.tasksKept,1);
    assert.deepEqual((await call('/github/projects',owner)).data,[]);
    const kept = (await call('/tasks',owner)).data;
    assert.equal(kept.length,1);assert.equal(kept[0].project,'');assert.equal(kept[0].referenceUrl,'https://example.com/edited');
    assert.equal((await call('/sessions/active',owner)).data.status,'paused');
    assert.equal((await call(`/github/projects/${project.id}/import`,owner,'POST',{numbers:[7]})).status,404);
    const reconnected = (await call('/github/projects',owner,'POST',{repository:repository.full_name})).data;
    assert.equal((await call(`/github/projects/${reconnected.id}/import`,owner,'POST',{numbers:[7]})).data.imported,0);
    await call('/tasks',owner,'POST',{title:'Local task',project:'A local project'});
    assert.equal((await call('/tasks/projects',owner,'DELETE',{name:'A local project'})).data.tasksKept,1);
    assert.equal((await call('/tasks',owner)).data.length,2);
    providerStatus=429;assert.equal((await call('/github/repositories',owner)).status,429);
    providerStatus=404;assert.equal((await call('/github/projects',owner,'POST',{repository:'owner/private'})).status,404);
  } finally {
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])',[users]);
    await new Promise(resolve=>server.close(resolve));await pool.end();
  }
});
