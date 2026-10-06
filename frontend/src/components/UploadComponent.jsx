import { useRef, useState } from 'react';

export default function UploadComponent({ isUploading, onUpload }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) {
      return;
    }

    const uploaded = await onUpload(file);
    if (uploaded) {
      setFile(null);
      inputRef.current.value = '';
    }
  }

  return (
    <form className="upload-tool" onSubmit={handleSubmit}>
      <div className="upload-copy">
        <span className="upload-index">01</span>
        <div>
          <h3>Adicionar documento</h3>
          <p>Até 10 MiB por arquivo</p>
        </div>
      </div>
      <label className="file-picker" htmlFor="document-file">
        <span>{file ? file.name : 'Escolher arquivo'}</span>
        <input
          ref={inputRef}
          id="document-file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button className="upload-button" type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar arquivo'}
      </button>
    </form>
  );
}