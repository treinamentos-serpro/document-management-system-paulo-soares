// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const path = require('node:path');
const express = require('express');
const multer = require('multer');
const InMemoryDocumentRepository = require('./repositories/documentRepository');
const DocumentService = require('./services/documentService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRoutes = require('./routes/documentRoutes');

function createApp({
  storageDirectory = process.env.STORAGE_DIR || path.resolve(__dirname, '../storage'),
  maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024,
  documentRepository = new InMemoryDocumentRepository(storageDirectory),
} = {}) {
  const app = express();
  const documentService = new DocumentService(documentRepository);
  const documentController = createDocumentController(documentService);

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.get('/health', (request, response) => response.json({ status: 'ok' }));
  app.use(
    createDocumentRoutes({
      controller: documentController,
      storageDirectory: documentRepository.storageDirectory || storageDirectory,
      maxFileSizeBytes,
    }),
  );
  app.use((error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return response.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: tooLarge ? 'O arquivo excede o limite permitido.' : 'Não foi possível processar o upload.',
        },
      });
    }

    const statusCode = error.statusCode || 500;
    return response.status(statusCode).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: statusCode === 500 ? 'Ocorreu um erro interno.' : error.message,
      },
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

app.createApp = createApp;
module.exports = app;
