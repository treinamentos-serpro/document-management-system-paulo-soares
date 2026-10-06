import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, downloadingId, isLoading, onDownload }) {
  if (isLoading) {
    return <div className="list-state" role="status">Carregando documentos...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="list-state empty-state">
        <span className="empty-number">00</span>
        <div>
          <h3>Nenhum documento por aqui</h3>
          <p>Os arquivos enviados aparecerão nesta lista.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Enviado em</th>
            <th scope="col">Tamanho</th>
            <th scope="col"><span className="visually-hidden">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="document-name" title={document.originalName}>{document.originalName}</td>
              <td>{formatDate(document.uploadedAt)}</td>
              <td>{formatSize(document.size)}</td>
              <td className="action-cell">
                <DownloadButton
                  document={document}
                  downloadingId={downloadingId}
                  onDownload={onDownload}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}