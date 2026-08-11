# Product

## Register

product

## Platform

web

## Users

O produto atende dois públicos. Candidatos e integrantes do APT usam os formulários públicos e a área do membro para entrar na comunidade, ativar a assinatura e cuidar da participação. A gestão do APT usa o painel para decidir candidaturas, acompanhar membros, cobrança e formulários.

## Product Purpose

Centralizar fora do aplicativo esportivo a relação do APT com seus integrantes: curadoria, cadastro, cobrança recorrente e saída. O Twinner continua responsável pelo ranking; o sistema APT assume a gestão da comunidade e da assinatura.

## Journey Architecture

- `/` — landing page pública que apresenta o APT e conduz ao requerimento.
- `/requerimento` — formulário de entrada, uma pergunta por vez, sem CPF ou dados de pagamento.
- `/gestao` — análise interna; a aprovação gera um link individual de cadastro.
- `/cadastro?convite=...` — cadastro exclusivo do aprovado, com CPF e preparação da assinatura.
- `/portal` — área financeira e operacional do integrante.

Essas jornadas não compartilham um menu público. O candidato não vê cadastro, portal ou gestão durante o requerimento.

## Positioning

O lugar onde a participação no APT é selecionada, ativada e cuidada com a mesma atenção dedicada à experiência do clube.

## Brand Personality

Exclusiva, sóbria e sensual. Combina a presença gráfica e social da Courts & Co. com a elegância silenciosa da Courtline. O tênis aparece como cultura e ritual, não como repertório esportivo genérico.

## Anti-references

Não deve parecer fintech, painel SaaS genérico, aplicativo infantil de esporte ou identidade baseada no clichê verde de Wimbledon. Evitar bolas, raquetes, troféus, placares e gramados como atalhos visuais.

## Design Principles

- A candidatura deve parecer uma conversa privada, uma pergunta por vez.
- Dados financeiros vivem separados da curadoria inicial.
- A gestão começa pelo que exige decisão, não por métricas decorativas.
- A linguagem visual deve continuar da inscrição ao painel sem perder clareza.
- Cor comunica ação e estado; não serve como decoração.

## Accessibility & Inclusion

A interface é mobile-first, navegável por teclado, preserva zoom do navegador, mantém alvos de toque confortáveis e oferece redução de movimento. Requisitos adicionais podem ser incorporados quando a operação definir necessidades específicas.
