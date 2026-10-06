export default function DownloadButton({ document, downloadingId, onDownload }) {
  return (
    <button
      className="download-button"
      type="button"
      onClick={() => onDownload(document)}
      disabled={Boolean(downloadingId)}
      aria-label={`Baixar ${document.originalName}`}
    >
      {downloadingId === document.id ? 'Baixando...' : 'Baixar'}
    </button>
  );
}