import React, { useEffect, useRef, useState } from 'react';
import { clamp, smooth, buildTroughPath, reach, GeometryData } from '../utils/math';

export interface TabData {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface LiquidNavProps {
  tabs: TabData[];
  activeTabIndex: number;
  onTabSelect: (index: number) => void;
}

export default function LiquidNav({ tabs, activeTabIndex, onTabSelect }: LiquidNavProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const fillPRef = useRef<SVGPathElement>(null);
  const beadRef = useRef<HTMLSpanElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [isReady, setIsReady] = useState(false);

  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const anim = useRef({
    x: 0, v: 0, target: 0, dragging: false, raf: 0, last: 0,
    pid: null as number | null, startX: 0, suppressClick: false,
    G: { W: 0, H: 0, R: 17, D: 56, RB: 35, S: 17, CY: -6, slots: [], span: 80 } as GeometryData
  });

  const measure = () => {
    if (!dockRef.current || !tabsContainerRef.current) return false;
    const r = dockRef.current.getBoundingClientRect();
    const W = Math.round(r.width);
    const H = Math.round(r.height);
    if (W < 40 || H < 30) return false;

    const tabElements = Array.from(tabsContainerRef.current.querySelectorAll('[role="tab"]'));
    const slots = tabElements.map(t => {
      const b = t.getBoundingClientRect();
      return b.left - r.left + b.width / 2;
    });

    const span = slots.length > 1 ? slots[1] - slots[0] : W;
    const R = clamp(H * 0.20, 13, 20);
    const CY = 0;

    let D = Math.min(H * 0.68, span * 0.78);
    const room = slots[0] - R - 6;
    for (let i = 0; i < 3; i++) {
      const hw = reach(D * 0.22, D / 2 + 6, CY);
      if (hw <= room) break;
      D *= room / hw;
    }
    D = Math.max(Math.round(D), 30);
    const S = D * 0.22;
    const RB = D / 2 + 6;

    anim.current.G = { W, H, R, CY, D, S, RB, slots, span };

    dockRef.current.style.setProperty('--dock-r', `${R.toFixed(1)}px`);
    dockRef.current.style.setProperty('--bead-d', `${D}px`);
    dockRef.current.style.setProperty('--bead-cy', `${CY}px`);
    dockRef.current.style.setProperty('--rise', `${(H / 2 - CY).toFixed(1)}px`);

    const svg = dockRef.current.querySelector('.dock__skin') as SVGSVGElement;
    if (svg) svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    return true;
  };

  const paint = () => {
    const { x, v, dragging, G } = anim.current;
    const q = clamp(v / 1100, -1, 1) * (dragging ? 0.5 : 1);
    const mag = Math.abs(q);

    const sL = clamp(G.S * (1 + 0.06 * mag + 0.40 * q), G.S * 0.55, G.S * 2.1);
    const sR = clamp(G.S * (1 + 0.06 * mag - 0.40 * q), G.S * 0.55, G.S * 2.1);

    const d = buildTroughPath(x, G.CY, G.RB, sL, sR, G);
    if (fillPRef.current) fillPRef.current.setAttribute('d', d);

    const sx = 1 + 0.07 * mag;
    if (beadRef.current) {
      beadRef.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${sx.toFixed(3)},${(1 / sx).toFixed(3)})`;
    }

    let near = 0, nd = Infinity;
    for (let i = 0; i < tabs.length; i++) {
      if (G.slots.length > 0) {
        const dx = Math.abs(x - G.slots[i]);
        if (dx < nd) { nd = dx; near = i; }
        if (tabRefs.current[i]) {
            tabRefs.current[i]!.style.setProperty('--t', smooth(clamp(1 - dx / (G.span * 0.55), 0, 1)).toFixed(3));
        }
      }
    }
  };

  const loop = (now: number) => {
    anim.current.raf = 0;
    const dt = Math.min((now - anim.current.last) / 1000, 1 / 30);
    anim.current.last = now;

    const K = anim.current.dragging ? 900 : 142;
    const C = anim.current.dragging ? 52 : 19.3;
    let step = dt;

    while (step > 0) {
      const h = Math.min(step, 1 / 240);
      anim.current.v += (-K * (anim.current.x - anim.current.target) - C * anim.current.v) * h;
      anim.current.x += anim.current.v * h;
      step -= h;
    }

    paint();

    if (Math.abs(anim.current.x - anim.current.target) > 0.05 || Math.abs(anim.current.v) > 0.6 || anim.current.dragging) {
      run();
    } else {
      anim.current.x = anim.current.target;
      anim.current.v = 0;
      paint();
    }
  };

  const run = () => {
    if (anim.current.raf) return;
    anim.current.last = performance.now();
    anim.current.raf = requestAnimationFrame(loop);
  };

  const jump = (to: number) => {
    anim.current.target = to;
    if (reducedMotion() && !anim.current.dragging) {
      anim.current.x = to;
      anim.current.v = 0;
      paint();
      return;
    }
    run();
  };

  // Sync with parent active state
  useEffect(() => {
    if (isReady && anim.current.G.slots.length > 0) {
      jump(anim.current.G.slots[activeTabIndex]);
    }
  }, [activeTabIndex, isReady]);

  useEffect(() => {
    const layout = () => {
      if (!measure()) return;
      anim.current.x = anim.current.target = anim.current.G.slots[activeTabIndex] || 0;
      anim.current.v = 0;
      paint();
      setIsReady(true);
    };

    layout();
    
    // Slight delay to ensure fonts loaded before final layout calculation
    const timeout = setTimeout(() => layout(), 100);

    const ro = new ResizeObserver(() => layout());
    if (dockRef.current) ro.observe(dockRef.current);

    return () => {
      ro.disconnect();
      if (anim.current.raf) cancelAnimationFrame(anim.current.raf);
      clearTimeout(timeout);
    };
  }, [tabs]);

  const handleTabClick = (i: number) => {
    if (!anim.current.suppressClick) {
      onTabSelect(i);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    anim.current.pid = e.pointerId;
    anim.current.startX = e.clientX;
    anim.current.suppressClick = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== anim.current.pid) return;
    if (!anim.current.dragging && Math.abs(e.clientX - anim.current.startX) < 7) return;

    if (!anim.current.dragging) {
      anim.current.dragging = true;
      anim.current.suppressClick = true;
      dockRef.current?.classList.add('is-dragging');
      dockRef.current?.setPointerCapture(e.pointerId);
    }
    const left = dockRef.current?.getBoundingClientRect().left || 0;
    anim.current.target = clamp(e.clientX - left, anim.current.G.slots[0], anim.current.G.slots[anim.current.G.slots.length - 1]);
    run();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== anim.current.pid) return;
    anim.current.pid = null;
    if (!anim.current.dragging) return;
    anim.current.dragging = false;
    dockRef.current?.classList.remove('is-dragging');

    let near = 0, nd = Infinity;
    anim.current.G.slots.forEach((s, i) => {
      const d = Math.abs(anim.current.target - s);
      if (d < nd) { nd = d; near = i; }
    });
    onTabSelect(near);
    setTimeout(() => { anim.current.suppressClick = false; }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (step[e.key]) next = activeTabIndex + step[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;

    if (next !== null) {
      e.preventDefault();
      const clampedNext = (next + tabs.length) % tabs.length;
      onTabSelect(clampedNext);
      tabRefs.current[clampedNext]?.focus();
    }
  };

  return (
    <div
      ref={dockRef}
      className={`dock ${isReady ? 'is-ready' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="dock__cast" aria-hidden="true"></span>
      <svg className="dock__skin" aria-hidden="true" focusable="false" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mnPlate" x1="0" y1="0" x2="0" y2="1">
            <stop className="dock__plate-hi" offset="0" />
            <stop className="dock__plate-lo" offset="1" />
          </linearGradient>
          <linearGradient id="mnRim" x1="0" y1="0" x2="0" y2="1">
            <stop className="dock__rim-hi" offset="0" />
            <stop className="dock__rim-lo" offset="1" />
          </linearGradient>
        </defs>
        <path className="dock__fill" ref={fillPRef} />
      </svg>
      <span className="dock__bead" ref={beadRef} aria-hidden="true"></span>

      <div
        className="dock__tabs"
        role="tablist"
        aria-label="Sections"
        ref={tabsContainerRef}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, i) => {
          const isSelected = activeTabIndex === i;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className="tab"
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleTabClick(i)}
              ref={el => (tabRefs.current[i] = el)}
            >
              <Icon className="tab__icon" aria-hidden="true" />
              <span className="tab__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
