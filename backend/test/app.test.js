const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const appModule = require('../src/app');
const InMemoryDocumentRepository = require('../src/repositories/documentRepository');

async function startTestServer() {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const documentRepository = new InMemoryDocumentRepository(storageDirectory);
  const app = appModule.createApp({ storageDirectory, documentRepository, maxFileSizeBytes: 16 });
  const server = app.listen(0);
  await once(server, 'listening');

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    server,
    storageDirectory,
  };
}

function createUploadBody(name = 'arquivo.txt', text = 'conteúdo') {
  const body = new FormData();
  body.append('file', new Blob([text], { type: 'text/plain' }), name);
  return body;
}

test('o app backend é exportado', () => {
  assert.equal(typeof appModule, 'function');
  assert.equal(typeof appModule.createApp, 'function');
});

test('usa backend/storage como diretório padrão', async (context) => {
  const previousStorageDirectory = process.env.STORAGE_DIR;
  delete process.env.STORAGE_DIR;
  context.after(() => {
    if (previousStorageDirectory === undefined) {
      delete process.env.STORAGE_DIR;
    } else {
      process.env.STORAGE_DIR = previousStorageDirectory;
    }
  });
  let actualStorageDirectory;
  context.mock.method(InMemoryDocumentRepository.prototype, 'findByOwner', function () {
    actualStorageDirectory = this.storageDirectory;
    return [];
  });
  const server = appModule.createApp().listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(response.status, 200);
  await response.json();
  assert.equal(actualStorageDirectory, path.resolve(__dirname, '../storage'));
});

test('faz upload, lista somente documentos do usuário e permite download', async (context) => {
  const testServer = await startTestServer();
  context.after(async () => {
    testServer.server.close();
    await fs.rm(testServer.storageDirectory, { recursive: true, force: true });
  });

  const uploadResponse = await fetch(`${testServer.baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: createUploadBody('relatorio.txt', 'conteúdo local'),
  });
  assert.equal(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.deepEqual(Object.keys(uploadedDocument).sort(), [
    'id', 'originalName', 'owner', 'size', 'uploadedAt',
  ]);
  assert.equal(uploadedDocument.originalName, 'relatorio.txt');
  assert.equal(uploadedDocument.owner, 'usuario-1');

  const listResponse = await fetch(`${testServer.baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).length, 1);

  const otherUserList = await fetch(`${testServer.baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.deepEqual(await otherUserList.json(), []);

  const downloadResponse = await fetch(
    `${testServer.baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'X-User-Id': 'usuario-1' } },
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteúdo local');
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);
});

test('rejeita identidade ausente, upload acima do limite e documento de outro usuário', async (context) => {
  const testServer = await startTestServer();
  context.after(async () => {
    testServer.server.close();
    await fs.rm(testServer.storageDirectory, { recursive: true, force: true });
  });

  const missingOwnerResponse = await fetch(`${testServer.baseUrl}/documents`);
  assert.equal(missingOwnerResponse.status, 400);

  const oversizedResponse = await fetch(`${testServer.baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: createUploadBody('grande.txt', 'conteúdo maior que dezesseis bytes'),
  });
  assert.equal(oversizedResponse.status, 413);

  const uploadResponse = await fetch(`${testServer.baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: createUploadBody('privado.txt', 'privado'),
  });
  const document = await uploadResponse.json();
  const forbiddenDocument = await fetch(
    `${testServer.baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'usuario-2' } },
  );
  assert.equal(forbiddenDocument.status, 404);
});
