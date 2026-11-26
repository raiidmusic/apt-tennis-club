// Run only in a disposable official HeyForm container with private outbound enabled.
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createRequire } = require('node:module');
const imageRequire = createRequire('/app/packages/server/package.json');
const webhook = imageRequire('/app/packages/server/dist/apps/webhook.js').default;

(async () => {
  let calls = 0;
  const server = createServer(async (request, response) => {
    calls++;
    if (request.headers.authorization !== 'Basic YXB0LXRlc3Q6bG9jYWwtb25seQ==') {
      response.writeHead(401).end();
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    assert.equal(body.id, 'submission-test');
    assert.equal(body.formId, 'form-test');
    assert.equal(body.hiddenFields[0].value, 'synthetic-context');
    assert.equal('ip' in body, false);
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://apt-test:local-only@127.0.0.1:${server.address().port}/`;
  try {
    process.env.ALLOW_PRIVATE_OUTBOUND = 'false';
    await assert.rejects(() => webhook.validate({ endpointUrl: endpoint }), /not allowed/);
    process.env.ALLOW_PRIVATE_OUTBOUND = 'true';
    await webhook.validate({ endpointUrl: endpoint });
    const form = { id: 'form-test', name: 'Synthetic', fields: [], settings: {} };
    const submission = { id: 'submission-test', answers: [], variables: [], hiddenFields: [{ name: 'apt_context', value: 'synthetic-context' }], ip: '192.0.2.1' };
    assert.equal(await webhook.run({ config: { endpointUrl: endpoint }, form, submission }), '{"ok":true}');
    await assert.rejects(() => webhook.run({ config: { endpointUrl: endpoint.replace('local-only', 'wrong') }, form, submission }));
    assert.equal(calls, 2);
    console.log('PASS: official HeyForm validates userinfo URL, sends Basic auth, carries context, omits IP and rejects unauthenticated delivery.');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
