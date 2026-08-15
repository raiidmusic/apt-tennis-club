"use client";

import type { LucideIcon } from "lucide-react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type ProductSidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string | number;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
};

type ProductSidebarProps = {
  ariaLabel: string;
  brand: ReactNode;
  eyebrow: string;
  title: string;
  items: ProductSidebarItem[];
  profile?: ReactNode;
  footer?: ReactNode;
  status?: ReactNode;
  className?: string;
};

const spring = { type: "spring" as const, stiffness: 520, damping: 42, mass: 0.82 };

function SidebarItems({ items, close }: { items: ProductSidebarItem[]; close?: () => void }) {
  return <nav className="product-sidebar__nav" aria-label="Seções">
    {items.map((item) => {
      const Icon = item.icon;
      const content = <>
        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        <span className="product-sidebar__label">{item.label}</span>
        {item.badge !== undefined && <span className="product-sidebar__badge">{item.badge}</span>}
      </>;
      const className = ["product-sidebar__item", item.active && "product-sidebar__item--active"].filter(Boolean).join(" ");
      if (item.href) return <a key={item.id} className={className} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} aria-label={item.label} aria-current={item.active ? "page" : undefined} onClick={close}>{content}</a>;
      return <button key={item.id} className={className} type="button" aria-label={item.label} aria-current={item.active ? "page" : undefined} onClick={() => { item.onSelect?.(); close?.(); }}>{content}</button>;
    })}
  </nav>;
}

export function ProductSidebar({ ariaLabel, brand, eyebrow, title, items, profile, footer, status, className }: ProductSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : spring;

  useEffect(() => {
    if (!mobileOpen) return;
    const mobileTrigger = mobileTriggerRef.current;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("drawer-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("drawer-open");
      mobileTrigger?.focus();
    };
  }, [mobileOpen]);

  function keepFocusInSheet(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = mobilePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <>
    <motion.aside
      className={["product-sidebar", !expanded && "product-sidebar--collapsed", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      initial={false}
      animate={{ width: expanded ? "17.5rem" : "4.75rem" }}
      transition={transition}
    >
      <div className="product-sidebar__top">
        <div className="product-sidebar__brand">{brand}</div>
        <button className="product-sidebar__collapse" type="button" onClick={() => setExpanded((current) => !current)} aria-label={expanded ? "Recolher barra lateral" : "Expandir barra lateral"}>
          {expanded ? <PanelLeftClose aria-hidden="true" size={18} /> : <PanelLeftOpen aria-hidden="true" size={18} />}
        </button>
      </div>
      {profile && <div className="product-sidebar__profile">{profile}</div>}
      <div className="product-sidebar__heading"><span>{eyebrow}</span><strong>{title}</strong></div>
      <SidebarItems items={items} />
      <div className="product-sidebar__bottom">{status}{footer}</div>
    </motion.aside>

    <div className="product-mobile-nav" aria-label={ariaLabel}>
      <div>{brand}<span>{eyebrow}</span></div>
      <button ref={mobileTriggerRef} type="button" onClick={() => setMobileOpen(true)} aria-label={`Abrir ${ariaLabel.toLowerCase()}`} aria-expanded={mobileOpen}><Menu aria-hidden="true" size={21} /></button>
    </div>
    <AnimatePresence initial={false}>
      {mobileOpen && <motion.div className="product-mobile-sheet" role="dialog" aria-modal="true" aria-label={ariaLabel} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}>
        <button className="product-mobile-sheet__backdrop" type="button" onClick={() => setMobileOpen(false)} tabIndex={-1} aria-label="Fechar menu" />
        <motion.aside ref={mobilePanelRef} onKeyDown={keepFocusInSheet} initial={reduceMotion ? false : { x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={transition}>
          <header><div>{brand}<span>{eyebrow}</span></div><button type="button" autoFocus onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X aria-hidden="true" size={21} /></button></header>
          {profile && <div className="product-sidebar__profile">{profile}</div>}
          <div className="product-mobile-sheet__title"><strong>{title}</strong></div>
          <SidebarItems items={items} close={() => setMobileOpen(false)} />
          <div className="product-sidebar__bottom">{status}{footer}</div>
        </motion.aside>
      </motion.div>}
    </AnimatePresence>
  </>;
}
