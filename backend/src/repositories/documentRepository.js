const fs = require('node:fs/promises');
const path = require('node:path');

class InMemoryDocumentRepository {
  constructor(storageDirectory) {
    this.storageDirectory = path.resolve(storageDirectory);
    this.documents = new Map();
  }

  create(document) {
    this.documents.set(document.id, document);
    return document;
  }

  findById(id) {
    return this.documents.get(id) || null;
  }

  findByOwner(owner) {
    return [...this.documents.values()].filter((document) => document.owner === owner);
  }

  getFilePath(document) {
    return path.join(this.storageDirectory, document.storedName);
  }

  async removeUploadedFile(storedName) {
    try {
      await fs.unlink(path.join(this.storageDirectory, storedName));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

module.exports = InMemoryDocumentRepository;