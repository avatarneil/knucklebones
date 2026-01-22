import React from "react";
import { useVideoConfig } from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

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
  const { fps } = useVideoConfig();

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
  const outroDuration = 5 * fps;

  // Transition duration
  const transitionDuration = Math.round(0.5 * fps);

  return (
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
        presentation={slide({ direction: "from-right" })}
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
        presentation={slide({ direction: "from-left" })}
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
        presentation={slide({ direction: "from-right" })}
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
        presentation={slide({ direction: "from-left" })}
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
        presentation={slide({ direction: "from-bottom" })}
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
  );
};
