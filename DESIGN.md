# APT Product Design System

## Direction

Um sistema editorial de produto que combina clube contemporâneo, competição e intimidade. A linguagem visual nasce do tênis praticado de verdade: movimento técnico, esforço, quadra, sombra e detalhes de equipamento. A candidatura é espaçosa e emocional; portal e gestão são mais densos e objetivos.

## Photography

- Somente homens, refletindo a composição atual do APT.
- Gesto e equipamento tecnicamente plausíveis: tênis próprios para quadra, raquete, empunhadura, bola, rede e superfície coerentes.
- Recortes documentais e cinematográficos: saque, split step, pés, mãos, sombra e pausa entre pontos.
- Grão, contraste e movimento podem dar textura, mas nunca esconder anatomia ou objeto incorreto.
- Evitar poses de moda sem jogo, tênis de corrida, acessórios inventados e o imaginário genérico de country club.

## Official identity assets

O lockup caligráfico oficial “APT Tennis Club — Beyond the Court” é obrigatório em todas as jornadas. As versões navy sobre mineral e clara sobre navy vêm da prancha oficial `LOGOS PRANCHETA.svg` e dos arquivos derivados aprovados; não devem ser recriadas tipograficamente.

## Color

- Mineral white: `oklch(98% 0.004 255)` — superfície principal.
- Deep navy: `oklch(29% 0.055 255)` — identidade, texto e painéis de presença.
- Clay: `oklch(59% 0.145 42)` — ação primária, progresso e atenção.
- Olive: `oklch(38% 0.055 119)` — apenas confirmação e estado positivo.
- Muted mineral: `oklch(94% 0.006 255)` — superfície secundária.

O verde nunca é dominante. A paleta de produto é restrita: mineral e navy estruturam; clay ativa; olive confirma.

## Typography

- Interface: Avenir Next com fallbacks nativos legíveis.
- Display: grotesca condensada e pesada nos manifestos; serif apenas em pequenos contrapontos editoriais.
- Corpo mínimo de 1rem; dados usam números tabulares; textos longos ficam entre 45 e 65 caracteres por linha.

## Shape and spacing

- Escala de 4 pontos: 4, 8, 12, 16, 24, 32, 48 e 64px.
- Controles com raio de 8px; seções e formulários evitam caixas excessivas.
- Bordas são hairlines completas; sem faixas laterais decorativas.
- Alvos interativos têm no mínimo 44px.

## Motion

- Transições de estado entre 150 e 300ms com `ease-out-quint`.
- A única entrada expressiva acontece na troca de pergunta.
- `prefers-reduced-motion` reduz animações e rolagem suave.

## Responsive behavior

- Mobile: coluna única, landing page com CTA direto e formulário com controles próximos ao polegar.
- Tablet: duas colunas quando o conteúdo comporta.
- Desktop: candidatura em composição assimétrica; portal e gestão ganham trilho lateral persistente.
