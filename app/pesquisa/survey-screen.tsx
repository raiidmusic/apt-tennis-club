"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Download, LayoutDashboard, RefreshCw } from "lucide-react";
import { ProductSidebar } from "../../components/ui/sidebar";
import { Brand } from "../apt-app";
import type { MemberSurvey } from "../../lib/member-survey";
import styles from "./survey.module.css";

type Access = { title: string; memberName: string; submittedAt: string | null; state: "open" | "closed" | "submitted"; formUrl?: string };
type Result = { survey: MemberSurvey; responses: Array<{ id: string; member_id: string; received_at: string; answers: Record<string, number | string | string[]>; members?: { name: string; class_level: string | null } }> };
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

export function MemberSurveyScreen({ slug }: { slug: string }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/pesquisas?survey=${encodeURIComponent(slug)}`, { signal });
      const payload = await response.json();
      if (signal?.aborted) return;
      setLogin(response.status === 401);
      if (response.status === 401 || response.status === 403) setAccess(null);
      if (!response.ok) throw new Error(payload.error || "Não foi possível abrir a pesquisa.");
      // Keep the current frame URL while the member answers; each status check issues a fresh context.
      setAccess(current => current?.formUrl && payload.state === "open" ? { ...payload, formUrl: current.formUrl } : payload);
      setError("");
    } catch (caught) {
      if (signal?.aborted) return;
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a pesquisa.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [slug]);
  useEffect(() => {
    const controller = new AbortController();
    setAccess(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const open = access?.state === "open";
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let checks = 0;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (++checks > 40) { window.clearInterval(interval); return; }
      void load(controller.signal);
    }, 15_000);
    return () => { window.clearInterval(interval); controller.abort(); };
  }, [open, load]);

  return <div className="apt-app apt-club">
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header className="route-header"><a href="/membros" aria-label="Área do membro"><Brand /></a><a className={styles.back} href="/membros"><ArrowLeft size={16} aria-hidden="true" /> Área do membro</a></header>
    <main id="main-content" className={styles.member}>
      <header className={styles.intro}><p className={styles.eyebrow}>Sua experiência na APT</p><h1>{access?.title || "Queremos ouvir você."}</h1><p>Sua opinião ajuda a definir o que melhorar nos jogos e na convivência do clube.</p></header>
      {loading && <p role="status">Abrindo a pesquisa…</p>}
      {error && <section className={styles.notice} role="alert"><h2>{login ? "Entre na sua conta APT." : open ? "Não foi possível conferir o registro." : "A pesquisa não está disponível."}</h2><p>{error}</p>{login ? <a className="primary-button" href={`/entrar?next=${encodeURIComponent(`/pesquisa/${slug}`)}`}>Entrar para responder</a> : <button className="secondary-button" onClick={() => { setLoading(true); void load(); }}>Tentar novamente</button>}</section>}
      {access?.state === "submitted" && <section className={styles.notice} role="status"><h2>Sua resposta está registrada.</h2><p>Obrigado, {access.memberName.split(" ")[0]}. Recebemos sua opinião em {access.submittedAt ? date(access.submittedAt) : "nosso sistema"}.</p><a className="primary-button" href="/membros">Voltar à área do membro</a></section>}
      {access?.state === "closed" && <section className={styles.notice}><h2>Esta pesquisa está fechada.</h2><p>Não estamos recebendo novas respostas neste momento.</p><a className="secondary-button" href="/membros">Voltar à área do membro</a></section>}
      {open && access?.formUrl && <><p className={styles.privacy}>Esta pesquisa é identificada. A gestão da APT poderá consultar suas respostas vinculadas ao seu cadastro.</p><iframe className={styles.frame} src={access.formUrl} title={access.title} referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin" /><footer className={styles.confirm}><p>Já terminou? Confira se sua resposta foi registrada.</p><button className="secondary-button" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" /> Conferir registro</button></footer></>}
    </main>
  </div>;
}

function Distribution({ title, values, total }: { title: string; values: Array<[string, number]>; total: number }) {
  return <section className={styles.distribution}><h3>{title}</h3>{values.length ? <ul>{values.map(([label, count]) => <li key={label}><span>{label}</span><meter min={0} max={total || 1} value={count} aria-label={`${label}: ${count} de ${total}`} /><strong>{count}</strong></li>)}</ul> : <p>Aguardando respostas.</p>}</section>;
}

export function SurveyResultsScreen() {
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/pesquisas?admin=1", { signal });
      const payload = await response.json();
      if (signal?.aborted) return;
      setLogin(response.status === 401);
      if (response.status === 401 || response.status === 403) setResults([]);
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar as pesquisas.");
      setResults(payload.results); setError("");
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Não foi possível carregar as pesquisas."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  return <div className="apt-app apt-product-app"><a className="skip-link" href="#main-content">Pular para o conteúdo</a><main className="admin-page" id="main-content">
    <ProductSidebar ariaLabel="Gestão APT" brand={<Brand />} eyebrow="Gestão APT" title="Operação do clube" items={[
      { id: "panel", label: "Painel de decisão", icon: LayoutDashboard, href: "/gestao" },
      { id: "surveys", label: "Pesquisas", icon: ClipboardList, active: true, href: "/gestao/pesquisas" },
    ]} />
    <section className={`admin-content ${styles.admin}`}><header className={styles.toolbar}><div><p className={styles.eyebrow}>Relacionamento com os membros</p><h1>Pesquisas</h1></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> {loading ? "Carregando…" : "Atualizar"}</button></header>
      {error && <div className={styles.notice} role="alert"><p>{error}</p>{login && <a className="primary-button" href="/entrar?next=/gestao/pesquisas">Entrar na gestão</a>}</div>}
      {!loading && !error && results.length === 0 && <section className={styles.notice}><h2>As próximas opiniões começam aqui.</h2><p>A pesquisa aparecerá quando seu questionário e público estiverem configurados.</p></section>}
      {results.map(({ survey, responses }) => <article key={survey.id} className={styles.report}><header className={styles.toolbar}><div><h2>{survey.title}</h2><p>De {date(survey.opens_at)} até {date(survey.closes_at)} · {survey.active ? "Campanha habilitada" : "Campanha fechada"}</p></div><a className="secondary-button" href={`/api/pesquisas?admin=1&id=${encodeURIComponent(survey.id)}&format=csv`}><Download size={16} aria-hidden="true" /> Exportar CSV</a></header>
        <dl className={styles.summary}><div><dt>Respostas recebidas</dt><dd>{responses.length}</dd></div><div><dt>Membros convidados</dt><dd>{survey.eligible_member_ids.length}</dd></div><div><dt>Participação</dt><dd>{survey.eligible_member_ids.length ? `${Math.round(responses.length / survey.eligible_member_ids.length * 100)}%` : "—"}</dd></div></dl>
        <div className={styles.distributions}>{survey.fields.filter(field => field.kind !== "long_text").map(field => {
          const counts = new Map<string, number>();
          for (const row of responses) { const value = row.answers[field.key]; for (const item of Array.isArray(value) ? value : value === undefined ? [] : [String(value)]) counts.set(item, (counts.get(item) || 0) + 1); }
          return <Distribution key={field.id} title={field.title} values={[...counts].sort((a, b) => b[1] - a[1])} total={responses.length} />;
        })}</div>
        <section className={styles.responses}><h3>Respostas por membro</h3>{responses.length === 0 && <p>Aguardando a primeira resposta. Cada envio será vinculado ao cadastro correspondente.</p>}{responses.map(row => <details key={row.id}><summary><span><strong>{row.members?.name || "Cadastro indisponível"}</strong><small>{row.members?.class_level || "Classe não informada"} · {date(row.received_at)}</small></span><span>Ver resposta</span></summary><dl>{survey.fields.map(field => { const answer = row.answers[field.key]; return <div key={field.id}><dt>{field.title}</dt><dd>{Array.isArray(answer) ? answer.join("; ") : answer ?? "Não respondeu"}</dd></div>; })}</dl></details>)}</section>
      </article>)}
    </section>
  </main></div>;
}
