'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('./server');

test('도서관리 CRUD API가 정상 동작한다', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'book-api-test-'));
  const dataFile = path.join(dir, 'books.json');
  fs.writeFileSync(dataFile, JSON.stringify([
    { id: 1, title: '테스트 도서', author: '테스트 작가', year: 2020, status: 'available' }
  ]));
  const server = createApp({ dataFile }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  let response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');

  response = await fetch(`${base}/api/books`);
  assert.equal((await response.json()).total, 1);

  response = await fetch(`${base}/api/books?q=테스트`);
  assert.equal((await response.json()).total, 1);

  response = await fetch(`${base}/api/books/1`);
  assert.equal((await response.json()).title, '테스트 도서');

  response = await fetch(`${base}/api/books`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '새 책', author: '새 작가', year: 2026, status: 'available' })
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.book.id, 2);

  response = await fetch(`${base}/api/books/2`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '수정한 책', author: '새 작가', year: 2025, status: 'borrowed' })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).book.status, 'borrowed');

  response = await fetch(`${base}/api/books/2`, { method: 'DELETE' });
  assert.equal(response.status, 200);

  response = await fetch(`${base}/api/books/2`);
  assert.equal(response.status, 404);

  response = await fetch(`${base}/api/books`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', author: '작가', year: 2022 })
  });
  assert.equal(response.status, 400);

  response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /나의 작은 서재/);
});
