import { Composition, Folder } from "remotion";
import { ShowcaseVideo } from "./ShowcaseVideo";
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

// Video settings
const FPS = 30;
const WIDTH = 3840;
const HEIGHT = 2160;

// Calculate total duration for main composition
// Scene durations: 6 + 6 + 7 + 7 + 7 + 7 + 7 + 7 + 6 + 7 + 6 + 7 + 5 = 85 seconds
// Minus 12 transitions of 0.5s each = 79 seconds total
const TOTAL_DURATION = Math.round(79 * FPS);

// Individual scene durations for preview
const SCENE_DURATION = 5 * FPS;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main showcase video */}
      <Composition
        id="ShowcaseVideo"
        component={ShowcaseVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Individual scenes for preview/testing */}
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={IntroScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Features"
          component={FeaturesScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="DifficultyProgression"
          component={DifficultyProgressionScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Expectimax"
          component={ExpectimaxScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="MCTS"
          component={MCTSScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="NeuralNetwork"
          component={NeuralNetworkScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="AlphaZero"
          component={AlphaZeroScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="MasterAI"
          component={MasterAIScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="WinProbability"
          component={WinProbabilityScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="SelfPlayTraining"
          component={SelfPlayTrainingScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="WasmPerformance"
          component={WasmPerformanceScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="OverEngineered"
          component={OverEngineeredScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Outro"
          component={OutroScene}
          durationInFrames={SCENE_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>
    </>
  );
};
