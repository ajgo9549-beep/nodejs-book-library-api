'use strict';

// 외부 라이브러리 없이 Node.js의 기본 HTTP 모듈만 사용하는 도서관리 REST API
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'books.json');
const STATIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' }
};

function makeStore(filePath) {
  const dataFile = path.resolve(filePath);
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]\n', 'utf8');
  }

  function read() {
    const books = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!Array.isArray(books)) throw new Error('도서 저장 파일은 배열이어야 합니다.');
    return books;
  }

  function save(books) {
    const temp = `${dataFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(books, null, 2) + '\n', 'utf8');
    fs.renameSync(temp, dataFile);
  }

  return { read, save };
}

function sendJson(res, code, data, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function validateBook(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'JSON 객체로 도서 정보를 보내주세요.' };
  }
  const { title, author, year, status = 'available' } = body;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) {
    return { error: '제목(title)은 1~100자의 문자열이어야 합니다.' };
  }
  if (typeof author !== 'string' || !author.trim() || author.trim().length > 60) {
    return { error: '저자(author)는 1~60자의 문자열이어야 합니다.' };
  }
  if (!Number.isInteger(year) || year < 1 || year > 2100) {
    return { error: '출판연도(year)는 1~2100 사이 정수여야 합니다.' };
  }
  if (!['available', 'borrowed'].includes(status)) {
    return { error: "상태(status)는 'available' 또는 'borrowed'여야 합니다." };
  }
  return { value: { title: title.trim(), author: author.trim(), year, status } };
}

async function readJsonBody(req) {
  const parts = [];
  let total = 0;
  for await (const part of req) {
    total += part.length;
    if (total > 32768) {
      const error = new Error('요청 데이터가 너무 큽니다.');
      error.status = 413;
      throw error;
    }
    parts.push(part);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    const error = new Error('올바른 JSON 형식이 아닙니다.');
    error.status = 400;
    throw error;
  }
}

function createApp({ dataFile = process.env.BOOKS_DATA_FILE || DEFAULT_DATA_FILE } = {}) {
  const store = makeStore(dataFile);

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const method = req.method;

      if (method === 'GET' && STATIC_FILES[route]) {
        const { file, type } = STATIC_FILES[route];
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res);
        return;
      }
      if (method === 'GET' && route === '/api/health') {
        return sendJson(res, 200, { status: 'ok', service: '도서관리 API' });
      }
      if (method === 'GET' && route === '/api/books') {
        const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
        const books = store.read().filter((book) =>
          `${book.title} ${book.author}`.toLocaleLowerCase().includes(q)
        );
        return sendJson(res, 200, { total: books.length, books });
      }

      if (method === 'POST' && route === '/api/books') {
        const result = validateBook(await readJsonBody(req));
        if (result.error) return sendJson(res, 400, { error: result.error });
        const books = store.read();
        const nextId = books.reduce((max, b) => Math.max(max, b.id), 0) + 1;
        const book = { id: nextId, ...result.value };
        books.push(book);
        store.save(books);
        return sendJson(res, 201, { message: '도서가 등록되었습니다.', book }, { Location: `/api/books/${book.id}` });
      }

      const match = route.match(/^\/api\/books\/(\d+)$/);
      if (match) {
        const id = Number(match[1]);
        const books = store.read();
        const index = books.findIndex((item) => item.id === id);

        if (method === 'GET') {
          if (index === -1) return sendJson(res, 404, { error: '도서를 찾을 수 없습니다.' });
          return sendJson(res, 200, books[index]);
        }
        if (method === 'PUT') {
          const result = validateBook(await readJsonBody(req));
          if (result.error) return sendJson(res, 400, { error: result.error });
          if (index === -1) return sendJson(res, 404, { error: '도서를 찾을 수 없습니다.' });
          const book = { id, ...result.value };
          books[index] = book;
          store.save(books);
          return sendJson(res, 200, { message: '도서가 수정되었습니다.', book });
        }
        if (method === 'DELETE') {
          if (index === -1) return sendJson(res, 404, { error: '도서를 찾을 수 없습니다.' });
          const [book] = books.splice(index, 1);
          store.save(books);
          return sendJson(res, 200, { message: '도서가 삭제되었습니다.', book });
        }
      }

      return sendJson(res, 404, { error: '요청한 경로를 찾을 수 없습니다.' });
    } catch (error) {
      if (error.status === 400 || error.status === 413) {
        return sendJson(res, error.status, { error: error.message });
      }
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: '서버 내부 오류가 발생했습니다.' });
      else res.destroy();
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`도서관리 서버 실행: http://localhost:${port}`);
  });
}

module.exports = { createApp };
