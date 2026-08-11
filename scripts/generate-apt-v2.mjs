import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = '/Users/gabrielguedes/Documents/Codex/2026-08-06/me';
const outDir = path.join(root, 'design-output');

const C = {
  mineral: '#F7F5F0',
  mineral2: '#EEEDE9',
  navy: '#263650',
  navyDeep: '#101A2A',
  navySoft: '#344762',
  clay: '#C45C3D',
  clayDark: '#98442E',
  olive: '#51613B',
  ink: '#182336',
  muted: '#657083',
  white: '#FFFFFF',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rect = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const text = (x, y, value, size = 16, weight = 500, fill = C.ink, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" font-family="Avenir Next, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(value)}</text>`;
const label = (x, y, value, fill = C.muted) => text(x, y, value.toUpperCase(), 11, 700, fill, 'start', 'letter-spacing="1.35"');
const multiline = (x, y, lines, size, weight, fill, lh, extra = '') => `<text x="${x}" y="${y}" font-family="Avenir Next Condensed, Arial Narrow, Avenir Next, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${lines.map((v, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(v)}</tspan>`).join('')}</text>`;
const bodyText = (x, y, lines, size = 17, fill = C.muted, lh = 28, max = 0) => `<text x="${x}" y="${y}" font-family="Avenir Next, Arial, sans-serif" font-size="${size}" font-weight="450" fill="${fill}">${lines.map((v, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(v)}</tspan>`).join('')}</text>`;
const pill = (x, y, w, h, bg, txt, fg = C.white, stroke = 'none') => `${rect(x, y, w, h, bg, h / 2, `stroke="${stroke}"`)}${text(x + w / 2, y + h / 2 + 5, txt, 14, 700, fg, 'middle')}`;
const glass = (x, y, w, h, r = 16, opacity = 0.12) => `<g filter="url(#glassShadow)">${rect(x, y, w, h, `rgba(255,255,255,${opacity})`, r, 'stroke="rgba(255,255,255,.28)" stroke-width="1"')}${line(x + r, y + 1, x + w - r, y + 1, 'rgba(255,255,255,.55)', 1)}</g>`;

async function imageData(name) {
  const buf = await readFile(path.join(root, 'public', name));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function logoInline(name, x, y, w, h) {
  const raw = await readFile(path.join(root, 'public', name), 'utf8');
  const vb = raw.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number) ?? [0, 0, 100, 100];
  const body = raw
    .replace(/[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\sserif:id="[^"]*"/g, '');
  const sx = w / vb[2];
  const sy = h / vb[3];
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy}) translate(${-vb[0]} ${-vb[1]})">${body}</g>`;
}

const heroImg = await imageData('apt-hero-figma.jpg');
const motionImg = await imageData('apt-motion-figma.jpg');
const ritualImg = await imageData('apt-ritual-figma.jpg');
const logoLight = await logoInline('logo-apt2.svg', 0, 0, 1, 1);

function inlineLogo(x, y, w, h) {
  return logoLight.replace('translate(0 0) scale(', `translate(${x} ${y}) scale(`).replace(/scale\(([^ ]+) ([^)]+)\)/, (_, a, b) => {
    const ratioX = Number(a) * w;
    const ratioY = Number(b) * h;
    return `scale(${ratioX} ${ratioY})`;
  });
}

function defs(extra = '') {
  return `<defs>
    <linearGradient id="heroShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101A2A" stop-opacity=".94"/><stop offset=".58" stop-color="#101A2A" stop-opacity=".58"/><stop offset="1" stop-color="#101A2A" stop-opacity=".18"/></linearGradient>
    <linearGradient id="glassTint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".26"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".08"/><stop offset="1" stop-color="#263650" stop-opacity=".18"/></linearGradient>
    <filter id="glassShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#07101D" flood-opacity=".24"/></filter>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#101A2A" flood-opacity=".14"/></filter>
    <clipPath id="desktopHero"><rect width="1440" height="900" rx="0"/></clipPath>
    <clipPath id="atmos"><rect x="80" y="2140" width="1280" height="610" rx="16"/></clipPath>
    <clipPath id="bentoImage"><rect x="882" y="1314" width="448" height="318" rx="14"/></clipPath>
    <clipPath id="phonePhoto"><rect x="848" y="3510" width="348" height="248" rx="14"/></clipPath>
    <clipPath id="mobileHero"><rect width="390" height="880"/></clipPath>
    <clipPath id="mobilePhoto"><rect x="16" y="1975" width="358" height="500" rx="14"/></clipPath>
    ${extra}
  </defs>`;
}

function rankingRows(x, y, width, dark = false) {
  const fg = dark ? C.white : C.ink;
  const muted = dark ? '#B7C0CF' : C.muted;
  const names = [
    ['01', 'Lucas Andrade', '1.284', '+2'],
    ['02', 'Pedro Nogueira', '1.248', '—'],
    ['03', 'Rafael Mendes', '1.196', '+1'],
    ['04', 'Bruno Tavares', '1.172', '-2'],
  ];
  return names.map((r, i) => {
    const yy = y + i * 64;
    return `${line(x, yy + 52, x + width, yy + 52, dark ? 'rgba(255,255,255,.14)' : '#D8DCE2')}${text(x, yy + 32, r[0], 13, 700, muted)}${circle(x + 54, yy + 25, 17, i === 0 ? C.clay : dark ? '#344762' : '#E3E6E9')}${text(x + 82, yy + 31, r[1], 15, 650, fg)}${text(x + width - 50, yy + 31, r[2], 15, 700, fg, 'end')}${text(x + width, yy + 31, r[3], 12, 700, r[3].startsWith('+') ? C.olive : muted, 'end')}`;
  }).join('');
}

function desktopSvg() {
  const W = 1440, H = 4870;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  ${rect(0, 0, W, H, C.mineral)}
  <g id="Hero">
    <image href="${heroImg}" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" clip-path="url(#desktopHero)"/>
    ${rect(0, 0, 1440, 900, 'url(#heroShade)')}
    ${glass(88, 36, 1264, 74, 37, .12)}
    ${inlineLogo(118, 52, 44, 38)}
    ${text(188, 80, 'APT TENNIS CLUB', 14, 700, C.white, 'start', 'letter-spacing="1.2"')}
    ${text(650, 80, 'Clube', 14, 600, '#E9EDF3', 'middle')}
    ${text(754, 80, 'Experiência', 14, 600, '#E9EDF3', 'middle')}
    ${text(872, 80, 'Entrada', 14, 600, '#E9EDF3', 'middle')}
    ${text(1014, 80, 'Área do membro', 14, 600, '#E9EDF3', 'middle')}
    ${pill(1160, 50, 164, 46, C.clay, 'Solicitar entrada')}

    ${label(96, 246, 'Ranking privado · Brasília', '#D9E0EA')}
    ${multiline(96, 316, ['O tênis continua', 'depois do último ponto.'], 68, 750, C.white, 72, 'letter-spacing="-1.5"')}
    ${bodyText(100, 486, ['Uma comunidade selecionada para jogar sério,', 'criar vínculos e viver o ranking além da quadra.'], 19, '#DDE3EC', 31)}
    ${pill(96, 592, 188, 52, C.clay, 'Solicitar entrada')}
    ${pill(300, 592, 166, 52, 'rgba(255,255,255,.12)', 'Entender o APT', C.white, 'rgba(255,255,255,.34)')}

    ${glass(914, 550, 390, 252, 16, .14)}
    ${label(944, 588, 'Agora no APT', '#DDE4EE')}
    ${text(944, 636, 'Ranking APT', 26, 750, C.white)}
    ${pill(1162, 602, 112, 34, 'rgba(81,97,59,.9)', 'ATIVO', C.white)}
    ${line(944, 664, 1274, 664, 'rgba(255,255,255,.22)')}
    ${text(944, 708, '08', 36, 750, C.white)}${text(944, 732, 'RODADA', 10, 700, '#C6CEDA', 'start', 'letter-spacing="1"')}
    ${text(1060, 708, '48', 36, 750, C.white)}${text(1060, 732, 'JOGADORES', 10, 700, '#C6CEDA', 'start', 'letter-spacing="1"')}
    ${text(1268, 702, '18 AGO', 17, 750, C.white, 'end')}${text(1268, 728, 'PRÓXIMO SORTEIO', 10, 700, '#C6CEDA', 'end', 'letter-spacing=".8"')}
  </g>

  <g id="Product experience">
    ${rect(0, 900, 1440, 1150, C.mineral)}
    ${label(80, 1000, 'A experiência digital do APT')}
    ${multiline(80, 1060, ['Um clube que organiza', 'o que acontece fora da quadra.'], 48, 720, C.ink, 54, 'letter-spacing="-1"')}
    ${bodyText(896, 1086, ['Ranking no Twinner. Assinatura no APT.', 'Cada ferramenta no lugar certo, sem ruído.'], 17, C.muted, 27)}

    ${rect(80, 1220, 758, 664, C.navyDeep, 16)}
    ${label(116, 1266, 'Ranking no Twinner', '#B9C3D0')}
    ${text(116, 1316, 'A competição em primeiro plano.', 28, 700, C.white)}
    ${text(116, 1352, 'Acesse o ranking, acompanhe posições e entre na próxima rodada.', 15, 450, '#B9C3D0')}
    ${pill(620, 1250, 180, 44, C.clay, 'Abrir no Twinner')}
    ${rect(116, 1400, 686, 420, C.navy, 14, 'stroke="rgba(255,255,255,.14)"')}
    ${text(146, 1440, 'Classificação geral', 17, 700, C.white)}
    ${text(772, 1440, 'PTS', 11, 700, '#B9C3D0', 'end')}
    ${rankingRows(146, 1476, 626, true)}

    ${rect(874, 1220, 486, 282, C.white, 16, 'stroke="#D9DCE1"')}
    ${label(906, 1260, 'Assinatura')}
    ${text(906, 1306, 'Tudo em dia', 28, 750, C.ink)}
    ${pill(1196, 1268, 126, 36, '#E7ECDF', 'ATIVA', C.olive)}
    ${text(906, 1352, 'Próxima cobrança', 13, 500, C.muted)}
    ${text(1322, 1352, '12 SET', 15, 700, C.ink, 'end')}
    ${line(906, 1380, 1322, 1380, '#E2E4E8')}
    ${text(906, 1422, '•••• 4242', 15, 650, C.ink)}
    ${text(1322, 1422, 'Atualizar cartão', 13, 700, C.clay, 'end')}

    ${rect(874, 1530, 486, 354, C.navy, 16)}
    <image href="${ritualImg}" x="874" y="1530" width="486" height="354" preserveAspectRatio="xMidYMid slice" opacity=".66"/>
    ${rect(874, 1530, 486, 354, 'url(#heroShade)', 16)}
    ${label(906, 1580, 'Comunidade selecionada', '#DDE4ED')}
    ${multiline(906, 1630, ['Gente que joga.', 'Gente que fica.'], 34, 720, C.white, 38, 'letter-spacing="-.6"')}
    ${bodyText(906, 1734, ['Entrada por análise. Experiência', 'construída encontro após encontro.'], 15, '#D8DFE8', 24)}
    ${pill(906, 1804, 158, 44, 'rgba(255,255,255,.12)', 'Conhecer o clube', C.white, 'rgba(255,255,255,.30)')}
  </g>

  <g id="Atmosphere">
    ${rect(0, 2050, 1440, 800, C.navyDeep)}
    ${label(80, 2112, 'Presença em quadra', '#C5CDD8')}
    <image href="${motionImg}" x="80" y="2140" width="1280" height="610" preserveAspectRatio="xMidYMid slice" clip-path="url(#atmos)"/>
    ${rect(80, 2140, 1280, 610, 'rgba(16,26,42,.22)', 16)}
    ${glass(120, 2484, 574, 218, 16, .14)}
    ${text(154, 2530, '“', 42, 700, C.clay)}
    ${multiline(154, 2574, ['Competição com intensidade.', 'Convívio sem performance.'], 30, 700, C.white, 36)}
    ${text(154, 2670, 'APT TENNIS CLUB · BEYOND THE COURT', 10, 700, '#D5DDE8', 'start', 'letter-spacing="1.1"')}
  </g>

  <g id="Entry flow">
    ${rect(0, 2850, 1440, 620, C.mineral)}
    ${label(80, 2940, 'Como entrar')}
    ${multiline(80, 2996, ['O primeiro contato', 'pede contexto.'], 44, 720, C.ink, 50)}
    ${bodyText(80, 3126, ['O formulário inicial não pede CPF nem cartão.', 'Primeiro a gente entende quem quer fazer parte.'], 16, C.muted, 26)}
    ${line(514, 3090, 1288, 3090, '#C8CDD4', 2)}
    ${circle(550, 3090, 18, C.clay)}${text(550, 3096, '1', 12, 800, C.white, 'middle')}
    ${circle(856, 3090, 18, C.navy)}${text(856, 3096, '2', 12, 800, C.white, 'middle')}
    ${circle(1170, 3090, 18, C.navy)}${text(1170, 3096, '3', 12, 800, C.white, 'middle')}
    ${text(514, 3160, 'Solicitação', 20, 700, C.ink)}
    ${bodyText(514, 3200, ['Você conta sobre seu jogo,', 'sua rotina e o que busca.'], 14, C.muted, 22)}
    ${text(820, 3160, 'Análise', 20, 700, C.ink)}
    ${bodyText(820, 3200, ['A gestão avalia o perfil', 'e a disponibilidade.'], 14, C.muted, 22)}
    ${text(1134, 3160, 'Convite e cadastro', 20, 700, C.ink)}
    ${bodyText(1134, 3200, ['Aprovado, você recebe', 'o link privado de cadastro.'], 14, C.muted, 22)}
    ${pill(80, 3352, 190, 50, C.clay, 'Começar solicitação')}
  </g>

  <g id="Member preview">
    ${rect(0, 3470, 1440, 930, C.navyDeep)}
    ${label(80, 3560, 'Área do membro', '#BDC7D4')}
    ${multiline(80, 3620, ['Sua participação,', 'sempre sob controle.'], 48, 720, C.white, 54)}
    ${bodyText(80, 3750, ['Assinatura, cartão, status e acesso ao ranking', 'sem misturar a vida financeira com a quadra.'], 17, '#BDC7D4', 28)}
    ${pill(80, 3860, 170, 48, C.clay, 'Ver área do membro')}
    ${rect(530, 3550, 360, 710, C.mineral, 28, 'stroke="rgba(255,255,255,.25)"')}
    ${rect(548, 3570, 324, 674, C.white, 20)}
    ${inlineLogo(574, 3594, 38, 34)}
    ${text(628, 3620, 'Boa tarde, Gabriel', 13, 650, C.ink)}
    ${rect(574, 3664, 272, 122, C.navy, 14)}
    ${label(596, 3694, 'Assinatura', '#C4CDD8')}
    ${text(596, 3736, 'Plano APT', 22, 750, C.white)}
    ${pill(732, 3692, 90, 30, C.olive, 'ATIVA')}
    ${text(596, 3764, 'Próxima cobrança · 12 SET', 11, 500, '#C4CDD8')}
    ${rect(574, 3810, 272, 116, C.mineral2, 14)}
    ${label(596, 3840, 'Próximo sorteio')}${text(596, 3880, '18 AGO', 24, 750, C.ink)}${text(822, 3880, 'Rodada 08', 12, 650, C.muted, 'end')}
    ${rect(574, 3950, 272, 112, C.mineral2, 14)}
    ${label(596, 3980, 'Seu ranking')}${text(596, 4022, '#12', 26, 750, C.ink)}${pill(706, 3988, 116, 36, C.clay, 'Abrir Twinner')}
    ${text(574, 4104, 'Pagamento', 14, 700, C.ink)}
    ${line(574, 4120, 846, 4120, '#DBDEE3')}
    ${text(574, 4156, '•••• 4242', 13, 650, C.ink)}${text(846, 4156, 'Alterar', 12, 700, C.clay, 'end')}

    ${rect(936, 3550, 344, 286, C.navy, 16, 'stroke="rgba(255,255,255,.18)"')}
    ${label(966, 3590, 'Status da comunidade', '#BDC7D4')}
    ${text(966, 3640, '48 jogadores ativos', 24, 750, C.white)}
    ${text(966, 3680, '5 novos convites aguardando cadastro', 14, 500, '#BDC7D4')}
    ${line(966, 3710, 1250, 3710, 'rgba(255,255,255,.15)')}
    ${circle(984, 3750, 7, C.olive)}${text(1004, 3756, 'Assinaturas sincronizadas', 13, 600, C.white)}
    ${rect(936, 3868, 344, 356, C.white, 16)}
    ${label(966, 3908, 'Próximas ações')}
    ${text(966, 3950, 'Seu cartão vence em 09/28', 15, 650, C.ink)}
    ${text(966, 3980, 'Nenhuma ação necessária agora.', 13, 450, C.muted)}
    ${line(966, 4010, 1250, 4010, '#E0E3E7')}
    ${text(966, 4050, 'Sair do ranking', 15, 650, C.ink)}
    ${text(966, 4080, 'Solicite o cancelamento quando quiser.', 13, 450, C.muted)}
    ${pill(966, 4140, 170, 44, C.navy, 'Gerir participação')}
  </g>

  <g id="Final CTA">
    ${rect(0, 4400, 1440, 470, C.clay)}
    ${inlineLogo(80, 4450, 64, 56)}
    ${multiline(80, 4560, ['Seu lugar no ranking', 'começa antes da quadra.'], 48, 720, C.white, 54)}
    ${bodyText(80, 4690, ['Conte sobre você. A próxima conversa começa aqui.'], 17, '#F7E6E0', 27)}
    ${pill(1090, 4590, 254, 56, C.navyDeep, 'Solicitar entrada')}
    ${line(80, 4808, 1360, 4808, 'rgba(255,255,255,.35)')}
    ${text(80, 4840, 'APT TENNIS CLUB · BRASÍLIA', 11, 700, '#F7E6E0', 'start', 'letter-spacing="1.1"')}
    ${text(1360, 4840, 'BEYOND THE COURT', 11, 700, '#F7E6E0', 'end', 'letter-spacing="1.1"')}
  </g>
  </svg>`;
}

function componentBoardSvg() {
  const W = 1440, H = 1030;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs()}
    ${rect(0, 0, W, H, '#E8EAED')}
    ${rect(48, 48, 1344, 934, C.mineral, 16, 'stroke="#D2D6DC"')}
    ${label(88, 104, 'APT UI V02')}
    ${text(88, 148, 'Foundation & product components', 28, 720, C.ink)}
    ${bodyText(88, 184, ['Mineral e navy estruturam. Clay ativa. Olive confirma.'], 14, C.muted, 22)}

    ${label(88, 246, 'Core palette')}
    ${rect(88, 272, 176, 96, C.mineral, 12, 'stroke="#CDD2D8"')}${text(104, 342, 'MINERAL', 11, 700, C.ink)}
    ${rect(280, 272, 176, 96, C.navy, 12)}${text(296, 342, 'DEEP NAVY', 11, 700, C.white)}
    ${rect(472, 272, 176, 96, C.clay, 12)}${text(488, 342, 'CLAY', 11, 700, C.white)}
    ${rect(664, 272, 176, 96, C.olive, 12)}${text(680, 342, 'OLIVE', 11, 700, C.white)}
    ${rect(856, 272, 176, 96, C.mineral2, 12, 'stroke="#CDD2D8"')}${text(872, 342, 'MUTED', 11, 700, C.ink)}

    ${label(88, 430, 'Floating navigation')}
    ${rect(88, 456, 1264, 112, C.navyDeep, 16)}
    ${glass(112, 478, 1216, 68, 34, .12)}
    ${inlineLogo(136, 492, 42, 36)}
    ${text(198, 519, 'APT TENNIS CLUB', 13, 700, C.white, 'start', 'letter-spacing="1"')}
    ${text(702, 519, 'Clube     Experiência     Entrada     Área do membro', 13, 600, '#E7EBF0', 'middle')}
    ${pill(1144, 489, 160, 46, C.clay, 'Solicitar entrada')}

    ${label(88, 628, 'Glass & status')}
    ${rect(88, 654, 398, 240, C.navyDeep, 16)}
    ${glass(108, 674, 358, 200, 16, .14)}
    ${label(132, 706, 'Ranking APT', '#D5DCE6')}
    ${text(132, 750, 'Rodada 08', 24, 750, C.white)}${pill(336, 716, 104, 32, C.olive, 'ATIVO')}
    ${line(132, 778, 442, 778, 'rgba(255,255,255,.20)')}
    ${text(132, 820, '48 jogadores', 16, 650, C.white)}${text(442, 820, '18 AGO', 16, 750, C.white, 'end')}
    ${text(132, 846, 'Próximo sorteio', 11, 500, '#C1CAD6')}

    ${rect(518, 654, 382, 240, C.white, 16, 'stroke="#D5D8DD"')}
    ${label(546, 694, 'Buttons & states')}
    ${pill(546, 724, 158, 46, C.clay, 'Ação primária')}
    ${pill(718, 724, 150, 46, C.navy, 'Secundária')}
    ${pill(546, 790, 112, 34, '#E7ECDF', 'ATIVA', C.olive)}
    ${pill(670, 790, 126, 34, '#F4E2DC', 'PENDENTE', C.clayDark)}
    ${pill(546, 842, 164, 34, C.mineral2, 'DESABILITADA', '#8A929E')}

    ${rect(932, 654, 420, 240, C.navy, 16)}
    ${label(960, 694, 'Mobile bottom bar', '#D5DCE6')}
    ${glass(956, 746, 372, 84, 42, .14)}
    ${circle(1004, 776, 5, C.clay)}${text(1004, 812, 'Início', 11, 650, C.white, 'middle')}
    ${circle(1092, 776, 5, '#C7CFDA')}${text(1092, 812, 'Ranking', 11, 650, '#D9E0E8', 'middle')}
    ${circle(1192, 776, 5, '#C7CFDA')}${text(1192, 812, 'Assinatura', 11, 650, '#D9E0E8', 'middle')}
    ${circle(1284, 776, 5, '#C7CFDA')}${text(1284, 812, 'Perfil', 11, 650, '#D9E0E8', 'middle')}

    ${text(88, 946, '8pt grid · 44px minimum target · 16px card radius · pill buttons only', 12, 650, C.muted)}
  </svg>`;
}

function mobileSvg() {
  const W = 390, H = 4610;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs()}
    ${rect(0, 0, W, H, C.mineral)}
    <g id="Mobile hero">
      <image href="${heroImg}" x="0" y="0" width="390" height="880" preserveAspectRatio="xMidYMid slice" clip-path="url(#mobileHero)"/>
      ${rect(0, 0, 390, 880, 'url(#heroShade)')}
      ${glass(16, 20, 358, 60, 30, .13)}
      ${inlineLogo(32, 32, 36, 32)}
      ${text(80, 56, 'APT TENNIS CLUB', 12, 700, C.white, 'start', 'letter-spacing=".8"')}
      ${circle(340, 50, 18, 'rgba(255,255,255,.12)', 'stroke="rgba(255,255,255,.30)"')}
      ${line(332, 45, 348, 45, C.white, 1.5)}${line(332, 51, 348, 51, C.white, 1.5)}${line(332, 57, 348, 57, C.white, 1.5)}

      ${label(24, 174, 'Ranking privado · Brasília', '#D5DDE7')}
      ${multiline(24, 228, ['O tênis continua', 'depois do último', 'ponto.'], 43, 750, C.white, 46, 'letter-spacing="-.8"')}
      ${bodyText(24, 382, ['Uma comunidade selecionada para', 'jogar sério e viver além da quadra.'], 15, '#DFE5ED', 24)}
      ${pill(24, 458, 342, 52, C.clay, 'Solicitar entrada')}
      ${pill(24, 522, 342, 50, 'rgba(255,255,255,.12)', 'Entender o APT', C.white, 'rgba(255,255,255,.34)')}
      ${glass(24, 610, 342, 190, 16, .14)}
      ${label(48, 644, 'Ranking APT', '#D8E0E9')}
      ${text(48, 684, 'Rodada 08', 24, 750, C.white)}${pill(252, 650, 90, 30, C.olive, 'ATIVO')}
      ${line(48, 710, 342, 710, 'rgba(255,255,255,.2)')}
      ${text(48, 750, '48 jogadores', 14, 650, C.white)}${text(342, 750, '18 AGO', 15, 750, C.white, 'end')}
      ${text(48, 776, 'Próximo sorteio', 11, 500, '#C5CED9')}
      ${glass(16, 808, 358, 64, 32, .14)}
      ${circle(60, 832, 5, C.clay)}${text(60, 856, 'Início', 10, 650, C.white, 'middle')}
      ${circle(148, 832, 5, '#CBD3DC')}${text(148, 856, 'Ranking', 10, 650, '#E0E5EB', 'middle')}
      ${circle(250, 832, 5, '#CBD3DC')}${text(250, 856, 'Assinatura', 10, 650, '#E0E5EB', 'middle')}
      ${circle(334, 832, 5, '#CBD3DC')}${text(334, 856, 'Perfil', 10, 650, '#E0E5EB', 'middle')}
    </g>

    <g id="Mobile product">
      ${rect(0, 880, 390, 1080, C.mineral)}
      ${label(20, 940, 'A experiência digital do APT')}
      ${multiline(20, 984, ['O clube organiza', 'o que acontece fora', 'da quadra.'], 34, 720, C.ink, 38, 'letter-spacing="-.5"')}
      ${bodyText(20, 1122, ['Ranking no Twinner. Assinatura no APT.', 'Cada ferramenta no lugar certo.'], 15, C.muted, 24)}

      ${rect(16, 1202, 358, 454, C.navyDeep, 16)}
      ${label(38, 1236, 'Ranking no Twinner', '#C2CBD6')}
      ${text(38, 1278, 'Classificação geral', 22, 750, C.white)}
      ${pill(222, 1232, 130, 38, C.clay, 'Abrir Twinner')}
      ${rankingRows(38, 1320, 314, true)}

      ${rect(16, 1678, 358, 246, C.white, 16, 'stroke="#D5D9DE"')}
      ${label(38, 1714, 'Assinatura')}
      ${text(38, 1756, 'Tudo em dia', 24, 750, C.ink)}${pill(254, 1720, 92, 32, '#E7ECDF', 'ATIVA', C.olive)}
      ${text(38, 1800, 'Próxima cobrança', 12, 500, C.muted)}${text(346, 1800, '12 SET', 14, 700, C.ink, 'end')}
      ${line(38, 1826, 346, 1826, '#E0E3E7')}
      ${text(38, 1864, '•••• 4242', 14, 650, C.ink)}${text(346, 1864, 'Alterar cartão', 12, 700, C.clay, 'end')}
    </g>

    <g id="Mobile atmosphere">
      ${rect(0, 1960, 390, 560, C.navyDeep)}
      <image href="${motionImg}" x="16" y="1975" width="358" height="500" preserveAspectRatio="xMidYMid slice" clip-path="url(#mobilePhoto)"/>
      ${rect(16, 1975, 358, 500, 'rgba(16,26,42,.26)', 14)}
      ${glass(32, 2258, 326, 194, 16, .14)}
      ${text(52, 2298, '“', 36, 700, C.clay)}
      ${multiline(52, 2338, ['Competição com', 'intensidade. Convívio', 'sem performance.'], 25, 700, C.white, 30)}
      ${text(52, 2430, 'BEYOND THE COURT', 10, 700, '#D5DDE7', 'start', 'letter-spacing="1"')}
    </g>

    <g id="Mobile entry">
      ${rect(0, 2520, 390, 820, C.mineral)}
      ${label(20, 2580, 'Como entrar')}
      ${multiline(20, 2624, ['O primeiro contato', 'pede contexto.'], 34, 720, C.ink, 40)}
      ${bodyText(20, 2718, ['Sem CPF, sem cartão. Primeiro a gente', 'entende quem quer fazer parte.'], 15, C.muted, 24)}
      ${line(42, 2818, 42, 3150, '#C8CDD4', 2)}
      ${circle(42, 2826, 17, C.clay)}${text(42, 2832, '1', 12, 800, C.white, 'middle')}
      ${text(78, 2822, 'Solicitação', 18, 700, C.ink)}${bodyText(78, 2852, ['Você conta sobre seu jogo,', 'sua rotina e o que busca.'], 14, C.muted, 22)}
      ${circle(42, 2950, 17, C.navy)}${text(42, 2956, '2', 12, 800, C.white, 'middle')}
      ${text(78, 2946, 'Análise', 18, 700, C.ink)}${bodyText(78, 2976, ['A gestão avalia o perfil', 'e a disponibilidade.'], 14, C.muted, 22)}
      ${circle(42, 3074, 17, C.navy)}${text(42, 3080, '3', 12, 800, C.white, 'middle')}
      ${text(78, 3070, 'Convite e cadastro', 18, 700, C.ink)}${bodyText(78, 3100, ['Aprovado, você recebe', 'um link privado.'], 14, C.muted, 22)}
      ${pill(20, 3232, 350, 52, C.clay, 'Começar solicitação')}
    </g>

    <g id="Mobile member">
      ${rect(0, 3340, 390, 920, C.navyDeep)}
      ${label(20, 3400, 'Área do membro', '#BCC6D2')}
      ${multiline(20, 3444, ['Sua participação,', 'sob controle.'], 34, 720, C.white, 40)}
      ${bodyText(20, 3538, ['Assinatura, cartão e acesso ao ranking', 'sem misturar finanças com a quadra.'], 15, '#BCC6D2', 24)}
      ${rect(16, 3628, 358, 558, C.white, 20)}
      ${text(40, 3672, 'Boa tarde, Gabriel', 14, 650, C.ink)}
      ${rect(40, 3700, 310, 128, C.navy, 14)}
      ${label(62, 3732, 'Assinatura', '#CAD2DC')}${text(62, 3774, 'Plano APT', 22, 750, C.white)}${pill(246, 3732, 82, 30, C.olive, 'ATIVA')}
      ${text(62, 3804, 'Próxima cobrança · 12 SET', 11, 500, '#CAD2DC')}
      ${rect(40, 3850, 310, 116, C.mineral2, 14)}
      ${label(62, 3880, 'Próximo sorteio')}${text(62, 3922, '18 AGO', 24, 750, C.ink)}${text(328, 3922, 'Rodada 08', 12, 650, C.muted, 'end')}
      ${rect(40, 3988, 310, 108, C.mineral2, 14)}
      ${label(62, 4018, 'Seu ranking')}${text(62, 4060, '#12', 25, 750, C.ink)}${pill(214, 4018, 114, 36, C.clay, 'Abrir Twinner')}
      ${text(40, 4132, '•••• 4242', 13, 650, C.ink)}${text(350, 4132, 'Alterar cartão', 12, 700, C.clay, 'end')}
    </g>

    <g id="Mobile CTA">
      ${rect(0, 4260, 390, 350, C.clay)}
      ${inlineLogo(20, 4290, 50, 44)}
      ${multiline(20, 4370, ['Seu lugar no ranking', 'começa antes da quadra.'], 32, 720, C.white, 38)}
      ${bodyText(20, 4470, ['A próxima conversa começa aqui.'], 15, '#F8E7E1', 24)}
      ${pill(20, 4524, 350, 54, C.navyDeep, 'Solicitar entrada')}
    </g>
  </svg>`;
}

function sliceSvg(fullSvg, marker, nextMarker, width, y, height) {
  const start = fullSvg.indexOf(marker);
  const end = nextMarker ? fullSvg.indexOf(nextMarker, start + marker.length) : fullSvg.lastIndexOf('</svg>');
  if (start < 0 || end < 0) throw new Error(`Unable to slice ${marker}`);
  const content = fullSvg.slice(start, end);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 ${y} ${width} ${height}">
    ${defs()}
    ${content}
  </svg>`;
}

await mkdir(outDir, { recursive: true });
const desktopFull = desktopSvg();
const mobileFull = mobileSvg();
await writeFile(path.join(outDir, 'apt-v2-components.svg'), componentBoardSvg());
await writeFile(path.join(outDir, 'apt-v2-desktop.svg'), desktopFull);
await writeFile(path.join(outDir, 'apt-v2-mobile.svg'), mobileFull);

const desktopSlices = [
  ['01-hero', '<g id="Hero">', '<g id="Product experience">', 0, 900],
  ['02-product', '<g id="Product experience">', '<g id="Atmosphere">', 900, 1150],
  ['03-atmosphere', '<g id="Atmosphere">', '<g id="Entry flow">', 2050, 800],
  ['04-entry', '<g id="Entry flow">', '<g id="Member preview">', 2850, 620],
  ['05-member', '<g id="Member preview">', '<g id="Final CTA">', 3470, 930],
  ['06-cta', '<g id="Final CTA">', null, 4400, 470],
];

const mobileSlices = [
  ['01-hero', '<g id="Mobile hero">', '<g id="Mobile product">', 0, 880],
  ['02-product', '<g id="Mobile product">', '<g id="Mobile atmosphere">', 880, 1080],
  ['03-atmosphere', '<g id="Mobile atmosphere">', '<g id="Mobile entry">', 1960, 560],
  ['04-entry', '<g id="Mobile entry">', '<g id="Mobile member">', 2520, 820],
  ['05-member', '<g id="Mobile member">', '<g id="Mobile CTA">', 3340, 920],
  ['06-cta', '<g id="Mobile CTA">', null, 4260, 350],
];

for (const [name, marker, nextMarker, y, height] of desktopSlices) {
  await writeFile(path.join(outDir, `apt-v2-desktop-${name}.svg`), sliceSvg(desktopFull, marker, nextMarker, 1440, y, height));
}

for (const [name, marker, nextMarker, y, height] of mobileSlices) {
  await writeFile(path.join(outDir, `apt-v2-mobile-${name}.svg`), sliceSvg(mobileFull, marker, nextMarker, 390, y, height));
}
console.log(outDir);
