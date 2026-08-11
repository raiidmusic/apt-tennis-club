"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  city: string;
  classLevel: string;
  referrer: string;
  status: "new" | "in_review" | "awaiting_info" | "approved" | "rejected" | "invite_sent" | "registered";
  inviteToken?: string | null;
  createdAt: string;
};

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
};

type PortalPayload = {
  member: {
    name: string; email: string; whatsapp: string; cpfMasked: string; classLevel?: string | null;
    participationStatus: string; accessActive: boolean; twinnerUrl?: string | null; whatsappCommunityUrl?: string | null; joinedAt?: string | null;
  };
  subscription: { status?: string; amount_cents?: number; next_due_date?: string; current_period_end?: string; cancel_at_period_end?: boolean } | null;
  payments: Array<{ id: string; status: string; value_cents: number; due_date?: string; paid_at?: string; invoice_url?: string }>;
};

type FormDefinition = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  versions: Array<{ id: string; number: number; status: "draft" | "published" | "archived"; publishedAt?: string | null }>;
  publishedVersion: {
    id: string;
    number: number;
    status: "published";
    publishedAt?: string | null;
    submissionCount: number;
    questions: Array<{ id: string; key: string; position: number; title: string; helper?: string | null; type: string; required: boolean }>;
  } | null;
};

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
  return <header className="route-header"><a href="/" aria-label="Voltar para o site do APT"><Brand /></a><span>{label}</span></header>;
}

export function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/portal");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("next");
    if (requested?.startsWith("/") && !requested.startsWith("//")) setNextPath(requested);
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
  return <div className="apt-app"><RouteHeader label="Acesso seguro" /><main className="login-page" id="main-content"><section><span>Área reservada</span><h1>Entre para cuidar da sua participação.</h1><p>Use o e-mail e a senha definidos no cadastro aprovado.</p><form onSubmit={submit}><label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" /></label><label className="field-label field-label--compact"><span>Senha</span><input required name="password" type="password" minLength={8} autoComplete="current-password" /></label>{error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button primary-button--wide" type="submit" disabled={submitting}>{submitting ? "Entrando…" : "Entrar"}<span aria-hidden="true">→</span></button></form></section><aside><img src="/apt-motion-figma.jpg" width="900" height="1125" alt="Movimento de um jogador em uma quadra de tênis" /><div /></aside></main></div>;
}

export function LandingPage() {
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
            <blockquote>O ranking acontece no Twinner. Sua assinatura e sua participação ficam no APT.</blockquote>
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
              <details><summary>Onde acompanho o ranking e os pagamentos?</summary><p>O ranking fica no Twinner. Assinatura, pagamentos e situação da participação ficam na área do membro do APT.</p></details>
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
      <div className="question-content">
        <div className="question-copy" key={question.id}><span>{question.optional ? "Resposta opcional" : "Conte do seu jeito"}</span><h1>{question.title}</h1>{question.helper && <p>{question.helper}</p>}</div>
        <div className="answer-area">
          {(["text", "email", "tel", "number"] as QuestionType[]).includes(question.type) && <label className="field-label"><span>Sua resposta</span><input type={question.type} min={question.type === "number" ? 25 : undefined} max={question.type === "number" ? 45 : undefined} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") next(); }} placeholder={question.type === "email" ? "nome@exemplo.com" : question.type === "tel" ? "(61) 99999-9999" : "Digite aqui…"} aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "textarea" && <label className="field-label"><span>Sua resposta</span><textarea rows={4} value={answers[question.id] as string || ""} onChange={(event) => setAnswer(event.target.value)} placeholder="Escreva aqui…" aria-describedby={error ? "question-error" : undefined} /></label>}
          {question.type === "choice" && <fieldset className="choice-list"><legend className="sr-only">Escolha uma opção</legend>{question.options?.map((option, index) => <label className={answers[question.id] === option ? "choice choice--selected" : "choice"} key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswer(option)} /><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{option}</span><i aria-hidden="true">{answers[question.id] === option ? "✓" : ""}</i></label>)}</fieldset>}
          {question.type === "multi" && <fieldset className="choice-list choice-list--two"><legend className="sr-only">Escolha até três opções</legend>{question.options?.map((option) => { const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option); return <label className={selected ? "choice choice--selected" : "choice"} key={option}><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleMulti(option)} /><span className="choice-check">{selected ? "✓" : ""}</span><span>{option}</span></label>; })}</fieldset>}
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
  const [cpf, setCpf] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  useEffect(() => { setInviteToken(new URLSearchParams(window.location.search).get("convite") || ""); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(""); const data = new FormData(event.currentTarget);
    try { const response = await fetch("/api/cadastros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteToken, name: data.get("name"), cpf, email: data.get("email"), phone: data.get("phone"), password: data.get("password"), consent: data.get("consent") === "on" }) }); const payload = await response.json() as { error?: string; checkoutUrl?: string }; if (!response.ok) throw new Error(payload.error || "Não foi possível concluir o cadastro."); setPaymentLink(payload.checkoutUrl || ""); setSubmitted(true); }
    catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir o cadastro."); }
    finally { setSubmitting(false); }
  }
  if (submitted) return <div className="apt-app"><RouteHeader label="Cadastro do aprovado" /><main className="content-page success-page" id="main-content"><span className="success-symbol">✓</span><p>Cadastro recebido</p><h1>{paymentLink ? "Sua assinatura está pronta para ativação." : "Seus dados foram vinculados ao requerimento."}</h1><p>{paymentLink ? "Conclua o pagamento no ambiente seguro do Asaas. O APT não recebe nem armazena os dados completos do seu cartão." : "A cobrança será liberada quando valor e vencimento forem confirmados pela gestão."}</p>{paymentLink ? <a className="primary-button" href={paymentLink}>Abrir checkout seguro <span aria-hidden="true">↗</span></a> : <a className="secondary-button" href="/">Voltar ao site</a>}</main></div>;
  return <div className="apt-app"><RouteHeader label="Cadastro do aprovado" /><main className="enrollment-page" id="main-content">
    <aside className="enrollment-intro"><img src="/apt-ritual-figma.jpg" width="900" height="1125" alt="Jogador segura uma bola e uma raquete junto à rede" /><div className="enrollment-intro__shade" /><div><span>Link privado</span><h1>Você foi aprovado. Agora, vamos ativar sua participação.</h1><p>Dados financeiros e CPF ficam separados do requerimento inicial.</p></div></aside>
    <section className="enrollment-content">
      <header><span>Cadastro e assinatura</span><h2>Confirme os dados usados na cobrança.</h2><p>O cartão será informado somente no ambiente seguro do Asaas.</p></header>
      {!inviteToken && <div className="access-notice"><strong>Este cadastro precisa de um convite aprovado.</strong><span>Abra o link individual enviado pela gestão do APT.</span></div>}
      <form className="enrollment-form" onSubmit={submit}>
        <div className="fields-grid"><label className="field-label field-label--compact"><span>Nome completo</span><input required name="name" autoComplete="name" placeholder="Nome e sobrenome" /></label><label className="field-label field-label--compact"><span>CPF</span><input required inputMode="numeric" autoComplete="off" value={formatCpf(cpf)} onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="000.000.000-00" /></label><label className="field-label field-label--compact"><span>E-mail</span><input required name="email" type="email" autoComplete="email" placeholder="nome@exemplo.com" /></label><label className="field-label field-label--compact"><span>WhatsApp</span><input required name="phone" type="tel" autoComplete="tel" placeholder="(61) 99999-9999" /></label><label className="field-label field-label--compact"><span>Crie uma senha</span><input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" /></label></div>
        <div className="plan-row"><div><span>Participação mensal APT</span><strong>Valor confirmado no convite</strong><small>Renovação automática · cartão de crédito</small></div><span className="status-chip status-chip--ok">Checkout seguro</span></div>
        <label className="consent-row"><input required name="consent" type="checkbox" /><span>Autorizo o uso destes dados para administrar minha participação, comunicação e cobrança recorrente no APT.</span></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button primary-button--wide" type="submit" disabled={!inviteToken || submitting}>{submitting ? "Validando convite…" : "Continuar para assinatura"}<span aria-hidden="true">→</span></button>
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
  useEffect(() => {
    fetch("/api/portal").then(async (response) => {
      if (response.status === 401) { setAuthRequired(true); return null; }
      const payload = await response.json() as PortalPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar sua participação.");
      return payload;
    }).then((payload) => { if (payload) setData(payload); }).catch((error) => setNotice(error instanceof Error ? error.message : "Não foi possível carregar sua participação.")).finally(() => setLoading(false));
  }, []);
  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3600); }
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
  if (authRequired || !data) return <div className="apt-app"><RouteHeader label="Área do membro" /><main className="access-state"><span>Área reservada</span><h1>Entre para ver sua assinatura.</h1><p>Pagamentos, links do clube e dados pessoais ficam protegidos.</p><a className="primary-button" href="/entrar?next=/portal">Entrar na área do membro</a></main></div>;
  const { member, subscription, payments } = data;
  const initials = member.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const nextDue = subscription?.next_due_date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${subscription.next_due_date}T12:00:00`)) : "A definir";
  const active = member.accessActive;
  return <div className="apt-app"><RouteHeader label="Área do membro" /><main className="member-page" id="main-content">
    <aside className="member-rail"><Brand inverse large /><div className="member-profile"><span>{initials}</span><div><strong>{member.name}</strong><small>{member.classLevel || "Classe a confirmar"}</small></div></div><nav aria-label="Área do membro"><button className={tab === "inicio" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("inicio")}>Início</button><button className={tab === "pagamentos" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("pagamentos")}>Pagamentos</button><button className={tab === "perfil" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("perfil")}>Meu cadastro</button></nav><div className="rail-status"><i /> {active ? "Participação ativa" : "Participação em atualização"}</div></aside>
    <section className="member-content">
      {notice && <div className="toast" role="status">{notice}</div>}
      {tab === "inicio" && <><header className="member-welcome"><div><p>Olá, {member.name.split(" ")[0]}.</p><h1>Sua vida no APT, sem ruído.</h1></div>{member.twinnerUrl ? <a className="secondary-button" href={member.twinnerUrl} target="_blank" rel="noreferrer">Abrir ranking no Twinner <span aria-hidden="true">↗</span></a> : <button className="secondary-button" onClick={() => showNotice("O link do Twinner ainda não foi cadastrado pela gestão.")}>Abrir ranking no Twinner</button>}</header><section className="membership-hero"><div><span>Próxima mensalidade</span><strong>{nextDue}</strong><small>Renovação automática no cartão</small></div><div><span>Situação</span><strong>{active ? "Em dia" : "Aguardando regularização"}</strong><small>{subscription?.status || "Em configuração"}</small></div><button className="primary-button" onClick={() => setTab("pagamentos")}>Gerenciar pagamento</button></section><section className="member-list"><header><h2>Últimos movimentos</h2><span>{payments.length} registros</span></header>{payments.slice(0, 3).map((payment) => <div className="movement-row" key={payment.id}><i className={payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "movement-dot movement-dot--ok" : "movement-dot"} /><div><strong>Mensalidade APT</strong><span>{payment.due_date ? `Vencimento em ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${payment.due_date}T12:00:00`))}` : "Cobrança registrada"}</span></div><strong>{payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "Pago" : "Pendente"}</strong></div>)}{payments.length === 0 && <div className="empty-state"><strong>Nenhuma cobrança registrada.</strong><span>O histórico aparece após o primeiro evento do Asaas.</span></div>}</section></>}
      {tab === "pagamentos" && <><header className="member-welcome"><div><p>Pagamentos</p><h1>Assinatura e cobranças.</h1></div></header><section className="payment-method"><div><span className="card-glyph">••••</span><div><strong>Cartão protegido pelo Asaas</strong><span>Os dados completos nunca ficam no APT.</span></div></div><p>Quando a troca de cartão estiver disponível, ela será aberta no ambiente seguro do Asaas — nunca nesta página.</p></section><section className="member-list"><header><h2>Histórico</h2><span>{payments.length} cobranças</span></header>{payments.map((payment) => <div className="movement-row" key={payment.id}><i className={payment.status.includes("RECEIVED") || payment.status.includes("CONFIRMED") ? "movement-dot movement-dot--ok" : "movement-dot"} /><div><strong>{(payment.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><span>{payment.due_date || "Sem vencimento informado"}</span></div>{payment.invoice_url ? <a href={payment.invoice_url} target="_blank" rel="noreferrer">Abrir cobrança</a> : <strong>{payment.status}</strong>}</div>)}</section></>}
      {tab === "perfil" && <><header className="member-welcome"><div><p>Meu cadastro</p><h1>Dados da participação.</h1></div></header><section className="profile-data"><div><span>Nome</span><strong>{member.name}</strong></div><div><span>E-mail</span><strong>{member.email}</strong></div><div><span>WhatsApp</span><strong>{member.whatsapp}</strong></div><div><span>CPF</span><strong>{member.cpfMasked}</strong></div></section><section className="exit-section"><h2>Encerrar participação</h2><p>O encerramento interrompe novas cobranças. O acesso segue até o fim do período já pago.</p>{!exitRequested && <><button className="text-button text-button--danger" onClick={() => setExitOpen((open) => !open)}>{exitOpen ? "Voltar" : "Quero sair do ranking"}</button>{exitOpen && <div className="exit-confirm"><p>Ao confirmar, nenhuma nova mensalidade será criada.</p><button className="danger-button" onClick={requestCancellation} disabled={cancelling}>{cancelling ? "Cancelando no Asaas…" : "Cancelar renovação"}</button></div>}</>}{exitRequested && <p className="success-message" role="status">Renovação cancelada. Nenhuma nova cobrança será criada.</p>}</section></>}
    </section>
    <nav className="mobile-tabbar" aria-label="Área do membro"><button className={tab === "inicio" ? "active" : ""} onClick={() => setTab("inicio")}>Início</button><button className={tab === "pagamentos" ? "active" : ""} onClick={() => setTab("pagamentos")}>Pagamentos</button><button className={tab === "perfil" ? "active" : ""} onClick={() => setTab("perfil")}>Cadastro</button></nav>
  </main></div>;
}

export function AdminPage() {
  const [tab, setTab] = useState<"resumo" | "membros" | "formularios">("resumo");
  const [query, setQuery] = useState("");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formsError, setFormsError] = useState("");
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const filteredMembers = members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    fetch("/api/auth/session").then(async (sessionResponse) => {
      const sessionPayload = await sessionResponse.json() as { user?: { role?: string } };
      if (!sessionResponse.ok || sessionPayload.user?.role !== "admin") { setAuthRequired(true); return; }
      const [applicationResponse, memberResponse, asaasResponse, formResponse] = await Promise.all([
        fetch("/api/requerimentos"), fetch("/api/membros"), fetch("/api/asaas/status"), fetch("/api/formularios"),
      ]);
      const [applicationPayload, memberPayload, asaasPayload, formPayload] = await Promise.all([
        applicationResponse.json() as Promise<{ applications?: ApplicationRecord[] }>,
        memberResponse.json() as Promise<{ members?: MemberRecord[] }>,
        asaasResponse.json() as Promise<{ connected?: boolean }>,
        formResponse.json() as Promise<{ forms?: FormDefinition[]; error?: string }>,
      ]);
      setApplications(applicationPayload.applications || []); setMembers(memberPayload.members || []);
      setAsaasConnected(Boolean(asaasPayload.connected));
      if (formResponse.ok) {
        const loadedForms = formPayload.forms || [];
        setForms(loadedForms);
        setSelectedFormId(loadedForms[0]?.id || "");
      } else {
        setFormsError(formPayload.error || "Não foi possível carregar os formulários.");
      }
    }).catch(() => setNotice("Não foi possível atualizar os dados agora.")).finally(() => setLoading(false));
  }, []);
  async function updateApplication(id: string, status: "in_review" | "awaiting_info" | "approved" | "rejected") { try { const response = await fetch("/api/requerimentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); const payload = await response.json() as { application?: ApplicationRecord; error?: string; inviteDelivery?: "sent" | "manual" }; if (!response.ok || !payload.application) throw new Error(payload.error); setApplications((current) => current.map((item) => item.id === id ? payload.application! : item)); setNotice(status === "approved" ? payload.inviteDelivery === "sent" ? "Convite enviado por e-mail." : "Aprovado. Copie o link individual de cadastro." : "Decisão registrada."); } catch { setNotice("Não foi possível registrar a decisão."); } }
  async function copyInvite(application: ApplicationRecord) { if (!application.inviteToken) return; await navigator.clipboard.writeText(`${window.location.origin}/cadastro?convite=${application.inviteToken}`); setCopiedId(application.id); window.setTimeout(() => setCopiedId(""), 2200); }
  if (authRequired) return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="access-state"><span>Acesso administrativo</span><h1>Entre com uma conta autorizada.</h1><p>A base de candidatos, integrantes e pagamentos não fica exposta publicamente.</p><a className="primary-button" href="/entrar?next=/gestao">Entrar na gestão</a></main></div>;
  const activeCount = members.filter((member) => member.participationStatus === "active").length;
  const inactiveCount = members.filter((member) => ["inactive", "cancelled"].includes(member.participationStatus)).length;
  const attentionCount = applications.filter((item) => ["new", "in_review", "awaiting_info"].includes(item.status)).length;
  const selectedForm = forms.find((form) => form.id === selectedFormId) || forms[0];
  return <div className="apt-app"><RouteHeader label="Gestão APT" /><main className="admin-page" id="main-content">
    <aside className="admin-sidebar"><Brand inverse /><div><span>Gestão APT</span><h1>Clube em movimento.</h1></div><nav aria-label="Gestão"><button className={tab === "resumo" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("resumo")}>Visão geral</button><button className={tab === "membros" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("membros")}>Membros e cobranças</button><button className={tab === "formularios" ? "side-link side-link--active" : "side-link"} onClick={() => setTab("formularios")}>Formulários</button></nav><div className="sidebar-footer"><span>Integração financeira</span><strong>{asaasConnected ? "Asaas conectado" : "Asaas pendente"}</strong></div></aside>
    <section className="admin-content">
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")}>Fechar</button></div>}
      {tab === "resumo" && <><header className="admin-heading"><div><span>Visão geral</span><h2>O que pede atenção hoje.</h2></div><span className={asaasConnected ? "status-chip status-chip--ok" : "status-chip status-chip--pending"}>{asaasConnected ? "Asaas conectado" : "Integração pendente"}</span></header><section className="signal-strip"><div><span>Membros ativos</span><strong>{activeCount}</strong><small>na cobrança recorrente</small></div><div><span>Inativos</span><strong>{inactiveCount}</strong><small>fora da renovação</small></div><div><span>Em análise</span><strong>{attentionCount}</strong><small>pedem uma decisão</small></div><div><span>MRR ativo</span><strong>{(members.filter((item) => item.participationStatus === "active").reduce((total, item) => total + item.amountCents, 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</strong><small>calculado pela base ativa</small></div></section><section className="review-queue"><header><div><h3>Requerimentos recentes</h3><span>{attentionCount} aguardando decisão</span></div></header>{loading && <div className="loading-state"><i /><span>Atualizando requerimentos…</span></div>}{!loading && applications.length === 0 && <div className="empty-state"><strong>Nenhum requerimento registrado ainda.</strong><span>Os novos envios aparecerão aqui.</span></div>}{applications.map((application) => <article className="candidate-row" key={application.id}><div className="candidate-identity"><span>{application.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{application.name}</strong><small>{application.city || "Cidade não informada"} · {application.classLevel || "Classe não informada"}</small></div></div><div className="candidate-referrer"><span>Indicação</span><strong>{application.referrer}</strong></div><span className={["approved", "invite_sent", "registered"].includes(application.status) ? "status-chip status-chip--ok" : application.status === "rejected" ? "status-chip status-chip--inactive" : "status-chip status-chip--pending"}>{application.status === "registered" ? "Cadastrado" : application.status === "invite_sent" ? "Convite enviado" : application.status === "approved" ? "Aprovado" : application.status === "rejected" ? "Não aprovado" : application.status === "awaiting_info" ? "Aguardando informação" : "Em análise"}</span><div className="row-actions">{["new", "in_review", "awaiting_info"].includes(application.status) && <><button onClick={() => updateApplication(application.id, "rejected")}>Não aprovar</button><button onClick={() => updateApplication(application.id, "awaiting_info")}>Pedir informação</button><button className="small-primary" onClick={() => updateApplication(application.id, "approved")}>Aprovar e gerar convite</button></>}{application.inviteToken && <button className="small-primary" onClick={() => copyInvite(application)}>{copiedId === application.id ? "Link copiado" : "Copiar link de cadastro"}</button>}{["approved", "invite_sent"].includes(application.status) && !application.inviteToken && <button onClick={() => updateApplication(application.id, "approved")}>Gerar novo link</button>}</div></article>)}</section></>}
      {tab === "membros" && <><header className="admin-heading"><div><span>Membros e cobranças</span><h2>Uma base única para saber quem está ativo.</h2></div><label className="search-field"><span className="sr-only">Buscar membro</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" /></label></header><div className="table-wrap"><table><thead><tr><th>Integrante</th><th>Participação</th><th>Assinatura</th><th>Próximo vencimento</th><th>Atraso</th></tr></thead><tbody>{filteredMembers.map((member) => <tr key={member.id}><td><div className="member-cell"><span>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.email} · {member.classLevel || "Sem classe"}</small></div></div></td><td><span className={member.participationStatus === "active" ? "status-chip status-chip--ok" : member.participationStatus === "pending_payment" ? "status-chip status-chip--pending" : "status-chip status-chip--inactive"}>{member.participationStatus}</span></td><td>{member.subscriptionStatus}</td><td>{member.nextDueDate || "—"}</td><td>{member.overdueDays ? `${member.overdueDays} dias` : "—"}</td></tr>)}</tbody></table>{filteredMembers.length === 0 && <div className="empty-state"><strong>Nenhum membro encontrado.</strong><span>Tente outro nome.</span></div>}</div></>}
      {tab === "formularios" && <><header className="admin-heading"><div><span>Formulários</span><h2>A conversa atual de entrada.</h2></div>{selectedForm?.publishedVersion && <span className="status-chip status-chip--ok">Versão {selectedForm.publishedVersion.number} publicada</span>}</header>{formsError && <section className="empty-state empty-state--bordered"><strong>Versionamento ainda indisponível.</strong><span>{formsError}</span></section>}{!formsError && forms.length === 0 && <section className="empty-state empty-state--bordered"><strong>Nenhum formulário publicado.</strong><span>Aplique a migration de formulários para registrar a versão atual.</span></section>}{selectedForm && <section className="forms-layout"><aside className="form-index" aria-label="Formulários cadastrados">{forms.map((form) => <button className={form.id === selectedForm.id ? "form-index__item form-index__item--active" : "form-index__item"} key={form.id} onClick={() => setSelectedFormId(form.id)}><strong>{form.name}</strong><small>{form.publishedVersion ? `${form.publishedVersion.questions.length} perguntas · ${form.publishedVersion.submissionCount} envios` : "Sem versão publicada"}</small></button>)}</aside><div className="form-editor"><header><div><span>{selectedForm.name}</span><p>{selectedForm.description}</p><small>A versão publicada é imutável. Para editar, será necessário criar e validar uma nova versão antes da publicação.</small></div>{selectedForm.publishedVersion?.publishedAt && <time dateTime={selectedForm.publishedVersion.publishedAt}>Publicada em {new Intl.DateTimeFormat("pt-BR").format(new Date(selectedForm.publishedVersion.publishedAt))}</time>}</header>{selectedForm.publishedVersion ? <ol className="question-editor-list">{selectedForm.publishedVersion.questions.map((item) => <li key={item.id}><span className="drag-index">{String(item.position).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.required ? "Obrigatória" : "Opcional"} · {item.type}</small></span></li>)}</ol> : <div className="empty-state"><strong>Sem versão publicada.</strong><span>Crie uma nova versão antes de disponibilizar este formulário.</span></div>}</div></section>}</>}
    </section>
    <nav className="admin-mobile-nav" aria-label="Gestão"><button className={tab === "resumo" ? "active" : ""} onClick={() => setTab("resumo")}>Visão geral</button><button className={tab === "membros" ? "active" : ""} onClick={() => setTab("membros")}>Membros</button><button className={tab === "formularios" ? "active" : ""} onClick={() => setTab("formularios")}>Formulários</button></nav>
  </main></div>;
}
