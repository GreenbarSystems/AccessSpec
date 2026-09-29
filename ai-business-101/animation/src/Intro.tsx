import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile} from 'remotion';
import {BLUE, Board, Chalk, SANS, Stroke, YELLOW, fontFace, prog, useT} from './chalk';

// Intro: while the professor talks about his background, it is handwritten in
// chalk on a blackboard. Times are seconds in this clip (memo 1.3 s → 48.4 s).
// Photo card: the owner's photo goes here (placeholder until he sends one).
const Photo: React.FC = () => {
  const {t, f, fps} = useT();
  const s = spring({frame: f - 0.3 * fps, fps, config: {damping: 14}});
  const shrink = prog(t, 38.8, 39.8);
  return (
    <div style={{position: 'absolute', left: interpolate(shrink, [0, 1], [70, 60]), top: interpolate(shrink, [0, 1], [300, 60]),
      transform: `scale(${s * interpolate(shrink, [0, 1], [1, 0.55])})`, transformOrigin: 'top left', fontFamily: SANS}}>
      <div style={{width: 330, height: 330, borderRadius: '50%', border: `8px solid ${YELLOW}`, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        background: 'radial-gradient(ellipse at 40% 35%, #2f4a3c 0%, #243b30 55%, #1c3026 100%)'}}>
        <Img src={staticFile('photo.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
      <div style={{marginTop: 18, width: 330, textAlign: 'center', color: '#fff', fontSize: 30, fontWeight: 800, opacity: 1 - shrink}}>AI Business 101</div>
      <div style={{width: 330, textAlign: 'center', color: YELLOW, fontSize: 26, fontWeight: 700, opacity: 1 - shrink}}>Professor</div>
    </div>
  );
};

const Captions: React.FC = () => {
  const {t} = useT();
  const CAPS: [number, string][] = [
    [0.2, 'Hello.'], [2.8, 'I am the AI Business 101 Professor.'], [8.5, 'I should also say accounting professor,'],
    [11.7, 'as this channel is going to talk about different subjects:'], [17.2, 'AI, basic accounting, accounting standards,'],
    [21.0, 'some business, some financial planning and analysis —'], [24.9, 'a bunch of different stuff.'],
    [27.5, 'I have over 25 years of experience in accounting and finance,'], [32.5, 'and recently in the AI accounting space.'],
    [36.5, 'So I hope you choose to join me.'], [39.2, "That's a little intro of me as we begin our first lesson:"],
    [43.2, 'why debits and credits suck.'],
  ];
  const cur = [...CAPS].reverse().find(([s]) => t >= s);
  if (!cur) return null;
  return (
    <div style={{position: 'absolute', left: 460, width: 1400, bottom: 26, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: SANS, fontSize: 34, fontWeight: 700, padding: '10px 22px', borderRadius: 12, opacity: Math.min(1, (t - cur[0]) / 0.15)}}>{cur[1]}</div>
    </div>
  );
};

export const Intro: React.FC = () => {
  const E = 38.9; // board wiped for the lesson title
  return (
    <AbsoluteFill>
      <style>{fontFace}</style>
      <Board>
        <Chalk title text="AI Business 101 Professor" x={70} y={40} size={96} at={2.8} dur={3.6} eraseAt={E} />
        <Stroke d="M 80 150 C 400 140, 800 148, 1060 138" at={6.6} dur={0.6} eraseAt={E} />
        <Chalk text="(+ Accounting Professor)" x={610} y={210} size={60} at={8.6} dur={2.4} color={BLUE} rotate={-3} eraseAt={E} />
        <Chalk text="What we'll cover:" x={70} y={300} size={62} at={12.0} dur={1.8} eraseAt={E} />
        <Chalk text="• AI" x={110} y={380} size={60} at={17.2} dur={0.7} eraseAt={E} />
        <Chalk text="• Accounting basics & standards" x={110} y={450} size={60} at={18.6} dur={2.2} eraseAt={E} />
        <Chalk text="• Business" x={110} y={520} size={60} at={21.0} dur={1.0} eraseAt={E} />
        <Chalk text="• FP&A (planning & analysis)" x={110} y={590} size={60} at={22.4} dur={2.2} eraseAt={E} />
        <Chalk title text="25+ years" x={70} y={650} size={130} at={27.6} dur={1.6} color={YELLOW} rotate={-4} eraseAt={E} />
        <Stroke d="M 80 800 C 200 792, 380 796, 520 786" at={29.4} dur={0.5} eraseAt={E} />
        <Chalk text="in accounting & finance" x={580} y={690} size={62} at={29.6} dur={2.0} eraseAt={E} />
        <Chalk text="→ now: AI in accounting" x={580} y={770} size={62} at={32.8} dur={2.2} color={BLUE} eraseAt={E} />
        <Chalk title text="Join me!" x={1010} y={400} size={90} at={36.6} dur={1.2} color={YELLOW} rotate={-6} eraseAt={E} />
        <Stroke d="M 1000 450 C 990 370, 1290 360, 1300 440 C 1310 520, 1010 530, 1000 450" at={37.6} dur={0.6} eraseAt={E} len={800} />
        {/* first lesson */}
        <Chalk title text="Lesson 1" x={500} y={200} size={90} at={40.0} dur={1.2} color={YELLOW} />
        <Chalk title text="Why debits & credits" x={260} y={330} size={120} at={43.2} dur={1.8} />
        <Chalk title text="SUCK" x={560} y={480} size={190} at={45.2} dur={0.8} color="#ff9b8a" rotate={-5} />
      </Board>
      <Photo />
      <Captions />
      <Audio src={staticFile('intro.wav')} />
    </AbsoluteFill>
  );
};
