# Guia de Implantação

Este guia é para quem vai **consumir** a Mail Micro API a partir de outra aplicação (um serviço terceiro) — não cobre como rodar ou hospedar a API em si (veja o [README principal](../README.md) para isso).

## 1. Obtendo uma API key

Cada aplicação consumidora precisa da sua própria API key. A criação de clientes é feita pelo administrador do serviço através do endpoint `POST /clients`, autenticado com a `x-admin-key` (chave que só o administrador do serviço possui).

```bash
curl -X POST https://<host>/clients \
  -H "x-admin-key: <admin-key>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nome da sua aplicação" }'
```

Resposta:

```json
{
  "id": "<uuid-do-cliente>",
  "name": "Nome da sua aplicação",
  "apiKey": "<api-key-gerada-guarde-com-cuidado>",
  "warning": "Guarde essa API key agora, ela não será mostrada novamente."
}
```

> **Importante:** a `apiKey` só é exibida nesse momento. Guarde-a em um cofre de segredos (variável de ambiente, secret manager, etc.) da sua aplicação — ela não pode ser recuperada depois, apenas revogada e substituída por uma nova.

Se você é uma aplicação terceira integrando esse serviço, peça ao administrador para gerar sua API key.

## 2. Autenticação

Todas as chamadas ao endpoint de envio de e-mail exigem o header:

```
x-api-key: <sua-api-key>
```

Requisições sem esse header, ou com uma key inválida, recebem `401 Unauthorized`.

## 3. Enviando um e-mail

**`POST /emails`**

### Corpo da requisição

| Campo         | Tipo                 | Obrigatório | Descrição                                      |
| ------------- | -------------------- | ----------- | ----------------------------------------------- |
| `to`          | `string[]`           | Sim         | Lista de e-mails destinatários                  |
| `subject`     | `string`              | Sim         | Assunto do e-mail                                |
| `body`        | `string`              | Sim         | Corpo do e-mail em HTML (uma versão texto puro é gerada automaticamente) |
| `attachments` | `AttachmentDto[]`     | Não         | Lista de anexos                                  |

`AttachmentDto`:

| Campo         | Tipo     | Obrigatório | Descrição                              |
| ------------- | -------- | ----------- | ---------------------------------------- |
| `filename`    | `string` | Sim         | Nome do arquivo                          |
| `content`     | `string` | Sim         | Conteúdo do arquivo **em base64**        |
| `contentType` | `string` | Não         | MIME type (ex: `application/pdf`)        |

### Exemplo — cURL

```bash
curl -X POST https://<host>/emails \
  -H "x-api-key: <sua-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["destinatario@exemplo.com"],
    "subject": "Bem-vindo!",
    "body": "<p>Olá, obrigado por se cadastrar.</p>"
  }'
```

### Exemplo — Node.js (fetch)

```js
const response = await fetch("https://<host>/emails", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MAIL_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: ["destinatario@exemplo.com"],
    subject: "Bem-vindo!",
    body: "<p>Olá, obrigado por se cadastrar.</p>",
  }),
});

const data = await response.json();
console.log(data); // { id: "...", status: "queued" }
```

### Exemplo — com anexo

```js
const fileBase64 = fs.readFileSync("relatorio.pdf").toString("base64");

await fetch("https://<host>/emails", {
  method: "POST",
  headers: { "x-api-key": process.env.MAIL_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    to: ["destinatario@exemplo.com"],
    subject: "Seu relatório",
    body: "<p>Segue em anexo.</p>",
    attachments: [{ filename: "relatorio.pdf", content: fileBase64, contentType: "application/pdf" }],
  }),
});
```

## 4. Resposta e modelo assíncrono

A API é **fire-and-forget**: a resposta `202 Accepted` confirma apenas que o e-mail foi **aceito e enfileirado**, não que foi entregue.

```json
{ "id": "<uuid-do-envio>", "status": "queued" }
```

O envio real acontece em background, com até 3 tentativas em caso de falha temporária. Sua aplicação não deve bloquear a experiência do usuário esperando confirmação de entrega — trate a chamada como "disparei, segue o fluxo".

> Hoje não existe um endpoint público para consultar o status final (`SENT`/`FAILED`) de um envio pelo `id` retornado. Se sua integração depende de confirmação de entrega, converse com o administrador do serviço sobre expor esse retorno.

## 5. Tratamento de erros

| Status | Situação                                      |
| ------ | ----------------------------------------------- |
| `202`  | E-mail aceito e enfileirado                     |
| `400`  | Corpo da requisição inválido (campos faltando, e-mail malformado, etc.) |
| `401`  | `x-api-key` ausente ou inválida                 |

Recomenda-se implementar retry com backoff no lado do cliente apenas para erros `5xx` ou falhas de rede — erros `400`/`401` indicam problema na requisição ou credencial, repetir não resolve.

## 6. Boas práticas

- Nunca exponha a `apiKey` no frontend/cliente — chame a Mail Micro API sempre a partir do seu backend.
- Use uma API key por aplicação/serviço, não compartilhe a mesma key entre projetos diferentes — isso facilita revogar acesso de um projeto específico sem afetar os demais.
- Envie o `body` já em HTML válido e com acentuação correta (isso ajuda tanto na renderização quanto na entregabilidade — conteúdo malformado ou sem acentos pode ser mal classificado por provedores como Gmail).
- Para anexos grandes, tenha em mente que o payload inteiro (incluindo o base64) vai no corpo JSON — evite anexos muito grandes (dezenas de MB) por esse caminho.

## 7. Referência completa

A documentação interativa (Swagger) com todos os schemas e exemplos de resposta está disponível em `/swagger` no host onde a API está publicada.
