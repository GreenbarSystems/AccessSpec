import React from 'react';
import {Composition} from 'remotion';
import {Intro} from './Intro';
import {LessonBoard} from './LessonBoard';
// public/ also needs: intro.wav, audio.wav (voice), photo.png (cutout) — media is not committed.
export const Root: React.FC = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={Math.round(47.1 * 30)} fps={30} width={1920} height={1080} />
    <Composition id="LessonBoard" component={LessonBoard} durationInFrames={Math.round(70.5 * 30)} fps={30} width={1920} height={1080} />
  </>
);
