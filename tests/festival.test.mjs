import assert from 'node:assert/strict';
import test from 'node:test';
import { countdownAt, findTopics, hasPersonalData, START_ISO } from '../src/festival-data.mjs';
import handler, { config } from '../netlify/functions/festival-assistant.mjs';

test('countdown flips at exactly 09:00 Kyzylorda time, independent of browser locale', () => {
  const at = Date.parse(START_ISO);
  assert.equal(new Date(at).toISOString(), '2026-12-04T04:00:00.000Z');
  assert.deepEqual(countdownAt(at - 90_061_000), [1, 1, 1, 1]);
  assert.deepEqual(countdownAt(at - 1), [0, 0, 0, 1]);
  assert.equal(countdownAt(at), null);
  assert.equal(countdownAt(at + 1000), null);
});

test('fallback understands three languages and does not invent unknowns', () => {
  assert.deepEqual(findTopics('Во сколько начинается регистрация?'), ['dates']);
  assert.deepEqual(findTopics('Фестиваль қай жерде өтеді?'), ['venue']);
  assert.deepEqual(findTopics('How do I submit the project?'), ['projects']);
  assert.deepEqual(findTopics('Какая будет погода?'), []);
  assert.equal(hasPersonalData('04.12.2026'), false);
  assert.equal(hasPersonalData('abc@example.invalid'), true);
  assert.equal(hasPersonalData('+7 (700) 123-45-67'), true);
});

test('optional server assist is off by default, bounds inputs, and returns only known FAQ IDs', async t => {
  const env = ['INNOFEST_AI_ENABLED', 'INNOFEST_ASSISTANT_GROQ_API_KEY', 'GROQ_API_KEY'];
  const original = Object.fromEntries(env.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of env) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  delete process.env.INNOFEST_AI_ENABLED;
  process.env.GROQ_API_KEY = 'test-key-not-real';
  delete process.env.INNOFEST_ASSISTANT_GROQ_API_KEY;
  const url = 'https://example.invalid' + config.path;
  const question = (value, origin = 'https://example.invalid') => new Request(url, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ question: value }),
  });
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.messages[1].content, 'Где фестиваль?');
    assert.equal(body.max_completion_tokens, 300);
    return Response.json({ choices: [{ message: { content: '{"topics":["venue","fake","venue","constructor"]}' } }] });
  });
  assert.deepEqual(await (await handler(new Request(url))).json(), { available: false });
  assert.equal((await handler(question('Где фестиваль?'))).status, 503);
  assert.equal(fetch.mock.calls.length, 0);

  process.env.INNOFEST_AI_ENABLED = 'true';
  assert.deepEqual(await (await handler(new Request(url))).json(), { available: true });
  assert.equal((await handler(question('Где фестиваль?', 'https://other.invalid'))).status, 403);
  assert.equal((await handler(question('abc@example.invalid'))).status, 400);
  assert.equal((await handler(question('ю'.repeat(301)))).status, 400);
  assert.equal((await handler(question('ю'.repeat(1801)))).status, 400);
  assert.equal(fetch.mock.calls.length, 0);
  assert.deepEqual(await (await handler(question('Где фестиваль?'))).json(), { topics: ['venue'] });
  assert.equal(fetch.mock.calls.length, 1);
  fetch.mock.mockImplementation(async () => new Response('failure', { status: 500 }));
  assert.equal((await handler(question('Где фестиваль?'))).status, 503);
});
