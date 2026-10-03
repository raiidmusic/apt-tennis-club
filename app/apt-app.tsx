"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CheckCheck, ChevronRight, ClipboardList, CreditCard, GripVertical, Home, LayoutDashboard, LogOut, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, Table2, Trophy, UserRound, UsersRound, Wallet } from "lucide-react";
import { ProductSidebar } from "@/components/ui/sidebar";
import GlyphPortal from "@/components/ui/glyph-portal";
import { AthleteImportInput, parseAthleteCsv } from "../lib/member-import";
import { billingCalendarDate, billingMonthKeys, financialMetricRows, type FinancialPayment, type FinancialMetric, type MemberFinancialView } from "../lib/billing-view";
import { isProtectedMembership, saoPauloDate } from "../lib/billing-state";
import type { MemberEmailCommunications } from "../lib/email-observability";

const ClippedAreaChart = dynamic(() => import("@/components/ui/advanced-stats").then((module) => module.ClippedAreaChart), {
  loading: () => <div className="advanced-stats-chart" aria-hidden="true" />,
});

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
  if (["RECEIVED", "RECEIVED_IN_CASH"].includes(status)) return "Recebido";
  if (status === "CONFIRMED") return "Confirmado · em liquidação";
  if (status.includes("OVERDUE")) return "Vencido";
  if (status.includes("REFUND")) return "Estornado";
  if (status.includes("CANCEL") || status.includes("DELETE")) return "Cancelado";
  return status.includes("PENDING") ? "Pendente" : readableStatus(status, {});
}

function shortDate(value?: string | null) {
  const day = billingCalendarDate(value);
  return day ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${day}T12:00:00`)) : "A definir";
}

function billingMethodLabel(method?: "pix" | "card" | null) {
  if (method === "pix") return "Pix mensal manual";
  if (method === "card") return "Cartão recorrente";
  return "A definir";
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
  billingMethod?: "pix" | "card" | null;
  financial: MemberFinancialView;
  billingLastAttemptAt?: string | null; billingLastSuccessAt?: string | null; billingIssue?: string | null; communicationIssue?: boolean;
  communications?: MemberEmailCommunications;
  emailConfiguration?: { webhookSecretConfigured: boolean; trackingVerification: string };
  amountCents: number;
  nextDueDate?: string | null;
  currentPeriodEnd?: string | null;
  overdueDays: number;
  cancelAtPeriodEnd?: boolean;
  checkoutExpiresAt?: string | null;
  checkoutStarted?: boolean;
  checkoutAvailable?: boolean;
  joinedAt?: string | null;
  createdAt?: string;
  twinnerUrl?: string | null;
  whatsappCommunityUrl?: string | null;
  payments?: FinancialPayment[];
  notes?: AdminNote[];
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
};

type PixPaymentDetails = {
  key: string;
  copyPaste?: string | null;
  expirationDate?: string | null;
  invoiceUrl?: string | null;
};

type PixCandidate = { id: string; payerName: string; cpfLast4?: string | null; valueCents: number; paidAt?: string | null; identityMatch: "reference" | "customer" | "unverified" };

type ManagementPayment = FinancialPayment;

type PortalPayload = {
  member: {
    name: string; email: string; whatsapp: string; cpfMasked: string; classLevel?: string | null;
    participationStatus: string; accessActive: boolean; twinnerUrl?: string | null; whatsappCommunityUrl?: string | null; joinedAt?: string | null;
  };
  subscription: { status?: string; amount_cents?: number; next_due_date?: string; current_period_end?: string; cancel_at_period_end?: boolean; asaas_checkout_url?: string | null } | null;
  financial: MemberFinancialView;
  payments: FinancialPayment[];
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
  const message = `Olá, ${firstName}! Tudo bem?\n\nEsta é uma mensagem automática do APT Tennis Club. A mensalidade deste mês ainda não consta como confirmada no sistema.\n\nPara continuar no ranking, você pode pagar por Pix pela chave habitual do APT ou aderir à mensalidade recorrente no cartão, processada pelo Asaas. No cartão, você pode cancelar quando quiser pelo sistema do APT.\n\nVocê deseja continuar participando do ranking do APT Tennis Club? Caso não queira continuar, basta nos avisar e retiraremos seu nome do ranking sem nenhum problema.\n\nSe você já realizou o pagamento, pode desconsiderar esta mensagem. Se precisar de ajuda, fale com a gente por aqui.\n\nEquipe APT`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}

function checkoutExpiryLabel(value?: string | null) {
  if (!value) return "Validade não informada";
  const date = new Date(value);
  if (date.getTime() <= Date.now()) return "Checkout expirado";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Expira hoje, ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}`
    : `Expira ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)}`;
}

export function Brand({ inverse = false, large = false }: { inverse?: boolean; large?: boolean }) {
  const source = large
    ? inverse ? "/logo-apt1.svg" : "/logo-apt1-navy.svg"
    : inverse ? "/logo-apt2.svg" : "/logo-apt2-navy.svg";
  return <span className={`brand-lockup${inverse ? " brand-lockup--inverse" : ""}${large ? " brand-lockup--large" : ""}`}><img src={source} width={large ? 1109 : 949} height={large ? 1162 : 823} alt="APT Tennis Club — Beyond the Court" /></span>;
}

const heroStatements = [
  "critério.",
  "constância.",
  "respeito.",
];

function HeroRotatingStatement({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [statement, setStatement] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setStatement((current) => (current + 1) % heroStatements.length), 2000);
    return () => window.clearTimeout(timer);
  }, [statement, reducedMotion]);

  // Word transitions adapted from Tommy Jepsen's MIT Hero5; see THIRD_PARTY_NOTICES.md.
  const activeStatement = reducedMotion ? 0 : statement;
  return <span className="apt-hero__rotator"><span className="apt-hero__rotator-measure" aria-hidden="true">constância.</span>{heroStatements.map((word, index) => (
    <motion.span key={word} className={index === activeStatement ? "apt-hero__rotator-line" : "apt-hero__rotator-away"}
      initial={{ opacity: index === activeStatement ? 1 : 0, y: index === activeStatement ? 0 : "120%" }}
      animate={{ y: index === activeStatement ? 0 : index < activeStatement ? "-120%" : "120%", opacity: index === activeStatement ? 1 : 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 18 }}>{word}</motion.span>
  ))}</span>;
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
    if (requested?.startsWith("/") && !requested.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(requested) && new URL(requested, window.location.origin).origin === window.location.origin) queueMicrotask(() => setNextPath(requested));
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
  return <div className={nextPath === "/gestao" ? "apt-app" : "apt-app apt-club"}><RouteHeader label="Acesso seguro" /><main className="login-page" id="main-content"><section><div className="auth-intro"><span>Bem-vindo ao APT</span><h1>Acesse sua conta</h1><p>Use o e-mail e a senha definidos no cadastro aprovado.</p></div><form onSubmit={submit}><label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" spellCheck={false} /></label><label className="field-label field-label--compact"><span>Senha</span><input required name="password" type="password" minLength={8} autoComplete="current-password" /></label>{error && <p className="field-error" role="alert">{error}</p>}{magicLinkNotice && <p className="recovery-notice" role="status">{magicLinkNotice}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={submitting}>{submitting ? "Entrando…" : "Entrar"}<span aria-hidden="true">→</span></button>{nextPath === "/gestao" && <button className="text-button" type="button" onClick={(event) => requestMagicLink(event.currentTarget.form!)} disabled={sendingMagicLink}>{sendingMagicLink ? "Enviando link…" : "Receber link de acesso da gestão"}</button>}<a className="text-button" href="/recuperar-senha">Esqueci minha senha</a></form></section><aside><img src={nextPath === "/gestao" ? "/apt-motion-figma.jpg" : "/apt-ritual-figma.jpg"} width="900" height="1125" alt="Um jogador com a raquete em quadra" /><div /><section className="auth-brand"><Brand inverse large /><p>Beyond the Court</p><span>Sua participação começa aqui.</span></section></aside></main></div>;
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
  if (reset && !accessToken) return <div className="apt-app apt-club"><RouteHeader label="Nova senha" /><main className="access-state" id="main-content"><span>Link inválido</span><h1>Solicite um novo link.</h1><p>Por segurança, cada link de recuperação só pode ser usado uma vez.</p><a className="primary-button" href="/recuperar-senha">Recuperar senha</a></main></div>;
  return <div className="apt-app apt-club"><RouteHeader label={reset ? "Nova senha" : "Recuperar senha"} /><main className="login-page" id="main-content"><section><div className="auth-intro"><span>Acesso seguro</span><h1>{reset ? "Crie sua nova senha." : "Recupere seu acesso."}</h1><p>{reset ? "Use pelo menos 8 caracteres." : "Enviaremos um link seguro para o seu e-mail. O APT nunca envia senhas por mensagem."}</p></div>{notice ? <div className="recovery-notice" role="status"><p>{notice}</p>{reset && <a className="primary-button" href="/entrar">Entrar</a>}</div> : <form onSubmit={submit}>{reset ? <label className="field-label field-label--compact"><span>Nova senha</span><input required name="password" type="password" minLength={8} maxLength={128} title="Use entre 8 e 128 caracteres." autoComplete="new-password" /></label> : <label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" spellCheck={false} /></label>}{error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={submitting}>{submitting ? "Enviando…" : reset ? "Criar nova senha" : "Enviar link seguro"}<span aria-hidden="true">→</span></button><a className="text-button" href="/entrar">Voltar para entrar</a></form>}</section><aside><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Bola e raquete nas mãos de um jogador junto à rede" /><div /><section className="auth-brand"><Brand inverse large /><p>Beyond the Court</p><span>Sua participação começa aqui.</span></section></aside></main></div>;
}

export function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const courtsRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [highlightedCourt, setHighlightedCourt] = useState(0);
  const courts = [
    { name: "Central Court", tone: "central", position: "Topo do ranking", description: "A divisão de maior nível do APT." },
    { name: "Court 1", tone: "one", position: "Primeiro patamar", description: "Competição forte, um patamar abaixo do Central." },
    { name: "Court 2", tone: "two", position: "Competição crescente", description: "O nível intermediário da escada competitiva." },
    { name: "Court 3", tone: "three", position: "Base do ranking", description: "A base da escada competitiva do APT." },
  ];
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "3.5%"]);
  function resetSpreadPointer(stage: HTMLElement) {
    stage.style.setProperty("--apt-pointer-x", "0px");
    stage.style.setProperty("--apt-pointer-y", "0px");
  }
  function moveSpreadPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || !CSS.supports("animation-timeline: view()")) return;
    const stage = event.currentTarget;
    const section = stage.parentElement!;
    const travel = section.offsetHeight - window.innerHeight;
    const progress = -section.getBoundingClientRect().top / Math.max(1, travel);
    if (progress < 0.9) { resetSpreadPointer(stage); return; }
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width * 2 - 1) * Math.min(26, rect.width * 0.026);
    const y = ((event.clientY - rect.top) / rect.height * 2 - 1) * Math.min(22, rect.height * 0.022);
    stage.style.setProperty("--apt-pointer-x", `${x.toFixed(2)}px`);
    stage.style.setProperty("--apt-pointer-y", `${y.toFixed(2)}px`);
  }
  const courtCount = courts.length;
  useEffect(() => {
    const section = courtsRef.current;
    if (reducedMotion || !section || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = undefined;
      if (visible && !document.hidden) {
        timer = window.setTimeout(() => setHighlightedCourt(current => (current + 1) % courtCount), 6000);
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15);
      schedule();
    }, { threshold: 0.15 });
    observer.observe(section);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [highlightedCourt, reducedMotion, courtCount]);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const type = hash.get("type");
    if (hash.get("access_token") && (type === "recovery" || type === "magiclink")) {
      window.location.replace(`${type === "recovery" ? "/redefinir-senha" : "/acesso-gestao"}${window.location.hash}`);
    }
  }, []);
  return (
    <div className="apt-app apt-club apt-landing">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="apt-site-nav">
        <a className="apt-site-nav__brand" href="/" aria-label="APT Tennis Club"><Brand /></a>
        <nav className="apt-site-nav__links" aria-label="Navegação principal">
          <a href="#o-apt">O APT</a>
          <a href="#ranking">Ranking</a>
          <a href="#temporada">Temporada</a>
          <a href="/calendario2026">Calendário</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div className="apt-site-nav__actions">
          <a className="apt-site-nav__member" href="/entrar">Área do membro</a>
          <a className="apt-pill apt-pill--clay" href="/requerimento">Solicitar entrada <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main id="main-content">
        <section className="apt-hero" ref={heroRef}>
          <div className="apt-hero__content">
            <div><p className="apt-kicker">APT Tennis Club · Brasília · Desde 2025</p>
              <h1><span className="sr-only">Um clube de tênis por indicação. Para jogar com critério, constância e respeito.</span>
                <span className="apt-hero__headline" aria-hidden="true"><span>Um clube de tênis. <em>Por indicação.</em></span><span className="apt-hero__statement">Para jogar com <HeroRotatingStatement reducedMotion={Boolean(reducedMotion)} /></span></span>
              </h1>
            </div>
            <div><p className="apt-hero__intro">Em Brasília, o APT reúne seus membros em um ranking masculino com quatro divisões e rodadas quinzenais. A entrada depende de indicação e análise do perfil.</p>
              <a className="apt-pill apt-pill--clay" href="/requerimento">Solicitar entrada <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className="apt-hero__visual" role="group" aria-label="O tênis, dentro e além da quadra">
            <figure><Image src="/apt-editorial-clay.jpeg" width="736" height="1211" sizes="(max-width: 767px) 32vw, (max-width: 920px) 30vw, 280px" alt="Um saque e sua sombra sobre o saibro" loading="eager" /></figure>
            <figure><motion.div className="apt-hero__photo" style={{ y: reducedMotion ? 0 : photoY }}><Image src="/apt-editorial-hero.jpeg" width="736" height="981" sizes="(max-width: 767px) 35vw, (max-width: 920px) 33vw, 310px" alt="Jogador junto à rede, entre dois pontos" loading="eager" fetchPriority="high" /></motion.div></figure>
            <figure><Image src="/apt-assets/tennis-green-racket.webp" width="736" height="1277" sizes="(max-width: 767px) 32vw, (max-width: 920px) 30vw, 280px" alt="Raquete vermelha e o passo de um jogador na quadra verde" loading="eager" /></figure>
          </div>
          <aside className="apt-hero__season" aria-label="Temporada atual"><span>Ranking masculino · Brasília</span><a href="/calendario2026">Temporada 2026 <ArrowUpRight size={16} aria-hidden="true" /></a><span>Beyond the Court.</span></aside>
        </section>

        <section className="apt-manifesto" id="o-apt">
          <figure className="apt-manifesto__photo apt-manifesto__photo--one"><Image src="/apt-ritual-figma.jpg" width="900" height="1125" sizes="(max-width: 767px) 136px, (max-width: 1485px) 14vw, 208px" alt="Bola e raquete, antes do próximo ponto" loading="lazy" /></figure>
          <div className="apt-manifesto__heading"><p className="apt-kicker">O clube</p><h2>Indicação e análise.<br /><em>Antes de cada convite.</em></h2></div>
          <div className="apt-manifesto__body"><p>A indicação apresenta o candidato ao APT. A gestão analisa o perfil e a disponibilidade na divisão adequada antes de liberar o convite de cadastro.</p><p>Os membros participam de uma temporada comum, com adversários de nível compatível e calendário definido. Cada jogador combina suas partidas e registra os resultados no prazo da rodada.</p><div className="apt-manifesto__mark"><img src="/logo-apt3-navy.svg" width="1241" height="1246" alt="" /><span>Beyond the Court.</span></div></div>
          <figure className="apt-manifesto__photo apt-manifesto__photo--two"><Image src="/apt-assets/tennis-green-racket.webp" width="736" height="1277" sizes="(max-width: 767px) 136px, (max-width: 1485px) 14vw, 208px" alt="O ritmo de um jogador entre pontos" loading="lazy" /></figure>
        </section>

        <section className="apt-product" id="ranking">
          <header className="apt-section-heading"><h2>Rodadas quinzenais.<br /><em>Horários combinados.</em></h2><p>O ranking define os confrontos. Você combina a data e o horário com cada adversário, dentro do prazo da rodada.</p></header>
          <div className="apt-product__layout"><figure className="apt-product__photo"><Image src="/apt-assets/apt-club-outdoor.webp" width="1149" height="1368" sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1480px) calc(50vw - 108px), 632px" alt="Três painéis ao ar livre: fotografias de tênis nas laterais e a marca APT ao centro" loading="lazy" /></figure>
            <dl className="apt-format"><div><dt>2</dt><dd><strong>Jogos por rodada</strong><p>A cada quinze dias, você recebe dois confrontos para combinar.</p></dd></div><div><dt>14</dt><dd><strong>Dias para jogar</strong><p>Combine o horário com seu adversário, entre em quadra e registre o resultado dentro do prazo.</p></dd></div><div><dt>4</dt><dd><strong>Divisões de nível</strong><p>Central Court, Court 1, Court 2 e Court 3. Os resultados definem sua posição e o próximo ciclo.</p></dd></div></dl>
          </div>
        </section>

        <section className="apt-courts" ref={courtsRef}>
          <header className="apt-section-heading">
            <h2>Quatro divisões.<br /><em>Classificação por resultado.</em></h2>
            <p>Você começa na divisão compatível com seu nível. Ao fim de cada ciclo, os resultados definem quem sobe e quem desce.</p>
          </header>
          <p className="apt-courts__hint" id="apt-courts-hint">Selecione uma divisão para vê-la em destaque.</p>
          <div className="apt-courts__layout">
            <div className="apt-courts__list" role="group" aria-label="Divisões do ranking" aria-describedby="apt-courts-hint">
              {courts.map((court, index) => <article className={`apt-court apt-court--${court.tone}`} data-highlighted={highlightedCourt === index} key={court.name}>
                <span className="apt-court__number" aria-hidden="true">0{index + 1}</span>
                <div><span className="apt-court__position">{court.position}</span><h3><button type="button" aria-pressed={highlightedCourt === index} aria-label={`Destacar ${court.name}`} onClick={() => setHighlightedCourt(index)}>{court.name}<span aria-hidden="true">↗</span></button></h3><p>{court.description}</p></div>
              </article>)}
            </div>
            <div className={`apt-courts__portrait apt-court--${courts[highlightedCourt].tone}`} aria-hidden="true">
              <div className="apt-courts__portrait-top"><span>APT Tennis Club</span><span>Escada competitiva</span></div>
              <svg key={highlightedCourt} className="apt-courts__drawing" viewBox="0 0 400 640" fill="none"><rect x="48" y="44" width="304" height="552" /><path d="M86 44v552M314 44v552M86 175h228M86 465h228M200 175v290M20 320h360" /><path className="apt-courts__service" d="M86 175h114v145H86zM200 320h114v145H200z" /><circle cx="200" cy="320" r="5" /></svg>
              <div className="apt-courts__portrait-bottom"><span>0{highlightedCourt + 1}</span><p>{courts[highlightedCourt].name}</p></div>
            </div>
          </div>
        </section>

        {/* Stack Spread adapted from the Hyperiux source supplied by the user; native CSS scroll, local APT photography. */}
        <section className="apt-spread" aria-label="Beyond the Court — fotografias de tênis">
          <div className="apt-spread__stage" onPointerMove={moveSpreadPointer} onPointerLeave={event => resetSpreadPointer(event.currentTarget)}>
            <svg className="apt-spread__court" viewBox="0 0 1200 900" fill="none" aria-hidden="true"><rect x="150" y="120" width="900" height="660" /><path d="M260 120v660M940 120v660M260 285h680M260 615h680M600 285v330M150 450h900" /></svg>
            <div className="apt-spread__copy"><p className="apt-kicker">APT Tennis Club</p><h2>Beyond<br /><em>the Court.</em></h2><p>Gente com quem jogar.<br />Uma temporada para compartilhar.</p></div>
            <div className="apt-spread__photos">
              {[
                { src: "/apt-assets/tennis-green-racket.webp", width: 736, height: 1277, alt: "O passo de um jogador com sua raquete vermelha" },
                { src: "/apt-ritual-figma.jpg", width: 900, height: 1125, alt: "Bola e raquete nas mãos, junto à rede" },
                { src: "/apt-editorial-clay.jpeg", width: 736, height: 1211, alt: "Um saque sobre o saibro" },
                { src: "/apt-assets/tennis-green-indian-wells.webp", width: 736, height: 863, alt: "Uma troca de bola na quadra verde" },
                { src: "/apt-assets/apt-court-photographic.webp", width: 1122, height: 1402, alt: "Composição de marca APT pintada no piso de uma quadra" },
                { src: "/apt-editorial-hero.jpeg", width: 736, height: 981, alt: "A pausa de um jogador junto à rede" },
              ].map((photo, index) => <figure key={photo.src}><div className="apt-spread__photo-drift" style={{ "--apt-depth": 0.55 + index * 0.15 } as CSSProperties}><Image {...photo} sizes="(max-width: 1023px) 28vw, (max-width: 1318px) 17vw, 224px" alt={photo.alt} loading="lazy" draggable={false} /></div></figure>)}
            </div>
          </div>
        </section>

        <section className="apt-cycle" id="temporada">
          <header className="apt-cycle__heading">
            <div>
            <p className="apt-kicker">A temporada</p><h2>Quatro ciclos.<br /><em>Uma temporada anual.</em></h2>
            </div>
            <div><p>Quatro ciclos ao longo do ano, com sorteios quinzenais e mudanças de divisão ao fim de cada ciclo.</p><a className="apt-text-link" href="/calendario2026">Ver calendário da temporada <span aria-hidden="true">↗</span></a></div>
          </header>
          <div className="apt-cycle__body">
            <figure className="apt-cycle__photo"><div><Image src="/apt-editorial-clay.jpeg" width="736" height="1211" sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1480px) calc(45vw - 92px), 600px" alt="Jogador executa um golpe no saibro" loading="lazy" /></div><figcaption><span>2 jogos por rodada</span><span>14 dias para jogar</span></figcaption></figure>
            <ol className="apt-cycle__steps">
              <li><span className="apt-cycle__number" aria-hidden="true">01</span><div><span className="apt-cycle__rhythm">A cada quinze dias</span><h3>Sorteios quinzenais</h3><p>Dois jogos liberados a cada rodada.</p></div></li>
              <li><span className="apt-cycle__number" aria-hidden="true">02</span><div><span className="apt-cycle__rhythm">A cada partida</span><h3>Pontuação por resultado</h3><p>Vitórias, sets e games entram na classificação.</p></div></li>
              <li><span className="apt-cycle__number" aria-hidden="true">03</span><div><span className="apt-cycle__rhythm">Ao fim do ciclo</span><h3>Promoção e rebaixamento</h3><p>No fim de cada ciclo, a classificação define quem sobe e quem desce.</p></div></li>
              <li><span className="apt-cycle__number" aria-hidden="true">04</span><div><span className="apt-cycle__rhythm">O encontro em quadra</span><h3>APT Finals</h3><p>Os melhores de cada Court se encontram no torneio presencial.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="apt-member-block">
          <div className="apt-member-block__copy">
            <p className="apt-kicker">Para quem já faz parte</p>
            <h2>Área do membro.<br /><em>Participação e assinatura.</em></h2>
            <p>Você acompanha o ranking no Tweener. Aqui, cuida da sua assinatura e da participação no APT.</p>
            <a className="apt-pill apt-pill--clay" href="/entrar">Entrar na área do membro <span aria-hidden="true">↗</span></a>
          </div>
          <div className="apt-member-block__visual">
            <svg className="apt-member-block__court" viewBox="0 0 500 600" fill="none" aria-hidden="true"><rect x="30" y="25" width="440" height="550" /><path d="M84 25v550M416 25v550M84 150h332M84 450h332M250 150v300M30 300h440" /></svg>
            <figure className="apt-member-block__main-photo"><img src="/apt-assets/tennis-black-white.jpeg" width="736" height="981" alt="Fotografia em preto e branco de um jogador executando um golpe em quadra" loading="lazy" /></figure>
            <figure className="apt-member-block__detail-photo"><img src="/apt-assets/apt-balls-photoshop.webp" width="938" height="1679" alt="Bolas de tênis com a marca APT em preto na bola central" loading="lazy" /></figure>
            <span className="apt-member-block__caption">Beyond the Court.</span>
          </div>
        </section>

        <section className="apt-faq" id="duvidas">
          <header><h2>Antes de entrar.</h2><p>Como entrar, combinar os jogos e acompanhar sua participação.</p></header>
          <div className="apt-faq__layout">
            <figure><img src="/apt-editorial-blue.jpeg" width="474" height="593" alt="Jogador se movimentando em uma quadra azul" loading="lazy" /></figure>
            <div className="apt-faq__items">
              <details open><summary>O que é o APT?</summary><p>Um clube de tênis em Brasília, com entrada por indicação e ranking masculino. Os jogos acontecem em rodadas quinzenais, com quatro divisões de nível e quatro ciclos ao longo do ano.</p></details>
              <details><summary>Como faço para entrar?</summary><p>A entrada começa por indicação. Você conta um pouco sobre seu tênis no requerimento; a gestão analisa o perfil e a disponibilidade na divisão adequada. Com a aprovação, você recebe o convite para cadastro.</p></details>
              <details><summary>Como são definidos os Courts?</summary><p>Seu nível de jogo e a disponibilidade de vagas definem a divisão inicial. Depois, os resultados do ranking determinam promoção e rebaixamento.</p></details>
              <details><summary>Quantos jogos acontecem por rodada?</summary><p>Você recebe dois confrontos a cada quinze dias e tem 14 dias para combinar e realizar as partidas.</p></details>
              <details><summary>Onde acompanho o ranking e os pagamentos?</summary><p>O ranking fica no Tweener. Na área do membro do APT, você acompanha assinatura, pagamentos e situação da participação. O checkout de cartão é realizado no Asaas.</p></details>
            </div>
          </div>
        </section>

        <GlyphPortal className="apt-glyph" word="JOGAR" focusChar="O" interactive={false} scrollLength={1} fontFamily="Georgia, serif" fontWeight={700} enterLabel="Ver como participar" style={{ "--gp-paper": "#ecebe2", "--gp-ink": "var(--navy)", "--gp-field": "var(--navy)", "--gp-foreground": "var(--white)" }} background={<svg className="apt-glyph__court" viewBox="0 0 1200 900" fill="none" aria-hidden="true"><rect x="150" y="120" width="900" height="660" /><path d="M260 120v660M940 120v660M260 285h680M260 615h680M600 285v330M150 450h900" /></svg>} front={<div className="apt-glyph__front"><span>APT Tennis Club</span><span>Entrada por indicação e análise.</span></div>}>
        <section className="apt-entry" id="entrada">
          <div className="apt-entry__copy"><div className="apt-entry__brand"><Brand inverse /><span>APT Tennis Club · Brasília</span></div><h2>Entrada por indicação.<br />Admissão por análise.</h2><p>Informe quem o indicou e sua experiência no tênis. A gestão avalia o requerimento e a disponibilidade na divisão adequada. Se aprovado, você recebe um convite individual para cadastro.</p><ol className="apt-entry__steps" aria-label="Etapas de entrada"><li><span>01</span>Requerimento</li><li><span>02</span>Análise do perfil</li><li><span>03</span>Convite e cadastro</li></ol></div>
          <a className="apt-pill apt-pill--light" href="/requerimento">Solicitar entrada <span aria-hidden="true">↗</span></a>
        </section>
        </GlyphPortal>
      </main>
      <footer className="apt-footer">
        <div className="apt-footer__body">
          <div className="apt-footer__identity">
            <Brand />
            <h2>Beyond the Court.</h2>
            <p>APT Tennis Club · Brasília</p>
          </div>
          <nav aria-label="Links do rodapé">
            <div><h3>O clube</h3><ul><li><a href="#o-apt">O APT</a></li><li><a href="#ranking">Ranking</a></li><li><a href="#temporada">Temporada</a></li><li><a href="/calendario2026">Calendário</a></li></ul></div>
            <div><h3>Participe</h3><ul><li><a href="/requerimento">Solicitar entrada</a></li><li><a href="/entrar">Área do membro</a></li><li><a href="#duvidas">Dúvidas frequentes</a></li></ul></div>
          </nav>
        </div>
        <div className="apt-footer__base"><span>Desde 2025</span><span>Admissão por indicação e análise.</span></div>
      </footer>
    </div>
  );
}

export function CandidatePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const answerArea = useRef<HTMLDivElement>(null);
  const visibleQuestions = useMemo(() => questions.filter((item) => !item.condition || item.condition(answers)), [answers]);
  const question = visibleQuestions[step];
  const progress = Math.round(((step + 1) / visibleQuestions.length) * 100);

  function setAnswer(value: AnswerValue) { setAnswers((current) => ({ ...current, [question.id]: value })); setError(""); }
  function validate() {
    const value = answers[question.id];
    let message = "";
    if (!question.optional && (!value || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0))) message = "Responda esta pergunta para continuar.";
    else if (question.id === "idade" && (!Number.isInteger(Number(value)) || Number(value) < 25 || Number(value) > 45)) message = "Neste momento, o APT recebe integrantes entre 25 e 45 anos.";
    else if (question.type === "email" && !/^\S+@\S+\.\S+$/.test(String(value).trim())) message = "Informe um e-mail válido para receber o retorno do APT.";
    else if (question.type === "tel" && !/^\d{10,13}$/.test(String(value).replace(/\D/g, ""))) message = "Informe o WhatsApp com DDD, entre 10 e 13 dígitos.";
    if (message) { setError(message); answerArea.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus(); return false; }
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

  if (complete) return <main className="apt-club form-shell form-shell--complete" id="main-content"><aside className="form-visual"><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador com a raquete e a bola junto à rede" /><div className="form-visual__shade" /><a href="/" aria-label="Voltar ao site"><Brand inverse large /></a></aside><section className="form-success"><span className="success-symbol">✓</span><p>Requerimento enviado</p><h1>Agora, a análise é nossa.</h1><p>Suas informações foram registradas. Se o perfil for aprovado, você receberá outro link — exclusivo para cadastro e assinatura.</p><a className="secondary-button" href="/">Voltar ao site</a></section></main>;

  return <main className="apt-club form-shell" id="main-content">
    <aside className="form-visual"><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador com a raquete e a bola junto à rede" /><div className="form-visual__shade" /><a href="/" aria-label="Voltar ao site"><Brand inverse large /></a><p>Não é só sobre jogar.<br />É sobre com quem você joga.</p></aside>
    <section className="question-stage">
      <header className="form-topbar"><button type="button" onClick={previous} disabled={step === 0} aria-label="Voltar para a pergunta anterior">←</button><div className="progress-track" role="progressbar" aria-label="Progresso do requerimento" aria-valuemin={1} aria-valuemax={visibleQuestions.length} aria-valuenow={step + 1} aria-valuetext={`Pergunta ${step + 1} de ${visibleQuestions.length}`}><span style={{ transform: `scaleX(${progress / 100})` }} /></div><span>{String(step + 1).padStart(2, "0")} / {String(visibleQuestions.length).padStart(2, "0")}</span></header>
      <div className="question-content" key={question.id}>
        <div className="question-copy"><span>{question.optional ? "Resposta opcional" : "Conte do seu jeito"}</span><h1>{question.title}</h1>{question.helper && <p>{question.helper}</p>}</div>
        <div className="answer-area" ref={answerArea}>
          {(["text", "email", "tel", "number"] as QuestionType[]).includes(question.type) && <label className="field-label"><span>Sua resposta</span><input name={question.id} type={question.type} inputMode={question.type === "tel" ? "tel" : question.type === "number" ? "numeric" : undefined} autoComplete={question.id === "nome" ? "name" : question.type === "email" ? "email" : question.type === "tel" ? "tel" : "off"} spellCheck={question.type !== "email" && question.type !== "tel"} min={question.type === "number" ? 25 : undefined} max={question.type === "number" ? 45 : undefined} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") next(); }} placeholder={question.type === "email" ? "nome@exemplo.com" : question.type === "tel" ? "(61) 99999-9999" : "Digite aqui…"} aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "textarea" && <label className="field-label"><span>Sua resposta</span><textarea name={question.id} rows={4} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} placeholder="Escreva aqui…" aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "choice" && <fieldset className="choice-list" aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined}><legend className="sr-only">Escolha uma opção</legend>{question.options?.map((option, index) => <label className={answers[question.id] === option ? "choice choice--selected" : "choice"} key={option}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswer(option)} /><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{option}</span><i aria-hidden="true">{answers[question.id] === option ? "✓" : ""}</i></label>)}</fieldset>}
          {question.type === "multi" && <fieldset className="choice-list choice-list--two" aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined}><legend className="sr-only">Escolha até três opções</legend>{question.options?.map((option) => { const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option); return <label className={selected ? "choice choice--selected" : "choice"} key={option}><input type="checkbox" name={question.id} value={option} checked={Boolean(selected)} onChange={() => toggleMulti(option)} /><span className="choice-check">{selected ? "✓" : ""}</span><span>{option}</span></label>; })}</fieldset>}
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
  const directToken = useRef("");
  const [hasInvite, setHasInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recadastro, setRecadastro] = useState(false);
  const [communityEnrollment, setCommunityEnrollment] = useState(false);
  const [directRegistration, setDirectRegistration] = useState(false);
  const [monthlyValue, setMonthlyValue] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("pix");
  const [pixPayment, setPixPayment] = useState<PixPaymentDetails | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("status");
    if (status === "sucesso" || status === "cancelado" || status === "expirado") {
      queueMicrotask(() => { setCheckoutStatus(status); setProfileLoading(false); });
      return;
    }
    const token = query.get("convite") || "";
    const communityToken = query.get("grupo") || "";
    const managedToken = query.get("direto") || "";
    inviteToken.current = token;
    groupToken.current = communityToken;
    directToken.current = managedToken;
    if (!token && !communityToken && !managedToken) { queueMicrotask(() => setProfileLoading(false)); return; }
    queueMicrotask(() => setHasInvite(true));
    const accessQuery = token ? `convite=${encodeURIComponent(token)}` : communityToken ? `grupo=${encodeURIComponent(communityToken)}` : `direto=${encodeURIComponent(managedToken)}`;
    fetch(`/api/cadastros?${accessQuery}`)
      .then(async (response) => {
        const payload = await response.json() as { name?: string; email?: string; phone?: string; recadastro?: boolean; communityEnrollment?: boolean; directRegistration?: boolean; monthlyValue?: number | null; checkoutUrl?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || "Este convite não pôde ser validado.");
        setName(payload.name || ""); setEmail(payload.email || ""); setPhone(payload.phone || "");
        setRecadastro(Boolean(payload.recadastro)); setCommunityEnrollment(Boolean(payload.communityEnrollment)); setDirectRegistration(Boolean(payload.directRegistration)); setMonthlyValue(payload.monthlyValue || null); setPaymentLink(payload.checkoutUrl || "");
      })
      .catch((validationError) => setError(validationError instanceof Error ? validationError.message : "Este convite não pôde ser validado."))
      .finally(() => setProfileLoading(false));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(""); const data = new FormData(event.currentTarget);
    try { const response = await fetch("/api/cadastros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteToken: inviteToken.current, groupToken: groupToken.current, directToken: directToken.current, name, cpf, email, phone, password: data.get("password"), consent: data.get("consent") === "on", paymentMethod }) }); const payload = await response.json() as { error?: string; checkoutUrl?: string; pix?: PixPaymentDetails }; if (!response.ok) throw new Error(payload.error || "Não foi possível concluir o cadastro."); setPaymentLink(payload.checkoutUrl || ""); setPixPayment(payload.pix || null); setSubmitted(true); }
    catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir o cadastro."); }
    finally { setSubmitting(false); }
  }
  if (checkoutStatus === "sucesso") return <div className="apt-app apt-club"><RouteHeader label="Assinatura APT" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Checkout concluído</p><h1>Recebemos sua assinatura.</h1><p>O Asaas está confirmando o pagamento. Assim que a confirmação chegar, sua área de membro será liberada.</p><a className="primary-button" href="/entrar?next=/membros">Entrar na área do membro <span aria-hidden="true">→</span></a></main></div>;
  if (checkoutStatus === "cancelado" || checkoutStatus === "expirado") return <div className="apt-app apt-club"><RouteHeader label="Assinatura APT" /><main className="content-page success-page" id="main-content"><p>Checkout não concluído</p><h1>{checkoutStatus === "expirado" ? "O link de pagamento expirou." : "O pagamento foi cancelado."}</h1><p>Peça à gestão um novo link individual para continuar sua assinatura com segurança.</p><a className="secondary-button" href="/">Voltar ao site</a></main></div>;
  const enrollmentLabel = communityEnrollment ? "Cadastro pelo grupo APT" : directRegistration ? "Cadastro direto APT" : "Cadastro do aprovado";
  const enrollmentHeadline = recadastro ? "Atualize seus dados. Ative sua recorrência." : communityEnrollment || directRegistration ? "Complete seu cadastro. Ative sua participação." : "Você foi aprovado. Agora, vamos ativar sua participação.";
  if (submitted && pixPayment) return <div className="apt-app apt-club"><RouteHeader label={enrollmentLabel} /><main className="content-page success-page pix-success" id="main-content"><span className="success-symbol">✓</span><p>Cadastro recebido</p><h1>Seu Pix está pronto.</h1><p>O Asaas atualizará sua situação automaticamente depois da confirmação. Você pode usar a cobrança identificada ou a chave fixa do APT.</p><div className="pix-payment-box"><span>Chave Pix do APT</span><strong>{pixPayment.key}</strong><button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(pixPayment.key)}>Copiar chave Pix</button>{pixPayment.copyPaste && <><span>Pix copia e cola identificado</span><textarea readOnly rows={3} value={pixPayment.copyPaste} aria-label="Pix copia e cola" /><button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(pixPayment.copyPaste || "")}>Copiar código identificado</button></>}{pixPayment.invoiceUrl && <a className="primary-button" href={pixPayment.invoiceUrl} target="_blank" rel="noreferrer">Abrir cobrança no Asaas <span aria-hidden="true">↗</span></a>}</div><small>Se outra pessoa fizer o Pix por você, prefira o código identificado ou envie o comprovante à gestão.</small></main></div>;
  if (submitted) return <div className="apt-app apt-club"><RouteHeader label={enrollmentLabel} /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Cadastro recebido</p><h1>{paymentLink ? "Sua assinatura está pronta para ativação." : "Seus dados foram vinculados ao requerimento."}</h1><p>{paymentLink ? "Conclua o pagamento no ambiente seguro do Asaas. O APT não recebe nem armazena os dados completos do seu cartão." : "A cobrança será liberada quando valor e vencimento forem confirmados pela gestão."}</p>{paymentLink ? <a className="primary-button" href={paymentLink}>Abrir checkout seguro <span aria-hidden="true">↗</span></a> : <a className="secondary-button" href="/">Voltar ao site</a>}</main></div>;
  if (!profileLoading && !hasInvite) return <div className="apt-app apt-club"><RouteHeader label="Cadastro por convite" /><main className="access-state" id="main-content"><span>Entrada no APT</span><h1>Cadastro por convite.</h1><p>Este cadastro precisa de um acesso válido. Abra o convite individual ou o link enviado pela gestão para completar seu cadastro. Se você ainda não participa do clube, comece pelo requerimento.</p><div className="profile-actions"><a className="primary-button" href="/requerimento">Fazer requerimento</a><a className="secondary-button" href="/entrar?next=/membros">Já sou membro</a></div></main></div>;
  return <div className="apt-app apt-club"><RouteHeader label={enrollmentLabel} /><main className="enrollment-page" id="main-content">
    <aside className="enrollment-intro"><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador segura uma bola e uma raquete junto à rede" /><div className="enrollment-intro__shade" /><div><span>{communityEnrollment ? "Grupo APT" : "Link privado"}</span><h1>{enrollmentHeadline}</h1><p>O APT guarda somente a proteção criptográfica do CPF e os quatro últimos dígitos. O cartão fica no Asaas.</p></div></aside>
    <section className="enrollment-content">
      <header><span>{recadastro ? "Recadastro e pagamento" : "Cadastro e pagamento"}</span><h2>Confirme os dados da sua participação.</h2><p>Escolha Pix ou cartão recorrente. Os pagamentos são processados pelo Asaas.</p></header>
      {!profileLoading && hasInvite && !monthlyValue && !error && <div className="access-notice"><strong>A mensalidade ainda não foi liberada.</strong><span>A gestão precisa confirmar o valor antes de gerar a recorrência.</span></div>}
      {profileLoading && <div className="loading-state"><i /><span>Validando seu convite…</span></div>}
      <form className="enrollment-form" onSubmit={submit}>
        <fieldset className="fields-grid"><legend>Dados da participação</legend><label className="field-label field-label--compact"><span>Nome completo</span><input required name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" /></label><label className="field-label field-label--compact"><span>CPF</span><input required name="cpf" inputMode="numeric" autoComplete="off" spellCheck={false} value={formatCpf(cpf)} onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="000.000.000-00" /></label><label className="field-label field-label--compact"><span>E-mail de acesso</span><input required readOnly={!communityEnrollment && !directRegistration} name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" /></label><label className="field-label field-label--compact"><span>WhatsApp</span><input required name="phone" type="tel" autoComplete="tel" inputMode="tel" spellCheck={false} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} placeholder="(61) 99999-9999" /></label><label className="field-label field-label--compact"><span>Crie uma senha</span><input required name="password" type="password" minLength={8} maxLength={128} title="Use entre 8 e 128 caracteres." autoComplete="new-password" placeholder="Pelo menos 8 caracteres" /></label></fieldset>
        <div className="plan-row"><div><span>Participação mensal APT</span><strong>{monthlyValue ? `${monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês` : "Valor ainda não configurado"}</strong><small>Escolha como prefere pagar</small></div><span className="status-chip">Pagamento no Asaas</span></div>
        <fieldset className="payment-choice"><legend>Forma de pagamento</legend><label className={paymentMethod === "pix" ? "payment-choice__option payment-choice__option--active" : "payment-choice__option"}><input type="radio" name="payment-method" value="pix" checked={paymentMethod === "pix"} onChange={() => setPaymentMethod("pix")} /><span><strong>Pix</strong><small>Pagamento mensal pela chave fixa ou cobrança identificada do Asaas.</small></span></label><label className={paymentMethod === "card" ? "payment-choice__option payment-choice__option--active" : "payment-choice__option"}><input type="radio" name="payment-method" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} /><span><strong>Cartão recorrente</strong><small>Renovação mensal; você pode cancelar quando quiser pelo APT.</small></span></label></fieldset>
        <label className="consent-row"><input required name="consent" type="checkbox" /><span>Autorizo o uso destes dados para administrar minha participação, comunicação e cobrança no APT.</span></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button primary-button--wide" type="submit" disabled={!hasInvite || !monthlyValue || profileLoading || submitting}>{submitting ? "Preparando pagamento…" : paymentMethod === "pix" ? "Gerar Pix" : "Continuar para o cartão"}<span aria-hidden="true">→</span></button>
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
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billingRefreshing, setBillingRefreshing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [cardRequesting, setCardRequesting] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileError, setProfileError] = useState("");
  const profileForm = useRef<HTMLFormElement>(null);
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
        try {
          const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh_billing" }) });
          const refreshed = await response.json() as { portal?: PortalPayload; error?: string };
          if (!response.ok || !refreshed.portal) throw new Error(refreshed.error || "Não foi possível atualizar a situação financeira agora.");
          setData(refreshed.portal); setProfileName(refreshed.portal.member.name); setProfileWhatsapp(refreshed.portal.member.whatsapp);
        } finally { setBillingRefreshing(false); }
      }
    }).catch((error) => { const message = error instanceof Error ? error.message : "Não foi possível carregar sua participação."; setLoadError(message); setNotice(message); }).finally(() => setLoading(false));
  }, [loadAttempt]);
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
    const name = profileName.trim().replace(/\s+/g, " ");
    const phone = profileWhatsapp.replace(/\D/g, "");
    const invalidField = name.length < 2 || name.length > 100 ? "member-name" : !/^\d{10,13}$/.test(phone) ? "member-whatsapp" : "";
    if (invalidField) { setProfileError(invalidField === "member-name" ? "Informe seu nome completo, entre 2 e 100 caracteres." : "Informe o WhatsApp com DDD, entre 10 e 13 dígitos."); profileForm.current?.querySelector<HTMLInputElement>(`[name="${invalidField}"]`)?.focus(); return; }
    setProfileError("");
    setProfileSaving(true);
    try {
      const response = await fetch("/api/portal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_profile", name: profileName, whatsapp: profileWhatsapp }) });
      const payload = await response.json() as { member?: { name: string; whatsapp: string }; error?: string };
      if (!response.ok || !payload.member) throw new Error(payload.error || "Não foi possível salvar seu cadastro.");
      setData((current) => current ? { ...current, member: { ...current.member, ...payload.member } } : current);
      showNotice("Cadastro atualizado.");
    } catch (error) { setProfileError(error instanceof Error ? error.message : "Não foi possível salvar seu cadastro."); }
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
      setData((current) => current ? { ...current, member: { ...current.member, participationStatus: isProtectedMembership(current.member.participationStatus) ? current.member.participationStatus : payload.accessUntil ? "cancellation_requested" : "cancelled", accessActive: ["inactive", "cancelled"].includes(current.member.participationStatus) ? false : current.member.participationStatus === "courtesy" || Boolean(payload.accessUntil) }, subscription: current.subscription ? { ...current.subscription, status: "cancelled", cancel_at_period_end: false } : current.subscription } : current);
      setExitRequested(true); setExitOpen(false);
      showNotice(payload.accessUntil ? `Renovação cancelada. Seu acesso segue até ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${payload.accessUntil}T12:00:00`))}.` : "Renovação cancelada. Não haverá novas cobranças.");
    } catch {
      showNotice("Não foi possível falar com o Asaas agora. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }
  if (loading) return <div className="apt-app apt-club"><RouteHeader label="Área do membro" /><main className="access-state" id="main-content"><div className="loading-state" role="status"><i aria-hidden="true" /><span>Carregando sua participação…</span></div></main></div>;
  if (authRequired) return <div className="apt-app apt-club"><RouteHeader label="Área do membro" /><main className="access-state"><span>Área reservada</span><h1>Entre para ver sua assinatura.</h1><p>Pagamentos, links do clube e dados pessoais ficam protegidos.</p><a className="primary-button" href="/entrar?next=/membros">Entrar na área do membro</a></main></div>;
  if (!data) return <div className="apt-app apt-club"><RouteHeader label="Área do membro" /><main className="access-state" id="main-content"><span>Área do membro</span><h1>Não foi possível carregar sua participação.</h1><p role="alert">{loadError || "Confira sua conexão e tente novamente."}</p><button className="primary-button" type="button" onClick={() => { setLoading(true); setLoadError(""); setNotice(""); setAuthRequired(false); setLoadAttempt((attempt) => attempt + 1); }}>Tentar novamente</button></main></div>;
  const { member, subscription, payments, financial } = data;
  const initials = member.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const courtesy = member.participationStatus === "courtesy";
  const nextDue = financial.nextInvoiceDueDate ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${financial.nextInvoiceDueDate}T12:00:00`)) : "Não emitida";
  const active = member.accessActive;
  const amount = courtesy ? "Cortesia" : subscription?.amount_cents !== undefined ? currency(subscription.amount_cents) : "Não definida";
  const lastReceived = financial.lastReceivedAt;
  const accessLabel = courtesy ? "Cortesia ativa" : member.participationStatus === "inactive" ? "Participação inativa" : member.participationStatus === "cancelled" ? "Participação encerrada" : member.participationStatus === "cancellation_requested" ? active ? "Renovação cancelada · acesso vigente" : "Renovação cancelada" : active ? "Mensalidade em dia" : member.participationStatus === "pending_payment" ? "Pagamento pendente" : "Confirmação em andamento";
  const rankingLink = member.twinnerUrl;
  const communityLink = member.whatsappCommunityUrl;
  const openLockedRanking = () => showNotice(isProtectedMembership(member.participationStatus) ? "Fale com a gestão do APT para conferir sua participação e o acesso ao clube." : "O acesso ao Tweener é liberado assim que o Asaas confirma a mensalidade.");
  return <div className="apt-app apt-club apt-product-app"><a className="skip-link" href="#main-content">Pular para o conteúdo</a><main className="member-page" id="main-content">
    <ProductSidebar
      ariaLabel="Área do membro"
      brand={<Brand />}
      eyebrow="Área do membro"
      title="Sua participação"
      profile={<div className="member-profile"><span>{initials}</span><div><strong>{member.name}</strong><small>{member.classLevel || "Classe a confirmar"}</small></div></div>}
      items={[
        { id: "inicio", label: "Início", icon: Home, active: tab === "inicio", onSelect: () => setTab("inicio") },
        rankingLink ? { id: "ranking", label: "Ranking no Tweener", mobileLabel: "Ranking", icon: Trophy, href: rankingLink, external: true } : { id: "ranking", label: "Ranking no Tweener", mobileLabel: "Ranking", icon: Trophy, onSelect: openLockedRanking },
        { id: "pagamentos", label: "Pagamentos", icon: CreditCard, active: tab === "pagamentos", onSelect: () => setTab("pagamentos") },
        { id: "perfil", label: "Meu cadastro", mobileLabel: "Perfil", icon: UserRound, active: tab === "perfil", onSelect: () => setTab("perfil") },
      ]}
      status={<div className="rail-status"><i /> <span>{accessLabel}</span></div>}
      footer={<SignOutButton />}
    />
    <section className="member-content"><header className="product-topbar"><div><span>Área do membro</span><strong>{tab === "inicio" ? "Sua participação" : tab === "pagamentos" ? "Pagamentos" : "Meu cadastro"}</strong></div><span className={`status-chip ${active ? "status-chip--ok" : "status-chip--pending"}`}>{accessLabel}</span></header>
      {notice && <div className="toast" role="status">{notice}</div>}
      {tab === "inicio" && <>
        <header className="member-welcome"><div><h1>Olá, {member.name.split(" ")[0]}.</h1><p>Seu lugar no clube, em um só espaço.</p></div><button className="secondary-button" type="button" onClick={() => setTab("perfil")}>Meu cadastro <UserRound size={16} aria-hidden="true" /></button></header>
        <section className="portal-identity" aria-label="Sua identificação no clube"><span className="portal-avatar" aria-hidden="true">{initials}</span><div><strong>{member.name}</strong><span>{member.classLevel || "Classe a confirmar"}{member.joinedAt && ` · No APT desde ${shortDate(member.joinedAt)}`}</span></div><a href={`mailto:${member.email}`}>{member.email}</a></section>
        <div className="portal-home-grid">
          <section className="membership-hero" aria-labelledby="member-finance-title"><header><span>Sua mensalidade</span><h2 id="member-finance-title">Participação e pagamentos</h2></header><dl className="portal-finance-facts"><div><dt>Mensalidade</dt><dd>{amount}</dd></div><div><dt>Método de pagamento</dt><dd>{billingMethodLabel(financial.billingMethod)}</dd></div><div><dt>Cobertura paga até</dt><dd>{financial.paidThrough ? shortDate(financial.paidThrough) : "Sem período registrado"}</dd></div><div><dt>Último recebimento</dt><dd>{lastReceived ? shortDate(lastReceived) : "Não registrado"}</dd></div></dl><footer><p>{courtesy ? "Sua participação é liberada pela gestão, por cortesia." : isProtectedMembership(member.participationStatus) ? "A participação definida pela gestão é preservada, mesmo quando há um período pago registrado." : financialReasons[financial.reason] || "Consulte as cobranças para conferir sua situação financeira."}</p>{!courtesy && <button className="secondary-button" type="button" onClick={refreshBilling} disabled={billingRefreshing}>{billingRefreshing ? "Atualizando…" : "Atualizar situação"}</button>}</footer></section>
          <aside className="portal-next-step"><span>Próximo passo</span><h2>{isProtectedMembership(member.participationStatus) ? "Sua participação no clube" : financial.overdueCents ? "Confira a cobrança vencida" : financial.pixRenewalDue ? "Renove seu Pix mensal" : financial.covered ? "Acompanhe sua mensalidade" : "Confira seus pagamentos"}</h2><p>{courtesy ? "A gestão cuida da sua condição de cortesia. Os acessos do clube estão disponíveis abaixo." : ["inactive", "cancelled"].includes(member.participationStatus) ? "Para retomar a participação e os acessos, fale com a gestão do APT." : member.participationStatus === "cancellation_requested" ? active ? `A renovação foi cancelada. Seu acesso permanece até ${shortDate(financial.paidThrough)}.` : "A renovação foi cancelada. Fale com a gestão para conferir sua participação." : financial.overdueCents ? `${currency(financial.overdueCents)} em cobranças emitidas e vencidas. Confira os detalhes no histórico.` : financial.billingMethod === "pix" ? "O Pix é mensal e manual. Cada mensalidade precisa de um novo pagamento identificado." : financial.recurring ? "A renovação é automática no cartão, pelo Asaas. Consulte as cobranças e datas já emitidas." : "Consulte o histórico ou fale com a gestão para conferir a configuração financeira."}</p>{isProtectedMembership(member.participationStatus) ? <a className="secondary-button" href="mailto:apttennisexclusive@gmail.com">Falar com a gestão <ArrowUpRight size={16} aria-hidden="true" /></a> : <button className="secondary-button" type="button" onClick={() => setTab("pagamentos")}>Ver pagamentos <ChevronRight size={16} aria-hidden="true" /></button>}</aside>
        </div>
        <section className="portal-shortcuts" aria-label="Acessos rápidos"><article><div><span className="shortcut-mark"><Trophy size={21} aria-hidden="true" /></span><div><strong>Ranking no Tweener</strong><small>{active ? "Ranking, jogos e evolução" : isProtectedMembership(member.participationStatus) ? "Acesso definido pela gestão" : "Liberado após confirmação"}</small></div></div>{rankingLink ? <a href={rankingLink} target="_blank" rel="noreferrer">Abrir Tweener <ArrowUpRight size={18} aria-hidden="true" /></a> : <button type="button" onClick={openLockedRanking}>Ver situação <ChevronRight size={18} aria-hidden="true" /></button>}</article><article><div><span className="shortcut-mark shortcut-mark--whatsapp"><UsersRound size={21} aria-hidden="true" /></span><div><strong>Comunidade APT</strong><small>{active ? "Avisos e conversas do clube" : isProtectedMembership(member.participationStatus) ? "Acesso definido pela gestão" : "Liberada com a participação"}</small></div></div>{communityLink ? <a href={communityLink} target="_blank" rel="noreferrer">Abrir WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a> : <button type="button" onClick={openLockedRanking}>Ver situação <ChevronRight size={18} aria-hidden="true" /></button>}</article></section>
        <section className="member-list portal-recent"><header><div><h2>Últimas cobranças</h2><p>Valores e datas confirmados pelo Asaas.</p></div><button className="table-action" type="button" onClick={() => setTab("pagamentos")}>Ver histórico <ChevronRight size={16} aria-hidden="true" /></button></header><InvoiceTable payments={payments.slice(0, 3)} /></section>
      </>}
      {tab === "pagamentos" && <>
        <header className="member-welcome"><div><h1>Pagamentos</h1><p>Método, cobertura e cada cobrança da sua participação.</p></div>{!courtesy && <button className="secondary-button" type="button" onClick={refreshBilling} disabled={billingRefreshing}>{billingRefreshing ? "Atualizando…" : "Atualizar situação"}</button>}</header>
        <section className="payment-overview" aria-label="Resumo dos pagamentos"><div><span>Valor mensal</span><strong>{amount}</strong></div><div><span>Cobertura paga até</span><strong>{financial.paidThrough ? shortDate(financial.paidThrough) : "Sem período registrado"}</strong></div><div><span>Próxima cobrança emitida</span><strong>{nextDue}</strong></div><div><span>Renovação</span><strong>{subscription?.cancel_at_period_end || subscription?.status === "cancelled" ? "Cancelada" : financial.recurring ? "Automática no cartão" : financial.billingMethod === "pix" ? "Pix mensal manual" : "A confirmar"}</strong></div></section>
        <section className="payment-method"><div><span className="card-glyph" aria-hidden="true">{financial.billingMethod === "pix" ? "Pix" : <CreditCard size={22} />}</span><div><strong>{billingMethodLabel(financial.billingMethod)}</strong><span>{financial.billingMethod === "pix" ? "Cada mensalidade precisa de um novo pagamento. Não há débito automático." : financial.recurring ? "Cartão e renovação permanecem no Asaas. O APT não recebe número, validade ou CVV." : "O método depende de confirmação financeira."}</span></div></div><div className="payment-method__action"><p>{financial.billingMethod === "pix" ? "Use sua cobrança identificada ou fale com a gestão para renovar a participação." : financial.checkoutAvailable ? "Conclua o checkout válido para ativar a recorrência." : financial.recurring ? "Peça à gestão um novo checkout para trocar o cartão." : "Fale com a gestão para conferir a configuração."}</p>{(financial.recurring || (financial.checkoutAvailable && financial.billingMethod !== "pix")) ? <button className="secondary-button" type="button" onClick={requestCardChange} disabled={cardRequesting}>{cardRequesting ? "Registrando…" : financial.checkoutAvailable && !financial.recurring ? "Concluir no Asaas" : "Solicitar troca de cartão"}</button> : <a className="secondary-button" href="mailto:apttennisexclusive@gmail.com">Falar com a gestão</a>}</div></section>
        <section className="member-list portal-history"><header className="panel-heading"><div><h2>Histórico financeiro</h2><p>{payments.length} {payments.length === 1 ? "cobrança registrada" : "cobranças registradas"} · Confirmado e recebido aparecem separadamente.</p></div></header><InvoiceTable payments={payments} /></section>
      </>}
      {tab === "perfil" && <>
        <header className="member-welcome"><div><h1>Meu cadastro</h1><p>Seus dados de contato e as configurações da participação.</p></div></header>
        <div className="portal-profile-layout"><aside className="portal-contact-sheet"><span className="portal-avatar" aria-hidden="true">{initials}</span><h2>{member.name}</h2><p>{member.classLevel || "Classe a confirmar"}</p><dl><div><dt>E-mail de acesso</dt><dd>{member.email}</dd></div><div><dt>WhatsApp</dt><dd>{member.whatsapp || "Não informado"}</dd></div><div><dt>CPF protegido</dt><dd>{member.cpfMasked}</dd></div>{member.joinedAt && <div><dt>No APT desde</dt><dd>{shortDate(member.joinedAt)}</dd></div>}</dl><p className="portal-contact-sheet__help">Para corrigir e-mail, classe ou CPF, fale com a gestão.</p><a className="text-button" href="mailto:apttennisexclusive@gmail.com">Falar com o APT <ArrowUpRight size={16} aria-hidden="true" /></a></aside>
          <form className="profile-form" ref={profileForm} onSubmit={saveProfile} aria-busy={profileSaving}><fieldset className="profile-edit"><legend>Dados de contato</legend><p>Atualize como a gestão entra em contato com você.</p><label className="field-label"><span>Nome completo</span><input required name="member-name" autoComplete="name" value={profileName} minLength={2} maxLength={100} onChange={(event) => { setProfileName(event.target.value); setProfileError(""); }} aria-describedby={profileError ? "profile-error" : undefined} /></label><label className="field-label"><span>WhatsApp com DDD</span><input required name="member-whatsapp" type="tel" inputMode="tel" autoComplete="tel" spellCheck={false} value={profileWhatsapp} maxLength={24} onChange={(event) => { setProfileWhatsapp(event.target.value); setProfileError(""); }} aria-describedby={profileError ? "profile-error" : undefined} /><small>Inclua o DDD. São aceitos de 10 a 13 dígitos.</small></label></fieldset>{profileError && <p className="field-error" id="profile-error" role="alert">{profileError}</p>}<div className="profile-actions"><button className="primary-button" type="submit" disabled={profileSaving}>{profileSaving ? "Salvando…" : "Salvar alterações"}</button><a className="secondary-button" href="/recuperar-senha">Alterar senha</a></div></form>
        </div>
        {financial.recurring && <section className="exit-section"><div><h2>Cancelar renovação</h2><p>Interrompe novas mensalidades. Se houver período já pago, o acesso segue até o final dele.</p></div>{!exitRequested && <><button className="text-button text-button--danger" type="button" aria-expanded={exitOpen} aria-controls="member-exit-confirm" onClick={() => setExitOpen((open) => !open)}>{exitOpen ? "Manter renovação" : "Cancelar minha renovação"}</button>{exitOpen && <div className="exit-confirm" id="member-exit-confirm"><p>Ao confirmar, nenhuma nova mensalidade será criada.</p><button className="danger-button" type="button" onClick={requestCancellation} disabled={cancelling}>{cancelling ? "Cancelando no Asaas…" : "Confirmar cancelamento"}</button></div>}</>}{exitRequested && <p className="success-message" role="status">Renovação cancelada. Nenhuma nova cobrança será criada.</p>}</section>}
      </>}
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
  const [newAthlete, setNewAthlete] = useState({ name: "", email: "", phone: "", classLevel: "" });
  const [invitationCopied, setInvitationCopied] = useState(false);

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
    return payload;
  }

  async function addAthlete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setError(""); setSummary(null); setInvitations([]); setInvitationCopied(false);
    try {
      const payload = await requestImport([{ ...newAthlete, status: "ATIVO" }], true);
      if (!payload.invitations?.length) throw new Error("Esse e-mail já pertence a um atleta cadastrado.");
      setNewAthlete({ name: "", email: "", phone: "", classLevel: "" });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível adicionar o atleta.");
    } finally { setWorking(false); }
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

  async function copySingleInvitation() {
    const invitation = invitations[0];
    if (!invitation) return;
    try { await navigator.clipboard.writeText(invitation.url); setInvitationCopied(true); }
    catch { window.prompt("Copie o link individual de cadastro:", invitation.url); }
  }

  return <section className="member-import-panel">
    <div><span>Novo atleta</span><h3>Adicionar atleta ao CRM</h3><p>Crie o registro e gere um link individual para o atleta completar CPF, senha e forma de pagamento.</p></div>
    <form className="member-create-form" onSubmit={addAthlete}><label className="field-label field-label--compact"><span>Nome completo</span><input required name="athlete-name" autoComplete="name" minLength={2} maxLength={100} value={newAthlete.name} onChange={(event) => setNewAthlete((current) => ({ ...current, name: event.target.value }))} /></label><label className="field-label field-label--compact"><span>E-mail</span><input required name="athlete-email" type="email" autoComplete="email" spellCheck={false} value={newAthlete.email} onChange={(event) => setNewAthlete((current) => ({ ...current, email: event.target.value }))} /></label><label className="field-label field-label--compact"><span>WhatsApp</span><input required name="athlete-whatsapp" type="tel" inputMode="tel" autoComplete="tel" spellCheck={false} pattern="[0-9]{10,13}" title="Informe entre 10 e 13 dígitos, incluindo o DDD." value={newAthlete.phone} onChange={(event) => setNewAthlete((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 13) }))} /></label><label className="field-label field-label--compact"><span>Classe</span><input name="athlete-class" autoComplete="off" value={newAthlete.classLevel} maxLength={80} onChange={(event) => setNewAthlete((current) => ({ ...current, classLevel: event.target.value }))} placeholder="Ex.: 4ª classe" /></label><button className="primary-button" type="submit" disabled={working}>{working ? "Adicionando…" : "Adicionar e gerar convite"}<span aria-hidden="true">→</span></button></form>
    <details className="member-import-batch"><summary>Importar vários atletas por CSV</summary><div><p>O arquivo deve ter NOME, EMAIL, TELEFONE, CLASSE e RANQUEADO. Apenas linhas ATIVO entram. CPF e cartão não são importados.</p><label className="secondary-button member-import-file"><input type="file" accept=".csv,text/csv" onChange={selectFile} /><span>{fileName || "Selecionar CSV"}</span></label></div></details>
    {working && <div className="loading-state"><i /><span>Validando a base…</span></div>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {summary && <div className="member-import-summary"><div><span>Ativos válidos</span><strong>{summary.activeRows}</strong></div><div><span>Novos</span><strong>{summary.newMembers}</strong></div><div><span>Já pendentes</span><strong>{summary.pendingExisting}</strong></div><div><span>Já cadastrados</span><strong>{summary.alreadyRegistered}</strong></div><div><span>Rejeitados</span><strong>{summary.rejected}</strong></div></div>}
    {summary && !invitations.length && <button className="primary-button" type="button" disabled={working || summary.rejected > 0 || summary.newMembers + summary.pendingExisting === 0} onClick={commitImport}>Importar e gerar {summary.newMembers + summary.pendingExisting} links <span aria-hidden="true">→</span></button>}
    {invitations.length > 0 && <div className="member-import-complete"><strong>{invitations.length} {invitations.length === 1 ? "link gerado" : "links gerados"}.</strong><span>Guarde agora: os tokens não ficam armazenados em texto aberto.</span>{invitations.length === 1 && <button className="primary-button" type="button" onClick={copySingleInvitation}>{invitationCopied ? "Link copiado" : `Copiar link de ${invitations[0].name}`}</button>}<button className="secondary-button" type="button" onClick={downloadInvitations}>Baixar {invitations.length === 1 ? "link" : "links"} em CSV</button></div>}
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
  onResendInvite,
  onCopyInvite,
  saving,
}: {
  application: ApplicationDetail | null;
  loading: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: (status?: "new" | "in_review" | "awaiting_info" | "approved" | "rejected") => void;
  onResendInvite: () => void;
  onCopyInvite: (token: string) => void;
  saving: boolean;
}) {
  const initialStatus = application?.status === "new" || application?.status === "awaiting_info" || application?.status === "rejected" ? application.status : "in_review";
  const [nextStatus, setNextStatus] = useState<"new" | "in_review" | "awaiting_info" | "rejected">(initialStatus);
  const detailDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = detailDialog.current;
    if (!element) return;
    element.showModal(); document.body.classList.add("drawer-open");
    return () => { element.close(); document.body.classList.remove("drawer-open"); };
  }, []);
  function closeDetail() { detailDialog.current?.close(); onClose(); }
  const whatsappUrl = application ? paymentReminderUrl({ name: application.name, whatsapp: application.whatsapp })?.replace(/\?text=.*/, "") : null;
  const statusLocked = application?.status === "registered";
  const isQuickRecadastro = application?.answers.origem === "Recadastro pelo link da comunidade";
  const isDirectInvite = application?.answers.origem === "Convite direto da gestão";
  return <dialog ref={detailDialog} className="crm-drawer" aria-labelledby="application-drawer-title" aria-busy={loading} onCancel={(event) => { event.preventDefault(); closeDetail(); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetail(); }}>
      <header className="crm-drawer__header"><div><span>Ficha do requerimento</span><h3 id="application-drawer-title">{application?.name || "Carregando…"}</h3>{application && <p>{application.email}</p>}</div><button className="crm-drawer__close" type="button" autoFocus onClick={closeDetail} aria-label="Fechar ficha">×</button></header>
      {loading && <div className="loading-state"><i /><span>Carregando ficha completa…</span></div>}
      {application && !loading && <div className="crm-drawer__body">
        <section className="crm-contact-card">
          <div><span className={`status-chip status-chip--${["approved", "invite_sent", "registered"].includes(application.status) ? "ok" : application.status === "rejected" ? "inactive" : "pending"}`}>{applicationStatusLabels[application.status]}</span><small>Recebido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(application.createdAt))}</small></div>
          <div className="crm-contact-actions"><a href={`mailto:${application.email}`}>E-mail</a>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}</div>
        </section>
        <section className="crm-stage-card" aria-labelledby="crm-stage-title">
          <div><span>{application.answers.origem ? "Aprovação rápida" : "Etapa do CRM"}</span><h4 id="crm-stage-title">{isQuickRecadastro ? "Veio pelo recadastro da comunidade." : isDirectInvite ? "Convite liberado diretamente pela gestão." : "Mova o lead com uma decisão clara."}</h4>{isQuickRecadastro && <p>Confira nome, e-mail e WhatsApp. Se reconhecer o integrante, aprove e gere o convite.</p>}</div>
          {statusLocked ? <p>Esta ficha já chegou a <strong>{applicationStatusLabels[application.status]}</strong>. O cadastro e a cobrança seguem no fluxo do membro.</p> : <><label><span>Próxima etapa</span><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}><option value="new">Novo</option><option value="in_review">Em análise</option><option value="awaiting_info">Aguardando retorno</option><option value="rejected">Não aprovado</option></select></label><button className="secondary-button" type="button" onClick={() => onSave(nextStatus)} disabled={saving || nextStatus === application.status || (nextStatus === "awaiting_info" && !note.trim())}>{saving ? "Salvando…" : "Aplicar etapa"}</button><button className="primary-button" type="button" onClick={() => onSave("approved")} disabled={saving}>{saving ? "Processando…" : "Aprovar e enviar convite"}<span aria-hidden="true">→</span></button>{["approved", "invite_sent"].includes(application.status) && <button className="secondary-button" type="button" onClick={onResendInvite} disabled={saving}>{saving ? "Enviando…" : "Reenviar convite por e-mail"}</button>}<p>{application.emailStatus === "sent" ? "E-mail do convite aceito pelo provedor." : application.emailStatus === "failed" ? "O provedor não confirmou este e-mail. Reenvie ou copie o novo link." : "O convite pode ser reenviado a qualquer momento."}</p></>}
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
  </dialog>;
}

function MemberManagementDetail({ member, loading, saving, refreshing, error, onClose, onSave, onRefresh, onDeleted }: {
  member: MemberRecord | null;
  loading: boolean;
  saving: boolean;
  refreshing: boolean;
  error: string;
  onClose: () => void;
  onSave: (changes: { participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string }) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onDeleted: (id: string) => void;
}) {
  const [participationStatus, setParticipationStatus] = useState("");
  const [twinnerUrl, setTwinnerUrl] = useState(member?.twinnerUrl || "");
  const [whatsappCommunityUrl, setWhatsappCommunityUrl] = useState(member?.whatsappCommunityUrl || "");
  const [note, setNote] = useState("");
  const [pixCandidates, setPixCandidates] = useState<PixCandidate[]>([]);
  const [pixWorking, setPixWorking] = useState(false);
  const [pixTo, setPixTo] = useState(saoPauloDate());
  const [pixFrom, setPixFrom] = useState(() => new Date(Date.parse(`${saoPauloDate()}T00:00:00Z`) - 89 * 86_400_000).toISOString().slice(0, 10));
  const [pixNextOffset, setPixNextOffset] = useState<number | null>(null);
  const [pixSearched, setPixSearched] = useState(false);
  const [pixError, setPixError] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteWorking, setDeleteWorking] = useState(false);
  const detailDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = detailDialog.current;
    if (!element) return;
    element.showModal(); document.body.classList.add("drawer-open");
    return () => { element.close(); document.body.classList.remove("drawer-open"); };
  }, []);
  function closeDetail() { detailDialog.current?.close(); onClose(); }
  const initialTweenerUrl = member?.twinnerUrl || "";
  const initialWhatsappUrl = member?.whatsappCommunityUrl || "";
  const contactWhatsappUrl = member ? paymentReminderUrl(member) : null;
  const reminderUrl = member && !member.financial?.covered && ["awaiting_payment", "pending_payment", "delinquent"].includes(member.financial?.participationStatus || "") ? contactWhatsappUrl : null;
  const directWhatsappUrl = contactWhatsappUrl?.replace(/\?text=.*/, "");
  const statusClass = member && ["active", "courtesy"].includes(member.participationStatus) ? "ok" : member?.participationStatus === "pending_payment" ? "pending" : "inactive";
  async function findPix(offset = 0) {
    if (!member) return;
    setPixWorking(true); setPixError("");
    if (offset === 0) { setPixCandidates([]); setPixNextOffset(null); setPixSearched(false); }
    try {
      const response = await fetch("/api/membros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, action: "find_pix", from: pixFrom, to: pixTo, offset }) });
      const payload = await response.json() as { candidates?: PixCandidate[]; nextOffset?: number | null; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar os Pix.");
      setPixCandidates((current) => offset ? [...current, ...(payload.candidates || [])] : payload.candidates || []);
      setPixNextOffset(payload.nextOffset ?? null); setPixSearched(true);
    } catch (candidateError) { setPixError(candidateError instanceof Error ? candidateError.message : "Não foi possível consultar os Pix."); }
    finally { setPixWorking(false); }
  }
  async function linkPix(candidate: PixCandidate) {
    if (!member || !window.confirm(`Vincular o Pix de ${candidate.payerName} a ${member.name}? Confira nome, valor, data e final do CPF antes de continuar.`)) return;
    setPixWorking(true);
    try {
      const response = await fetch("/api/membros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, action: "link_pix", paymentId: candidate.id, confirmation: member.name }) });
      const payload = await response.json() as { linked?: boolean; error?: string };
      if (!response.ok || !payload.linked) throw new Error(payload.error || "Não foi possível vincular o Pix.");
      setPixCandidates([]); setPixNextOffset(null); setPixSearched(false);
      await onRefresh();
    } catch (linkError) { window.alert(linkError instanceof Error ? linkError.message : "Não foi possível vincular o Pix."); }
    finally { setPixWorking(false); }
  }
  async function deleteMember() {
    if (!member || deleteConfirmation !== member.name) return;
    setDeleteWorking(true);
    try {
      const response = await fetch("/api/membros", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, confirmation: deleteConfirmation }) });
      const payload = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) throw new Error(payload.error || "Não foi possível excluir o cadastro.");
      onDeleted(member.id);
    } catch (deleteError) { window.alert(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o cadastro."); }
    finally { setDeleteWorking(false); }
  }
  return <dialog ref={detailDialog} className="crm-drawer" aria-labelledby="member-management-title" aria-busy={loading} onCancel={(event) => { event.preventDefault(); closeDetail(); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetail(); }}>
      <header className="crm-drawer__header"><div><span>Ficha do integrante</span><h3 id="member-management-title">{member?.name || "Carregando…"}</h3>{member && <p>{member.email}</p>}</div><button className="crm-drawer__close" type="button" autoFocus onClick={closeDetail} aria-label="Fechar ficha">×</button></header>
      {loading && <div className="loading-state"><i /><span>Carregando histórico do integrante…</span></div>}
      {member && !loading && <div className="crm-drawer__body">
        <section className="member-contact-detail" aria-labelledby="member-contact-title"><header><span className="record-avatar" aria-hidden="true">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><h4 id="member-contact-title">Contato do integrante</h4><span className={`status-chip status-chip--${statusClass}`}>{readableStatus(member.participationStatus, memberStatusLabels)}</span></div></header><dl><div><dt>E-mail</dt><dd><a href={`mailto:${member.email}`}>{member.email}</a></dd></div><div><dt>WhatsApp</dt><dd>{directWhatsappUrl ? <a href={directWhatsappUrl} target="_blank" rel="noreferrer">{member.whatsapp}</a> : member.whatsapp || "Não informado"}</dd></div><div><dt>Classe</dt><dd>{member.classLevel || "Não informada"}</dd></div><div><dt>No APT desde</dt><dd>{member.joinedAt ? shortDate(member.joinedAt) : "Não registrado"}</dd></div></dl><div className="crm-contact-actions"><a href={`mailto:${member.email}`}>Enviar e-mail <ArrowUpRight size={15} aria-hidden="true" /></a>{directWhatsappUrl && <a href={directWhatsappUrl} target="_blank" rel="noreferrer">Conversar no WhatsApp <ArrowUpRight size={15} aria-hidden="true" /></a>}{reminderUrl && <a href={reminderUrl} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}</div></section>
        <section className="member-financial-summary"><div><span>Método comprovado</span><strong>{billingMethodLabel(member.billingMethod)}</strong></div><div><span>Cobertura paga até</span><strong>{shortDate(member.financial?.paidThrough)}</strong></div><div><span>Último recebimento</span><strong>{shortDate(member.financial?.lastReceivedAt)}</strong></div><div><span>Próxima cobrança emitida</span><strong>{shortDate(member.financial?.nextInvoiceDueDate)}</strong></div><div><span>Dívida emitida vencida</span><strong>{currency(member.financial?.overdueCents || 0)}</strong></div><div><span>Mensalidade</span><strong>{member.amountCents ? currency(member.amountCents) : "Não definida"}</strong></div><p className="member-financial-reason">{financialReasons[member.financial?.reason] || "Conferir situação financeira"}{member.financial?.divergence && " · A participação registrada diverge da evidência financeira."}</p><button className="secondary-button member-financial-refresh" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Consultando Asaas…" : "Atualizar no Asaas"}</button></section>
        <details className="crm-answers" open><summary>Histórico financeiro <span>{member.payments?.length || 0}</span></summary><InvoiceTable payments={member.payments || []} /></details>
        <section className="crm-notes member-contact-notes" aria-labelledby="member-notes-title"><div><span>Histórico interno</span><h4 id="member-notes-title">Notas da gestão</h4><p>Contexto e próximos contatos, registrados pela equipe.</p></div><div className="crm-notes__history">{member.notes?.length ? member.notes.map((item) => <article key={item.id}><p>{item.body}</p><small>{item.created_by} · {dateTime(item.created_at)}</small></article>) : <p className="crm-notes__empty">Nenhuma nota registrada.</p>}</div><form onSubmit={async (event) => { event.preventDefault(); if (!note.trim() || saving) return; if (await onSave({ note: note.trim() })) setNote(""); }} aria-busy={saving}><label className="field-label field-label--compact"><span>Nova nota interna</span><textarea name="member-note" rows={3} maxLength={1200} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Registre contexto ou o próximo acompanhamento." /></label><button className="secondary-button" type="submit" disabled={saving || !note.trim()}>{saving ? "Salvando…" : "Registrar nota"}</button></form></section>
        <section className="member-monitoring"><header><span>Conciliação automática</span><h4>Monitoramento do cadastro</h4></header><dl><div><dt>Última tentativa</dt><dd>{dateTime(member.billingLastAttemptAt)}</dd></div><div><dt>Último sucesso</dt><dd>{dateTime(member.billingLastSuccessAt)}</dd></div><div><dt>Exceção</dt><dd>{member.billingIssue ? ({ missing_subscription: "Sem assinatura local", missing_provider: "Sem vínculo com o Asaas", provider_unresolved: "Cobrança não confirmada no Asaas", reconciliation_failed: "Falha de conciliação" } as Record<string, string>)[member.billingIssue] || "Revisão necessária" : "Nenhuma registrada"}</dd></div></dl></section>
        <section className="pix-reconciliation"><div><span>Conciliação Pix</span><h4>Recebimentos sem vínculo</h4><p>Escolha o período e confira o pagador antes de vincular. O APT não escolhe por semelhança de nome.</p></div><div className="pix-period"><label>De<input type="date" value={pixFrom} max={pixTo} disabled={pixWorking} onChange={(event) => { setPixFrom(event.target.value); setPixCandidates([]); setPixNextOffset(null); setPixSearched(false); }} /></label><label>Até<input type="date" value={pixTo} min={pixFrom} max={saoPauloDate()} disabled={pixWorking} onChange={(event) => { setPixTo(event.target.value); setPixCandidates([]); setPixNextOffset(null); setPixSearched(false); }} /></label><button className="secondary-button" type="button" onClick={() => findPix()} disabled={pixWorking}>{pixWorking ? "Consultando…" : "Localizar Pix"}</button></div>{pixError && <p className="field-error" role="alert">{pixError}</p>}{pixCandidates.length > 0 && <div className="pix-candidate-list">{pixCandidates.map((candidate) => <article key={candidate.id}><div><strong>{candidate.payerName}</strong><span>{currency(candidate.valueCents)} · {shortDate(candidate.paidAt)}{candidate.cpfLast4 ? ` · CPF final ${candidate.cpfLast4}` : " · CPF indisponível"}</span><small>{candidate.id} · {candidate.identityMatch === "reference" ? "Referência exata deste cadastro" : candidate.identityMatch === "customer" ? "Cliente já vinculado ao atleta" : "Identidade ainda não confirmada"}</small></div><button type="button" onClick={() => linkPix(candidate)} disabled={pixWorking}>Conferi e quero vincular</button></article>)}</div>}{pixNextOffset !== null && <button className="secondary-button" type="button" disabled={pixWorking} onClick={() => findPix(pixNextOffset)}>Carregar próxima página</button>}{!pixWorking && pixSearched && pixCandidates.length === 0 && <small>Nenhum Pix elegível nesta página do período consultado.{pixNextOffset !== null && " Há outra página para conferir."}</small>}{!pixSearched && <small>A consulta é feita somente quando solicitada.</small>}</section>
        {error && <p className="field-error" role="alert">{error}</p>}
        <details className="member-admin-details"><summary><Settings2 size={20} aria-hidden="true" /><span>Editar participação e acessos</span><ChevronRight size={18} aria-hidden="true" /></summary>        <form className="member-management-form" onSubmit={async (event) => { event.preventDefault(); const saved = await onSave({ participationStatus: participationStatus || undefined, twinnerUrl: twinnerUrl === initialTweenerUrl ? undefined : twinnerUrl, whatsappCommunityUrl: whatsappCommunityUrl === initialWhatsappUrl ? undefined : whatsappCommunityUrl }); if (saved) setParticipationStatus(""); }}>
          <div><span>Gestão do integrante</span><h4>Participação e acessos</h4></div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <label className="field-label field-label--compact"><span>Participação</span><select name="participation-status" value={participationStatus} onChange={(event) => setParticipationStatus(event.target.value)}><option value="">Manter: {readableStatus(member.participationStatus, memberStatusLabels)}</option><option value="pending_payment">Aguardando pagamento</option><option value="courtesy">Cortesia</option><option value="inactive">Inativo</option></select><small>Ativo e inadimplente são atualizados pelo fluxo financeiro.</small></label>
          <label className="field-label field-label--compact"><span>Link individual do Tweener</span><input name="tweener-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={twinnerUrl} onChange={(event) => setTwinnerUrl(event.target.value)} placeholder="https://app.tweener.club/…" /></label>
          <label className="field-label field-label--compact"><span>Convite individual do WhatsApp</span><input name="whatsapp-community-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={whatsappCommunityUrl} onChange={(event) => setWhatsappCommunityUrl(event.target.value)} placeholder="https://chat.whatsapp.com/…" /></label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar ficha"}<span aria-hidden="true">→</span></button>
        </form></details>

        <section className="member-communications"><header><span>Comunicações</span><h4>Envio, entrega e sinais coletados</h4><p>{member.emailConfiguration?.webhookSecretConfigured ? "Autenticação do webhook configurada. Tracking externo ainda não verificado." : "Webhook sem configuração confirmada neste ambiente."} Abertura e clique são sinais técnicos; não comprovam leitura humana.</p></header>{member.communications ? <><small>{member.communications.messages.length} de {member.communications.total} mensagens{member.communications.truncated ? " · exibindo as mais recentes" : ""}</small>{member.communications.messages.map((message) => <article key={message.id}><div><strong>{message.kind === "confirmed" ? "Confirmação financeira" : message.kind === "attention" ? "Atenção financeira" : "Lembrete de checkout"}</strong><span>{message.audience === "management" ? "Gestão" : "Membro"} · {message.deliveryIssue ? "Resultado do envio requer revisão" : message.sendingStatus === "sent" ? "Aceito pelo remetente" : message.sendingStatus === "suppressed" ? "Envio suprimido" : message.sendingStatus === "failed" ? "Falha de envio" : "Envio pendente"}</span></div><dl><div><dt>Aceito</dt><dd>{dateTime(message.acceptedAt)}</dd></div><div><dt>Servidor destinatário</dt><dd>{dateTime(message.recipientServerDeliveredAt)}</dd></div><div><dt>Abertura coletada</dt><dd>{dateTime(message.openedAt)}</dd></div><div><dt>Clique coletado</dt><dd>{dateTime(message.clickedAt)}</dd></div></dl><details><summary>Falhas e adiamentos coletados</summary><dl><div><dt>Entrega adiada</dt><dd>{dateTime(message.delayedAt)}</dd></div><div><dt>Falha</dt><dd>{dateTime(message.failedAt)}</dd></div><div><dt>Rejeição</dt><dd>{dateTime(message.bouncedAt)}</dd></div><div><dt>Reclamação</dt><dd>{dateTime(message.complainedAt)}</dd></div><div><dt>Suprimido pelo provedor</dt><dd>{dateTime(message.providerSuppressedAt)}</dd></div></dl></details>{!message.correlationAvailable && <small>Sem ID do provedor: sinais não correlacionados.</small>}{message.events.length > 0 && <details><summary>Eventos coletados ({message.events.length}{message.eventsTruncated ? ` de ${message.eventTotal}` : ""})</summary><ul>{message.events.map((event, index) => <li key={`${event.type}-${index}`}>{({ "email.sent": "Aceito", "email.delivered": "Entregue ao servidor", "email.opened": "Abertura", "email.clicked": "Clique", "email.delivery_delayed": "Entrega adiada", "email.bounced": "Rejeitado", "email.complained": "Reclamação", "email.failed": "Falha", "email.suppressed": "Suprimido" } as Record<string, string>)[event.type] || event.type} · {dateTime(event.occurredAt)}</li>)}</ul></details>}</article>)}{!member.communications.messages.length && <p>Nenhuma comunicação financeira registrada.</p>}</> : <p>Comunicações indisponíveis. Atualize a ficha para conferir.</p>}</section>
        <section className="member-lifecycle-actions"><div><span>Ciclo do atleta</span><h4>Inativar ou excluir</h4><p>Inativar preserva todo o histórico e é a opção correta para quem saiu do ranking.</p></div>{member.participationStatus !== "inactive" && <button className="secondary-button" type="button" disabled={saving} onClick={() => onSave({ participationStatus: "inactive" })}>Inativar atleta</button>}{member.participationStatus === "inactive" && <button className="secondary-button" type="button" disabled={saving} onClick={() => onSave({ participationStatus: "pending_payment" })}>Reativar como aguardando pagamento</button>}<div className="member-delete-control"><label className="field-label field-label--compact"><span>Excluir cadastro incompleto</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={member.canDelete ? `Digite: ${member.name}` : "Exclusão indisponível"} disabled={!member.canDelete || deleteWorking} /><small>{member.canDelete ? "Disponível porque não há acesso nem histórico financeiro." : member.deleteBlockedReason || "Use a inativação para preservar o histórico."}</small></label><button className="danger-button" type="button" onClick={deleteMember} disabled={!member.canDelete || deleteConfirmation !== member.name || deleteWorking}>{deleteWorking ? "Excluindo…" : "Excluir definitivamente"}</button></div></section>
      </div>}
  </dialog>;
}

function PaymentReminderQueue({ members }: { members: MemberRecord[] }) {
  const contacts = members.filter((member) => !member.financial.covered && ["awaiting_payment", "pending_payment", "delinquent"].includes(member.financial.participationStatus) && paymentReminderUrl(member));
  const [current, setCurrent] = useState(0);
  if (!contacts.length) return null;
  const member = contacts[current] || contacts[0];
  const position = contacts[current] ? current : 0;
  const reminderUrl = paymentReminderUrl(member);
  return <section className="payment-reminder-queue" aria-live="polite"><div><span>Cobrança por WhatsApp</span><h3>Fila de lembretes</h3><p>Abra uma conversa por vez, revise e envie pelo seu WhatsApp. Não há disparo automático.</p></div><div className="payment-reminder-queue__next"><small>{position + 1} de {contacts.length}</small><strong>{member.name}</strong><a className="small-primary" href={reminderUrl || undefined} target="_blank" rel="noreferrer" onClick={() => setCurrent((index) => Math.min(index + 1, contacts.length - 1))}>Abrir lembrete</a></div></section>;
}

type MemberOperationsStage = "checkout_pending" | "awaiting_payment" | "attention" | "active" | "cancellation_requested" | "inactive";

const memberOperationsStages: Array<{ id: MemberOperationsStage; label: string; mobileLabel: string; empty: string }> = [
  { id: "checkout_pending", label: "Cadastrou, não pagou", mobileLabel: "Não pagou", empty: "Nenhum cadastro concluído com checkout pendente." },
  { id: "awaiting_payment", label: "Aguardando pagamento", mobileLabel: "Aguardando", empty: "Nenhum integrante do grupo aguardando pagamento." },
  { id: "attention", label: "Atenção financeira", mobileLabel: "Ação", empty: "Nenhum membro precisa de atenção financeira." },
  { id: "active", label: "Ativos", mobileLabel: "Ativos", empty: "Nenhum membro ativo." },
  { id: "cancellation_requested", label: "Cancelamento solicitado", mobileLabel: "Cancelando", empty: "Nenhum cancelamento em andamento." },
  { id: "inactive", label: "Inativos", mobileLabel: "Inativos", empty: "Nenhum membro inativo." },
];

const memberOperationsDesktopStages = memberOperationsStages.filter((stage) => stage.id !== "inactive");

function memberOperationsStage(member: MemberRecord): MemberOperationsStage {
  if (member.participationStatus === "cancellation_requested") return member.financial?.covered ? "cancellation_requested" : "inactive";
  if (["inactive", "cancelled"].includes(member.participationStatus)) return "inactive";
  if (member.participationStatus === "courtesy") return "active";
  if (member.financial?.overdueCents || member.financial?.pixRenewalDue || (!member.financial?.covered && ["pending_payment", "active", "delinquent"].includes(member.participationStatus))) return "attention";
  if (member.financial?.configurationRequired) return "awaiting_payment";
  if (member.financial?.covered) return "active";
  if (member.checkoutStarted && member.checkoutAvailable) return "checkout_pending";
  return "awaiting_payment";
}

function memberOperationsStatusClass(stage: MemberOperationsStage) {
  return stage === "active" ? "ok" : stage === "inactive" || stage === "cancellation_requested" ? "inactive" : "pending";
}

function MemberOperationCard({ member, onManage, onResendCheckout, reminding }: {
  member: MemberRecord;
  onManage: (member: MemberRecord) => void;
  onResendCheckout: (member: MemberRecord) => void;
  reminding: boolean;
}) {
  const stage = memberOperationsStage(member);
  const dueLabel = stage === "checkout_pending" ? checkoutExpiryLabel(member.checkoutExpiresAt) : member.nextDueDate ? `Vence ${shortDate(member.nextDueDate)}` : readableStatus(member.subscriptionStatus, subscriptionStatusLabels);
  return <article className="member-operations-card">
    <button className="member-operations-card__body" type="button" onClick={() => onManage(member)} aria-label={`Abrir ficha de ${member.name}`}>
      <div className="member-cell"><span>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.classLevel || "Classe não informada"}</small></div></div>
      <div className="member-operations-card__meta"><span className={`status-chip status-chip--${memberOperationsStatusClass(stage)}`}>{stage === "checkout_pending" ? "Cadastro concluído" : readableStatus(member.participationStatus, memberStatusLabels)}</span><span className={`billing-method-chip billing-method-chip--${member.billingMethod || "unset"}`}>{billingMethodLabel(member.billingMethod)}</span><small>{financialReasons[member.financial?.reason] || dueLabel}</small><small>Coberto até {shortDate(member.financial?.paidThrough)}</small></div>
      <span className="member-operations-card__value"><small>Mensalidade</small><strong>{(member.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
      <span className="member-management-card__open">Abrir ficha completa <i aria-hidden="true">→</i></span>
    </button>
    {stage === "checkout_pending" && <div className="member-operations-card__checkout"><small>Lembretes automáticos em 1h e 20h</small><button type="button" onClick={() => onResendCheckout(member)} disabled={reminding || !member.checkoutAvailable}>{reminding ? "Confirmando no Asaas…" : member.checkoutAvailable ? "Reenviar checkout" : "Checkout indisponível"}</button></div>}
  </article>;
}

function MemberOperationsKanban({ members, onManage, onResendCheckout, remindingMemberId, mobileDefaultStage }: { members: MemberRecord[]; onManage: (member: MemberRecord) => void; onResendCheckout: (member: MemberRecord) => void; remindingMemberId: string; mobileDefaultStage: MemberOperationsStage | "action" | "all" }) {
  const [mobileStage, setMobileStage] = useState<MemberOperationsStage | "action" | "all">(mobileDefaultStage);
  const grouped = useMemo(() => Object.fromEntries(memberOperationsStages.map((stage) => [stage.id, members.filter((member) => memberOperationsStage(member) === stage.id)])) as Record<MemberOperationsStage, MemberRecord[]>, [members]);
  const mobileMembers = mobileStage === "all" ? members : mobileStage === "action" ? [...grouped.checkout_pending, ...grouped.awaiting_payment, ...grouped.attention] : grouped[mobileStage];
  const mobileTitle = mobileStage === "all" ? "Todos os resultados" : mobileStage === "action" ? "Ação necessária" : memberOperationsStages.find((stage) => stage.id === mobileStage)?.label || "Membros";
  const desktopStages = mobileDefaultStage === "inactive" ? memberOperationsStages.filter((stage) => stage.id === "inactive") : memberOperationsDesktopStages;
  return <section className="member-operations" aria-label="Operação de membros">
    <div className="member-operations__summary" aria-label="Resumo da operação">
      <div><span>Em ação</span><strong>{grouped.checkout_pending.length + grouped.awaiting_payment.length + grouped.attention.length}</strong></div>
      <div><span>Ativos</span><strong>{grouped.active.length}</strong></div>
      <div><span>Cancelando</span><strong>{grouped.cancellation_requested.length}</strong></div>
      <div><span>Inativos</span><strong>{grouped.inactive.length}</strong></div>
    </div>
    <div className="member-operations__mobile-stages" aria-label="Etapa dos membros">
      {([{ id: "all", mobileLabel: "Todos" }, { id: "action", mobileLabel: "Ação" }, ...memberOperationsStages.map(({ id, mobileLabel }) => ({ id, mobileLabel }))] as Array<{ id: MemberOperationsStage | "action" | "all"; mobileLabel: string }>).map((stage) => <button key={stage.id} type="button" aria-pressed={mobileStage === stage.id} onClick={() => setMobileStage(stage.id)}>{stage.mobileLabel}</button>)}
    </div>
    <section className="member-operations__mobile-list" aria-live="polite"><header><span>{mobileTitle}</span><strong>{mobileMembers.length}</strong></header><div>{mobileMembers.map((member) => <MemberOperationCard key={member.id} member={member} onManage={onManage} onResendCheckout={onResendCheckout} reminding={remindingMemberId === member.id} />)}{!mobileMembers.length && <p>Nenhum membro nesta etapa.</p>}</div></section>
    <div className="member-operations__desktop-board" data-columns={desktopStages.length}>{desktopStages.map((stage) => <section className="member-operations__lane" data-stage={stage.id} key={stage.id}><header><div><strong>{stage.label}</strong><span>{grouped[stage.id].length} {grouped[stage.id].length === 1 ? "membro" : "membros"}</span></div></header><div>{grouped[stage.id].map((member) => <MemberOperationCard key={member.id} member={member} onManage={onManage} onResendCheckout={onResendCheckout} reminding={remindingMemberId === member.id} />)}{!grouped[stage.id].length && <p>{stage.empty}</p>}</div></section>)}</div>
  </section>;
}

function MemberRecordsTable({ members, onManage, onResendCheckout, remindingMemberId }: { members: MemberRecord[]; onManage: (member: MemberRecord) => void; onResendCheckout: (member: MemberRecord) => void; remindingMemberId: string }) {
  return <section className="member-records">
    <div className="records-table-scroll" tabIndex={0} role="region" aria-label="Lista de membros, com rolagem horizontal" aria-describedby="member-records-scroll-hint">
      <table className="records-table">
        <caption className="sr-only">Membros e situação financeira</caption>
        <colgroup><col className="records-col-identity" /><col className="records-col-participation" /><col className="records-col-method" /><col className="records-col-coverage" /><col className="records-col-debt" /><col className="records-col-actions" /></colgroup>
        <thead><tr><th scope="col">Atleta</th><th scope="col">Participação</th><th scope="col">Método</th><th scope="col">Cobertura paga</th><th scope="col" className="invoice-value">Dívida emitida</th><th scope="col">Ações</th></tr></thead>
        <tbody>{members.map((member) => {
          const stage = memberOperationsStage(member);
          const participationLabel = isProtectedMembership(member.participationStatus) ? readableStatus(member.participationStatus, memberStatusLabels) : stage === "active" ? "Ativo" : memberOperationsStages.find((item) => item.id === stage)?.label;
          return <tr key={member.id}>
            <td><button className="record-identity" type="button" onClick={() => onManage(member)} aria-label={`Abrir ficha de ${member.name}`}><span className="record-avatar" aria-hidden="true">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></button></td>
            <td><span className={`status-chip status-chip--${memberOperationsStatusClass(stage)}`}>{participationLabel}</span><small>{member.classLevel || "Classe não informada"}</small></td>
            <td><span className="billing-method-chip">{billingMethodLabel(member.billingMethod)}</span></td>
            <td><strong>{shortDate(member.financial.paidThrough)}</strong><small>{financialReasons[member.financial.reason]}</small></td>
            <td className="invoice-value">{member.financial.overdueCents ? currency(member.financial.overdueCents) : "—"}</td>
            <td><div className="record-actions"><button className="table-action" type="button" onClick={() => onManage(member)}>Abrir ficha <ChevronRight size={16} aria-hidden="true" /></button>{member.checkoutAvailable && <button className="table-action" type="button" disabled={Boolean(remindingMemberId)} onClick={() => onResendCheckout(member)}>{remindingMemberId === member.id ? "Enviando…" : "Reenviar checkout"}</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <footer><span>{members.length} {members.length === 1 ? "membro neste recorte" : "membros neste recorte"} · Cobertura e dívida usam o histórico financeiro.</span><span className="table-scroll-hint" id="member-records-scroll-hint">Role para o lado para ver todas as colunas <ArrowUpRight size={14} aria-hidden="true" /></span></footer>
  </section>;
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

type ApplicationDecision = "new" | "in_review" | "awaiting_info" | "approved" | "rejected";
type ApplicationMove = { id: string; from: ApplicationRecord["status"]; to: ApplicationDecision; note: string };

function CrmKanban({ applications, onOpen, onMove }: { applications: ApplicationRecord[]; onOpen: (id: string) => void; onMove: (move: ApplicationMove) => Promise<{ ok: boolean; error?: string; noteRecorded?: boolean }> }) {
  const [draggingId, setDraggingId] = useState("");
  const [over, setOver] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<ApplicationMove | null>(null);
  const [note, setNote] = useState("");
  const dragSource = useRef<ApplicationRecord | null>(null);
  const moving = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const mutable = (status: string) => ["new", "in_review", "awaiting_info", "rejected"].includes(status);
  const writable = (status: string): status is ApplicationDecision => ["new", "in_review", "awaiting_info", "approved", "rejected"].includes(status);
  useEffect(() => {
    if (!decision || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); if (opener.current?.isConnected) opener.current.focus(); else document.getElementById(`crm-card-${decision.id}`)?.querySelector<HTMLButtonElement>(".crm-card__open")?.focus(); };
  }, [decision]);
  async function persist(move: ApplicationMove) {
    if (moving.current) return;
    moving.current = true; setSavingId(move.id); setError("");
    try {
      const result = await onMove(move);
      if (result.noteRecorded) setNote("");
      if (!result.ok) throw new Error(result.error || "Não foi possível salvar a nova etapa.");
      setDecision(null); setNote("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar a nova etapa."); }
    finally { moving.current = false; setSavingId(""); }
  }
  function requestMove(application: ApplicationRecord, to: string) {
    if (moving.current || decision || !mutable(application.status) || !writable(to) || application.status === to) return;
    setError("");
    const move = { id: application.id, from: application.status, to, note: "" };
    if (["awaiting_info", "approved", "rejected"].includes(to)) {
      opener.current = document.activeElement as HTMLElement | null;
      setNote(""); setDecision(move);
    } else { void persist(move); }
  }
  const candidate = decision && applications.find((application) => application.id === decision.id);
  return <div className="crm-board-shell">
    <p className="crm-board-hint" id="crm-move-hint">Arraste pela alça para mudar de etapa. No celular ou pelo teclado, use “Mover etapa”. Convites e cadastros acompanham o fluxo de entrada.</p>
    {error && !decision && <p className="field-error" role="alert">{error} O cartão conserva a última etapa confirmada.</p>}
    <nav className="crm-board-stages" aria-label="Etapas dos requerimentos">{crmColumns.map((column) => <a key={column.status} href={`#crm-column-${column.status}`}>{column.label}<span>{applications.filter((application) => application.status === column.status).length}</span></a>)}</nav>
    <section className="crm-kanban" id="pipeline-requerimentos" aria-label="Pipeline de requerimentos" aria-describedby="crm-move-hint" aria-busy={Boolean(savingId)} tabIndex={0}>{crmColumns.map((column) => {
      const cards = applications.filter((application) => application.status === column.status);
      return <section className={`crm-column${over === column.status ? " crm-column--drop" : ""}`} id={`crm-column-${column.status}`} key={column.status}
        onDragOver={(event) => { if (dragSource.current && writable(column.status) && dragSource.current.status !== column.status && !moving.current) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(column.status); } }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(""); }}
        onDrop={(event) => { event.preventDefault(); const original = dragSource.current; dragSource.current = null; setDraggingId(""); setOver(""); if (!original) return; const current = applications.find((item) => item.id === original.id); if (current?.status === original.status) requestMove(current, column.status); }}>
        <header><strong>{column.label}</strong><span>{cards.length}</span></header><div>{cards.map((application) => <article className={`crm-card${draggingId === application.id ? " crm-card--dragging" : ""}`} id={`crm-card-${application.id}`} key={application.id} draggable={mutable(application.status) && !savingId && !decision} aria-busy={savingId === application.id}
          onDragStart={(event) => { if (!mutable(application.status) || moving.current || decision) { event.preventDefault(); return; } dragSource.current = application; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", application.id); setDraggingId(application.id); setError(""); }}
          onDragEnd={() => { dragSource.current = null; setDraggingId(""); setOver(""); }}>
          <div className="crm-card__heading"><button type="button" className="crm-card__open" draggable={false} onClick={() => onOpen(application.id)} disabled={Boolean(savingId)}><span className="crm-card__top"><strong>{application.name}</strong><i aria-hidden="true">→</i></span><small>{application.city || "Cidade não informada"}</small><small>{application.classLevel || "Classe não informada"}</small><span className="crm-card__meta">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(application.createdAt))}</span></button>{mutable(application.status) && !savingId && !decision && <span className="crm-card__drag-handle" draggable={true} aria-hidden="true" title="Arraste para mudar de etapa"><GripVertical size={18} /></span>}</div>
          {mutable(application.status) && <label className="crm-card__move"><span className="sr-only">Mover {application.name} para</span><select value="" disabled={Boolean(savingId) || Boolean(decision)} onChange={(event) => requestMove(application, event.target.value)}><option value="">{savingId === application.id ? "Salvando…" : "Mover etapa…"}</option>{crmColumns.filter((item) => writable(item.status) && item.status !== application.status).map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}</select></label>}
        </article>)}{cards.length === 0 && <p className="crm-column-empty">{over === column.status ? "Solte para mover" : "Sem requerimentos"}</p>}</div>
      </section>;
    })}</section>
    {decision && <dialog ref={dialog} className="crm-move-dialog" aria-labelledby="crm-move-title" onCancel={(event) => { event.preventDefault(); if (!moving.current) { setDecision(null); setError(""); } }}>
      <form onSubmit={(event) => { event.preventDefault(); if (!candidate || candidate.status !== decision.from) { setError("Este requerimento mudou de etapa. Atualize o quadro antes de decidir."); return; } void persist({ ...decision, note: note.trim() }); }}>
        <span className="crm-move-eyebrow">Revisar decisão</span><h3 id="crm-move-title">{candidate?.name || "Requerimento"}</h3><p>Mover para <strong>{applicationStatusLabels[decision.to]}</strong>.</p>
        <p className="crm-move-impact">{decision.to === "approved" ? "A aprovação gera um convite de cadastro e tenta enviá-lo por e-mail." : decision.to === "rejected" ? "A decisão de não aprovar será comunicada ao candidato por e-mail." : "Registre o que falta. O contato com o candidato será feito pela gestão."}</p>
        <label className="field-label field-label--compact"><span>{decision.to === "awaiting_info" ? "O que ainda precisa ser informado?" : "Nota interna (opcional)"}</span><textarea value={note} required={decision.to === "awaiting_info"} maxLength={1200} rows={3} disabled={Boolean(savingId)} autoFocus={decision.to === "awaiting_info"} onChange={(event) => setNote(event.target.value)} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}<div className="crm-move-actions"><button type="button" className="secondary-button" autoFocus={decision.to !== "awaiting_info"} disabled={Boolean(savingId)} onClick={() => { setDecision(null); setError(""); }}>Cancelar</button><button type="submit" className={decision.to === "rejected" ? "danger-button" : "primary-button"} disabled={Boolean(savingId) || (decision.to === "awaiting_info" && !note.trim())}>{savingId ? "Salvando…" : decision.to === "approved" ? "Aprovar e enviar convite" : decision.to === "rejected" ? "Confirmar e comunicar" : "Registrar pendência"}</button></div>
      </form>
    </dialog>}
  </div>;
}

function currency(valueCents: number) {
  return (valueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const financialReasons: Record<string, string> = { manual: "Estado definido pela gestão", overdue: "Cobrança emitida e vencida", pix_renewal: "Pix com cobertura encerrada", configuration: "Conferir configuração financeira", uncovered: "Sem cobertura paga vigente", divergence: "Conferir divergência financeira", covered: "Cobertura paga vigente" };
const financialMetricIcons = { recurring: CreditCard, received: ArrowDownLeft, confirmed: CheckCheck, overdue: Wallet, pix_renewal: RefreshCw, configuration: Settings2 };
const financialMetricLabels: Record<FinancialMetric, string> = { recurring: "Cartão recorrente", received: "Recebido no mês", confirmed: "Confirmado no mês", overdue: "Emitido vencido", pix_renewal: "Renovação Pix", configuration: "Configuração pendente" };

function InvoiceTable({ payments, members, onManage }: { payments: FinancialPayment[]; members?: MemberRecord[]; onManage?: (member: MemberRecord) => void }) {
  return <><div className="invoice-table-scroll" tabIndex={0} role="region" aria-label="Histórico de cobranças, com rolagem horizontal"><table className="invoice-table"><caption className="sr-only">Cobranças e datas financeiras confirmadas pelo Asaas</caption><thead><tr>{members && <th scope="col">Atleta</th>}<th scope="col">Cobrança</th><th scope="col">Método e situação</th><th scope="col">Datas do provedor</th><th scope="col" className="invoice-value">Valor</th><th scope="col">Ação</th></tr></thead><tbody>{payments.map((payment) => {
    const member = members?.find((item) => item.id === payment.memberId);
    return <tr key={payment.id}>{members && <td>{member ? <button type="button" className="invoice-athlete" onClick={() => onManage?.(member)}>{member.name}</button> : "Vínculo indisponível"}</td>}<td className="invoice-reference"><strong>{payment.providerId || payment.id}</strong><small>Vence {shortDate(payment.dueDate)}</small></td><td><strong>{payment.billingType === "PIX" ? "Pix" : payment.billingType === "CREDIT_CARD" ? "Cartão" : "Método não confirmado"}</strong><span className={`status-chip status-chip--${payment.receivedAt || payment.confirmedAt ? "ok" : "pending"}`}>{paymentStatusLabel(payment.status)}</span></td><td><span>Recebido: {payment.receivedAt ? shortDate(payment.receivedAt) : "—"}</span><span>Confirmado: {payment.confirmedAt ? shortDate(payment.confirmedAt) : "—"}</span></td><td className="invoice-value">{currency(payment.valueCents)}</td><td>{payment.invoiceUrl ? <a href={payment.invoiceUrl} target="_blank" rel="noreferrer">Ver cobrança <ArrowUpRight size={16} aria-hidden="true" /></a> : <span>Sem link</span>}</td></tr>;
  })}</tbody></table>{!payments.length && <p className="ledger-empty">Nenhuma cobrança neste recorte.</p>}</div><p className="table-scroll-hint invoice-scroll-hint">Role para o lado para conferir datas, valores e ações <ArrowUpRight size={14} aria-hidden="true" /></p></>;
}

function RevenuePulse({ payments }: { payments: ManagementPayment[] }) {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const months = billingMonthKeys(saoPauloDate());
  const monthLabel = (month: string, long = false) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}) }).replace(".", "");
  const received = months.map((month) => financialMetricRows("received", [], payments, month));
  const confirmed = months.map((month) => financialMetricRows("confirmed", [], payments, month));
  const totals = received.map((month) => month.valueCents);
  const total = totals.reduce((sum, value) => sum + value, 0);
  const data = months.map((month, index) => ({ index, month: monthLabel(month), received: totals[index] / 100, confirmed: confirmed[index].valueCents / 100 }));
  return <section className="management-revenue" aria-labelledby="revenue-pulse-title">
    <header className="panel-heading"><div><h3 id="revenue-pulse-title">Recebimentos</h3><p>Recebimento no Asaas · últimos seis meses</p></div><div className="chart-total"><span>{activeMonth === null ? "Total no período" : `Recebido · ${monthLabel(months[activeMonth])}`}</span><strong>{currency(activeMonth === null ? total : totals[activeMonth])}</strong></div></header>
    <p className="sr-only" id="revenue-chart-description">Recebido e confirmado em liquidação são séries separadas pela data do provedor. Selecione um mês para consultar seus valores e cobranças. O total do período soma apenas recebimentos.</p>
    <div className="management-revenue__chart" onKeyDown={(event) => { if (event.key === "Escape") setActiveMonth(null); }}>
      <ClippedAreaChart data={data} activeIndex={activeMonth} onSelect={setActiveMonth} />
      {activeMonth !== null && <div className="revenue-tooltip" id="revenue-month-detail" role="status"><strong>{monthLabel(months[activeMonth], true)}</strong><dl><div><dt>Recebido</dt><dd>{currency(totals[activeMonth])}</dd></div><div><dt>Em liquidação</dt><dd>{currency(confirmed[activeMonth].valueCents)}</dd></div></dl><span>{received[activeMonth].invoices.length} {received[activeMonth].invoices.length === 1 ? "recebimento" : "recebimentos"} · {confirmed[activeMonth].invoices.length} em liquidação</span></div>}
    </div>
    <div className="revenue-legend"><span className="revenue-legend__received" /><p>Recebido</p><span className="revenue-legend__confirmed" /><p>Confirmado em liquidação</p></div>
    <details className="revenue-month-values"><summary>Consultar valores por mês</summary><div className="management-revenue__months" role="group" aria-label="Consultar mês do gráfico">{months.map((month, index) => <button type="button" key={month} aria-pressed={activeMonth === index} aria-label={`${monthLabel(month, true)}: recebido ${currency(totals[index])}, confirmado em liquidação ${currency(confirmed[index].valueCents)}`} aria-describedby="revenue-chart-description" onPointerEnter={() => setActiveMonth(index)} onFocus={() => setActiveMonth(index)} onBlur={() => setActiveMonth(null)} onClick={() => setActiveMonth(index)}><span>{monthLabel(month)}</span><strong>{currency(totals[index])}</strong></button>)}</div></details>
    {!total && <p className="chart-empty">Nenhum recebimento com data do provedor neste período.</p>}<p className="chart-instruction">Passe sobre o gráfico ou selecione um mês para conferir os valores.</p>
  </section>;
}

function ManagementDashboard({ applications, members, payments, loading, error, operations, onRetry, onManageMember, onOpenApplications, onOpenMembers }: {
  applications: ApplicationRecord[]; members: MemberRecord[]; payments: ManagementPayment[]; loading: boolean; error: string;
  operations: OperationsSummary | null; onRetry: () => void; onManageMember: (member: MemberRecord) => void;
  onOpenApplications: () => void; onOpenMembers: (filter: MemberFilter) => void;
}) {
  const [metric, setMetric] = useState<FinancialMetric | null>(null);
  if (loading) return <div className="management-dashboard-loading" role="status" aria-label="Atualizando os indicadores da gestão"><span /><span /><span /><span /><span /><span /></div>;
  if (error || members.some((member) => !member.financial)) return <section className="financial-error" role="alert"><h3>Indicadores indisponíveis</h3><p>{error || "A base financeira chegou incompleta."}</p><button className="secondary-button" type="button" onClick={onRetry}>Consultar novamente</button></section>;
  const month = saoPauloDate().slice(0, 7);
  const metrics = (["recurring", "received", "confirmed", "overdue", "pix_renewal", "configuration"] as FinancialMetric[]).map((key) => ({ key, ...financialMetricRows(key, members, payments, month) }));
  const selected = metrics.find((item) => item.key === metric);
  const missingDates = payments.filter((payment) => (["RECEIVED", "RECEIVED_IN_CASH"].includes(payment.status) && !payment.receivedAt) || (payment.status === "CONFIRMED" && !payment.confirmedAt)).length;
  const actionMembers = members.filter((member) => ["checkout_pending", "awaiting_payment", "attention"].includes(memberOperationsStage(member)));
  const attentionApplications = applications.filter((application) => ["new", "in_review", "awaiting_info"].includes(application.status));
  return <div className="management-dashboard">
    <div className="management-dashboard__main">
      <RevenuePulse payments={payments} />
      <aside className="management-dashboard__aside" aria-label="Base do clube e decisões">
        <section className="club-base-summary" aria-labelledby="club-base-title">
          <header><span>Base do clube</span><h3 id="club-base-title">Membros cadastrados</h3></header>
          <div className="club-base-summary__total"><strong>{members.length}</strong><span>{members.length === 1 ? "membro nesta base" : "membros nesta base"}</span></div>
          <dl><div><dt>Com cobertura paga</dt><dd>{members.filter((member) => member.financial.covered).length}</dd></div><div><dt>Cortesias</dt><dd>{members.filter((member) => member.participationStatus === "courtesy").length}</dd></div></dl>
          <button type="button" onClick={() => onOpenMembers("all")}>Consultar membros<ArrowUpRight size={18} aria-hidden="true" /></button>
        </section>
        <section className="management-decisions"><header className="panel-heading"><div><h3>Próximas decisões</h3><p>Filas que pedem sua atenção</p></div></header><div><button type="button" onClick={onOpenApplications}><span className="decision-icon"><ClipboardList size={20} aria-hidden="true" /></span><span><strong>Requerimentos</strong><small>{attentionApplications.length} para decidir</small></span><ChevronRight size={18} aria-hidden="true" /></button><button type="button" onClick={() => onOpenMembers("attention")}><span className="decision-icon"><Wallet size={20} aria-hidden="true" /></span><span><strong>Ação financeira</strong><small>{actionMembers.length} membros para conferir</small></span><ChevronRight size={18} aria-hidden="true" /></button><button type="button" onClick={() => onOpenMembers("communication")}><span className="decision-icon"><UsersRound size={20} aria-hidden="true" /></span><span><strong>Comunicações</strong><small>{members.filter((member) => member.communicationIssue).length} falhas ou revisões</small></span><ChevronRight size={18} aria-hidden="true" /></button></div></section>
      </aside>
    </div>
    <section className="financial-metrics" aria-label="Indicadores financeiros e suas listas">{metrics.map((item) => { const Icon = financialMetricIcons[item.key]; return <button key={item.key} type="button" aria-expanded={metric === item.key} aria-controls="financial-ledger" data-metric={item.key} onClick={() => setMetric(metric === item.key ? null : item.key)}><div className="metric-heading"><span>{financialMetricLabels[item.key]}</span><Icon size={20} aria-hidden="true" /></div><strong>{item.key === "configuration" ? item.athletes.length : currency(item.valueCents)}</strong><div className="metric-footer"><small>{item.key === "recurring" ? `${item.athletes.length} ${item.athletes.length === 1 ? "recorrência ativa" : "recorrências ativas"} · por mês` : item.key === "pix_renewal" ? `${item.athletes.length} ${item.athletes.length === 1 ? "renovação" : "renovações"} · referência mensal` : item.key === "configuration" ? "Cadastros para conferir" : `${item.invoices.length} ${item.invoices.length === 1 ? "cobrança" : "cobranças"} neste recorte`}</small><ChevronRight size={18} aria-hidden="true" /></div></button>; })}</section>
    <p className="financial-definition">Pix a renovar é uma referência mensal, sem duplicar cobrança vencida. Confirmado ainda em liquidação fica separado do recebido.{missingDates > 0 && ` ${missingDates} pagamentos sem data financeira ficam fora dos totais mensais.`}</p>
    {selected && <section className="financial-ledger" id="financial-ledger" aria-label={`Composição de ${financialMetricLabels[selected.key]}`}><header><div><span>Composição do indicador</span><h3>{financialMetricLabels[selected.key]}</h3><p>{selected.key === "received" || selected.key === "confirmed" ? `Calendário do provedor · ${month}` : selected.key === "pix_renewal" ? "Uma mensalidade de referência por atleta, sem dívida emitida duplicada." : "Registros exatos que formam este indicador."}</p></div><button type="button" className="secondary-button" onClick={() => setMetric(null)}>Fechar lista</button></header>{["received", "confirmed", "overdue"].includes(selected.key) ? <InvoiceTable payments={selected.invoices} members={members} onManage={onManageMember} /> : <div className="financial-athletes">{selected.athletes.map((athlete) => { const member = members.find((item) => item.id === athlete.id)!; return <button type="button" key={athlete.id} onClick={() => onManageMember(member)}><span><strong>{member.name}</strong><small>{financialReasons[member.financial.reason]} · {billingMethodLabel(member.billingMethod)}</small></span><strong>{selected.key === "configuration" ? "Abrir ficha →" : currency(member.amountCents)}</strong></button>; })}{!selected.athletes.length && <p className="ledger-empty">Nenhum atleta neste recorte.</p>}</div>}</section>}
    <section className="automation-health"><header className="panel-heading"><div><h3>Saúde da operação</h3><p>Conciliação e comunicações</p></div>{operations && <span className={`status-chip status-chip--${operations.latestRun?.ok ? "ok" : "pending"}`}>{operations.latestRun?.timedOut ? "Prazo atingido" : operations.latestRun?.ok === true ? "Execução concluída" : operations.latestRun?.ok === false ? "Execução com falha" : "Sem execução registrada"}</span>}</header>{operations ? <><p className="operation-timestamp">Última execução: {dateTime(operations.latestRun?.recordedAt)}</p><dl><div><dt>Cadastros conferidos</dt><dd>{operations.latestRun?.checked ?? "—"}</dd></div><div><dt>Falhas na execução</dt><dd>{operations.latestRun?.failed ?? "—"}</dd></div><div><dt>Exceções na execução</dt><dd>{operations.latestRun?.exceptions ?? "—"}</dd></div><div><dt>Webhooks pendentes</dt><dd>{operations.webhooks.pending}</dd></div><div><dt>Webhooks com falha</dt><dd>{operations.webhooks.failed}</dd></div><div><dt>Tentativas esgotadas</dt><dd>{operations.webhooks.exhausted}</dd></div><div><dt>Emails pendentes</dt><dd>{operations.emails.pending}</dd></div><div><dt>Falhas de envio</dt><dd>{operations.emails.failed}</dd></div><div><dt>Emails em revisão</dt><dd>{operations.emails.reviewRequired}</dd></div><div><dt>Exceções financeiras</dt><dd>{operations.exceptionCount}</dd></div></dl></> : <p className="panel-footnote">Monitoramento indisponível. Consulte novamente para conferir a operação.</p>}</section>
  </div>;
}

function DirectEnrollmentLinkPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/requerimentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rotate_direct_link" }) });
      const payload = await response.json() as { directToken?: string; error?: string };
      if (!response.ok || !payload.directToken) throw new Error(payload.error || "Não foi possível gerar o link direto.");
      setLink(`${window.location.origin}/cadastro?direto=${encodeURIComponent(payload.directToken)}`);
      onNotice("Link direto gerado. Guarde-o antes de sair desta tela.");
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "Não foi possível gerar o link direto."); }
    finally { setSubmitting(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); onNotice("Link direto copiado."); }
    catch { window.prompt("Copie o link direto de cadastro:", link); }
  }
  return <section className="crm-stage-card direct-invite" aria-labelledby="direct-link-title"><div><span>Link direto</span><h3 id="direct-link-title">Onboarding já aprovado?</h3><p>Gere uma única vez, guarde e envie este link apenas para quem você já aprovou. Ele não cria requerimento nem exige preenchimento na gestão.</p></div><div className="direct-link-actions"><button className="primary-button" type="button" onClick={generate} disabled={submitting}>{submitting ? "Gerando…" : link ? "Substituir link direto" : "Gerar link direto"}<span aria-hidden="true">→</span></button>{link && <><code>{link}</code><button className="invite-copy" type="button" onClick={copyLink}>Copiar link direto</button></>}{error && <p className="field-error" role="alert">{error}</p>}<small>Ao substituir, o link anterior é revogado. Este vale por um ano.</small></div></section>;
}

type MemberFilter = "all" | "attention" | "active" | "cancellation_requested" | "inactive" | "overdue" | "pix_renewal" | "configuration" | "divergence" | "communication";
type OperationsSummary = { latestRun: { recordedAt: string; ok?: boolean; timedOut?: boolean; checked?: number; exceptions?: number; failed?: number } | null; webhooks: { pending: number; failed: number; exhausted: number }; emails: { pending: number; failed: number; reviewRequired: number }; exceptionCount: number };
function dateTime(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Não registrada"; }

export function AdminPage() {
  const [tab, setTab] = useState<"painel" | "requerimentos" | "membros">("painel");
  const [memberView, setMemberView] = useState<"table" | "board">("table");
  const [query, setQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [payments, setPayments] = useState<ManagementPayment[]>([]);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [financialError, setFinancialError] = useState("");
  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationSaving, setApplicationSaving] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberRefreshing, setMemberRefreshing] = useState(false);
  const [checkoutRemindingMemberId, setCheckoutRemindingMemberId] = useState("");
  const [memberError, setMemberError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const memberTrigger = useRef<HTMLElement | null>(null);
  const applicationTrigger = useRef<HTMLElement | null>(null);
  const memberGeneration = useRef(0);
  const applicationGeneration = useRef(0);
  const filteredMembers = members.filter((member) => {
    const matchesQuery = `${member.name} ${member.email} ${member.whatsapp}`.toLowerCase().includes(query.toLowerCase());
    const stage = memberOperationsStage(member);
    const matchesStatus = memberFilter === "all" ||
      (memberFilter === "attention" && ["checkout_pending", "awaiting_payment", "attention"].includes(stage)) ||
      (memberFilter === "overdue" && member.financial?.overdueCents > 0) ||
      (memberFilter === "pix_renewal" && member.financial?.pixRenewalDue) ||
      (memberFilter === "configuration" && member.financial?.configurationRequired) ||
      (memberFilter === "divergence" && (member.financial?.divergence || member.billingIssue === "reconciliation_failed")) ||
      (memberFilter === "communication" && member.communicationIssue) || memberFilter === stage;
    return matchesQuery && matchesStatus;
  });
  const mobileDefaultStage: MemberOperationsStage | "action" | "all" = query.trim() || ["overdue", "pix_renewal", "configuration", "divergence", "communication"].includes(memberFilter) ? "all" : memberFilter === "all" || memberFilter === "attention" ? "action" : memberFilter as MemberOperationsStage;
  useEffect(() => {
    fetch("/api/auth/session").then(async (sessionResponse) => {
      const sessionPayload = await sessionResponse.json() as { user?: { role?: string } };
      if (!sessionResponse.ok || sessionPayload.user?.role !== "admin") { setAuthRequired(true); return; }
      const [applicationResponse, memberResponse, asaasResponse] = await Promise.all([
        fetch("/api/requerimentos"), fetch("/api/membros"), fetch("/api/asaas/status"),
      ]);
      const [applicationPayload, memberPayload, asaasPayload] = await Promise.all([
        applicationResponse.json() as Promise<{ applications?: ApplicationRecord[]; error?: string }>,
        memberResponse.json() as Promise<{ members?: MemberRecord[]; payments?: ManagementPayment[]; error?: string }>,
        asaasResponse.json() as Promise<{ connected?: boolean }>,
      ]);
      if (applicationResponse.ok) setApplications(applicationPayload.applications || []);
      else setNotice(applicationPayload.error || "Não foi possível carregar os requerimentos.");
      if (memberResponse.ok) {
        setMembers(memberPayload.members || []);
        setPayments(memberPayload.payments || []);
      } else { setFinancialError(memberPayload.error || "Não foi possível carregar os integrantes."); setNotice(memberPayload.error || "Não foi possível carregar os integrantes."); }
      setAsaasConnected(Boolean(asaasPayload.connected));
      const operationsResponse = await fetch("/api/membros?operations=1").catch(() => null);
      if (operationsResponse?.ok) { const result = await operationsResponse.json() as { operations?: OperationsSummary }; setOperations(result.operations || null); }
    }).catch(() => { setFinancialError("Não foi possível atualizar os dados financeiros agora."); setNotice("Não foi possível atualizar os dados agora."); }).finally(() => { setLoading(false); setAuthChecking(false); });
  }, []);
  async function openApplication(id: string) {
    const generation = ++applicationGeneration.current;
    if (!selectedApplication && !applicationLoading) applicationTrigger.current = document.activeElement as HTMLElement | null;
    setApplicationLoading(true); setApplicationSaving(false); setSelectedApplication(null); setReviewNote("");
    try {
      const response = await fetch(`/api/requerimentos?id=${encodeURIComponent(id)}`);
      const payload = await response.json() as { application?: ApplicationDetail; error?: string };
      if (!response.ok || !payload.application) throw new Error(payload.error);
      if (generation === applicationGeneration.current) setSelectedApplication(payload.application);
    } catch (error) { if (generation === applicationGeneration.current) setNotice(error instanceof Error ? error.message : "Não foi possível abrir o requerimento."); }
    finally { if (generation === applicationGeneration.current) setApplicationLoading(false); }
  }
  async function updateApplication(id: string, status?: ApplicationDecision, move?: { expectedStatus: ApplicationRecord["status"]; note: string }) {
    const generation = applicationGeneration.current;
    setApplicationSaving(true);
    let noteRecorded = false;
    try {
      const response = await fetch("/api/requerimentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, note: move?.note ?? reviewNote, ...(move ? { expectedStatus: move.expectedStatus } : {}) }) });
      const payload = await response.json() as { application?: ApplicationRecord; note?: AdminNote; noteRecorded?: boolean; error?: string; inviteDelivery?: "sent" | "manual"; emailStatus?: string };
      if (!response.ok || !payload.application) {
        noteRecorded = Boolean(payload.noteRecorded);
        if (noteRecorded && generation === applicationGeneration.current) {
          setReviewNote("");
          if (payload.note) setSelectedApplication((current) => current?.id === id && !current.notes.some((item) => item.id === payload.note!.id) ? { ...current, notes: [...current.notes, payload.note!] } : current);
        }
        throw new Error(`${payload.error || "Não foi possível registrar a decisão."}${noteRecorded ? " A nota foi registrada; a etapa não foi alterada por esta decisão." : ""}`);
      }
      setApplications((current) => current.map((item) => item.id === id ? payload.application! : item));
      if (generation === applicationGeneration.current) { setSelectedApplication((current) => current?.id === id ? { ...current, ...payload.application!, emailStatus: payload.emailStatus || current.emailStatus, notes: payload.note ? [...current.notes, payload.note] : current.notes } : current); setReviewNote(""); }
      setNotice(status === "approved" ? payload.inviteDelivery === "sent" ? "Convite enviado por e-mail." : "Convite criado, mas o e-mail não foi confirmado. Reenvie ou copie o link individual." : status === "awaiting_info" ? "Pedido de informação registrado. O contato ainda precisa ser feito pela gestão." : status ? "Decisão registrada." : "Nota registrada.");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível registrar a decisão.";
      setNotice(message);
      if (move) {
        try { const response = await fetch("/api/requerimentos"); const payload = await response.json() as { applications?: ApplicationRecord[] }; if (response.ok && Array.isArray(payload.applications)) setApplications(payload.applications); } catch { /* Preserve the last confirmed board when refresh is unavailable. */ }
      }
      return { ok: false, error: message, noteRecorded };
    }
    finally { if (generation === applicationGeneration.current) setApplicationSaving(false); }
  }
  async function resendApplicationInvite() {
    if (!selectedApplication) return;
    const generation = applicationGeneration.current;
    setApplicationSaving(true);
    try {
      const response = await fetch("/api/requerimentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend_invite", id: selectedApplication.id }) });
      const payload = await response.json() as { application?: ApplicationRecord; error?: string; inviteDelivery?: "sent" | "manual"; emailStatus?: string };
      if (!response.ok || !payload.application) throw new Error(payload.error || "Não foi possível reenviar o convite.");
      setApplications((current) => current.map((item) => item.id === payload.application!.id ? payload.application! : item));
      if (generation === applicationGeneration.current) setSelectedApplication((current) => current?.id === payload.application!.id ? { ...current, ...payload.application!, emailStatus: payload.emailStatus || current.emailStatus } : current);
      setNotice(payload.inviteDelivery === "sent" ? "Novo convite enviado por e-mail." : "Novo convite criado, mas o e-mail não foi confirmado. Copie o link individual.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível reenviar o convite."); }
    finally { if (generation === applicationGeneration.current) setApplicationSaving(false); }
  }
  async function openMember(member: MemberRecord, generation = ++memberGeneration.current) {
    if (generation !== memberGeneration.current) return;
    if (!selectedMember && !memberLoading) memberTrigger.current = document.activeElement as HTMLElement | null;
    setMemberError(""); setSelectedMember(member); setMemberLoading(true);
    try {
      const response = await fetch(`/api/membros?id=${encodeURIComponent(member.id)}`);
      const payload = await response.json() as { member?: MemberRecord; emailConfiguration?: MemberRecord["emailConfiguration"]; error?: string };
      if (!response.ok || !payload.member) throw new Error(payload.error || "Não foi possível abrir o integrante.");
      if (generation === memberGeneration.current) setSelectedMember({ ...payload.member, emailConfiguration: payload.emailConfiguration });
    } catch (error) { if (generation === memberGeneration.current) setMemberError(error instanceof Error ? error.message : "Não foi possível abrir o integrante."); }
    finally { if (generation === memberGeneration.current) setMemberLoading(false); }
  }
  async function updateMember(changes: { participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string }) {
    if (!selectedMember || Object.values(changes).every((value) => value === undefined)) { setMemberError("Faça ao menos uma alteração antes de salvar."); return false; }
    const generation = memberGeneration.current;
    setMemberError("");
    setMemberSaving(true);
    try {
      const response = await fetch("/api/membros", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedMember.id, ...changes }) });
      const payload = await response.json() as { member?: Pick<MemberRecord, "id" | "participationStatus" | "twinnerUrl" | "whatsappCommunityUrl">; note?: AdminNote; noteRecorded?: boolean; error?: string };
      if (!response.ok || !payload.member) {
        if (payload.noteRecorded && payload.note) {
          if (generation === memberGeneration.current) setSelectedMember((current) => current?.id === selectedMember.id && !(current.notes || []).some((item) => item.id === payload.note!.id) ? { ...current, notes: [...(current.notes || []), payload.note!] } : current);
          const message = `${payload.error || "Não foi possível concluir a atualização."} A nota foi registrada; o registro de auditoria não foi confirmado.`;
          if (generation === memberGeneration.current) setMemberError(message); setNotice(message);
          return Object.entries(changes).every(([field, value]) => field === "note" || value === undefined);
        }
        throw new Error(payload.error || "Não foi possível atualizar o integrante.");
      }
      setMembers((current) => current.map((member) => member.id === payload.member!.id ? { ...member, ...payload.member! } : member));
      if (generation === memberGeneration.current) setSelectedMember((current) => current?.id === payload.member!.id ? { ...current, ...payload.member!, notes: payload.note && !(current.notes || []).some((item) => item.id === payload.note!.id) ? [...(current.notes || []), payload.note] : current.notes } : current);
      await refreshMembers();
      await openMember({ ...selectedMember, ...payload.member }, generation);
      setNotice("Ficha do integrante atualizada.");
      return true;
    } catch (error) { if (generation === memberGeneration.current) setMemberError(error instanceof Error ? error.message : "Não foi possível atualizar o integrante."); return false; }
    finally { if (generation === memberGeneration.current) setMemberSaving(false); }
  }
  async function refreshMemberBilling() {
    if (!selectedMember || memberRefreshing) return;
    const generation = memberGeneration.current;
    setMemberRefreshing(true); setMemberError("");
    try {
      const response = await fetch("/api/membros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedMember.id, action: "refresh_billing" }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o Asaas.");
      const current = selectedMember;
      await refreshMembers();
      await openMember(current, generation);
      setNotice("Situação financeira atualizada no Asaas.");
    } catch (error) { if (generation === memberGeneration.current) setMemberError(error instanceof Error ? error.message : "Não foi possível consultar o Asaas."); }
    finally { if (generation === memberGeneration.current) setMemberRefreshing(false); }
  }
  async function resendMemberCheckout(member: MemberRecord) {
    if (checkoutRemindingMemberId) return;
    setCheckoutRemindingMemberId(member.id);
    try {
      const response = await fetch("/api/membros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, action: "resend_checkout" }) });
      const payload = await response.json() as { delivery?: "sent" | "failed" | "pending"; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível reenviar o checkout.");
      setNotice(payload.delivery === "sent" ? `Checkout reenviado para ${member.name}.` : `Lembrete de ${member.name} entrou na fila de envio.`);
      await refreshMembers();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível reenviar o checkout."); }
    finally { setCheckoutRemindingMemberId(""); }
  }
  async function copyInvite(token: string) {
    const url = `${window.location.origin}/cadastro?convite=${encodeURIComponent(token)}`;
    try { await navigator.clipboard.writeText(url); setNotice("Link individual copiado."); }
    catch { window.prompt("Copie o link individual de cadastro:", url); }
  }
  async function refreshMembers() { try { const response = await fetch("/api/membros"); const payload = await response.json() as { members?: MemberRecord[]; payments?: ManagementPayment[]; error?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível carregar as finanças."); setMembers(payload.members || []); setPayments(payload.payments || []); setFinancialError(""); setOperations(null); const health = await fetch("/api/membros?operations=1").catch(() => null); if (health?.ok) { const result = await health.json() as { operations?: OperationsSummary }; setOperations(result.operations || null); } } catch (error) { setFinancialError(error instanceof Error ? error.message : "Não foi possível carregar as finanças."); } }
  if (authChecking) return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="access-state"><span>Acesso administrativo</span><h1>Verificando acesso.</h1><p>A gestão é carregada somente para contas autorizadas.</p></main></div>;
  if (authRequired) return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="access-state"><span>Acesso administrativo</span><h1>Entre com uma conta autorizada.</h1><p>A base de candidatos, integrantes e pagamentos não fica exposta publicamente.</p><a className="primary-button" href="/entrar?next=/gestao">Entrar na gestão</a></main></div>;
  const attentionCount = applications.filter((item) => ["new", "in_review", "awaiting_info"].includes(item.status)).length;
  const memberActionCount = members.filter((member) => ["checkout_pending", "awaiting_payment", "attention"].includes(memberOperationsStage(member))).length;
  return <div className="apt-app apt-product-app"><a className="skip-link" href="#main-content">Pular para o conteúdo</a><main className="admin-page" id="main-content">
    <ProductSidebar
      ariaLabel="Gestão APT"
      brand={<Brand />}
      eyebrow="Gestão APT"
      title="Operação do clube"
      items={[
        { id: "painel", label: "Painel de decisão", mobileLabel: "Painel", icon: LayoutDashboard, active: tab === "painel", onSelect: () => setTab("painel") },
        { id: "requerimentos", label: "Requerimentos", mobileLabel: "CRM", icon: ClipboardList, active: tab === "requerimentos", onSelect: () => setTab("requerimentos"), badge: attentionCount || undefined },
        { id: "membros", label: "Membros", mobileLabel: "Membros", icon: UsersRound, active: tab === "membros", onSelect: () => setTab("membros"), badge: memberActionCount || undefined },
      ]}
      status={<div className="sidebar-footer"><span>APT Tennis Club</span><strong>Operação e relacionamento</strong></div>}
      footer={<SignOutButton />}
    />
    <section className="admin-content">
      <header className="product-topbar"><div><span>Gestão do clube</span><strong>{tab === "painel" ? "Painel de decisão" : tab === "requerimentos" ? "Requerimentos" : "Membros e cobranças"}</strong></div><span className={`connection-status ${asaasConnected ? "connection-status--ok" : ""}`}><i aria-hidden="true" />{asaasConnected ? "Asaas conectado" : "Asaas pendente"}</span></header>
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")}>Fechar</button></div>}
      {tab === "painel" && <><header className="admin-heading admin-heading--dashboard"><div><h2>Visão geral</h2><p>Receita, base e pendências da operação, em um só lugar.</p></div></header><ManagementDashboard applications={applications} members={members} payments={payments} loading={loading} error={financialError} operations={operations} onRetry={refreshMembers} onManageMember={(member) => { setTab("membros"); openMember(member); }} onOpenApplications={() => setTab("requerimentos")} onOpenMembers={(filter) => { setQuery(""); setMemberFilter(filter); setTab("membros"); }} /></>}
      {tab === "requerimentos" && <><header className="admin-heading"><div><h2>Requerimentos</h2><p>Decisões de entrada, com contexto.</p></div><span className="status-chip status-chip--pending">{attentionCount} {attentionCount === 1 ? "decisão" : "decisões"}</span></header><details className="direct-enrollment"><summary><Plus size={20} aria-hidden="true" /><span>Cadastro de atleta já aprovado</span><ChevronRight size={18} aria-hidden="true" /></summary><DirectEnrollmentLinkPanel onNotice={setNotice} /></details>{loading && <div className="loading-state"><i /><span>Atualizando requerimentos…</span></div>}{!loading && applications.length === 0 && <div className="empty-state empty-state--bordered"><strong>Nenhum requerimento registrado ainda.</strong><span>Os novos envios aparecerão aqui.</span></div>}{!loading && applications.length > 0 && <CrmKanban applications={applications} onOpen={openApplication} onMove={({ id, from, to, note }) => updateApplication(id, to, { expectedStatus: from, note })} />}{(selectedApplication || applicationLoading) && <ApplicationReviewDetail key={selectedApplication?.id || "loading-application"} application={selectedApplication} loading={applicationLoading} saving={applicationSaving} note={reviewNote} onNoteChange={setReviewNote} onClose={() => { applicationGeneration.current++; setSelectedApplication(null); setApplicationLoading(false); setApplicationSaving(false); setReviewNote(""); applicationTrigger.current?.focus(); }} onSave={(status) => { if (selectedApplication) updateApplication(selectedApplication.id, status); }} onResendInvite={resendApplicationInvite} onCopyInvite={copyInvite} />}</>}
      {tab === "membros" && <><header className="admin-heading"><div><h2>Membros e cobranças</h2><p>Operação em tempo real, com conciliação segura.</p></div></header><div className="admin-toolbar"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar membro</span><input name="member-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, e-mail ou WhatsApp" /></label><label className="filter-field"><SlidersHorizontal size={18} aria-hidden="true" /><span className="sr-only">Filtrar membros</span><select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value as typeof memberFilter)}><option value="all">Todos os estágios</option><option value="attention">Precisa de ação</option><option value="overdue">Dívida emitida vencida</option><option value="pix_renewal">Pix a renovar</option><option value="configuration">Configuração pendente</option><option value="divergence">Divergência financeira</option><option value="communication">Falha / revisão de comunicação</option><option value="active">Ativos</option><option value="cancellation_requested">Cancelamento</option><option value="inactive">Inativos</option></select></label><span className="records-count">{filteredMembers.length} de {members.length}</span><div className="view-switch" role="group" aria-label="Visualização dos membros"><button type="button" aria-pressed={memberView === "table"} onClick={() => setMemberView("table")}><Table2 size={18} aria-hidden="true" />Tabela</button><button type="button" aria-pressed={memberView === "board"} onClick={() => setMemberView("board")}><LayoutDashboard size={18} aria-hidden="true" />Quadro</button></div></div>{financialError && <p className="field-error" role="alert">{financialError}</p>}<PaymentReminderQueue members={members} /><div className="member-view">{memberView === "table" ? <MemberRecordsTable members={filteredMembers} onManage={openMember} onResendCheckout={resendMemberCheckout} remindingMemberId={checkoutRemindingMemberId} /> : <MemberOperationsKanban key={mobileDefaultStage} members={filteredMembers} onManage={openMember} onResendCheckout={resendMemberCheckout} remindingMemberId={checkoutRemindingMemberId} mobileDefaultStage={mobileDefaultStage} />}</div><details className="member-addition"><summary><Plus size={20} aria-hidden="true" /><span>Adicionar atleta ou importar base</span><ChevronRight size={18} aria-hidden="true" /></summary><MemberImportPanel onImported={refreshMembers} /></details>{filteredMembers.length === 0 && <div className="empty-state"><strong>Nenhum membro encontrado.</strong><span>Ajuste a busca ou o filtro.</span></div>}{(selectedMember || memberLoading) && <MemberManagementDetail member={selectedMember} loading={memberLoading} saving={memberSaving} refreshing={memberRefreshing} error={memberError} onClose={() => { memberGeneration.current++; setMemberError(""); setSelectedMember(null); setMemberLoading(false); setMemberSaving(false); setMemberRefreshing(false); memberTrigger.current?.focus(); }} onSave={updateMember} onRefresh={refreshMemberBilling} onDeleted={(id) => { setMembers((current) => current.filter((member) => member.id !== id)); setSelectedMember(null); setNotice("Cadastro incompleto excluído."); }} />}</>}
    </section>
  </main></div>;
}
