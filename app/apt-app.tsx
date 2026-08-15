"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, CreditCard, Home, LogOut, Trophy, UserRound, UsersRound } from "lucide-react";
import { ProductSidebar } from "@/components/ui/sidebar";
import { AthleteImportInput, parseAthleteCsv } from "../lib/member-import";

type QuestionType = "text" | "email" | "tel" | "number" | "choice" | "multi" | "textarea";
type AnswerValue = string | string[];

type Question = {
  id: string;
  title: string;
  helper?: string;
  type: QuestionType;
  options?: string[];
  optional?: boolean;
  condition?: (answers: Record<string, AnswerValue>) => boolean;
};

type ApplicationRecord = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  city: string | null;
  classLevel: string | null;
  referrer: string | null;
  status: "new" | "in_review" | "awaiting_info" | "approved" | "rejected" | "invite_sent" | "registered";
  inviteToken?: string | null;
  createdAt: string;
};

type AdminNote = { id: string; body: string; created_by: string; created_at: string };
type ApplicationDetail = ApplicationRecord & {
  profession?: string | null;
  answers: Record<string, AnswerValue>;
  emailStatus?: string;
  notes: AdminNote[];
};

const applicationStatusLabels: Record<ApplicationRecord["status"], string> = {
  new: "Novo",
  in_review: "Em análise",
  awaiting_info: "Aguardando retorno",
  approved: "Aprovado",
  invite_sent: "Convite enviado",
  registered: "Cadastrado",
  rejected: "Não aprovado",
};

const memberStatusLabels: Record<string, string> = {
  active: "Ativo",
  awaiting_payment: "Aguardando pagamento",
  pending_payment: "Pagamento pendente",
  delinquent: "Inadimplente",
  courtesy: "Cortesia",
  cancellation_requested: "Cancelamento solicitado",
  cancelled: "Cancelado",
  inactive: "Inativo",
};

const subscriptionStatusLabels: Record<string, string> = {
  active: "Ativa",
  pending: "Pendente",
  pending_configuration: "Em configuração",
  awaiting_payment: "Aguardando confirmação",
  past_due: "Em atraso",
  overdue: "Em atraso",
  cancelled: "Cancelada",
  inactive: "Inativa",
  courtesy: "Cortesia",
  none: "Não iniciada",
};

function readableStatus(status: string, labels: Record<string, string>) {
  return labels[status] || status.replaceAll("_", " ");
}

function paymentStatusLabel(status: string) {
  if (status.includes("RECEIVED") || status.includes("CONFIRMED")) return "Pago";
  if (status.includes("OVERDUE")) return "Vencido";
  if (status.includes("REFUND")) return "Estornado";
  if (status.includes("CANCEL") || status.includes("DELETE")) return "Cancelado";
  return status.includes("PENDING") ? "Pendente" : readableStatus(status, {});
}

function shortDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "A definir";
}

const questions: Question[] = [
  { id: "nome", title: "Como você gosta de ser chamado?", helper: "Comece pelo seu nome completo.", type: "text" },
  { id: "email", title: "Qual é o seu melhor e-mail?", helper: "É por aqui que você recebe as próximas etapas.", type: "email" },
  { id: "whatsapp", title: "E o seu WhatsApp?", helper: "Inclua o DDD. Usaremos apenas quando necessário.", type: "tel" },
  { id: "idade", title: "Qual é a sua idade?", helper: "O APT recebe integrantes entre 25 e 45 anos.", type: "number" },
  { id: "cidade", title: "Onde você mora?", helper: "Cidade e bairro ajudam a criar conexões locais.", type: "text" },
  { id: "profissao", title: "O que você faz da vida?", helper: "Profissão ou área de atuação.", type: "text" },
  { id: "onde_joga", title: "Onde você costuma jogar tênis hoje?", helper: "Esta resposta é opcional.", type: "text", optional: true },
  { id: "socio", title: "Você é sócio de algum clube ou espaço esportivo?", type: "choice", options: ["Sim", "Não"] },
  { id: "clube", title: "Qual clube você frequenta?", type: "text", condition: (answers) => answers.socio === "Sim" },
  { id: "classe", title: "Com qual classe você mais se identifica hoje?", helper: "Não precisa ser exato. Queremos uma percepção honesta.", type: "choice", options: ["5ª classe — construindo base técnica", "4ª classe — regularidade e leitura de jogo", "3ª classe — controle, ritmo e competitividade", "2ª classe — ritmo alto e consistência", "1ª classe — técnica refinada e estratégia"] },
  { id: "tempo", title: "Há quanto tempo você joga tênis?", type: "choice", options: ["Menos de 1 ano", "Entre 1 e 3 anos", "Mais de 3 anos", "Voltei recentemente"] },
  { id: "nivel", title: "Como você descreveria seu momento no jogo?", type: "choice", options: ["Recreativo com frequência", "Competitivo casual", "Treino regular com foco em evolução", "Alto rendimento ou torneios"] },
  { id: "atracao", title: "O que mais chamou sua atenção no APT?", helper: "Escolha até três pontos.", type: "multi", options: ["A curadoria dos membros", "O estilo de vida ao redor do jogo", "O nível técnico e o formato", "As conexões e o networking", "A sensação de pertencer", "A estética e a experiência"] },
  { id: "tenis", title: "Como o tênis entra na sua vida?", type: "choice", options: ["Um esporte", "Um ritual", "Um meio de conexão", "Equilíbrio entre mente e corpo", "Um espaço de performance"] },
  { id: "comunidade", title: "O que não pode faltar em uma comunidade para você permanecer nela?", type: "textarea" },
  { id: "indicacao", title: "Quem indicou você para o APT?", helper: "Informe o nome completo de quem já faz parte da comunidade.", type: "text" },
  { id: "agora", title: "Por que faz sentido estar no APT agora?", type: "textarea" },
  { id: "consent", title: "Podemos usar suas respostas para analisar seu requerimento e entrar em contato?", helper: "Se aprovado, o cadastro financeiro acontece em outro link, separado desta etapa.", type: "choice", options: ["Sim, autorizo o uso para análise e contato"] },
];

type MemberRecord = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  classLevel?: string | null;
  participationStatus: string;
  subscriptionStatus: string;
  amountCents: number;
  nextDueDate?: string | null;
  overdueDays: number;
  cancelAtPeriodEnd?: boolean;
  joinedAt?: string | null;
  createdAt?: string;
  twinnerUrl?: string | null;
  whatsappCommunityUrl?: string | null;
  payments?: Array<{ id: string; status: string; value_cents: number; due_date?: string | null; paid_at?: string | null; invoice_url?: string | null; created_at: string }>;
  notes?: AdminNote[];
};

type PortalPayload = {
  member: {
    name: string; email: string; whatsapp: string; cpfMasked: string; classLevel?: string | null;
    participationStatus: string; accessActive: boolean; twinnerUrl?: string | null; whatsappCommunityUrl?: string | null; joinedAt?: string | null;
  };
  subscription: { status?: string; amount_cents?: number; next_due_date?: string; current_period_end?: string; cancel_at_period_end?: boolean; asaas_checkout_url?: string } | null;
  payments: Array<{ id: string; status: string; value_cents: number; due_date?: string; paid_at?: string; invoice_url?: string; created_at?: string }>;
};

type MemberImportSummary = {
  activeRows: number;
  newMembers: number;
  pendingExisting: number;
  alreadyRegistered: number;
  rejected: number;
};

type MemberInvitation = { id: string; name: string; email: string; whatsapp: string; url: string };

function paymentReminderUrl(member: Pick<MemberRecord, "name" | "whatsapp">) {
  const phone = member.whatsapp.replace(/\D/g, "");
  const whatsapp = phone.startsWith("55") ? phone : `55${phone}`;
  if (whatsapp.length < 12 || whatsapp.length > 13) return null;
  const firstName = member.name.trim().split(/\s+/)[0] || "tudo bem";
  const message = `Olá, ${firstName}! Tudo bem?\n\nPassando para lembrar da mensalidade do APT Tennis Club. Se você já realizou o pagamento, pode desconsiderar esta mensagem. Se precisar de ajuda ou do link para pagamento, me avise por aqui.\n\nObrigado!\nEquipe APT`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}

export function Brand({ inverse = false, large = false }: { inverse?: boolean; large?: boolean }) {
  const source = large
    ? inverse ? "/logo-apt1.svg" : "/logo-apt1-navy.svg"
    : inverse ? "/logo-apt2.svg" : "/logo-apt2-navy.svg";
  return <span className={`brand-lockup${inverse ? " brand-lockup--inverse" : ""}${large ? " brand-lockup--large" : ""}`}><img src={source} width={large ? 1109 : 949} height={large ? 1162 : 823} alt="APT Tennis Club — Beyond the Court" /></span>;
}

const heroStatements = [
  "competir.",
  "evoluir.",
  "pertencer.",
];

function HeroRotatingStatement() {
  const [statement, setStatement] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setStatement((current) => (current + 1) % heroStatements.length),
      3600,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="apt-hero__rotator">
      <span className="apt-hero__rotator-line" key={heroStatements[statement]}>
        {heroStatements[statement]}
      </span>
    </span>
  );
}

function RouteHeader({ label }: { label: string }) {
  return <header className="route-header"><a href="/" aria-label="Voltar para o site do APT"><Brand /></a><span>{label}</span><i aria-hidden="true" /></header>;
}

function SignOutButton() {
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { window.location.assign("/"); }
  }
  return <button className="product-sidebar__item product-sidebar__exit" type="button" aria-label="Sair da conta" onClick={signOut} disabled={leaving}><LogOut aria-hidden="true" size={18} strokeWidth={1.8} /><span>{leaving ? "Saindo…" : "Sair"}</span></button>;
}

export function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkNotice, setMagicLinkNotice] = useState("");
  const [nextPath, setNextPath] = useState("/portal");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("next");
    if (requested?.startsWith("/") && !requested.startsWith("//")) queueMicrotask(() => setNextPath(requested));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível entrar.");
      window.location.assign(nextPath);
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar."); }
    finally { setSubmitting(false); }
  }
  async function requestMagicLink(form: HTMLFormElement) {
    const email = new FormData(form).get("email");
    setSendingMagicLink(true); setError(""); setMagicLinkNotice("");
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o link de acesso.");
      setMagicLinkNotice("Se este e-mail for autorizado, enviamos um link seguro para entrar na gestão.");
    } catch (magicLinkError) { setError(magicLinkError instanceof Error ? magicLinkError.message : "Não foi possível enviar o link de acesso."); }
    finally { setSendingMagicLink(false); }
  }
  return <div className="apt-app"><RouteHeader label="Acesso seguro" /><main className="login-page" id="main-content"><section><span>Área reservada</span><h1>Entre para cuidar da sua participação.</h1><p>Use o e-mail e a senha definidos no cadastro aprovado.</p><form onSubmit={submit}><label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" spellCheck={false} /></label><label className="field-label field-label--compact"><span>Senha</span><input required name="password" type="password" minLength={8} autoComplete="current-password" /></label>{error && <p className="field-error" role="alert">{error}</p>}{magicLinkNotice && <p className="recovery-notice" role="status">{magicLinkNotice}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={submitting}>{submitting ? "Entrando…" : "Entrar"}<span aria-hidden="true">→</span></button>{nextPath === "/gestao" && <button className="text-button" type="button" onClick={(event) => requestMagicLink(event.currentTarget.form!)} disabled={sendingMagicLink}>{sendingMagicLink ? "Enviando link…" : "Receber link de acesso da gestão"}</button>}<a className="text-button" href="/recuperar-senha">Esqueci minha senha</a></form></section><aside><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Movimento de um jogador em uma quadra de tênis" /><div /></aside></main></div>;
}

export function MagicLinkAccessPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token") || "";
    if (!accessToken) { queueMicrotask(() => setError("Este link de acesso é inválido ou já expirou.")); return; }
    void (async () => {
      try {
        const response = await fetch("/api/auth/magic-link", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", accessToken }),
        });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível concluir o acesso.");
        window.location.replace("/gestao");
      } catch (accessError) { setError(accessError instanceof Error ? accessError.message : "Não foi possível concluir o acesso."); }
    })();
  }, []);
  return <div className="apt-app"><RouteHeader label="Acesso à gestão" /><main className="access-state" id="main-content"><span>Acesso seguro</span><h1>{error ? "Solicite um novo link." : "Confirmando seu acesso."}</h1><p>{error || "Validando sua conta autorizada para abrir a gestão."}</p>{error && <a className="primary-button" href="/entrar?next=/gestao">Receber novo link</a>}</main></div>;
}

export function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  useEffect(() => { if (reset) queueMicrotask(() => setAccessToken(new URLSearchParams(window.location.hash.slice(1)).get("access_token") || "")); }, [reset]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { action: "reset", password: data.get("password"), accessToken } : { action: "request", email: data.get("email") }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a recuperação.");
      setNotice(reset ? "Senha criada. Você já pode entrar na área reservada." : "Se este e-mail estiver cadastrado, enviamos um link seguro para criar uma nova senha.");
    } catch (recoveryError) { setError(recoveryError instanceof Error ? recoveryError.message : "Não foi possível concluir a recuperação."); }
    finally { setSubmitting(false); }
  }
  if (reset && !accessToken) return <div className="apt-app"><RouteHeader label="Nova senha" /><main className="access-state" id="main-content"><span>Link inválido</span><h1>Solicite um novo link.</h1><p>Por segurança, cada link de recuperação só pode ser usado uma vez.</p><a className="primary-button" href="/recuperar-senha">Recuperar senha</a></main></div>;
  return <div className="apt-app"><RouteHeader label={reset ? "Nova senha" : "Recuperar senha"} /><main className="login-page" id="main-content"><section><span>Área reservada</span><h1>{reset ? "Crie sua nova senha." : "Recupere seu acesso."}</h1><p>{reset ? "Escolha uma senha com pelo menos 8 caracteres." : "Enviaremos um link seguro para o seu e-mail. O APT nunca envia senhas por mensagem."}</p>{notice ? <div className="recovery-notice"><p>{notice}</p>{reset && <a className="primary-button" href="/entrar">Entrar</a>}</div> : <form onSubmit={submit}>{reset ? <label className="field-label field-label--compact"><span>Nova senha</span><input required name="password" type="password" minLength={8} autoComplete="new-password" /></label> : <label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" /></label>}{error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={submitting}>{submitting ? "Enviando…" : reset ? "Criar nova senha" : "Enviar link seguro"}<span aria-hidden="true">→</span></button><a className="text-button" href="/entrar">Voltar para entrar</a></form>}</section><aside><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Movimento de um jogador em uma quadra de tênis" /><div /></aside></main></div>;
}

export function LandingPage() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const type = hash.get("type");
    if (hash.get("access_token") && (type === "recovery" || type === "magiclink")) {
      window.location.replace(`${type === "recovery" ? "/redefinir-senha" : "/acesso-gestao"}${window.location.hash}`);
    }
  }, []);
  return (
    <div className="apt-app apt-landing">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="apt-site-nav">
        <a className="apt-site-nav__brand" href="/" aria-label="APT Tennis Club"><Brand inverse /></a>
        <nav className="apt-site-nav__links" aria-label="Navegação principal">
          <a href="#o-apt">O APT</a>
          <a href="#ranking">Ranking</a>
          <a href="#temporada">Temporada</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div className="apt-site-nav__actions">
          <a className="apt-site-nav__member" href="/entrar">Área do membro</a>
          <a className="apt-pill apt-pill--clay" href="/requerimento">Solicitar entrada <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main id="main-content">
        <section className="apt-hero">
          <img src="/apt-hero-figma.jpg" width="1440" height="810" alt="Jogador sacando em uma quadra de saibro visto de cima" fetchPriority="high" />
          <div className="apt-hero__shade" />
          <div className="apt-hero__content">
            <p className="apt-kicker">APT Tennis Club · Brasília</p>
            <h1>
              <span className="sr-only">Um ranking para quem leva o tênis a sério.</span>
              <span className="apt-hero__headline" aria-hidden="true">
                <span>Um ranking para quem quer</span>
                <HeroRotatingStatement />
              </span>
            </h1>
            <p className="apt-hero__intro">Jogos equilibrados, calendário definido e adversários do seu nível. Entrada por indicação.</p>
            <a className="apt-pill apt-pill--light" href="/requerimento">Quero jogar no APT <span aria-hidden="true">↗</span></a>
          </div>
          <ul className="apt-hero__tags" aria-label="Características do APT">
            <li>Ranking masculino</li><li>Brasília</li><li>Por indicação</li>
          </ul>
          <aside className="apt-hero__season" aria-label="Temporada atual">
            <img src="/apt-editorial-blue.jpeg" width="474" height="593" alt="Movimento de um jogador na quadra azul" />
            <div><span>Temporada 2026</span><strong>APT Ranking</strong><small>Quatro Courts · ciclos trimestrais</small></div>
          </aside>
        </section>

        <section className="apt-manifesto" id="o-apt">
          <p>No APT, o tênis é mais do que marcar uma partida. É uma temporada com <strong>ritmo</strong>, adversários do mesmo nível e <strong>consequência esportiva</strong>.</p>
          <p>O ranking foi criado em Brasília para quem quer jogar com regularidade, competir de verdade e evoluir dentro da quadra.</p>
          <div className="apt-manifesto__mark"><span /><img src="/logo-apt3-navy.svg" width="1241" height="1246" alt="" /><span /></div>
        </section>

        <section className="apt-photo-rail" aria-label="Atmosfera do APT Tennis Club">
          <figure><img src="/apt-editorial-ocean.jpeg" width="480" height="640" alt="Jogador em uma quadra à beira-mar" loading="lazy" /></figure>
          <figure><img src="/apt-editorial-ritual.jpeg" width="736" height="1030" alt="Jogador segura raquete e bola antes do saque" loading="lazy" /></figure>
          <figure><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Pés de um jogador em movimento numa quadra azul" loading="lazy" /></figure>
          <figure><img src="/apt-editorial-clay.jpeg" width="736" height="1211" alt="Jogador atacando uma bola no saibro" loading="lazy" /></figure>
          <figure><img src="/apt-editorial-hero.jpeg" width="736" height="981" alt="Jogador entre pontos diante da arquibancada" loading="lazy" /></figure>
        </section>

        <section className="apt-product" id="ranking">
          <header className="apt-section-heading">
            <h2>O ranking em números.</h2>
            <p>Uma estrutura simples para manter o jogo acontecendo e o nível sempre equilibrado.</p>
          </header>
          <div className="apt-product__grid">
            <article className="apt-product-card apt-product-card--image">
              <img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Jogador se deslocando numa quadra azul" loading="lazy" />
              <div><span>O formato</span><h3>Confrontos equilibrados em todos os ciclos.</h3></div>
            </article>
            <article className="apt-product-card apt-product-card--blue"><strong>2</strong><h3>confrontos</h3><p>liberados para cada jogador a cada quinze dias.</p></article>
            <article className="apt-product-card apt-product-card--clay"><strong>14</strong><h3>dias</h3><p>para realizar cada partida e registrar o resultado.</p></article>
            <article className="apt-product-card apt-product-card--detail">
              <img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador com raquete e bola junto à rede" loading="lazy" />
              <p>Vitórias, sets e games formam a classificação de cada ciclo.</p>
            </article>
          </div>
        </section>

        <section className="apt-courts">
          <header className="apt-section-heading apt-section-heading--center">
            <h2>Quatro Courts. Uma escada competitiva.</h2>
            <p>Cada jogador começa na divisão compatível com o seu nível. O ranking decide o próximo passo.</p>
          </header>
          <div className="apt-courts__grid">
            <article className="apt-court apt-court--central"><span>Topo do ranking</span><h3>Central Court</h3><p>A divisão de maior nível do APT.</p><small>O mais alto patamar competitivo</small></article>
            <article className="apt-court apt-court--one"><span>Primeiro patamar</span><h3>Court 1</h3><p>Competição forte, logo abaixo do Central.</p><small>Suba pelo resultado</small></article>
            <article className="apt-court apt-court--two"><span>Competição crescente</span><h3>Court 2</h3><p>Desenvolvimento com jogos mais exigentes.</p><small>Regularidade muda o ranking</small></article>
            <article className="apt-court apt-court--three"><span>Ponto de entrada</span><h3>Court 3</h3><p>Onde começa a ascensão dentro do APT.</p><small>Todo ciclo abre uma nova chance</small></article>
          </div>
        </section>

        <section className="apt-cycle" id="temporada">
          <figure><img src="/apt-editorial-clay.jpeg" width="736" height="1211" alt="Jogador executa um golpe no saibro" loading="lazy" /></figure>
          <div className="apt-cycle__copy">
            <h2>Uma temporada que se movimenta.</h2>
            <p>O ano é dividido em quatro ciclos. Cada ciclo reorganiza as divisões e mantém o ranking competitivo.</p>
            <ol>
              <li><span>01</span><div><strong>Sorteios quinzenais</strong><p>Dois jogos liberados a cada rodada.</p></div></li>
              <li><span>02</span><div><strong>Pontuação por resultado</strong><p>Vitórias, sets e games valem posição.</p></div></li>
              <li><span>03</span><div><strong>Promoção e rebaixamento</strong><p>Ao fim do trimestre, o ranking define quem sobe e quem desce.</p></div></li>
              <li><span>04</span><div><strong>APT Finals</strong><p>Os melhores de cada Court se encontram no torneio presencial.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="apt-member-block">
          <div className="apt-member-block__visual"><img src="/apt-editorial-hero.jpeg" width="736" height="981" alt="Jogador em quadra diante da arquibancada" loading="lazy" /></div>
          <div className="apt-member-block__quote">
            <span>Para quem já faz parte</span>
            <blockquote>O ranking acontece no Tweener. Sua assinatura e sua participação ficam no APT.</blockquote>
            <a className="apt-text-link" href="/entrar">Entrar na área do membro <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="apt-faq" id="duvidas">
          <header><h2>Tudo o que você precisa saber sobre o APT.</h2><p>Sem enrolação. O essencial antes de solicitar sua entrada.</p></header>
          <div className="apt-faq__layout">
            <figure><img src="/apt-editorial-blue.jpeg" width="474" height="593" alt="Jogador se movimentando em uma quadra azul" loading="lazy" /></figure>
            <div className="apt-faq__items">
              <details open><summary>O que é o APT?</summary><p>Um ranking masculino por convite, criado em Brasília, com jogos quinzenais, quatro divisões e ciclos trimestrais.</p></details>
              <details><summary>Como faço para entrar?</summary><p>O acesso começa por indicação. Você envia um requerimento e a gestão analisa o perfil e a disponibilidade na divisão adequada.</p></details>
              <details><summary>Como são definidos os Courts?</summary><p>A divisão considera o nível de jogo e a disponibilidade de vagas. Depois, os resultados definem promoção e rebaixamento.</p></details>
              <details><summary>Quantos jogos acontecem por rodada?</summary><p>Dois confrontos são liberados a cada 15 dias, com prazo de 14 dias para a realização.</p></details>
              <details><summary>Onde acompanho o ranking e os pagamentos?</summary><p>O ranking fica no Tweener. Assinatura, pagamentos e situação da participação ficam na área do membro do APT.</p></details>
            </div>
          </div>
        </section>

        <section className="apt-entry" id="entrada">
          <div><Brand inverse large /></div>
          <div><h2>Quer jogar no APT?</h2><p>Faça o requerimento. Se houver vaga para o seu nível e o perfil for aprovado, você recebe o link de cadastro.</p><a className="apt-pill apt-pill--light" href="/requerimento">Solicitar entrada <span aria-hidden="true">↗</span></a></div>
        </section>
      </main>
      <footer className="apt-footer"><div><Brand /><p>APT Tennis Club · Brasília · Desde 2025</p></div><nav><a href="#o-apt">O APT</a><a href="#ranking">Ranking</a><a href="/requerimento">Requerimento</a><a href="/entrar">Área do membro</a></nav><span aria-hidden="true">APT</span></footer>
    </div>
  );
}

export function CandidatePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const visibleQuestions = useMemo(() => questions.filter((item) => !item.condition || item.condition(answers)), [answers]);
  const question = visibleQuestions[step];
  const progress = Math.round(((step + 1) / visibleQuestions.length) * 100);

  function setAnswer(value: AnswerValue) { setAnswers((current) => ({ ...current, [question.id]: value })); setError(""); }
  function validate() {
    const value = answers[question.id];
    if (!question.optional && (!value || (Array.isArray(value) && value.length === 0))) { setError("Responda esta pergunta para continuar."); return false; }
    if (question.id === "idade") { const age = Number(value); if (age < 25 || age > 45) { setError("Neste momento, o APT recebe integrantes entre 25 e 45 anos."); return false; } }
    return true;
  }
  async function submitApplication() {
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/requerimentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, consent: answers.consent === "Sim, autorizo o uso para análise e contato" }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o requerimento.");
      setComplete(true);
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Não foi possível enviar o requerimento."); }
    finally { setSubmitting(false); }
  }
  async function next() { if (!validate()) return; if (step === visibleQuestions.length - 1) return submitApplication(); setStep((current) => current + 1); }
  function previous() { setError(""); setStep((current) => Math.max(0, current - 1)); }
  function toggleMulti(option: string) { const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []; if (!current.includes(option) && current.length >= 3) { setError("Você pode escolher até três pontos."); return; } setAnswer(current.includes(option) ? current.filter((item) => item !== option) : [...current, option]); }

  if (complete) return <main className="form-shell form-shell--complete" id="main-content"><aside className="form-visual"><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Jogador em movimento na quadra" /><div className="form-visual__shade" /><a href="/" aria-label="Voltar ao site"><Brand inverse large /></a></aside><section className="form-success"><span className="success-symbol">✓</span><p>Requerimento enviado</p><h1>Agora, a análise é nossa.</h1><p>Suas informações foram registradas. Se o perfil for aprovado, você receberá outro link — exclusivo para cadastro e assinatura.</p><a className="secondary-button" href="/">Voltar ao site</a></section></main>;

  return <main className="form-shell" id="main-content">
    <aside className="form-visual"><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Jogador em movimento na quadra" /><div className="form-visual__shade" /><a href="/" aria-label="Voltar ao site"><Brand inverse large /></a><p>Não é só sobre jogar.<br />É sobre com quem você joga.</p></aside>
    <section className="question-stage">
      <header className="form-topbar"><button type="button" onClick={previous} disabled={step === 0} aria-label="Voltar para a pergunta anterior">←</button><div className="progress-track" role="progressbar" aria-label="Progresso do requerimento" aria-valuemin={1} aria-valuemax={visibleQuestions.length} aria-valuenow={step + 1} aria-valuetext={`Pergunta ${step + 1} de ${visibleQuestions.length}`}><span style={{ transform: `scaleX(${progress / 100})` }} /></div><span>{String(step + 1).padStart(2, "0")} / {String(visibleQuestions.length).padStart(2, "0")}</span></header>
      <div className="question-content" key={question.id}>
        <div className="question-copy"><span>{question.optional ? "Resposta opcional" : "Conte do seu jeito"}</span><h1>{question.title}</h1>{question.helper && <p>{question.helper}</p>}</div>
        <div className="answer-area">
          {(["text", "email", "tel", "number"] as QuestionType[]).includes(question.type) && <label className="field-label"><span>Sua resposta</span><input name={question.id} type={question.type} inputMode={question.type === "tel" ? "tel" : question.type === "number" ? "numeric" : undefined} autoComplete={question.id === "nome" ? "name" : question.type === "email" ? "email" : question.type === "tel" ? "tel" : "off"} spellCheck={question.type !== "email" && question.type !== "tel"} min={question.type === "number" ? 25 : undefined} max={question.type === "number" ? 45 : undefined} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") next(); }} placeholder={question.type === "email" ? "nome@exemplo.com" : question.type === "tel" ? "(61) 99999-9999" : "Digite aqui…"} aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "textarea" && <label className="field-label"><span>Sua resposta</span><textarea name={question.id} rows={4} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} placeholder="Escreva aqui…" aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "choice" && <fieldset className="choice-list"><legend className="sr-only">Escolha uma opção</legend>{question.options?.map((option, index) => <label className={answers[question.id] === option ? "choice choice--selected" : "choice"} key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswer(option)} /><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{option}</span><i aria-hidden="true">{answers[question.id] === option ? "✓" : ""}</i></label>)}</fieldset>}
          {question.type === "multi" && <fieldset className="choice-list choice-list--two"><legend className="sr-only">Escolha até três opções</legend>{question.options?.map((option) => { const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option); return <label className={selected ? "choice choice--selected" : "choice"} key={option}><input type="checkbox" name={question.id} checked={Boolean(selected)} onChange={() => toggleMulti(option)} /><span className="choice-check">{selected ? "✓" : ""}</span><span>{option}</span></label>; })}</fieldset>}
          {error && <p className="field-error" id="question-error" role="alert">{error}</p>}
        </div>
      </div>
      <footer className="form-actions"><span>{question.optional ? "Você pode deixar em branco." : "Enter também continua"}</span><button className="primary-button" type="button" onClick={next} disabled={submitting}>{submitting ? "Enviando…" : step === visibleQuestions.length - 1 ? "Enviar requerimento" : question.optional && !answers[question.id] ? "Pular" : "Continuar"}<span aria-hidden="true">→</span></button></footer>
    </section>
  </main>;
}

function formatCpf(value: string) { return value.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }

export function EnrollmentPage() {
  const [submitted, setSubmitted] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<"sucesso" | "cancelado" | "expirado" | null>(null);
  const [cpf, setCpf] = useState("");
  const inviteToken = useRef("");
  const groupToken = useRef("");
  const [hasInvite, setHasInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recadastro, setRecadastro] = useState(false);
  const [groupRegistration, setGroupRegistration] = useState(false);
  const [qualificationState, setQualificationState] = useState<"form" | "pending" | "registered">("form");
  const [monthlyValue, setMonthlyValue] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qualificationSubmitting, setQualificationSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("status");
    if (status === "sucesso" || status === "cancelado" || status === "expirado") {
      queueMicrotask(() => { setCheckoutStatus(status); setProfileLoading(false); });
      return;
    }
    const token = query.get("convite") || "";
    const communityToken = query.get("grupo") || "";
    inviteToken.current = token;
    groupToken.current = communityToken;
    if (!token && !communityToken) { queueMicrotask(() => setProfileLoading(false)); return; }
    queueMicrotask(() => setHasInvite(true));
    const accessQuery = token ? `convite=${encodeURIComponent(token)}` : `grupo=${encodeURIComponent(communityToken)}`;
    fetch(`/api/cadastros?${accessQuery}`)
      .then(async (response) => {
        const payload = await response.json() as { name?: string; email?: string; phone?: string; recadastro?: boolean; groupRegistration?: boolean; monthlyValue?: number | null; checkoutUrl?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || "Este convite não pôde ser validado.");
        setName(payload.name || ""); setEmail(payload.email || ""); setPhone(payload.phone || "");
        setRecadastro(Boolean(payload.recadastro)); setGroupRegistration(Boolean(payload.groupRegistration)); setMonthlyValue(payload.monthlyValue || null); setPaymentLink(payload.checkoutUrl || "");
      })
      .catch((validationError) => setError(validationError instanceof Error ? validationError.message : "Este convite não pôde ser validado."))
      .finally(() => setProfileLoading(false));
  }, []);
  async function qualifyGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setQualificationSubmitting(true); setError("");
    try {
      const response = await fetch("/api/cadastros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qualify_group", groupToken: groupToken.current, name, email, phone, consent: true }),
      });
      const payload = await response.json() as { inviteUrl?: string; pendingApproval?: boolean; alreadyRegistered?: boolean; error?: string };
      if (!response.ok && response.status !== 202) throw new Error(payload.error || "Não foi possível conferir seu recadastro.");
      if (payload.inviteUrl) { window.location.assign(payload.inviteUrl); return; }
      if (payload.alreadyRegistered) { setQualificationState("registered"); return; }
      if (payload.pendingApproval) { setQualificationState("pending"); return; }
      throw new Error("Não foi possível conferir seu recadastro.");
    } catch (qualificationError) {
      setError(qualificationError instanceof Error ? qualificationError.message : "Não foi possível conferir seu recadastro.");
    } finally {
      setQualificationSubmitting(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(""); const data = new FormData(event.currentTarget);
    try { const response = await fetch("/api/cadastros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteToken: inviteToken.current, name, cpf, email, phone, password: data.get("password"), consent: data.get("consent") === "on" }) }); const payload = await response.json() as { error?: string; checkoutUrl?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível concluir o cadastro."); setPaymentLink(payload.checkoutUrl || ""); setSubmitted(true); }
    catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir o cadastro."); }
    finally { setSubmitting(false); }
  }
  if (checkoutStatus === "sucesso") return <div className="apt-app"><RouteHeader label="Assinatura APT" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Checkout concluído</p><h1>Recebemos sua assinatura.</h1><p>O Asaas está confirmando o pagamento. Assim que a confirmação chegar, sua área de membro será liberada.</p><a className="primary-button" href="/entrar?next=/membros">Entrar na área do membro <span aria-hidden="true">→</span></a></main></div>;
  if (checkoutStatus === "cancelado" || checkoutStatus === "expirado") return <div className="apt-app"><RouteHeader label="Assinatura APT" /><main className="content-page success-page" id="main-content"><p>Checkout não concluído</p><h1>{checkoutStatus === "expirado" ? "O link de pagamento expirou." : "O pagamento foi cancelado."}</h1><p>Peça à gestão um novo link individual para continuar sua assinatura com segurança.</p><a className="secondary-button" href="/">Voltar ao site</a></main></div>;
  if (groupRegistration && qualificationState === "pending") return <div className="apt-app"><RouteHeader label="Recadastro APT" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Dados recebidos</p><h1>Sua aprovação rápida já está na gestão.</h1><p>Assim que o APT confirmar sua entrada, você receberá o acesso para concluir o cadastro e a assinatura.</p><a className="secondary-button" href="/">Voltar ao site</a></main></div>;
  if (groupRegistration && qualificationState === "registered") return <div className="apt-app"><RouteHeader label="Recadastro APT" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Cadastro localizado</p><h1>Você já tem acesso ao APT.</h1><p>Entre com seu e-mail e senha para consultar sua participação e seus pagamentos.</p><a className="primary-button" href="/entrar?next=/membros">Entrar na área do membro <span aria-hidden="true">→</span></a></main></div>;
  if (groupRegistration) return <div className="apt-app"><RouteHeader label="Recadastro APT" /><main className="enrollment-page" id="main-content">
    <aside className="enrollment-intro enrollment-intro--plain"><div><span>Comunidade atual</span><h1>Vamos localizar sua participação.</h1><p>Use seus dados atuais. Quem já está na lista segue direto; novos nomes entram em uma aprovação rápida da gestão.</p></div></aside>
    <section className="enrollment-content"><header><span>Primeiro passo</span><h2>Informe como você está no grupo.</h2><p>CPF, senha e pagamento só serão solicitados depois desta conferência.</p></header>{profileLoading ? <div className="loading-state"><i /><span>Validando o link…</span></div> : <form className="enrollment-form" onSubmit={qualifyGroup}><div className="fields-grid"><label className="field-label field-label--compact"><span>Nome completo</span><input required minLength={2} name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" /></label><label className="field-label field-label--compact"><span>E-mail de acesso</span><input required name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" /></label><label className="field-label field-label--compact"><span>WhatsApp com DDD</span><input required name="phone" type="tel" autoComplete="tel" inputMode="tel" spellCheck={false} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(61) 99999-9999" /></label></div><p className="form-helper">Ao continuar, você autoriza o APT a usar estes dados para localizar sua participação ou encaminhar uma aprovação rápida.</p>{error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={qualificationSubmitting || profileLoading}>{qualificationSubmitting ? "Conferindo…" : "Continuar meu recadastro"}<span aria-hidden="true">→</span></button></form>}</section>
  </main></div>;
  if (paymentLink && !submitted) return <div className="apt-app"><RouteHeader label="Recadastro APT" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Recadastro concluído</p><h1>Sua assinatura está pronta para ativação.</h1><p>Continue no ambiente seguro do Asaas. O APT não recebe nem armazena os dados completos do seu cartão.</p><a className="primary-button" href={paymentLink}>Abrir checkout seguro <span aria-hidden="true">↗</span></a></main></div>;
  if (submitted) return <div className="apt-app"><RouteHeader label="Cadastro do aprovado" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Cadastro recebido</p><h1>{paymentLink ? "Sua assinatura está pronta para ativação." : "Seus dados foram vinculados ao requerimento."}</h1><p>{paymentLink ? "Conclua o pagamento no ambiente seguro do Asaas. O APT não recebe nem armazena os dados completos do seu cartão." : "A cobrança será liberada quando valor e vencimento forem confirmados pela gestão."}</p>{paymentLink ? <a className="primary-button" href={paymentLink}>Abrir checkout seguro <span aria-hidden="true">↗</span></a> : <a className="secondary-button" href="/">Voltar ao site</a>}</main></div>;
  return <div className="apt-app"><RouteHeader label="Cadastro do aprovado" /><main className="enrollment-page" id="main-content">
    <aside className="enrollment-intro"><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador segura uma bola e uma raquete junto à rede" /><div className="enrollment-intro__shade" /><div><span>Link privado</span><h1>{recadastro ? "Atualize seus dados. Ative sua recorrência." : "Você foi aprovado. Agora, vamos ativar sua participação."}</h1><p>O APT guarda somente a proteção criptográfica do CPF e os quatro últimos dígitos. O cartão fica no Asaas.</p></div></aside>
    <section className="enrollment-content">
      <header><span>{recadastro ? "Recadastro e assinatura" : "Cadastro e assinatura"}</span><h2>Confirme os dados da sua participação.</h2><p>Endereço e cartão serão informados somente no ambiente seguro do Asaas.</p></header>
      {!profileLoading && !hasInvite && <div className="access-notice"><strong>Este cadastro precisa de um acesso válido.</strong><span>Abra o link de recadastro enviado no grupo ou seu convite individual.</span></div>}
      {!profileLoading && hasInvite && !monthlyValue && !error && <div className="access-notice"><strong>A mensalidade ainda não foi liberada.</strong><span>A gestão precisa confirmar o valor antes de gerar a recorrência.</span></div>}
      {profileLoading && <div className="loading-state"><i /><span>Validando seu convite…</span></div>}
      <form className="enrollment-form" onSubmit={submit}>
        <div className="fields-grid"><label className="field-label field-label--compact"><span>Nome completo</span><input required name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" /></label><label className="field-label field-label--compact"><span>CPF</span><input required name="cpf" inputMode="numeric" autoComplete="off" spellCheck={false} value={formatCpf(cpf)} onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="000.000.000-00" /></label><label className="field-label field-label--compact"><span>E-mail de acesso</span><input required readOnly={Boolean(email)} name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" /></label><label className="field-label field-label--compact"><span>WhatsApp</span><input required name="phone" type="tel" autoComplete="tel" inputMode="tel" spellCheck={false} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(61) 99999-9999" /></label><label className="field-label field-label--compact"><span>Crie uma senha</span><input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" /></label></div>
        <div className="plan-row"><div><span>Participação mensal APT</span><strong>{monthlyValue ? `${monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês` : "Valor ainda não configurado"}</strong><small>Renovação automática · cartão de crédito</small></div><span className="status-chip status-chip--ok">Checkout seguro</span></div>
        <label className="consent-row"><input required name="consent" type="checkbox" /><span>Autorizo o uso destes dados para administrar minha participação, comunicação e cobrança recorrente no APT.</span></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button primary-button--wide" type="submit" disabled={!hasInvite || !monthlyValue || profileLoading || submitting}>{submitting ? "Preparando assinatura…" : "Continuar para assinatura"}<span aria-hidden="true">→</span></button>
      </form>
    </section>
  </main></div>;
}

export function PortalPage() {
  const [tab, setTab] = useState<"inicio" | "pagamentos" | "perfil">("inicio");
  const [notice, setNotice] = useState("");
  const [exitOpen, setExitOpen] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [data, setData] = useState<PortalPayload | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingRefreshing, setBillingRefreshing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [cardRequesting, setCardRequesting] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  useEffect(() => {
    fetch("/api/portal").then(async (response) => {
      if (response.status === 401) { setAuthRequired(true); return null; }
      const payload = await response.json() as PortalPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar sua participação.");
      return payload;
    }).then(async (payload) => {
      if (!payload) return;
      setData(payload); setProfileName(payload.member.name); setProfileWhatsapp(payload.member.whatsapp);
      if (!payload.member.accessActive && payload.subscription && payload.payments.length === 0) {
        setBillingRefreshing(true);
        const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh_billing" }) });
        const refreshed = await response.json() as { portal?: PortalPayload };
        if (response.ok && refreshed.portal) { setData(refreshed.portal); setProfileName(refreshed.portal.member.name); setProfileWhatsapp(refreshed.portal.member.whatsapp); }
        setBillingRefreshing(false);
      }
    }).catch((error) => setNotice(error instanceof Error ? error.message : "Não foi possível carregar sua participação.")).finally(() => setLoading(false));
  }, []);
  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3600); }
  async function refreshBilling() {
    if (billingRefreshing) return;
    setBillingRefreshing(true);
    try {
      const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh_billing" }) });
      const payload = await response.json() as { portal?: PortalPayload; found?: boolean; error?: string };
      if (!response.ok || !payload.portal) throw new Error(payload.error || "Não foi possível atualizar agora.");
      setData(payload.portal); showNotice(payload.found ? "Situação financeira atualizada com o Asaas." : "O Asaas ainda não confirmou uma cobrança para este cadastro.");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível atualizar agora."); }
    finally { setBillingRefreshing(false); }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_profile", name: profileName, whatsapp: profileWhatsapp }) });
      const payload = await response.json() as { member?: { name: string; whatsapp: string }; error?: string };
      if (!response.ok || !payload.member) throw new Error(payload.error || "Não foi possível salvar seu cadastro.");
      setData((current) => current ? { ...current, member: { ...current.member, ...payload.member } } : current);
      showNotice("Cadastro atualizado.");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível salvar seu cadastro."); }
    finally { setProfileSaving(false); }
  }
  async function requestCardChange() {
    if (cardRequesting) return;
    setCardRequesting(true);
    try {
      const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request_card_change" }) });
      const payload = await response.json() as { requested?: boolean; checkoutUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível iniciar a troca do cartão.");
      if (payload.checkoutUrl) { window.location.assign(payload.checkoutUrl); return; }
      showNotice("Solicitação registrada. A gestão enviará o novo checkout seguro do Asaas.");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível iniciar a troca do cartão."); }
    finally { setCardRequesting(false); }
  }
  async function requestCancellation() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request_cancellation" }) });
      const payload = await response.json() as { error?: string; accessUntil?: string | null };
      if (!response.ok) { showNotice(payload.error || "Não foi possível cancelar a renovação."); return; }
      setData((current) => current ? { ...current, member: { ...current.member, participationStatus: payload.accessUntil ? "cancellation_requested" : "cancelled", accessActive: Boolean(payload.accessUntil) }, subscription: current.subscription ? { ...current.subscription, status: "cancelled", cancel_at_period_end: false } : current.subscription } : current);
      setExitRequested(true); setExitOpen(false);
      showNotice(payload.accessUntil ? `Renovação cancelada. Seu acesso segue até ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${payload.accessUntil}T12:00:00`))}.` : "Renovação cancelada. Não haverá novas cobranças.");
    } catch {
      showNotice("Não foi possível falar com o Asaas agora. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }
  if (loading) return <div className="apt-app"><RouteHeader label="Área do membro" /><main className="access-state"><div className="loading-state"><i /><span>Carregando sua participação…</span></div></main></div>;
  if (authRequired || !data) return <div className="apt-app"><RouteHeader label="Área do membro" /><main className="access-state"><span>Área reservada</span><h1>Entre para ver sua assinatura.</h1><p>Pagamentos, links do clube e dados pessoais ficam protegidos.</p><a className="primary-button" href="/entrar?next=/membros">Entrar na área do membro</a></main></div>;
  const { member, subscription, payments } = data;
  const initials = member.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const courtesy = member.participationStatus === "courtesy";
  const nextDue = courtesy ? "Cortesia" : subscription?.next_due_date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${subscription.next_due_date}T12:00:00`)) : "A definir";
  const active = member.accessActive;
  const amount = ((subscription?.amount_cents || 2290) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lastPaid = payments.find((payment) => payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED"));
  const accessLabel = courtesy ? "Cortesia ativa" : active ? "Mensalidade em dia" : member.participationStatus === "pending_payment" ? "Pagamento pendente" : "Confirmação em andamento";
  const rankingLink = member.twinnerUrl;
  const communityLink = member.whatsappCommunityUrl;
  const openLockedRanking = () => showNotice("O acesso ao Tweener é liberado assim que o Asaas confirma a mensalidade.");
  return <div className="apt-app apt-product-app"><a className="skip-link" href="#main-content">Pular para o conteúdo</a><main className="member-page" id="main-content">
    <ProductSidebar
      ariaLabel="Área do membro"
      brand={<Brand inverse />}
      eyebrow="Área do membro"
      title="Sua participação"
      profile={<div className="member-profile"><span>{initials}</span><div><strong>{member.name}</strong><small>{member.classLevel || "Classe a confirmar"}</small></div></div>}
      items={[
        { id: "inicio", label: "Início", icon: Home, active: tab === "inicio", onSelect: () => setTab("inicio") },
        rankingLink ? { id: "ranking", label: "Ranking no Tweener", icon: Trophy, href: rankingLink, external: true } : { id: "ranking", label: "Ranking no Tweener", icon: Trophy, onSelect: openLockedRanking },
        { id: "pagamentos", label: "Pagamentos", icon: CreditCard, active: tab === "pagamentos", onSelect: () => setTab("pagamentos") },
        { id: "perfil", label: "Meu cadastro", icon: UserRound, active: tab === "perfil", onSelect: () => setTab("perfil") },
      ]}
      status={<div className="rail-status"><i /> <span>{accessLabel}</span></div>}
      footer={<SignOutButton />}
    />
    <section className="member-content">
      {notice && <div className="toast" role="status">{notice}</div>}
      {tab === "inicio" && <><header className="member-welcome"><div><p>Olá, {member.name.split(" ")[0]}.</p><h1>Seu APT em um só lugar.</h1></div><span className={`status-chip ${active ? "status-chip--ok" : "status-chip--pending"}`}>{accessLabel}</span></header><section className="membership-hero"><div><span>Mensalidade</span><strong>{amount}</strong><small>{courtesy ? "Acesso liberado pela gestão" : `Próxima data: ${nextDue}`}</small></div><div><span>Último pagamento</span><strong>{lastPaid?.paid_at ? shortDate(lastPaid.paid_at.slice(0, 10)) : "Ainda não confirmado"}</strong><small>{billingRefreshing ? "Consultando o Asaas…" : readableStatus(subscription?.status || "pending", subscriptionStatusLabels)}</small></div>{!courtesy && <button className="secondary-button" onClick={refreshBilling} disabled={billingRefreshing}>{billingRefreshing ? "Atualizando…" : "Atualizar situação"}</button>}</section><section className="portal-shortcuts" aria-label="Acessos rápidos"><article><div><span className="shortcut-mark">T</span><div><strong>Ranking no Tweener</strong><small>{active ? "Ranking, jogos e evolução" : "Liberado após confirmação"}</small></div></div>{rankingLink ? <a href={rankingLink} target="_blank" rel="noreferrer">Abrir Tweener <span aria-hidden="true">↗</span></a> : <button type="button" onClick={openLockedRanking}>Ver situação</button>}</article><article><div><span className="shortcut-mark shortcut-mark--whatsapp">W</span><div><strong>Comunidade APT</strong><small>{active ? "Avisos e conversas do clube" : "Liberada com a participação"}</small></div></div>{communityLink ? <a href={communityLink} target="_blank" rel="noreferrer">Abrir WhatsApp <span aria-hidden="true">↗</span></a> : <button type="button" onClick={openLockedRanking}>Ver situação</button>}</article></section><section className="member-list"><header><h2>Últimos movimentos</h2><span>{payments.length} registros</span></header>{payments.slice(0, 3).map((payment) => <div className="movement-row" key={payment.id}><i className={payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "movement-dot movement-dot--ok" : "movement-dot"} /><div><strong>Mensalidade APT</strong><span>{payment.due_date ? `Vencimento em ${shortDate(payment.due_date)}` : "Cobrança registrada"}</span></div><strong>{paymentStatusLabel(payment.status)}</strong></div>)}{payments.length === 0 && <div className="empty-state"><strong>Aguardando o primeiro retorno do Asaas.</strong><span>Use “Atualizar situação” se você acabou de concluir o checkout.</span></div>}</section></>}
      {tab === "pagamentos" && <><header className="member-welcome"><div><p>Pagamentos</p><h1>Mensalidade sem surpresa.</h1></div><span className={`status-chip ${active ? "status-chip--ok" : "status-chip--pending"}`}>{accessLabel}</span></header><section className="payment-overview"><div><span>Valor mensal</span><strong>{amount}</strong></div><div><span>Próxima data</span><strong>{nextDue}</strong></div><div><span>Renovação</span><strong>{subscription?.cancel_at_period_end ? "Cancelada" : "Automática"}</strong></div></section><section className="payment-method"><div><span className="card-glyph">••••</span><div><strong>Cartão protegido pelo Asaas</strong><span>APT não recebe número, validade ou CVV.</span></div></div><div className="payment-method__action"><p>{subscription?.asaas_checkout_url && !subscription?.status?.includes("active") ? "Conclua o checkout hospedado para ativar sua recorrência." : "Precisa usar outro cartão? A solicitação entra direto na ficha da gestão."}</p><button className="secondary-button" type="button" onClick={requestCardChange} disabled={cardRequesting}>{cardRequesting ? "Registrando…" : subscription?.asaas_checkout_url && !subscription?.status?.includes("active") ? "Concluir no Asaas" : "Solicitar troca de cartão"}</button></div></section><section className="member-list"><header><h2>Histórico</h2><span>{payments.length} cobranças</span></header>{payments.map((payment) => <div className="movement-row" key={payment.id}><i className={payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "movement-dot movement-dot--ok" : "movement-dot"} /><div><strong>{(payment.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><span>{payment.due_date ? shortDate(payment.due_date) : "Sem vencimento informado"}</span></div>{payment.invoice_url ? <a href={payment.invoice_url} target="_blank" rel="noreferrer">{paymentStatusLabel(payment.status)} ↗</a> : <strong>{paymentStatusLabel(payment.status)}</strong>}</div>)}{payments.length === 0 && <div className="empty-state"><strong>Nenhuma cobrança registrada.</strong><span>O histórico será preenchido assim que o Asaas confirmar o primeiro evento.</span></div>}</section></>}
      {tab === "perfil" && <><header className="member-welcome"><div><p>Meu cadastro</p><h1>Seus dados, sob seu controle.</h1></div></header><form className="profile-form" onSubmit={saveProfile}><label className="field-label"><span>Nome completo</span><input name="member-name" value={profileName} minLength={2} maxLength={100} onChange={(event) => setProfileName(event.target.value)} /></label><label className="field-label"><span>WhatsApp com DDD</span><input name="member-whatsapp" type="tel" inputMode="tel" value={profileWhatsapp} minLength={10} maxLength={18} onChange={(event) => setProfileWhatsapp(event.target.value)} /></label><div className="profile-readonly"><div><span>E-mail de acesso</span><strong>{member.email}</strong></div><div><span>Classe</span><strong>{member.classLevel || "A confirmar"}</strong></div><div><span>CPF protegido</span><strong>{member.cpfMasked}</strong></div></div><div className="profile-actions"><button className="primary-button" type="submit" disabled={profileSaving}>{profileSaving ? "Salvando…" : "Salvar alterações"}</button><a className="secondary-button" href="/recuperar-senha">Alterar senha</a><a className="text-button" href="mailto:apttennisexclusive@gmail.com">Falar com o APT</a></div></form><section className="exit-section"><h2>Cancelar renovação</h2><p>Interrompe novas mensalidades. Se houver período já pago, o acesso segue até o final dele.</p>{!exitRequested && <><button className="text-button text-button--danger" onClick={() => setExitOpen((open) => !open)}>{exitOpen ? "Manter renovação" : "Cancelar minha renovação"}</button>{exitOpen && <div className="exit-confirm"><p>Ao confirmar, nenhuma nova mensalidade será criada.</p><button className="danger-button" onClick={requestCancellation} disabled={cancelling}>{cancelling ? "Cancelando no Asaas…" : "Confirmar cancelamento"}</button></div>}</>}{exitRequested && <p className="success-message" role="status">Renovação cancelada. Nenhuma nova cobrança será criada.</p>}</section></>}
    </section>
  </main></div>;
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function MemberImportPanel({ onImported }: { onImported: () => Promise<void> }) {
  const [athletes, setAthletes] = useState<AthleteImportInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<MemberImportSummary | null>(null);
  const [invitations, setInvitations] = useState<MemberInvitation[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function requestImport(rows: AthleteImportInput[], commit: boolean) {
    const response = await fetch("/api/membros/importacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athletes: rows, commit }),
    });
    const payload = await response.json() as {
      summary?: MemberImportSummary;
      invitations?: MemberInvitation[];
      error?: string;
    };
    if (!response.ok || !payload.summary) throw new Error(payload.error || "Não foi possível validar a importação.");
    setSummary(payload.summary);
    if (commit) {
      setInvitations(payload.invitations || []);
      await onImported();
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true); setError(""); setSummary(null); setInvitations([]); setFileName(file.name);
    try {
      const parsed = parseAthleteCsv(await file.text());
      setAthletes(parsed);
      await requestImport(parsed, false);
    } catch (fileError) {
      setAthletes([]);
      setError(fileError instanceof Error ? fileError.message : "Não foi possível ler o CSV.");
    } finally {
      setWorking(false);
    }
  }

  async function commitImport() {
    setWorking(true); setError("");
    try { await requestImport(athletes, true); }
    catch (importError) { setError(importError instanceof Error ? importError.message : "Não foi possível importar os atletas."); }
    finally { setWorking(false); }
  }

  function downloadInvitations() {
    const rows = [
      ["NOME", "EMAIL", "TELEFONE", "LINK_RECADASTRO"],
      ...invitations.map((invitation) => [invitation.name, invitation.email, invitation.whatsapp, invitation.url]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "convites-recadastro-apt.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  return <section className="member-import-panel">
    <div><span>Recadastro da base atual</span><h3>Importar atletas e gerar links individuais</h3><p>O arquivo deve ter NOME, EMAIL, TELEFONE e RANQUEADO. Apenas linhas ATIVO entram. CPF e cartão não são importados.</p></div>
    <label className="secondary-button member-import-file"><input type="file" accept=".csv,text/csv" onChange={selectFile} /><span>{fileName || "Selecionar CSV"}</span></label>
    {working && <div className="loading-state"><i /><span>Validando a base…</span></div>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {summary && <div className="member-import-summary"><div><span>Ativos válidos</span><strong>{summary.activeRows}</strong></div><div><span>Novos</span><strong>{summary.newMembers}</strong></div><div><span>Já pendentes</span><strong>{summary.pendingExisting}</strong></div><div><span>Já cadastrados</span><strong>{summary.alreadyRegistered}</strong></div><div><span>Rejeitados</span><strong>{summary.rejected}</strong></div></div>}
    {summary && !invitations.length && <button className="primary-button" type="button" disabled={working || summary.rejected > 0 || summary.newMembers + summary.pendingExisting === 0} onClick={commitImport}>Importar e gerar {summary.newMembers + summary.pendingExisting} links <span aria-hidden="true">→</span></button>}
    {invitations.length > 0 && <div className="member-import-complete"><strong>{invitations.length} links gerados.</strong><span>Baixe agora: os tokens não ficam armazenados em texto aberto.</span><button className="secondary-button" type="button" onClick={downloadInvitations}>Baixar links de recadastro</button></div>}
  </section>;
}

function answerText(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function ApplicationReviewDetail({
  application,
  loading,
  note,
  onNoteChange,
  onClose,
  onSave,
  onCopyInvite,
  saving,
}: {
  application: ApplicationDetail | null;
  loading: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: (status?: "new" | "in_review" | "awaiting_info" | "approved" | "rejected") => void;
  onCopyInvite: (token: string) => void;
  saving: boolean;
}) {
  const initialStatus = application?.status === "new" || application?.status === "awaiting_info" || application?.status === "rejected" ? application.status : "in_review";
  const [nextStatus, setNextStatus] = useState<"new" | "in_review" | "awaiting_info" | "rejected">(initialStatus);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("drawer-open");
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("drawer-open"); };
  }, [onClose]);
  const whatsappUrl = application ? paymentReminderUrl({ name: application.name, whatsapp: application.whatsapp })?.replace(/\?text=.*/, "") : null;
  const statusLocked = application?.status === "registered";
  return <div className="crm-drawer-shell">
    <button className="crm-drawer-backdrop" type="button" tabIndex={-1} onClick={onClose} aria-label="Fechar ficha do requerimento" />
    <section className="crm-drawer" role="dialog" aria-modal="true" aria-labelledby="application-drawer-title" aria-busy={loading}>
      <header className="crm-drawer__header"><div><span>Ficha do requerimento</span><h3 id="application-drawer-title">{application?.name || "Carregando…"}</h3>{application && <p>{application.email}</p>}</div><button className="crm-drawer__close" type="button" autoFocus onClick={onClose} aria-label="Fechar ficha">×</button></header>
      {loading && <div className="loading-state"><i /><span>Carregando ficha completa…</span></div>}
      {application && !loading && <div className="crm-drawer__body">
        <section className="crm-contact-card">
          <div><span className={`status-chip status-chip--${["approved", "invite_sent", "registered"].includes(application.status) ? "ok" : application.status === "rejected" ? "inactive" : "pending"}`}>{applicationStatusLabels[application.status]}</span><small>Recebido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(application.createdAt))}</small></div>
          <div className="crm-contact-actions"><a href={`mailto:${application.email}`}>E-mail</a>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}</div>
        </section>
        <section className="crm-stage-card" aria-labelledby="crm-stage-title">
          <div><span>{application.answers.origem ? "Aprovação rápida" : "Etapa do CRM"}</span><h4 id="crm-stage-title">{application.answers.origem ? "Veio pelo recadastro da comunidade." : "Mova o lead com uma decisão clara."}</h4>{application.answers.origem && <p>Confira nome, e-mail e WhatsApp. Se reconhecer o integrante, aprove e gere o convite.</p>}</div>
          {statusLocked ? <p>Esta ficha já chegou a <strong>{applicationStatusLabels[application.status]}</strong>. O cadastro e a cobrança seguem no fluxo do membro.</p> : <><label><span>Próxima etapa</span><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}><option value="new">Novo</option><option value="in_review">Em análise</option><option value="awaiting_info">Aguardando retorno</option><option value="rejected">Não aprovado</option></select></label><button className="secondary-button" type="button" onClick={() => onSave(nextStatus)} disabled={saving || nextStatus === application.status || (nextStatus === "awaiting_info" && !note.trim())}>{saving ? "Salvando…" : "Aplicar etapa"}</button><button className="primary-button" type="button" onClick={() => onSave("approved")} disabled={saving}>{saving ? "Processando…" : "Aprovar e gerar convite"}<span aria-hidden="true">→</span></button></>}
          {application.inviteToken && <button className="invite-copy" type="button" onClick={() => onCopyInvite(application.inviteToken!)}>Copiar link individual de cadastro</button>}
        </section>
        <section className="crm-notes" aria-labelledby="crm-notes-title">
          <div><span>Histórico interno</span><h4 id="crm-notes-title">Notas e próximos passos</h4><p>Para mover para “Aguardando retorno”, registre abaixo o que precisa ser solicitado.</p></div>
          <div className="crm-notes__history">{application.notes.length ? application.notes.map((item) => <article key={item.id}><p>{item.body}</p><small>{item.created_by} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</small></article>) : <p className="crm-notes__empty">Nenhuma nota registrada.</p>}</div>
          <label className="field-label field-label--compact"><span>Nova nota</span><textarea name="application-note" rows={4} value={note} maxLength={1200} onChange={(event) => onNoteChange(event.target.value)} placeholder="Registre contexto, decisão ou o próximo contato." /></label>
          <button className="secondary-button" type="button" onClick={() => onSave()} disabled={saving || !note.trim()}>Registrar nota</button>
        </section>
        <details className="crm-answers" open><summary>Respostas do requerimento <span>{Object.keys(application.answers).length}</span></summary><dl className="application-answers">{questions.filter((question) => answerText(application.answers[question.id])).map((question) => <div key={question.id}><dt>{question.title}</dt><dd>{answerText(application.answers[question.id])}</dd></div>)}</dl></details>
      </div>}
    </section>
  </div>;
}

function MemberManagementDetail({ member, loading, saving, refreshing, error, onClose, onSave, onRefresh }: {
  member: MemberRecord | null;
  loading: boolean;
  saving: boolean;
  refreshing: boolean;
  error: string;
  onClose: () => void;
  onSave: (changes: { participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string }) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}) {
  const [participationStatus, setParticipationStatus] = useState("");
  const [twinnerUrl, setTwinnerUrl] = useState(member?.twinnerUrl || "");
  const [whatsappCommunityUrl, setWhatsappCommunityUrl] = useState(member?.whatsappCommunityUrl || "");
  const [note, setNote] = useState("");
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", closeOnEscape); document.body.classList.add("drawer-open");
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("drawer-open"); };
  }, [onClose]);
  const initialTweenerUrl = member?.twinnerUrl || "";
  const initialWhatsappUrl = member?.whatsappCommunityUrl || "";
  const reminderUrl = member ? paymentReminderUrl(member) : null;
  const directWhatsappUrl = reminderUrl?.replace(/\?text=.*/, "");
  const statusClass = member && ["active", "courtesy"].includes(member.participationStatus) ? "ok" : member?.participationStatus === "pending_payment" ? "pending" : "inactive";
  return <div className="crm-drawer-shell">
    <button className="crm-drawer-backdrop" type="button" tabIndex={-1} onClick={onClose} aria-label="Fechar ficha do integrante" />
    <section className="crm-drawer" role="dialog" aria-modal="true" aria-labelledby="member-management-title" aria-busy={loading}>
      <header className="crm-drawer__header"><div><span>Ficha do integrante</span><h3 id="member-management-title">{member?.name || "Carregando…"}</h3>{member && <p>{member.email}</p>}</div><button className="crm-drawer__close" type="button" autoFocus onClick={onClose} aria-label="Fechar ficha">×</button></header>
      {loading && <div className="loading-state"><i /><span>Carregando histórico do integrante…</span></div>}
      {member && !loading && <div className="crm-drawer__body">
        <section className="crm-contact-card"><div><span className={`status-chip status-chip--${statusClass}`}>{readableStatus(member.participationStatus, memberStatusLabels)}</span><small>{member.classLevel || "Classe não informada"}</small></div><div className="crm-contact-actions"><a href={`mailto:${member.email}`}>E-mail</a>{directWhatsappUrl && <a href={directWhatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}{reminderUrl && <a href={reminderUrl} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}</div></section>
        <section className="member-financial-summary"><div><span>Assinatura</span><strong>{readableStatus(member.subscriptionStatus, subscriptionStatusLabels)}</strong></div><div><span>Mensalidade</span><strong>{(member.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div><div><span>Próximo vencimento</span><strong>{shortDate(member.nextDueDate)}</strong></div><div><span>Atraso</span><strong>{member.overdueDays ? `${member.overdueDays} dias` : "Em dia"}</strong></div><button className="secondary-button member-financial-refresh" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Consultando Asaas…" : "Atualizar no Asaas"}</button></section>
        <form className="member-management-form" onSubmit={async (event) => { event.preventDefault(); const saved = await onSave({ participationStatus: participationStatus || undefined, twinnerUrl: twinnerUrl === initialTweenerUrl ? undefined : twinnerUrl, whatsappCommunityUrl: whatsappCommunityUrl === initialWhatsappUrl ? undefined : whatsappCommunityUrl, note: note || undefined }); if (saved) { setParticipationStatus(""); setNote(""); } }}>
          <div><span>Gestão do integrante</span><h4>Participação, acessos e nota interna</h4></div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <label className="field-label field-label--compact"><span>Participação</span><select name="participation-status" value={participationStatus} onChange={(event) => setParticipationStatus(event.target.value)}><option value="">Manter: {readableStatus(member.participationStatus, memberStatusLabels)}</option><option value="pending_payment">Aguardando pagamento</option><option value="courtesy">Cortesia</option><option value="inactive">Inativo</option></select><small>Ativo e inadimplente são atualizados pelo fluxo financeiro.</small></label>
          <label className="field-label field-label--compact"><span>Link individual do Tweener</span><input name="tweener-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={twinnerUrl} onChange={(event) => setTwinnerUrl(event.target.value)} placeholder="https://app.tweener.club/…" /></label>
          <label className="field-label field-label--compact"><span>Convite individual do WhatsApp</span><input name="whatsapp-community-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={whatsappCommunityUrl} onChange={(event) => setWhatsappCommunityUrl(event.target.value)} placeholder="https://chat.whatsapp.com/…" /></label>
          <label className="field-label field-label--compact"><span>Nova nota interna</span><textarea name="member-note" rows={3} maxLength={1200} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Registre contexto ou o próximo acompanhamento." /></label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar ficha"}<span aria-hidden="true">→</span></button>
        </form>
        <section className="crm-notes"><div><span>Histórico interno</span><h4>Notas da gestão</h4></div><div className="crm-notes__history">{member.notes?.length ? member.notes.map((item) => <article key={item.id}><p>{item.body}</p><small>{item.created_by} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</small></article>) : <p className="crm-notes__empty">Nenhuma nota registrada.</p>}</div></section>
        <details className="crm-answers" open><summary>Histórico financeiro <span>{member.payments?.length || 0}</span></summary><div className="member-payment-history">{member.payments?.length ? member.payments.map((payment) => <article key={payment.id}><div><strong>{(payment.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><span>{payment.due_date ? shortDate(payment.due_date) : "Sem vencimento"}</span></div><span className={`status-chip status-chip--${payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "ok" : "pending"}`}>{paymentStatusLabel(payment.status)}</span>{payment.invoice_url && <a href={payment.invoice_url} target="_blank" rel="noreferrer">Abrir cobrança</a>}</article>) : <p className="crm-notes__empty">Nenhuma cobrança registrada.</p>}</div></details>
      </div>}
    </section>
  </div>;
}

function PaymentReminderQueue({ members }: { members: MemberRecord[] }) {
  const contacts = members.filter((member) => ["awaiting_payment", "pending_payment", "delinquent"].includes(member.participationStatus) && paymentReminderUrl(member));
  const [current, setCurrent] = useState(0);
  if (!contacts.length) return null;
  const member = contacts[current] || contacts[0];
  const position = contacts[current] ? current : 0;
  const reminderUrl = paymentReminderUrl(member);
  return <section className="payment-reminder-queue" aria-live="polite"><div><span>Cobrança por WhatsApp</span><h3>Fila de lembretes</h3><p>Abra uma conversa por vez, revise e envie pelo seu WhatsApp. Não há disparo automático.</p></div><div className="payment-reminder-queue__next"><small>{position + 1} de {contacts.length}</small><strong>{member.name}</strong><a className="small-primary" href={reminderUrl || undefined} target="_blank" rel="noreferrer" onClick={() => setCurrent((index) => Math.min(index + 1, contacts.length - 1))}>Abrir lembrete</a></div></section>;
}

function MemberManagementList({ members, onManage }: { members: MemberRecord[]; onManage: (member: MemberRecord) => void }) {
  return <div className="member-management-list">{members.map((member) => <button key={member.id} className="member-management-card" type="button" onClick={() => onManage(member)}><div className="member-cell"><span>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.email} · {member.classLevel || "Sem classe"}</small></div></div><div className="member-management-card__status"><span className={["active", "courtesy"].includes(member.participationStatus) ? "status-chip status-chip--ok" : member.participationStatus === "pending_payment" ? "status-chip status-chip--pending" : "status-chip status-chip--inactive"}>{readableStatus(member.participationStatus, memberStatusLabels)}</span><small>{member.nextDueDate ? `Vence ${shortDate(member.nextDueDate)}` : readableStatus(member.subscriptionStatus, subscriptionStatusLabels)}</small></div><span className="member-management-card__open">Abrir ficha completa <i aria-hidden="true">→</i></span></button>)}</div>;
}

const crmColumns: Array<{ status: ApplicationRecord["status"]; label: string }> = [
  { status: "new", label: "Novos" },
  { status: "in_review", label: "Em análise" },
  { status: "awaiting_info", label: "Aguardando retorno" },
  { status: "approved", label: "Aprovados" },
  { status: "invite_sent", label: "Convites enviados" },
  { status: "registered", label: "Cadastrados" },
  { status: "rejected", label: "Não aprovados" },
];

function CrmKanban({ applications, onOpen }: { applications: ApplicationRecord[]; onOpen: (id: string) => void }) {
  return <section className="crm-kanban" aria-label="Pipeline de requerimentos">{crmColumns.map((column) => {
    const cards = applications.filter((application) => application.status === column.status);
    return <section className="crm-column" key={column.status}><header><strong>{column.label}</strong><span>{cards.length}</span></header><div>{cards.map((application) => <button type="button" className="crm-card" key={application.id} onClick={() => onOpen(application.id)}><span className="crm-card__top"><strong>{application.name}</strong><i aria-hidden="true">→</i></span><small>{application.city || "Cidade não informada"}</small><small>{application.classLevel || "Classe não informada"}</small><span className="crm-card__meta">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(application.createdAt))}</span></button>)}{cards.length === 0 && <p>Sem requerimentos.</p>}</div></section>;
  })}</section>;
}

export function AdminPage() {
  const [tab, setTab] = useState<"resumo" | "membros">("resumo");
  const [query, setQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<"all" | "attention" | "active" | "inactive">("all");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationSaving, setApplicationSaving] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberRefreshing, setMemberRefreshing] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const filteredMembers = members.filter((member) => {
    const matchesQuery = `${member.name} ${member.email} ${member.whatsapp}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = memberFilter === "all" ||
      (memberFilter === "attention" && ["awaiting_payment", "pending_payment", "delinquent"].includes(member.participationStatus)) ||
      (memberFilter === "active" && ["active", "courtesy"].includes(member.participationStatus)) ||
      (memberFilter === "inactive" && ["inactive", "cancelled", "cancellation_requested"].includes(member.participationStatus));
    return matchesQuery && matchesStatus;
  });
  useEffect(() => {
    fetch("/api/auth/session").then(async (sessionResponse) => {
      const sessionPayload = await sessionResponse.json() as { user?: { role?: string } };
      if (!sessionResponse.ok || sessionPayload.user?.role !== "admin") { setAuthRequired(true); return; }
      const [applicationResponse, memberResponse, asaasResponse] = await Promise.all([
        fetch("/api/requerimentos"), fetch("/api/membros"), fetch("/api/asaas/status"),
      ]);
      const [applicationPayload, memberPayload, asaasPayload] = await Promise.all([
        applicationResponse.json() as Promise<{ applications?: ApplicationRecord[]; error?: string }>,
        memberResponse.json() as Promise<{ members?: MemberRecord[] }>,
        asaasResponse.json() as Promise<{ connected?: boolean }>,
      ]);
      if (applicationResponse.ok) setApplications(applicationPayload.applications || []);
      else setNotice(applicationPayload.error || "Não foi possível carregar os requerimentos.");
      setMembers(memberPayload.members || []);
      setAsaasConnected(Boolean(asaasPayload.connected));
    }).catch(() => setNotice("Não foi possível atualizar os dados agora.")).finally(() => { setLoading(false); setAuthChecking(false); });
  }, []);
  async function openApplication(id: string) {
    setApplicationLoading(true); setSelectedApplication(null); setReviewNote("");
    try {
      const response = await fetch(`/api/requerimentos?id=${encodeURIComponent(id)}`);
      const payload = await response.json() as { application?: ApplicationDetail; error?: string };
      if (!response.ok || !payload.application) throw new Error(payload.error);
      setSelectedApplication(payload.application);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível abrir o requerimento."); }
    finally { setApplicationLoading(false); }
  }
  async function updateApplication(id: string, status?: "new" | "in_review" | "awaiting_info" | "approved" | "rejected") {
    setApplicationSaving(true);
    try {
      const response = await fetch("/api/requerimentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, note: reviewNote }) });
      const payload = await response.json() as { application?: ApplicationRecord; note?: AdminNote; error?: string; inviteDelivery?: "sent" | "manual" };
      if (!response.ok || !payload.application) throw new Error(payload.error);
      setApplications((current) => current.map((item) => item.id === id ? payload.application! : item));
      setSelectedApplication((current) => current?.id === id ? { ...current, ...payload.application!, notes: payload.note ? [...current.notes, payload.note] : current.notes } : current);
      setReviewNote("");
      setNotice(status === "approved" ? payload.inviteDelivery === "sent" ? "Convite enviado por e-mail." : "Aprovado. Copie o link individual de cadastro." : status === "awaiting_info" ? "Pedido de informação registrado. O contato ainda precisa ser feito pela gestão." : status ? "Decisão registrada." : "Nota registrada.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível registrar a decisão."); }
    finally { setApplicationSaving(false); }
  }
  async function openMember(member: MemberRecord) {
    setMemberError(""); setSelectedMember(member); setMemberLoading(true);
    try {
      const response = await fetch(`/api/membros?id=${encodeURIComponent(member.id)}`);
      const payload = await response.json() as { member?: MemberRecord; error?: string };
      if (!response.ok || !payload.member) throw new Error(payload.error || "Não foi possível abrir o integrante.");
      setSelectedMember(payload.member);
    } catch (error) { setMemberError(error instanceof Error ? error.message : "Não foi possível abrir o integrante."); }
    finally { setMemberLoading(false); }
  }
  async function updateMember(changes: { participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string }) {
    if (!selectedMember || Object.values(changes).every((value) => value === undefined)) { setMemberError("Faça ao menos uma alteração antes de salvar."); return false; }
    setMemberError("");
    setMemberSaving(true);
    try {
      const response = await fetch("/api/membros", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedMember.id, ...changes }) });
      const payload = await response.json() as { member?: Pick<MemberRecord, "id" | "participationStatus" | "twinnerUrl" | "whatsappCommunityUrl">; note?: AdminNote; error?: string };
      if (!response.ok || !payload.member) throw new Error(payload.error);
      setMembers((current) => current.map((member) => member.id === payload.member!.id ? { ...member, ...payload.member! } : member));
      setSelectedMember((current) => current ? { ...current, ...payload.member!, notes: payload.note ? [...(current.notes || []), payload.note] : current.notes } : current);
      setNotice("Ficha do integrante atualizada.");
      return true;
    } catch (error) { setMemberError(error instanceof Error ? error.message : "Não foi possível atualizar o integrante."); return false; }
    finally { setMemberSaving(false); }
  }
  async function refreshMemberBilling() {
    if (!selectedMember || memberRefreshing) return;
    setMemberRefreshing(true); setMemberError("");
    try {
      const response = await fetch("/api/membros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedMember.id, action: "refresh_billing" }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o Asaas.");
      const current = selectedMember;
      await refreshMembers();
      await openMember(current);
      setNotice("Situação financeira atualizada no Asaas.");
    } catch (error) { setMemberError(error instanceof Error ? error.message : "Não foi possível consultar o Asaas."); }
    finally { setMemberRefreshing(false); }
  }
  async function copyInvite(token: string) {
    const url = `${window.location.origin}/cadastro?convite=${encodeURIComponent(token)}`;
    try { await navigator.clipboard.writeText(url); setNotice("Link individual copiado."); }
    catch { window.prompt("Copie o link individual de cadastro:", url); }
  }
  async function refreshMembers() { const response = await fetch("/api/membros"); const payload = await response.json() as { members?: MemberRecord[] }; if (response.ok) setMembers(payload.members || []); }
  if (authChecking) return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="access-state"><span>Acesso administrativo</span><h1>Verificando acesso.</h1><p>A gestão é carregada somente para contas autorizadas.</p></main></div>;
  if (authRequired) return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="access-state"><span>Acesso administrativo</span><h1>Entre com uma conta autorizada.</h1><p>A base de candidatos, integrantes e pagamentos não fica exposta publicamente.</p><a className="primary-button" href="/entrar?next=/gestao">Entrar na gestão</a></main></div>;
  const activeCount = members.filter((member) => member.participationStatus === "active").length;
  const inactiveCount = members.filter((member) => ["inactive", "cancelled"].includes(member.participationStatus)).length;
  const attentionCount = applications.filter((item) => ["new", "in_review", "awaiting_info"].includes(item.status)).length;
  return <div className="apt-app apt-product-app"><a className="skip-link" href="#main-content">Pular para o conteúdo</a><main className="admin-page" id="main-content">
    <ProductSidebar
      ariaLabel="Gestão APT"
      brand={<Brand inverse />}
      eyebrow="Gestão APT"
      title="Clube em movimento"
      items={[
        { id: "resumo", label: "CRM e visão geral", icon: ClipboardList, active: tab === "resumo", onSelect: () => setTab("resumo"), badge: attentionCount || undefined },
        { id: "membros", label: "Membros e cobranças", icon: UsersRound, active: tab === "membros", onSelect: () => setTab("membros") },
      ]}
      status={<div className="sidebar-footer"><span>Integração financeira</span><strong>{asaasConnected ? "Asaas conectado" : "Asaas pendente"}</strong></div>}
      footer={<SignOutButton />}
    />
    <section className="admin-content">
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")}>Fechar</button></div>}
      {tab === "resumo" && <><header className="admin-heading"><div><span>CRM e visão geral</span><h2>O que pede atenção hoje.</h2></div><span className={asaasConnected ? "status-chip status-chip--ok" : "status-chip status-chip--pending"}>{asaasConnected ? "Asaas conectado" : "Integração pendente"}</span></header><section className="signal-strip"><div><span>Membros ativos</span><strong>{activeCount}</strong><small>na cobrança recorrente</small></div><div><span>Inativos</span><strong>{inactiveCount}</strong><small>fora da renovação</small></div><div><span>Em análise</span><strong>{attentionCount}</strong><small>pedem uma decisão</small></div><div><span>MRR ativo</span><strong>{(members.filter((item) => item.participationStatus === "active").reduce((total, item) => total + item.amountCents, 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</strong><small>calculado pela base ativa</small></div></section>{loading && <div className="loading-state"><i /><span>Atualizando requerimentos…</span></div>}{!loading && applications.length === 0 && <div className="empty-state empty-state--bordered"><strong>Nenhum requerimento registrado ainda.</strong><span>Os novos envios aparecerão aqui.</span></div>}{!loading && applications.length > 0 && <CrmKanban applications={applications} onOpen={openApplication} />}{(selectedApplication || applicationLoading) && <ApplicationReviewDetail key={selectedApplication?.id || "loading-application"} application={selectedApplication} loading={applicationLoading} saving={applicationSaving} note={reviewNote} onNoteChange={setReviewNote} onClose={() => { setSelectedApplication(null); setReviewNote(""); }} onSave={(status) => { if (selectedApplication) updateApplication(selectedApplication.id, status); }} onCopyInvite={copyInvite} />}</>}
      {tab === "membros" && <><header className="admin-heading"><div><span>Membros e cobranças</span><h2>Quem está em dia e quem precisa de ação.</h2></div></header><div className="admin-toolbar"><label className="search-field"><span className="sr-only">Buscar membro</span><input name="member-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, e-mail ou WhatsApp" /></label><label className="filter-field"><span className="sr-only">Filtrar membros</span><select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value as typeof memberFilter)}><option value="all">Todos</option><option value="attention">Precisa de ação</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label><span>{filteredMembers.length} de {members.length}</span></div><PaymentReminderQueue members={members} /><MemberManagementList members={filteredMembers} onManage={openMember} /><MemberImportPanel onImported={refreshMembers} />{filteredMembers.length === 0 && <div className="empty-state"><strong>Nenhum membro encontrado.</strong><span>Ajuste a busca ou o filtro.</span></div>}{(selectedMember || memberLoading) && <MemberManagementDetail member={selectedMember} loading={memberLoading} saving={memberSaving} refreshing={memberRefreshing} error={memberError} onClose={() => { setMemberError(""); setSelectedMember(null); }} onSave={updateMember} onRefresh={refreshMemberBilling} />}</>}
    </section>
  </main></div>;
}
