# Documentação — Mail Micro API

Índice da documentação do projeto. Para uma visão geral rápida (stack, arquitetura, setup local), veja o [README principal](../README.md).

## Guias

- [Guia de Implantação](./guia-de-implantacao.md) — como integrar sua aplicação a esta API para enviar e-mails.
- [Arquitetura](./arquitetura.md) — visão técnica interna: fluxo da fila, entidades e decisões de design.
- [Operação](./operacao.md) — variáveis de ambiente, gestão de clientes/API keys, monitoramento de envios.
- [Troubleshooting](./troubleshooting.md) — problemas comuns e como resolver.

## Sobre este projeto

A Mail Micro API é um microsserviço interno responsável exclusivamente por enviar e-mails transacionais, usado por diferentes aplicações (web, mobile, backends de clientes) para evitar duplicar lógica de SMTP em cada projeto. Cada aplicação consumidora recebe uma API key própria e chama a API de forma assíncrona (fire-and-forget).
