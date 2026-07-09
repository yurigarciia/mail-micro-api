# Troubleshooting

Problemas comuns e como resolver. Para o runbook geral de operação, veja [Operação](./operacao.md).

## E-mail caiu em Spam ou Promoções (Gmail)

**Causas prováveis:**

1. **Domínio sem autenticação configurada corretamente.** Confira no Mailgun (Sending → Domain Settings) se o domínio remetente está com SPF, DKIM e tracking configurados e com status "Verified".
2. **Conteúdo sem versão texto.** Já mitigado — o `MailerService` gera automaticamente uma versão `text` a partir do `body` HTML (função `stripHtml`). Se um e-mail específico ainda cair em Promoções, avalie o conteúdo/formatação daquele envio.
3. **Reputação do domínio/IP.** Domínios novos ou com baixo volume de envio ainda não têm histórico suficiente para os provedores confiarem plenamente — tende a melhorar com o tempo e envios consistentes.

## Gmail mostra aviso "esta mensagem parece estar em inglês"

Geralmente não é um bug do serviço — é o texto do e-mail sem acentuação correta (ex: "Ola" em vez de "Olá", "voce" em vez de "você") confundindo a detecção de idioma do Gmail. Garanta que o `body` enviado para `/emails` tenha acentuação em português correta.

## `401 Unauthorized` ao chamar `/emails`

- Confirme que o header é exatamente `x-api-key` (não `Authorization` nem `api-key`).
- Confirme que a API key não tem espaços extras ou quebra de linha ao ser lida de variável de ambiente.
- Se a key foi perdida/nunca guardada, não há como recuperá-la — é necessário criar um novo cliente via `POST /clients` (veja [Operação](./operacao.md#gestão-de-clientes-api-keys)).

## `401 Unauthorized` ao chamar `/clients`

Confirme o header `x-admin-key` e que ele bate com a variável de ambiente `ADMIN_KEY` configurada no serviço (não confundir com uma API key de cliente comum — são conceitos diferentes).

## Erro de conexão com o banco (Neon) ao iniciar a aplicação

Bancos serverless como o Neon hibernam após período de inatividade. A primeira query após esse período pode demorar alguns segundos para "acordar" o banco — isso normalmente não é uma falha real, apenas latência. Se o erro persistir além disso, verifique se `DATABASE_URL` está correta e se o IP/ambiente tem permissão de acesso (Neon geralmente libera acesso público via SSL por padrão).

## E-mail aceito (`202`) mas nunca chegou

1. Consulte o status real na tabela `email_log` pelo `id` retornado na resposta (veja query em [Operação](./operacao.md#monitorando-envios)).
   - `SENT`: o Mailgun aceitou a entrega — se o destinatário não recebeu, o problema é no lado do provedor de e-mail dele (spam, filtro, etc.), não no envio em si.
   - `FAILED`: veja a coluna `error` para o motivo da última tentativa.
   - `PENDING` com `attempts` > 0 parado: possivelmente o processo reiniciou no meio de um retry (veja [Arquitetura](./arquitetura.md#fila-em-memória-não-redisbullmq)) — o job foi perdido e precisa ser reenviado manualmente.
2. Verifique os logs da aplicação por volta do horário do envio (mensagens de `warn`/`error` da fila).

## `Connection timeout` ao enviar e-mail em produção

**Sintoma:** localmente o envio funciona, mas em produção (Render ou outro PaaS) todo envio falha com `Connection timeout` após ~2 minutos, esgotando as 3 tentativas e caindo em `FAILED`.

**Causa:** muitos provedores PaaS (Render incluído) bloqueiam tráfego de saída nas portas SMTP (25/465/587) por padrão, como medida antispam. Isso derruba qualquer tentativa de conexão SMTP direta, mesmo com credenciais corretas — o erro é de rede, não de autenticação.

**Solução:** este é o motivo pelo qual o `MailerService` usa a **API HTTP do Mailgun** (`mailgun.js`, porta 443) em vez de SMTP direto — HTTP raramente é bloqueado por esses provedores. Se esse erro voltar a aparecer, confirme que o serviço ainda está configurado para usar a API HTTP (variáveis `MAILGUN_API_KEY`/`MAILGUN_DOMAIN`/`MAILGUN_FROM`) e não foi revertido para SMTP.

## `bcrypt` falha ao instalar/rodar (erro de binding nativo)

`bcrypt` usa bindings nativos compilados por plataforma. Se aparecer erro de binding ao instalar dependências em um ambiente diferente do usado no desenvolvimento, rode `npm rebuild bcrypt` ou reinstale as dependências (`rm -rf node_modules && npm install`) diretamente nesse ambiente/imagem Docker.
