# Node.js 도서관리 REST API 과제

Node.js 기본 HTTP 모듈를 사용해 도서 목록 조회, 검색, 개별 조회, 등록, 수정, 삭제 기능을 구현했습니다. 브라우저에서 접속하면 도서관리 화면도 사용할 수 있습니다.

## 기능

| HTTP | URL | 설명 |
| --- | --- | --- |
| GET | `/` | 도서관리 웹 화면 |
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/books` | 전체 도서 조회 |
| GET | `/api/books?q=어린` | 도서명/저자 검색 |
| GET | `/api/books/1` | ID가 1인 도서 조회 |
| POST | `/api/books` | 도서 등록 |
| PUT | `/api/books/1` | 도서 정보 수정 |
| DELETE | `/api/books/1` | 도서 삭제 |

## 로컬 실행

1. Node.js 20 이상을 설치합니다.
2. 이 폴더에서 터미널을 열고 `npm start`를 실행합니다. (외부 패키지 설치 불필요)
3. 브라우저에서 `http://localhost:3000`에 접속합니다.
4. `npm test`로 자동화된 API 테스트를 실행할 수 있습니다.

## API 사용 예시

### 새 도서 등록

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"1984","author":"조지 오웰","year":1949,"status":"available"}'
```

### 전체 도서 조회

```bash
curl http://localhost:3000/api/books
```

## 온라인 배포(Render + GitHub)

1. [GitHub](https://github.com/new)에서 새 저장소(`nodejs-book-library-api` 등)를 만듭니다.
2. 압축을 풀고 **프로젝트 안의 파일과 폴더**(`package.json`, `server.js`, `public`, `data` 등)를 GitHub 저장소 최상위에 업로드합니다. `node_modules` 폴더는 업로드하지 않습니다.
3. [Render](https://dashboard.render.com/)에 로그인하여 **New → Web Service**를 선택합니다.
4. GitHub 저장소를 연결하고 다음 값을 사용합니다.
   - Language: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path(선택): `/api/health`
5. **Create Web Service**를 눌러 배포합니다.
6. 배포가 성공하면 Render에 표시되는 실제 `https://...onrender.com` 주소로 접속해 동작을 확인합니다.
7. 해당 **실제 주소**를 `제출_URL.txt`에 붙여 넣고 저장한 후 제출합니다.

> **주의:** `localhost` 주소는 과제 제출용 공개 URL이 아닙니다. 이 프로젝트는 JSON 파일(`data/books.json`)에 저장하므로 로컬에서는 실행을 다시 시작해도 데이터가 유지됩니다. 다만 Render의 영구 디스크가 없는 서비스에서는 재배포/재시작 등으로 저장한 변경 내용이 사라질 수 있습니다. 영구 저장이 필요한 운영 서비스라면 외부 DB를 연결해야 합니다.

## 과제 설명에 사용할 문장

> Node.js 기본 HTTP 모듈를 이용하여 REST API 방식의 도서관리 프로그램을 구현하였습니다. GET으로 도서를 조회하고 POST로 등록, PUT으로 수정, DELETE로 삭제하도록 구성하였습니다. HTML/JavaScript 사용자 화면과 API를 연동하였고, 데이터는 JSON 파일에 저장하도록 구현하였습니다.
