function createDocumentController(documentService) {
  function requireOwner(request, response, next) {
    const owner = request.get('X-User-Id')?.trim();
    if (!owner || owner.length > 128 || /[\r\n]/.test(owner)) {
      const error = new Error('Informe um identificador válido no cabeçalho X-User-Id.');
      error.statusCode = 400;
      error.code = 'USER_ID_REQUIRED';
      return next(error);
    }

    request.owner = owner;
    return next();
  }

  async function upload(request, response, next) {
    try {
      const document = await documentService.uploadDocument(request.owner, request.file);
      return response.status(201).json(document);
    } catch (error) {
      return next(error);
    }
  }

  function list(request, response, next) {
    try {
      return response.json(documentService.listDocuments(request.owner));
    } catch (error) {
      return next(error);
    }
  }

  async function download(request, response, next) {
    try {
      const { document, filePath } = await documentService.getDocumentForDownload(
        request.owner,
        request.params.id,
      );

      response.download(
        filePath,
        document.originalName,
        {
          headers: {
            'Content-Type': document.mimeType || 'application/octet-stream',
          },
        },
        (error) => {
          if (error && !response.headersSent) {
            next(error);
          }
        },
      );
    } catch (error) {
      return next(error);
    }
  }

  return { requireOwner, upload, list, download };
}

module.exports = createDocumentController;