import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile} from 'remotion';
import {BLUE, Board, CHALK, Chalk, Eraser, SANS, Stroke, TITLE, YELLOW, fontFace, useT} from './chalk';

// Lesson 1 sample on the same blackboard as the intro. Debit = blue, credit = yellow.
// Times are seconds in this clip (memo 153.3 s → 214 s, then the quiz).
const PINK = '#ff9b8a';
const W1 = 19.1; // wipe the sale for the T-accounts
const W2 = 60.2; // wipe for the quiz

const CAPTIONS: [number, string][] = [
  [0, 'For example,'], [1.6, 'if we are recording revenue, we sell something.'], [4.8, 'We sell a widget.'],
  [6.3, 'We sell a bottle of water.'], [11.7, 'The bottle of water costs $1.'], [15.8, 'The person pays us in cash.'],
  [19.3, 'So on the T-account, the way we record it,'], [23.8, 'we are reporting revenue.'],
  [26.5, 'So we are reporting a dollar'], [29.2, 'on the revenue T-account, and we are recording a'],
  [33.8, 'debit to cash'], [36.2, 'on the cash T-account.'], [39.3, 'And that is on the left side.'],
  [41.8, 'So as you see them side by side together,'], [44.3, 'you will see a dollar being added'],
  [46.7, 'to the revenue T-account on the credit side, meaning our revenue has gone up,'],
  [53.0, 'and you are seeing a dollar added to the cash side,'], [57.2, 'meaning our cash has gone up by a dollar.'],
];

const Captions: React.FC = () => {
  const {t} = useT();
  if (t > 60.2) return null;
  const cur = [...CAPTIONS].reverse().find(([s]) => t >= s);
  if (!cur) return null;
  return (
    <div style={{position: 'absolute', left: 460, width: 1400, bottom: 26, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: SANS, fontSize: 34, fontWeight: 700, padding: '10px 22px', borderRadius: 12, opacity: Math.min(1, (t - cur[0]) / 0.15)}}>{cur[1]}</div>
    </div>
  );
};

// Photo badge + lesson label in the left column (same spot the intro leaves it).
const Badge: React.FC = () => (
  <div style={{position: 'absolute', left: 60, top: 60, width: 330}}>
    <div style={{width: 182, height: 182, borderRadius: '50%', border: `6px solid ${YELLOW}`, overflow: 'hidden', background: 'radial-gradient(ellipse at 40% 35%, #2f4a3c 0%, #243b30 55%, #1c3026 100%)'}}>
      <Img src={staticFile('photo.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
    <div style={{marginTop: 26, fontFamily: TITLE, fontWeight: 700, fontSize: 44, color: YELLOW}}>Lesson 1</div>
    <div style={{fontFamily: 'Kalam', fontWeight: 700, fontSize: 30, color: CHALK, lineHeight: 1.2}}>Debits &amp; credits</div>
  </div>
);

// Countdown digit drawn in chalk for the quiz.
const Countdown: React.FC = () => {
  const {t} = useT();
  if (t < 61.5 || t >= 66.5) return null;
  const n = Math.ceil(66.5 - t);
  const frac = (66.5 - t) % 1;
  return (
    <div style={{position: 'absolute', left: 1130, top: 30, fontFamily: TITLE, fontWeight: 700, fontSize: 150, color: YELLOW, opacity: 0.4 + 0.6 * Math.min(1, frac * 3), transform: `scale(${1 + 0.15 * Math.max(0, frac - 0.7)})`}}>{n}</div>
  );
};

export const LessonBoard: React.FC = () => (
  <AbsoluteFill>
    <style>{fontFace}</style>
    <Board>
      {/* The sale */}
      <Chalk title text="Let's sell something" x={70} y={40} size={96} at={1.6} dur={2.0} eraseAt={W1} />
      <Chalk text="a widget?" x={90} y={200} size={70} at={4.8} dur={1.0} color={BLUE} eraseAt={W1} />
      <Stroke d="M 80 245 L 380 240" at={6.0} dur={0.3} color={PINK} eraseAt={W1} len={320} />
      <Chalk text="a bottle of water" x={90} y={300} size={70} at={6.4} dur={1.6} eraseAt={W1} />
      <Stroke d="M 700 250 h 60 v 40 M 690 290 h 80 q 50 40 50 100 v 230 q 0 20 -20 20 h -140 q -20 0 -20 -20 v -230 q 0 -60 50 -100" at={7.6} dur={2.4} color={CHALK} width={7} eraseAt={W1} len={1400} />
      <Stroke d="M 650 450 h 160 M 650 520 h 160" at={9.8} dur={0.8} color={BLUE} width={6} eraseAt={W1} len={400} />
      <Chalk title text="$1.00" x={930} y={250} size={110} at={11.7} dur={1.0} color={YELLOW} rotate={-6} eraseAt={W1} />
      <Stroke d="M 910 320 C 900 230, 1190 220, 1200 300 C 1210 380, 920 400, 910 320" at={12.9} dur={0.6} eraseAt={W1} len={900} />
      <Chalk text="paid in cash ✓" x={900} y={450} size={64} at={15.8} dur={1.4} eraseAt={W1} />
      <Chalk title text="SOLD!" x={960} y={560} size={120} at={17.4} dur={0.7} color={PINK} rotate={-8} eraseAt={W1} />
      <Eraser at={W1} />

      {/* T-accounts */}
      <Chalk title text="Cash" x={290} y={210} size={84} at={19.9} dur={0.6} eraseAt={W2} />
      <Stroke d="M 130 330 L 640 330 M 385 330 L 385 700" at={20.2} dur={1.0} color={CHALK} width={7} eraseAt={W2} len={900} />
      <Chalk text="Dr" x={150} y={340} size={52} at={21.0} dur={0.4} color={BLUE} eraseAt={W2} />
      <Chalk text="Cr" x={570} y={340} size={52} at={21.2} dur={0.4} color={YELLOW} eraseAt={W2} />
      <Chalk title text="Revenue" x={840} y={210} size={84} at={20.8} dur={0.8} eraseAt={W2} />
      <Stroke d="M 730 330 L 1240 330 M 985 330 L 985 700" at={21.1} dur={1.0} color={CHALK} width={7} eraseAt={W2} len={900} />
      <Chalk text="Dr" x={750} y={340} size={52} at={21.9} dur={0.4} color={BLUE} eraseAt={W2} />
      <Chalk text="Cr" x={1170} y={340} size={52} at={22.1} dur={0.4} color={YELLOW} eraseAt={W2} />
      <Stroke d="M 820 300 C 810 190, 1170 180, 1180 290 C 1190 340, 830 350, 820 300" at={26.5} dur={0.7} eraseAt={W2} len={1000} />
      <Chalk title text="$1.00" x={170} y={420} size={90} at={33.8} dur={0.9} color={BLUE} eraseAt={W2} />
      <Chalk text="left = debit" x={150} y={540} size={46} at={39.3} dur={1.4} color={BLUE} eraseAt={W2} />
      <Chalk title text="$1.00" x={1010} y={420} size={90} at={44.3} dur={0.9} color={YELLOW} eraseAt={W2} />
      <Chalk text="revenue ↑" x={1010} y={540} size={52} at={50.0} dur={1.0} color={YELLOW} eraseAt={W2} />
      <Chalk text="cash ↑" x={170} y={610} size={52} at={57.2} dur={0.8} color={BLUE} eraseAt={W2} />
      <Chalk text="Dr Cash 1.00" x={140} y={715} size={50} at={57.6} dur={0.9} color={BLUE} eraseAt={W2} />
      <Chalk text="Cr Revenue 1.00" x={260} y={770} size={50} at={58.2} dur={0.9} color={YELLOW} eraseAt={W2} />
      <Chalk title text="Debits = Credits ✓" x={760} y={730} size={70} at={59.0} dur={1.0} eraseAt={W2} />
      <Eraser at={W2} />

      {/* Quiz */}
      <Chalk title text="Quick quiz!" x={70} y={40} size={100} at={60.9} dur={0.8} color={YELLOW} />
      <Chalk text="You pay $0.50 cash to restock the water." x={80} y={200} size={62} at={61.2} dur={1.3} />
      <Chalk text="Which side does Cash go on?" x={80} y={280} size={62} at={62.2} dur={1.0} />
      <Stroke d="M 180 420 h 380 v 150 h -380 z" at={63.0} dur={0.5} color={BLUE} width={6} len={1100} />
      <Chalk title text="DEBIT" x={250} y={440} size={96} at={63.2} dur={0.5} color={BLUE} />
      <Stroke d="M 760 420 h 380 v 150 h -380 z" at={63.5} dur={0.5} color={YELLOW} width={6} len={1100} />
      <Chalk title text="CREDIT" x={800} y={440} size={96} at={63.7} dur={0.5} color={YELLOW} />
      <Stroke d="M 730 500 C 720 380, 1170 370, 1180 490 C 1190 610, 740 620, 730 500" at={66.5} dur={0.5} color={PINK} width={8} len={1400} />
      <Chalk text="Credit — cash went down." x={180} y={640} size={66} at={66.9} dur={1.2} color={PINK} />
      <Countdown />
    </Board>
    <Badge />
    <Captions />
    <Audio src={staticFile('audio.wav')} />
  </AbsoluteFill>
);
