const fs = require('node:fs');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const express = require('express');

function createDocumentRoutes({ controller, storageDirectory, maxFileSizeBytes }) {
  const router = express.Router();
  const storage = multer.diskStorage({
    destination(request, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true }, (error) => callback(error, storageDirectory));
    },
    filename(request, file, callback) {
      callback(null, randomUUID());
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  router.post('/upload', controller.requireOwner, upload.single('file'), controller.upload);
  router.get('/documents', controller.requireOwner, controller.list);
  router.get('/documents/:id/download', controller.requireOwner, controller.download);

  return router;
}

module.exports = createDocumentRoutes;