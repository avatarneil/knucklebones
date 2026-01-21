import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { theme, flexColumn } from "../theme";
import { Dice } from "./Dice";

const { fontFamily } = loadFont();

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const scale = interpolate(enterSpring, [0, 1], [0.8, 1], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(enterSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(enterSpring, [0, 1], [50, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        ...flexColumn,
        gap: 32,
        padding: 80,
        backgroundColor: `${theme.backgroundLight}cc`,
        borderRadius: 48,
        border: `4px solid ${theme.accent}33`,
        width: 640,
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity,
      }}
    >
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <div
        style={{
          fontFamily,
          fontSize: 56,
          fontWeight: "bold",
          color: theme.accent,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 36,
          color: theme.textSecondary,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
};

// Icon components
const AIIcon = () => (
  <svg
    width="128"
    height="128"
    viewBox="0 0 24 24"
    fill="none"
    stroke={theme.primary}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
    <path d="M12 12 2.1 9.1" />
    <path d="m12 12 6.4-8.4" />
    <path d="M12 12 17 21" />
  </svg>
);

const MultiplayerIcon = () => (
  <svg
    width="128"
    height="128"
    viewBox="0 0 24 24"
    fill="none"
    stroke={theme.secondary}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TrainingIcon = () => (
  <svg
    width="128"
    height="128"
    viewBox="0 0 24 24"
    fill="none"
    stroke={theme.accent}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [-30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        gap: 120,
        padding: 160,
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontFamily,
          fontSize: 128,
          fontWeight: "bold",
          color: theme.textPrimary,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}
      >
        Everything You Need
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          gap: 80,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <FeatureCard
          icon={<AIIcon />}
          title="8 AI Levels"
          description="From beginner to Grandmaster with neural network + MCTS"
          delay={15}
        />
        <FeatureCard
          icon={<MultiplayerIcon />}
          title="Multiplayer"
          description="Play online with friends or spectate live matches"
          delay={25}
        />
        <FeatureCard
          icon={<TrainingIcon />}
          title="Training Mode"
          description="Real-time win probability to improve your strategy"
          delay={35}
        />
      </div>
    </AbsoluteFill>
  );
};
