---
target: "app/apt-app.tsx#LandingPage (v2.6 prévia local)"
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-11-26T00-31-29Z
slug: app-apt-app-tsx-landingpage
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# Crítica Impeccable — landing APT v2.6 (prévia local, porta 3040)

Alvo: `app/apt-app.tsx#LandingPage` na cópia `/private/tmp/apt-landing-v21`, a partir da última prévia do Codex, com Courts empilhando, galeria Beyond the Court, rodadas com foto no cursor, Temporada em carrossel, acento oliva e creme, moldura marinho e passe de contraste.

## Design Health Score

| # | Heurística | Nota | Problema principal |
|---|---|---:|---|
| 1 | Visibilidade do estado | 2 | Menu não acompanha a rolagem; numa página de ~10.600 px não há "onde estou" nem botão de entrada fixo. |
| 2 | Correspondência com o mundo real | 3 | Texto claro, mas "Courts", "Tweener" e "sorteios" aparecem antes de serem explicados. |
| 3 | Controle e liberdade | 3 | Carrossel com setas e rolagem nativa; Courts (2.441 px) e "JOGAR" (~1.500 px) são rolagens longas obrigatórias. |
| 4 | Consistência | 2 | Três nomes para a mesma coisa ("rodadas quinzenais", "sorteios quinzenais", "confrontos"); "Beyond the Court" como título duas vezes; ↗ usado para link interno e externo. |
| 5 | Prevenção de erro | 3 | Regras de entrada explicadas antes do requerimento. |
| 6 | Reconhecimento | 2 | Menu do desktop esconde Calendário e Dúvidas; o botão "Solicitar entrada" do menu fica oculto em todas as larguras. |
| 7 | Flexibilidade | 2 | Nada permite pular as seções longas guiadas por rolagem. |
| 8 | Estética minimalista | 2 | Os mesmos fatos (2 jogos, 14 dias, 4 divisões, 4 ciclos) se repetem 4 a 6 vezes; fotos reaproveitadas 2 a 3 vezes. |
| 9 | Recuperação de erro | 2 | Pouco aplicável; sem alternativa se fotos ou o portal falharem. |
| 10 | Ajuda | 3 | FAQ objetivo e com links, mas só aparece perto dos 8.000 px. |
| **Total** | | **24/40** | **Aceitável** |

A crítica anterior (03/10/2026) deu 32/40 para outra versão e com outra avaliação; a queda reflete critério mais duro sobre repetição e chamada para ação, não piora visual.

## Veredito anti-padrões

**Avaliação de design:** passa no limite. Voz serif/sans, paleta marinho/oliva/papel e regras reais afastam o visual genérico. O que denuncia template: todos os títulos seguem a mesma fórmula "Frase. / Itálico oliva." (8 vezes); índices "0N / 04" em quatro lugares; terceira fonte (Barlow Condensed) no rodapé; seções inspiradas em componentes diferentes que ainda não falam como uma direção só.

**Detector automático:** `detect.mjs` em `app/apt-app.tsx` saiu com código 0 e nenhuma ocorrência. No navegador (1440 e 390 px): sem rolagem lateral, sem texto vazando, sem imagem sem texto alternativo, sem pulo de hierarquia de títulos, sem id duplicado, sem botão sem nome, contraste sem falhas. Único ponto: link "O APT" do rodapé com 43×44 px (1 px abaixo do mínimo).

**Overlay visual:** não disponível. A política de segurança do site bloqueia scripts de outra porta.

## Impressão geral

Tecnicamente limpa e com bons momentos (hero, números grandes das rodadas, Courts empilhando, final azul com as bolas). O maior problema não é visual: a página conta as mesmas regras cinco vezes e só oferece o botão de entrada no começo e no fim.

## O que funciona

- Texto honesto e específico: 14 dias para combinar, entrada por indicação e análise, as três etapas.
- Números grandes 2 / 14 / 4 e a escada de Courts empilhando dão confiança e sensação de escada real.
- Acessibilidade de base sólida: link de pular conteúdo, título oculto para leitor de tela, foco visível, versões sem movimento, alvos de 44 px, texto de apoio a ~7:1.

## Problemas prioritários

1. **[P1] Não há forma constante de pedir entrada.** Depois do hero, o único caminho é um link dentro de uma resposta do FAQ e o bloco final, perto dos 9.000 px. Correção: menu fixo ao rolar e botão "Solicitar entrada" visível no menu a partir do tablet; no celular, uma barra compacta com o botão depois do hero.
2. **[P1] O conteúdo se repete em vez de evoluir.** Correção: uma função por seção. Tirar a linha "4 Divisões de nível" das rodadas (os Courts vêm logo abaixo), tirar o cartão 01 "Sorteios quinzenais" da Temporada (repete as rodadas) e encurtar o segundo parágrafo da segunda dobra. Usar o espaço para o que falta: custo e prazo aproximado da análise.
3. **[P2] Os cartões dos Courts dizem pouco.** "O nível intermediário da escada competitiva" não ajuda o candidato a se situar. Correção: um marcador concreto por Court (nível típico, quantos sobem e descem por ciclo).
4. **[P2] Fotos repetidas e com cara de circuito profissional.** Saibro, raquete vermelha e jogador na rede aparecem no hero, na galeria e na Temporada; as do hero mostram estádio e patrocínio. Correção: cada foto em um lugar só e mais fotos próprias do clube (quadra pintada, bolas, painéis).
5. **[P2] A palavra do hero gira a cada 2 segundos sem parar** (WCAG 2.2.2). Correção: parar depois de uma volta, ou pausar fora da tela.

## Personas

- **Primeira visita:** "Como são definidos os Courts?" pressupõe o termo; não há custo nem prazo da análise; "Área do membro" como única ação do topo sugere que o site é para quem já é membro.
- **Celular:** "Dúvidas" cortado no menu em 390 px; nenhum botão de entrada ao alcance do polegar por ~8.500 px; texto centralizado de 4 a 5 linhas no hero e na segunda dobra.
- **Acessibilidade:** perguntas do FAQ exclusivas (abrir uma fecha a que estava sendo lida); a passagem "JOGAR" é longa e vazia para leitor de tela; a faixa do carrossel recebe foco sem instrução.

## Observações menores

- Terceira fonte no rodapé (Barlow Condensed).
- "Entrada por indicação" aparece quatro vezes até a primeira rolagem.
- Escala de textos pequenos quase plana (12, 13, 14–15 px).
- Rótulo em caixa alta só duas vezes: bom equilíbrio.

## Perguntas

- Se alguém pode decidir lendo só o hero e o bloco de entrada, o que os 8.000 px do meio estão ganhando?
- Como seria uma página que só a APT poderia publicar: membros reais, quadras reais em Brasília, resultado do último ciclo?
- O portal "JOGAR" serve ao candidato ou ao design?
