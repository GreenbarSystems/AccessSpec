import React from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Shared chalkboard look: board, chalk text (Cabin Sketch titles, Kalam body), chalk strokes.
export const CHALK = '#f3f1e7';
export const YELLOW = '#ffe27a';
export const BLUE = '#9fd4ff';
export const HAND = 'Kalam, cursive'; // body lines (C)
export const TITLE = 'CabinSketch, cursive'; // titles and big words (E)
export const SANS = 'DejaVu Sans, Arial, sans-serif';
const ease = Easing.bezier(0.33, 0, 0.3, 1);

export const fontFace = `@font-face { font-family: 'Kalam'; src: url('${staticFile('kalam.woff2')}') format('woff2'); font-weight: 700; } @font-face { font-family: 'CabinSketch'; src: url('${staticFile('cabin-sketch.woff2')}') format('woff2'); font-weight: 700; }`;

export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {t: f / fps, f, fps};
};
export const prog = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// Handwritten line: revealed left to right like chalk being written, with a
// chalk stick riding the reveal edge.
export const Chalk: React.FC<{text: string; x: number; y: number; size: number; at: number; dur: number; color?: string; rotate?: number; eraseAt?: number; title?: boolean}> = ({text, x, y, size, at, dur, color = CHALK, rotate = 0, eraseAt, title = false}) => {
  const {t} = useT();
  if (t < at) return null;
  const p = prog(t, at, at + dur);
  const erase = eraseAt === undefined ? 0 : prog(t, eraseAt, eraseAt + 0.6);
  const writing = p > 0 && p < 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `rotate(${rotate}deg)`, opacity: 1 - erase}}>
      <div style={{fontFamily: title ? TITLE : HAND, fontWeight: 700, fontSize: title ? size * 0.9 : size * 0.82, color, whiteSpace: 'nowrap', lineHeight: 1.1,
        clipPath: `inset(-20% ${100 - p * 100}% -20% -2%)`,
        textShadow: `0 0 1px ${color}, 1px 1px 0 rgba(255,255,255,0.15), -1px 0 2px rgba(255,255,255,0.12)`,
        filter: 'contrast(1.1)'}}>{text}</div>
      {writing && (
        <div style={{position: 'absolute', top: size * 0.35, left: `${p * 100}%`, width: 60, height: 14, borderRadius: 6, background: '#fbfaf5',
          transform: `rotate(-35deg) translate(-8px, ${Math.sin(t * 40) * 3}px)`, boxShadow: '0 4px 8px rgba(0,0,0,0.4)'}} />
      )}
    </div>
  );
};

// Hand-drawn underline/circle strokes.
export const Stroke: React.FC<{d: string; at: number; dur: number; color?: string; width?: number; eraseAt?: number; len?: number}> = ({d, at, dur, color = YELLOW, width = 6, eraseAt, len = 1200}) => {
  const {t} = useT();
  if (t < at) return null;
  const p = prog(t, at, at + dur);
  const erase = eraseAt === undefined ? 0 : prog(t, eraseAt, eraseAt + 0.6);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, opacity: 1 - erase}} width={1920} height={1080}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={0.9} />
    </svg>
  );
};

export const Board: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {t} = useT();
  const inn = prog(t, 0, 0.8);
  const push = interpolate(t, [0, 60], [1, 1.04], {extrapolateRight: 'clamp'}); // slow push-in so it never sits still
  return (
    <AbsoluteFill style={{background: '#2a2019'}}>
      <div style={{position: 'absolute', left: 460, top: 60, width: 1400, height: 900, transform: `scale(${push})`, transformOrigin: '60% 50%', opacity: inn}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 18, background: '#6b4a2b', boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}} />
        <div style={{position: 'absolute', inset: 22, borderRadius: 8,
          background: 'radial-gradient(ellipse at 40% 35%, #2f4a3c 0%, #243b30 55%, #1c3026 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.55)'}} />
        {/* chalk smudges */}
        <div style={{position: 'absolute', left: 160, top: 620, width: 520, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.035)', filter: 'blur(14px)'}} />
        <div style={{position: 'absolute', left: 820, top: 140, width: 420, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', filter: 'blur(12px)'}} />
        <div style={{position: 'absolute', left: 60, right: 60, bottom: -4, height: 22, borderRadius: 6, background: '#7a5634'}} />
        <div style={{position: 'absolute', left: 1080, bottom: 4, width: 110, height: 16, borderRadius: 5, background: '#efeee6'}} />
        <div style={{position: 'absolute', inset: 22, overflow: 'hidden'}}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};


// Felt eraser sweeping across the board (pair with eraseAt on what it wipes).
export const Eraser: React.FC<{at: number; dur?: number}> = ({at, dur = 0.7}) => {
  const {t} = useT();
  if (t < at - 0.05 || t > at + dur + 0.1) return null;
  const p = prog(t, at, at + dur);
  return (
    <div style={{position: 'absolute', left: interpolate(p, [0, 1], [-260, 1400]), top: 120 + Math.sin(p * Math.PI * 3) * 160, width: 240, height: 110,
      borderRadius: 14, background: 'linear-gradient(#8a5a36 0 55%, #3b3b3b 55%)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', transform: 'rotate(-8deg)'}} />
  );
};
