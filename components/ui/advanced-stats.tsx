"use client";

/*
 * Adapted from UI LAYOUT's Advanced Stats / ClippedAreaChart:
 * https://21st.dev/@uilayout.contact/components/advanced-stats
 *
 * MIT License — Copyright (c) 2024 UI LAYOUT
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { useEffect, useId, useState } from "react";
import { useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, useActiveTooltipDataPoints, usePlotArea } from "recharts";

export type RevenueChartPoint = { index: number; month: string; received: number; confirmed: number };

function ClippedSeries({ data, activeIndex, onSelect, gradientId }: { data: RevenueChartPoint[]; activeIndex: number | null; onSelect: (index: number | null) => void; gradientId: string }) {
  const plot = usePlotArea();
  const points = useActiveTooltipDataPoints<RevenueChartPoint>();
  const hoveredIndex = points?.[0]?.index;
  const reduced = useReducedMotion();
  const springX = useSpring(0, { damping: 30, stiffness: 150 });
  const [axis, setAxis] = useState(0);
  useMotionValueEvent(springX, "change", setAxis);
  useEffect(() => {
    if (hoveredIndex !== undefined && Number.isInteger(hoveredIndex) && hoveredIndex >= 0 && hoveredIndex < data.length) onSelect(hoveredIndex);
  }, [hoveredIndex, onSelect, data.length]);
  const targetX = plot ? plot.x + (activeIndex ?? data.length - 1) * plot.width / Math.max(data.length - 1, 1) : 0;
  useEffect(() => {
    if (reduced || activeIndex === null) springX.jump(targetX);
    else springX.set(targetX);
  }, [activeIndex, reduced, springX, targetX]);
  const clipId = `${gradientId}-clip`;
  const selected = activeIndex === null ? null : data[activeIndex];
  const badgeX = plot ? Math.max(plot.x, Math.min(axis - 60, plot.x + plot.width - 120)) : 0;
  return <>
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
      </linearGradient>
      <clipPath id={clipId}><rect x={plot?.x ?? 0} y={plot?.y ?? 0} width={plot ? activeIndex === null ? plot.width : Math.max(0, axis - plot.x) : 0} height={plot?.height ?? 0} /></clipPath>
    </defs>
    <Area dataKey="received" type="monotone" fill="none" stroke="var(--chart-received)" strokeOpacity={0.18} strokeWidth={1.6} dot={false} activeDot={false} isAnimationActive={false} tooltipType="none" />
    <Area dataKey="received" name="Recebido" type="monotone" fill={`url(#${gradientId})`} fillOpacity={0.7} stroke="var(--chart-received)" strokeWidth={1.6} clipPath={`url(#${clipId})`} dot={false} activeDot={{ r: 4, fill: "var(--chart-received)", stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
    <Area dataKey="confirmed" name="Em liquidação" type="monotone" fill="none" stroke="var(--secondary)" strokeWidth={1.5} strokeDasharray="4 5" dot={false} activeDot={{ r: 3, fill: "var(--secondary)", stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
    {selected && plot && <g aria-hidden="true">
      <line x1={axis} x2={axis} y1={plot.y} y2={plot.y + plot.height} stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.5} />
      <rect x={badgeX} y={plot.y - 24} width={120} height={22} rx={5} fill="var(--primary)" />
      <text x={badgeX + 60} y={plot.y - 9} textAnchor="middle" fill="var(--primary-foreground)" fontSize={12} fontWeight={600}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", ...(selected.received >= 10000 ? { notation: "compact", maximumFractionDigits: 1 } : {}) }).format(selected.received)}</text>
    </g>}
  </>;
}

export function ClippedAreaChart({ data, activeIndex, onSelect }: { data: RevenueChartPoint[]; activeIndex: number | null; onSelect: (index: number | null) => void }) {
  const gradientId = `apt-revenue-${useId().replaceAll(":", "")}`;
  return <div className="advanced-stats-chart">
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 720, height: 280 }}>
      <AreaChart data={data} accessibilityLayer aria-label="Recebimentos por mês. Use as setas para consultar o gráfico." margin={{ top: 28, right: 12, left: 12, bottom: 0 }} onMouseLeave={() => onSelect(null)}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" horizontalCoordinatesGenerator={({ offset }) => [offset.top, offset.top + offset.height]} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} height={40} interval={0} tick={{ fill: "var(--muted-text)", fontSize: 13 }} />
        <YAxis hide domain={[0, (maximum: number) => Math.max(1, maximum * 1.15)]} />
        <Tooltip content={() => null} cursor={false} />
        <ClippedSeries data={data} activeIndex={activeIndex} onSelect={onSelect} gradientId={gradientId} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
