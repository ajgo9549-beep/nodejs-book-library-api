'use strict';

const $ = (selector) => document.querySelector(selector);
const rows = $('#book-rows');
const form = $('#book-form');
const notice = $('#notice');
let allBooks = [];
let editingId = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
  return data;
}

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.hidden = false;
}

function statusTag(status) {
  const tag = document.createElement('span');
  tag.className = `tag tag-${status === 'available' ? 'available' : 'borrowed'}`;
  tag.textContent = status === 'available' ? '대출 가능' : '대출 중';
  return tag;
}

function render() {
  const q = $('#search').value.trim().toLocaleLowerCase();
  const books = allBooks.filter(book => `${book.title} ${book.author}`.toLocaleLowerCase().includes(q));
  $('#total-books').textContent = allBooks.length;
  $('#available-books').textContent = allBooks.filter(book => book.status === 'available').length;
  $('#borrowed-books').textContent = allBooks.filter(book => book.status === 'borrowed').length;
  $('#list-count').textContent = `전체 ${books.length}권`;
  rows.replaceChildren();
  if (!books.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = '검색 결과가 없습니다.';
    tr.append(td);
    rows.append(tr);
    return;
  }
  for (const book of books) {
    const tr = document.createElement('tr');
    for (const field of ['title', 'author', 'year']) {
      const td = document.createElement('td');
      td.textContent = book[field];
      tr.append(td);
    }
    const statusTd = document.createElement('td');
    statusTd.append(statusTag(book.status));
    tr.append(statusTd);

    const actions = document.createElement('td');
    actions.className = 'actions-cell';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'action';
    edit.textContent = '수정';
    edit.addEventListener('click', () => editBook(book));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'action remove';
    del.textContent = '삭제';
    del.addEventListener('click', () => deleteBook(book));
    actions.append(edit, del);
    tr.append(actions);
    rows.append(tr);
  }
}

async function loadBooks() {
  try {
    const data = await request('/api/books');
    allBooks = data.books;
    render();
  } catch (error) {
    showNotice(`도서 조회 실패: ${error.message}`, true);
    rows.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = '서버와 연결할 수 없습니다.';
    tr.append(td);
    rows.append(tr);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  $('#form-heading').textContent = '새 도서 등록';
  $('#submit-book').textContent = '도서 등록하기';
  $('#cancel-edit').hidden = true;
}

function editBook(book) {
  editingId = book.id;
  for (const field of ['title', 'author', 'year', 'status']) {
    form.elements[field].value = book[field];
  }
  $('#form-heading').textContent = `도서 수정 #${book.id}`;
  $('#submit-book').textContent = '수정사항 저장';
  $('#cancel-edit').hidden = false;
  notice.hidden = true;
  $('#form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteBook(book) {
  if (!window.confirm(`'${book.title}' 도서를 삭제할까요?`)) return;
  try {
    await request(`/api/books/${book.id}`, { method: 'DELETE' });
    if (editingId === book.id) resetForm();
    showNotice(`'${book.title}' 도서를 삭제했습니다.`);
    await loadBooks();
  } catch (error) { showNotice(error.message, true); }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const book = {
    title: form.elements.title.value.trim(),
    author: form.elements.author.value.trim(),
    year: Number(form.elements.year.value),
    status: form.elements.status.value
  };
  const id = editingId;
  try {
    await request(id === null ? '/api/books' : `/api/books/${id}`, {
      method: id === null ? 'POST' : 'PUT',
      body: JSON.stringify(book)
    });
    resetForm();
    showNotice(id === null ? '도서 등록이 완료되었습니다.' : '도서 수정이 완료되었습니다.');
    await loadBooks();
  } catch (error) { showNotice(error.message, true); }
});

$('#cancel-edit').addEventListener('click', resetForm);
$('#search').addEventListener('input', render);
loadBooks();
