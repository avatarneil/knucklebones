import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { theme } from "./theme";

import { IntroScene } from "./components/IntroScene";
import { FeaturesScene } from "./components/FeaturesScene";
import { DifficultyProgressionScene } from "./components/DifficultyProgressionScene";
import { ExpectimaxScene } from "./components/ExpectimaxScene";
import { MCTSScene } from "./components/MCTSScene";
import { NeuralNetworkScene } from "./components/NeuralNetworkScene";
import { AlphaZeroScene } from "./components/AlphaZeroScene";
import { MasterAIScene } from "./components/MasterAIScene";
import { WinProbabilityScene } from "./components/WinProbabilityScene";
import { SelfPlayTrainingScene } from "./components/SelfPlayTrainingScene";
import { WasmPerformanceScene } from "./components/WasmPerformanceScene";
import { OverEngineeredScene } from "./components/OverEngineeredScene";
import { OutroScene } from "./components/OutroScene";

export const ShowcaseVideo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Scene durations in seconds (extended for better pacing)
  const introDuration = 4 * fps;
  const featuresDuration = 6 * fps;
  const difficultyDuration = 7 * fps;
  const expectimaxDuration = 7 * fps;
  const mctsDuration = 7 * fps;
  const neuralNetworkDuration = 7 * fps;
  const alphaZeroDuration = 7 * fps;
  const masterAIDuration = 7 * fps;
  const winProbDuration = 6 * fps;
  const selfPlayDuration = 7 * fps;
  const wasmDuration = 6 * fps;
  const overEngineeredDuration = 7 * fps;
  const outroDuration = Math.round(7.5 * fps); // 50% longer for fade out

  // Transition duration
  const transitionDuration = Math.round(0.5 * fps);

  // Audio fade out over last 3 seconds
  const fadeOutDuration = 3 * fps;
  const fadeOutStart = durationInFrames - fadeOutDuration;
  const volume = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      {/* Background fill to prevent flicker during transitions */}
      <AbsoluteFill style={{ backgroundColor: theme.background }} />
      <Audio src={staticFile("music.mp3")} volume={volume} />
      <TransitionSeries>
      {/* === INTRO === */}
      <TransitionSeries.Sequence durationInFrames={introDuration}>
        <IntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === FEATURES OVERVIEW === */}
      <TransitionSeries.Sequence durationInFrames={featuresDuration}>
        <FeaturesScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === DIFFICULTY LEVELS === */}
      <TransitionSeries.Sequence durationInFrames={difficultyDuration}>
        <DifficultyProgressionScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === AI/ML DEEP DIVE SECTION === */}

      {/* Expectimax Algorithm */}
      <TransitionSeries.Sequence durationInFrames={expectimaxDuration}>
        <ExpectimaxScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Monte Carlo Tree Search */}
      <TransitionSeries.Sequence durationInFrames={mctsDuration}>
        <MCTSScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Neural Network Architecture */}
      <TransitionSeries.Sequence durationInFrames={neuralNetworkDuration}>
        <NeuralNetworkScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* AlphaZero Hybrid Approach */}
      <TransitionSeries.Sequence durationInFrames={alphaZeroDuration}>
        <AlphaZeroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Master AI Adaptive Learning */}
      <TransitionSeries.Sequence durationInFrames={masterAIDuration}>
        <MasterAIScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === USER-FACING FEATURES === */}

      {/* Win Probability Analysis */}
      <TransitionSeries.Sequence durationInFrames={winProbDuration}>
        <WinProbabilityScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Self-Play Training */}
      <TransitionSeries.Sequence durationInFrames={selfPlayDuration}>
        <SelfPlayTrainingScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === TECHNICAL PERFORMANCE === */}

      {/* WASM Performance */}
      <TransitionSeries.Sequence durationInFrames={wasmDuration}>
        <WasmPerformanceScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === QUIRKY SELF-AWARE MOMENT === */}
      <TransitionSeries.Sequence durationInFrames={overEngineeredDuration}>
        <OverEngineeredScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* === OUTRO === */}
      <TransitionSeries.Sequence durationInFrames={outroDuration}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    </>
  );
};
