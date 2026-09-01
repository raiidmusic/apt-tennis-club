"use client";

import { useState } from "react";
import styles from "./calendar.module.css";

export type SeasonQuarter = {
  id: string;
  label: string;
  range: string;
  draws: readonly string[];
  cut: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function compactDate(value: string) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(`${value}T00:00:00Z`)).map((part) => [part.type, part.value]),
  );
  return `${parts.day} ${parts.month.replace(".", "").toUpperCase()} ${parts.year}`;
}

export function SeasonNavigator({ quarters, finalsDate, initialQuarterId }: { quarters: readonly SeasonQuarter[]; finalsDate: string; initialQuarterId: string }) {
  const [activeId, setActiveId] = useState(initialQuarterId);
  const activeQuarter = quarters.find((quarter) => quarter.id === activeId) ?? quarters[0];

  return (
    <div className={styles.navigator}>
      <p className={styles.navigatorHint}>Escolha um quarter</p>
      <div className={styles.quarterRail} aria-label="Quarters da temporada 2027">
        {quarters.map((quarter) => (
          <button
            type="button"
            aria-pressed={quarter.id === activeQuarter.id}
            aria-controls="quarter-detail"
            className={quarter.id === activeQuarter.id ? styles.quarterActive : ""}
            onClick={() => setActiveId(quarter.id)}
            key={quarter.id}
          >
            <strong>{quarter.id.toUpperCase()}</strong>
            <span>{quarter.range}</span>
          </button>
        ))}
        <a className={styles.finalsNode} href="#finals"><strong>Finals</strong><time dateTime={finalsDate}>04 DEZ</time></a>
      </div>

      <article className={styles.quarterPanel} id="quarter-detail" aria-labelledby={`title-${activeQuarter.id}`} key={activeQuarter.id}>
        <header><h3 id={`title-${activeQuarter.id}`}>{activeQuarter.label}</h3><p>{activeQuarter.range}</p></header>
        <ol>
          {activeQuarter.draws.map((date, index) => (
            <li key={date}><span>Sorteio {index + 1}</span><time dateTime={date}>{compactDate(date)}</time></li>
          ))}
          <li className={styles.panelCut}><span>Corte</span><time dateTime={activeQuarter.cut}>{compactDate(activeQuarter.cut)}</time></li>
        </ol>
      </article>
    </div>
  );
}
