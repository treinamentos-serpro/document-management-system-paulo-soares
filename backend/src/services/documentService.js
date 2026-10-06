const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');

class DocumentService {
  constructor(documentRepository) {
    this.documentRepository = documentRepository;
  }

  async uploadDocument(owner, file) {
    if (!file) {
      const error = new Error('Envie um arquivo no campo file.');
      error.statusCode = 400;
      error.code = 'FILE_REQUIRED';
      throw error;
    }

    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storedName: file.filename,
      mimeType: file.mimetype || 'application/octet-stream',
    };

    try {
      this.documentRepository.create(document);
    } catch (error) {
      await this.documentRepository.removeUploadedFile(file.filename).catch(() => {});
      throw error;
    }

    return this.toPublicDocument(document);
  }

  listDocuments(owner) {
    return this.documentRepository
      .findByOwner(owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
      .map((document) => this.toPublicDocument(document));
  }

  async getDocumentForDownload(owner, id) {
    const document = this.documentRepository.findById(id);
    if (!document || document.owner !== owner) {
      const error = new Error('Documento não encontrado.');
      error.statusCode = 404;
      error.code = 'DOCUMENT_NOT_FOUND';
      throw error;
    }

    const filePath = this.documentRepository.getFilePath(document);
    try {
      await fs.access(filePath);
    } catch {
      const error = new Error('Documento não encontrado.');
      error.statusCode = 404;
      error.code = 'DOCUMENT_NOT_FOUND';
      throw error;
    }

    return { document: this.toPublicDocument(document), filePath };
  }

  toPublicDocument(document) {
    const { id, originalName, size, uploadedAt, owner } = document;
    return { id, originalName, size, uploadedAt, owner };
  }
}

module.exports = DocumentService;