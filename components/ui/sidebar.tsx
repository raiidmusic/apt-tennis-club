"use client";

import type { LucideIcon } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";

export type ProductSidebarItem = {
  id: string;
  label: string;
  mobileLabel?: string;
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

function SidebarItems({ items }: { items: ProductSidebarItem[] }) {
  return <nav id="product-sidebar-navigation" className="product-sidebar__nav" aria-label="Seções">
    {items.map((item) => {
      const Icon = item.icon;
      const content = <>
        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
        <span className="product-sidebar__label">{item.label}</span>
        {item.badge !== undefined && <span className="product-sidebar__badge">{item.badge}</span>}
      </>;
      const className = ["product-sidebar__item", item.active && "product-sidebar__item--active"].filter(Boolean).join(" ");
      if (item.href) return <a key={item.id} className={className} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} aria-label={item.label} aria-current={item.active ? "page" : undefined}>{content}</a>;
      return <button key={item.id} className={className} type="button" aria-label={item.label} aria-current={item.active ? "page" : undefined} onClick={item.onSelect}>{content}</button>;
    })}
  </nav>;
}

export function ProductSidebar({ ariaLabel, brand, eyebrow, title, items, profile, footer, status, className }: ProductSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] as const };

  return <>
    <motion.aside
      className={["product-sidebar", !expanded && "product-sidebar--collapsed", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      initial={false}
      animate={{ width: expanded ? "15rem" : "4.5rem" }}
      transition={transition}
    >
      <div className="product-sidebar__top">
        <div className="product-sidebar__brand">{brand}</div>
        <button className="product-sidebar__collapse" type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} aria-controls="product-sidebar-navigation" aria-label={expanded ? "Recolher barra lateral" : "Expandir barra lateral"}>
          {expanded ? <PanelLeftClose aria-hidden="true" size={18} /> : <PanelLeftOpen aria-hidden="true" size={18} />}
        </button>
      </div>
      {profile && <div className="product-sidebar__profile">{profile}</div>}
      <div className="product-sidebar__heading"><span>{eyebrow}</span><strong>{title}</strong></div>
      <SidebarItems items={items} />
      <div className="product-sidebar__bottom">{status}{footer}</div>
    </motion.aside>

    <header className="product-mobile-appbar">
      <div>{brand}<span>{eyebrow}</span></div>
      <div className="product-mobile-appbar__action">{footer}</div>
    </header>
    <nav className="product-mobile-tabbar" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = <><span className="product-mobile-tabbar__icon"><Icon aria-hidden="true" size={20} strokeWidth={item.active ? 2.2 : 1.8} />{item.badge !== undefined && <span>{item.badge}</span>}</span><span>{item.mobileLabel || item.label}</span></>;
        const itemClass = ["product-mobile-tabbar__item", item.active && "product-mobile-tabbar__item--active"].filter(Boolean).join(" ");
        if (item.href) return <a key={item.id} className={itemClass} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} aria-label={item.label} aria-current={item.active ? "page" : undefined}>{content}</a>;
        return <button key={item.id} className={itemClass} type="button" aria-label={item.label} aria-current={item.active ? "page" : undefined} onClick={item.onSelect}>{content}</button>;
      })}
    </nav>
  </>;
}
