import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import heroImage from "../../public/apt-hero-figma.jpg";
import finalsImage from "../../public/apt-finals-2027.png";
import { SeasonNavigator, type SeasonQuarter } from "./season-navigator";
import styles from "./calendar.module.css";

type SeasonEvent = {
  date: string;
  kind: "draw" | "cut" | "finals";
  label: string;
  quarterId: string;
};

const bridgeQuarter: SeasonQuarter = {
  id: "ponte-2026",
  label: "Último quarter 2026",
  range: "09 nov — 03 jan",
  draws: ["2026-11-09", "2026-11-23", "2026-12-07", "2026-12-21"],
  cut: "2027-01-04",
};

const quarters2027: readonly SeasonQuarter[] = [
  { id: "q1", label: "Q1 2027", range: "04 jan — 28 fev", draws: ["2027-01-04", "2027-01-18", "2027-02-01", "2027-02-15"], cut: "2027-03-01" },
  { id: "q2", label: "Q2 2027", range: "29 mar — 23 mai", draws: ["2027-03-29", "2027-04-12", "2027-04-26", "2027-05-10"], cut: "2027-05-24" },
  { id: "q3", label: "Q3 2027", range: "21 jun — 15 ago", draws: ["2027-06-21", "2027-07-05", "2027-07-19", "2027-08-02"], cut: "2027-08-16" },
  { id: "q4", label: "Q4 2027", range: "13 set — 07 nov", draws: ["2027-09-13", "2027-09-27", "2027-10-11", "2027-10-25"], cut: "2027-11-08" },
];

const finalsDate = "2027-12-04";
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Agenda Viva 2026–2027 | APT Tennis Club",
  description: "Sorteios, jogos, cortes e APT Finals da temporada 2026–2027.",
  alternates: { canonical: "/calendario2026" },
  openGraph: {
    title: "Agenda Viva · APT Tennis Club",
    description: "4 sorteios. 8 jogos. 8 semanas. 1 corte.",
    url: "/calendario2026",
    images: [{ url: "/og-apt-social.png", width: 1200, height: 630, alt: "APT Tennis Club" }],
  },
};

function dateParts(value: string) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(`${value}T00:00:00Z`)).map((part) => [part.type, part.value]),
  );
  return { year: parts.year, month: parts.month.replace(".", "").toUpperCase(), day: parts.day };
}

function compactDate(value: string, includeYear = false) {
  const { year, month, day } = dateParts(value);
  return `${day} ${month}${includeYear ? ` ${year}` : ""}`;
}

function eventsForQuarter(quarter: SeasonQuarter): SeasonEvent[] {
  return [
    ...quarter.draws.map((date, index) => ({ date, kind: "draw" as const, label: `Sorteio ${index + 1}`, quarterId: quarter.id })),
    { date: quarter.cut, kind: "cut" as const, label: "Corte", quarterId: quarter.id },
  ];
}

const quarterSequence = [bridgeQuarter, ...quarters2027];
const finalsEvent: SeasonEvent = { date: finalsDate, kind: "finals", label: "APT Finals", quarterId: "finals" };
const seasonEvents: SeasonEvent[] = [
  ...quarterSequence.flatMap(eventsForQuarter),
  finalsEvent,
].sort((a, b) => a.date.localeCompare(b.date));

function eventStatus(event: SeasonEvent | undefined) {
  if (!event) return "Temporada concluída";
  if (event.kind === "draw") return "Próximo sorteio";
  if (event.kind === "cut") return "Próximo corte";
  return "Próximo encontro";
}

function heroQuarterFor(event: SeasonEvent | undefined) {
  if (!event || event.kind === "finals") return quarters2027[3];
  return quarterSequence.find((quarter) => quarter.id === event.quarterId) ?? bridgeQuarter;
}

function QuarterDates({ quarter }: { quarter: SeasonQuarter }) {
  return (
    <ol className={styles.dateLine}>
      {eventsForQuarter(quarter).map((event, index) => (
        <li className={event.kind === "cut" ? styles.cutEvent : ""} key={`${quarter.id}-${event.date}`}>
          <span>{event.kind === "cut" ? "Corte" : `Sorteio ${index + 1}`}</span>
          <time dateTime={event.date}>{compactDate(event.date, event.date.endsWith("01-04"))}</time>
        </li>
      ))}
    </ol>
  );
}

export default function CalendarPage() {
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = seasonEvents.find((event) => event.date >= today);
  const heroEvent = nextEvent ?? seasonEvents.at(-1)!;
  const heroQuarter = heroQuarterFor(nextEvent);
  const heroEvents = eventsForQuarter(heroQuarter);
  const heroDate = dateParts(heroEvent.date);
  const heroTarget = heroEvent.kind === "finals" ? "#finals" : heroQuarter.id === bridgeQuarter.id ? "#quarter-atual" : "#temporada-2027";
  const initialQuarterId = quarters2027.some((quarter) => quarter.id === heroQuarter.id) ? heroQuarter.id : quarters2027[0].id;

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="APT Tennis Club — início">
          <Image src="/logo-apt1-navy.svg" width={1109} height={1162} alt="APT Tennis Club — Beyond the Court" priority />
        </Link>
        <nav aria-label="Navegação do calendário">
          <a href="#temporada-2027">2027</a>
          <a href="#finals">Finals</a>
          <Link href="/entrar">Entrar</Link>
        </nav>
      </header>

      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroMain}>
            <p className={styles.agendaMark}>Agenda viva</p>
            <div className={styles.heroLead}>
              <p>{eventStatus(nextEvent)}</p>
              <h1 id="hero-title"><span>{heroDate.day} {heroDate.month}</span><span>{heroDate.year}</span></h1>
              <strong>{nextEvent ? (heroEvent.kind === "finals" ? "APT Finals" : heroQuarter.label) : "APT Finals 2027"}</strong>
              <a className={styles.heroCta} href={heroTarget}>Ver agenda <span aria-hidden="true">→</span></a>
            </div>

            <div className={styles.progressBlock} aria-label={`Cadência do ${heroQuarter.label}`}>
              <p>{heroQuarter.label}<span>{heroQuarter.range}</span></p>
              <ol className={styles.progressLine}>
                {heroEvents.map((event, index) => (
                  <li className={`${event.kind === "cut" ? styles.progressCut : ""} ${event.date === heroEvent.date ? styles.progressCurrent : ""}`} key={event.date}>
                    <span>{event.kind === "cut" ? "Corte" : `Sorteio ${index + 1}`}</span>
                    <time dateTime={event.date}>{compactDate(event.date)}</time>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <figure className={styles.heroPhoto}>
            <Image src={heroImage} alt="Jogador sacando em uma quadra de saibro visto de cima" priority sizes="(max-width: 767px) 100vw, 32vw" />
          </figure>
        </section>

        <section className={styles.currentQuarter} id="quarter-atual" aria-labelledby="current-title">
          <header>
            <div><p>Ponte para 2027</p><h2 id="current-title">Último quarter 2026</h2></div>
            <p className={styles.formula}><strong>4 sorteios × 2 jogos</strong><span>=</span>8 jogos em 8 semanas</p>
          </header>
          <QuarterDates quarter={bridgeQuarter} />
          <p className={styles.quarterNote}>Cada sorteio abre dois confrontos e 14 dias para jogar. Ao fim do ciclo, o corte reorganiza os Courts e inicia o quarter seguinte.</p>
        </section>

        <section className={styles.season} id="temporada-2027" aria-labelledby="season-title">
          <header>
            <div><span aria-hidden="true">2027</span><h2 id="season-title">A temporada inteira, sem perder o próximo jogo.</h2></div>
            <p>Todos os quarters repetem a mesma cadência. Escolha uma etapa para ver sorteios e corte.</p>
          </header>
          <SeasonNavigator quarters={quarters2027} finalsDate={finalsDate} initialQuarterId={initialQuarterId} />
        </section>

        <section className={styles.finals} id="finals" aria-labelledby="finals-title">
          <Image src={finalsImage} alt="Quatro jogadores reunidos junto à rede depois dos jogos em uma quadra azul à noite" fill sizes="100vw" />
          <div className={styles.finalsCopy}>
            <p>O encontro que fecha o ano</p>
            <h2 id="finals-title">APT Finals</h2>
            <time dateTime={finalsDate}>04 dezembro 2027</time>
            <span>Os melhores de cada Court, na mesma quadra, para encerrar a temporada.</span>
            <Link href="/#ranking">Entender o formato do ranking <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" aria-label="APT Tennis Club — início"><Image src="/logo-apt1-navy.svg" width={1109} height={1162} alt="" /></Link>
        <p>Brasília · Desde 2025</p>
        <nav aria-label="Links finais"><Link href="/requerimento">Solicitar entrada</Link><Link href="/entrar">Área do membro</Link></nav>
      </footer>
    </div>
  );
}
