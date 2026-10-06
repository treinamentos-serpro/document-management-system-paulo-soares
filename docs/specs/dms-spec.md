# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem documentos armazenados no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem de documentos associados ao usuário informado na requisição.
- Download de documento por identificador, respeitando o proprietário.
- Arquivos armazenados localmente via `multer` com `diskStorage`.
- Metadados mantidos em memória durante a execução do backend.
- Interface React para upload, listagem e download.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento, edição ou exclusão de documentos.
- Autenticação, cadastro de usuários e autorização centralizada.
- Persistência dos metadados após reinício do backend.
- Busca avançada, paginação e compartilhamento.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo via `multipart/form-data` no campo `file`. |
| RF-02 | O sistema gera identificador único e registra nome original, tamanho, data/hora, proprietário e tipo MIME. |
| RF-03 | O sistema grava o arquivo em diretório local com `multer` e `diskStorage`, usando nome físico gerado pela aplicação. |
| RF-04 | O usuário pode listar apenas os metadados de seus documentos, ordenados do mais recente para o mais antigo. |
| RF-05 | O usuário pode baixar um documento identificado por `id` se for seu proprietário. |
| RF-06 | Arquivo ausente/inválido, documento inexistente e falhas de armazenamento geram respostas HTTP apropriadas. |
| RF-07 | A interface permite informar a identidade funcional, enviar arquivo, consultar a lista e baixar documentos. |
| RF-08 | A interface informa estados de carregamento, lista vazia, sucesso e erro. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados exclusivamente no filesystem local, por padrão em `backend/storage`. |
| RNF-02 | Metadados em memória podem ser perdidos quando o backend reiniciar. |
| RNF-03 | Porta, diretório de armazenamento e limite de upload são configuráveis por ambiente. |
| RNF-04 | Nome original nunca determina o caminho físico nem é usado como nome interno. |
| RNF-05 | A API não expõe caminhos locais nem confirma a existência de documentos de outros usuários. |
| RNF-06 | O tamanho máximo padrão é 10 MiB; arquivos maiores são rejeitados. |
| RNF-07 | Respostas de metadados usam JSON; downloads retornam conteúdo binário como anexo. |
| RNF-08 | O backend segue `routes -> controllers -> services -> repositories`; o frontend usa `fetch` com prefixo `/api`. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado pela aplicação. |
| `originalName` | string | Nome original enviado pelo usuário. |
| `size` | number | Tamanho em bytes. |
| `uploadedAt` | string | Data/hora do upload em ISO 8601. |
| `owner` | string | Identificador funcional informado pelo cliente. |
| `storedName` | string | Nome interno aleatório no filesystem; nunca exposto publicamente. |
| `mimeType` | string | Tipo MIME informado pelo upload, usado na resposta de download. |

As respostas públicas omitem `storedName` e caminho absoluto.

### Identidade funcional

O cliente envia `X-User-Id`. Cabeçalho ausente/vazio resulta em `400`. Esse identificador não é autenticação e não prova a identidade do solicitante; a solução serve apenas para segmentação funcional local e não deve ser exposta como controle de segurança em ambiente público.

## 6. Contratos de API

Rotas do backend: `/upload`, `/documents` e `/documents/:id/download`. O proxy de desenvolvimento remove o prefixo `/api` usado pelo frontend.

### `POST /upload`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data`, campo obrigatório `file`.
- Sucesso: `201 Created`, JSON com `id`, `originalName`, `size`, `uploadedAt` e `owner`.
- Erros: `400` para usuário/arquivo ausente ou campo inválido; `413` acima do limite; `500` em falha de armazenamento.
- Se o registro de metadados falhar após a gravação, o arquivo deve ser removido quando possível.

### `GET /documents`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, array de metadados públicos do proprietário; array vazio quando não houver documentos.
- Erros: `400` se o cabeçalho estiver ausente; `500` em falha inesperada.

### `GET /documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, arquivo binário com `Content-Disposition: attachment` e nome de download seguro.
- Erros: `400` para identidade/identificador inválido; `404` se não houver documento acessível; `500` em falha de leitura.
- Documento de outro proprietário também resulta em `404`.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

Mensagens não incluem stack trace, caminhos locais ou dados de outros usuários.

## 7. Decisões arquiteturais

- Backend CommonJS com Express e camadas `routes`, `controllers`, `services` e `repositories`.
- Multer fica na borda HTTP da rota; seu `diskStorage` grava somente em diretório local configurado.
- Controllers validam/extraem dados HTTP e traduzem o resultado para status e respostas.
- Services aplicam regras de upload, ordenação, proprietário e disponibilidade do arquivo.
- Repository concentra o mapa em memória e acesso ao filesystem.
- O frontend React consome a API via `fetch` no prefixo `/api`, já redirecionado pelo proxy do Vite.
- Configuração: `PORT` (padrão `3000`), `STORAGE_DIR` (padrão `backend/storage`) e `MAX_FILE_SIZE_BYTES` (padrão `10485760`).

## 8. Plano de execução

1. Estabelecer a especificação e decisões operacionais: identidade funcional, limite de upload e respostas de erro.
2. Implementar upload local e metadados em memória, isolados pelas camadas do backend.
3. Implementar listagem e download com verificação de proprietário e tratamento de arquivos ausentes.
4. Implementar a interface React para upload, listagem e download consumindo `/api`.
5. Validar contratos, erros, limite, isolamento funcional e build do frontend; documentar a perda de metadados após reinício.

## 9. Riscos e pressupostos

- `X-User-Id` pode ser forjado e não substitui autenticação.
- Após reinício, metadados são perdidos, embora os arquivos possam permanecer no disco e ficar órfãos.
- Diretório local exige espaço e permissões adequadas; múltiplas instâncias não compartilham automaticamente os arquivos.
- O MIME é informado pelo cliente e não deve ser tratado como conteúdo validado. Downloads sempre são anexos e usam `X-Content-Type-Options: nosniff`.