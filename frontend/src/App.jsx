import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documents.js';
import './styles.css';

const DEFAULT_USER_ID = 'usuario-1';

export default function App() {
  const [owner, setOwner] = useState(
    () => localStorage.getItem('dms-user-id') || DEFAULT_USER_ID,
  );
  const [userDraft, setUserDraft] = useState(owner);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    localStorage.setItem('dms-user-id', owner);
    setIsLoading(true);

    listDocuments(owner)
      .then((result) => {
        if (isCurrent) {
          setDocuments(result);
          setNotice(null);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setDocuments([]);
          setNotice({ type: 'error', message: error.message });
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [owner]);

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextOwner = userDraft.trim();
    if (!nextOwner) {
      setNotice({ type: 'error', message: 'Informe um identificador de usuário.' });
      return;
    }
    setOwner(nextOwner);
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setNotice(null);
    try {
      await uploadDocument(owner, file);
      setDocuments(await listDocuments(owner));
      setNotice({ type: 'success', message: 'Documento enviado.' });
      return true;
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setNotice(null);
    try {
      await downloadDocument(owner, document);
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead-inner">
          <a className="wordmark" href="/" aria-label="DMS, início">
            <span className="wordmark-mark">D</span>
            <span>DMS</span>
          </a>
          <div className="masthead-title">
            <p className="eyebrow">ARQUIVO PESSOAL</p>
            <h1>Documentos, em ordem.</h1>
          </div>
          <form className="identity-form" onSubmit={handleUserSubmit}>
            <label htmlFor="user-id">Identificador funcional</label>
            <div className="identity-control">
              <input
                id="user-id"
                maxLength={128}
                value={userDraft}
                onChange={(event) => setUserDraft(event.target.value)}
                autoComplete="off"
              />
              <button type="submit">Acessar</button>
            </div>
          </form>
        </div>
      </header>

      <main className="workspace">
        <section className="workspace-heading" aria-labelledby="documents-heading">
          <div>
            <p className="eyebrow eyebrow-dark">ESPAÇO DE TRABALHO</p>
            <h2 id="documents-heading">Seus documentos</h2>
          </div>
          <p className="document-count">
            {isLoading ? 'Carregando...' : `${documents.length} ${documents.length === 1 ? 'arquivo' : 'arquivos'}`}
          </p>
        </section>

        <UploadComponent isUploading={isUploading} onUpload={handleUpload} />

        {notice && (
          <p className={`notice notice-${notice.type}`} role="status" aria-live="polite">
            {notice.message}
          </p>
        )}

        <DocumentList
          documents={documents}
          downloadingId={downloadingId}
          isLoading={isLoading}
          onDownload={handleDownload}
        />
      </main>

      <footer className="page-footer">
        <span>Armazenamento local</span>
        <span>Metadados mantidos durante a sessão do servidor</span>
      </footer>
    </div>
  );
}
