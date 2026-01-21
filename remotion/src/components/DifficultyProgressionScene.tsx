import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMonoFont } from "@remotion/google-fonts/JetBrainsMono";
import { theme, flexColumn, flexCenter } from "../theme";

const { fontFamily } = loadFont();
const { fontFamily: monoFont } = loadMonoFont();

type DifficultyLevel = {
  name: string;
  depth: number;
  randomness: number;
  features: string[];
  color: string;
};

const difficulties: DifficultyLevel[] = [
  { name: "Greedy", depth: 0, randomness: 0, features: ["Immediate score"], color: "#6b7280" },
  { name: "Beginner", depth: 1, randomness: 40, features: ["Random moves"], color: "#22c55e" },
  { name: "Easy", depth: 2, randomness: 25, features: ["Basic strategy"], color: "#84cc16" },
  { name: "Medium", depth: 3, randomness: 10, features: ["Solid play"], color: "#eab308" },
  { name: "Hard", depth: 4, randomness: 0, features: ["Adversarial"], color: "#f97316" },
  { name: "Expert", depth: 6, randomness: 0, features: ["Time budget"], color: "#ef4444" },
  { name: "Master", depth: 6, randomness: 0, features: ["Adaptive"], color: "#ec4899" },
  { name: "Grandmaster", depth: 6, randomness: 0, features: ["Neural+MCTS"], color: "#a855f7" },
];

type LevelCardProps = {
  level: DifficultyLevel;
  index: number;
  delay: number;
  isHighlighted: boolean;
};

const LevelCard: React.FC<LevelCardProps> = ({
  level,
  index,
  delay,
  isHighlighted,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const scale = interpolate(enterSpring, [0, 1], [0.5, 1], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(enterSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const pulseScale = isHighlighted ? 1 + Math.sin(frame * 0.15) * 0.05 : 1;

  return (
    <div
      style={{
        ...flexColumn,
        gap: 16,
        padding: "32px 24px",
        backgroundColor: isHighlighted
          ? `${level.color}22`
          : `${theme.backgroundLight}99`,
        borderRadius: 24,
        border: `4px solid ${isHighlighted ? level.color : level.color}44`,
        width: 260,
        minHeight: 320,
        transform: `scale(${scale * pulseScale})`,
        opacity,
        boxShadow: isHighlighted ? `0 0 40px ${level.color}44` : "none",
      }}
    >
      {/* Level number badge */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: level.color,
          ...flexCenter,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            fontWeight: "bold",
            color: theme.background,
          }}
        >
          {index + 1}
        </span>
      </div>

      {/* Name */}
      <span
        style={{
          fontFamily,
          fontSize: 30,
          fontWeight: "bold",
          color: level.color,
          textAlign: "center",
        }}
      >
        {level.name}
      </span>

      {/* Depth bar */}
      <div style={{ width: "100%", marginTop: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontFamily: monoFont, fontSize: 20, color: theme.textMuted }}>
            Depth
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 20, color: theme.textSecondary }}>
            {level.depth}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 12,
            backgroundColor: `${theme.textMuted}33`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              width: `${(level.depth / 6) * 100}%`,
              height: "100%",
              backgroundColor: level.color,
              borderRadius: 6,
            }}
          />
        </div>
      </div>

      {/* Randomness */}
      <div
        style={{
          fontFamily: monoFont,
          fontSize: 20,
          color: theme.textMuted,
          marginTop: 8,
        }}
      >
        {level.randomness > 0 ? `${level.randomness}% random` : "Optimal"}
      </div>

      {/* Features */}
      <div
        style={{
          fontFamily,
          fontSize: 20,
          color: theme.textSecondary,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {level.features[0]}
      </div>
    </div>
  );
};

export const DifficultyProgressionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Highlight cycles through levels
  const highlightDuration = 15;
  const highlightIndex = Math.floor((frame - 60) / highlightDuration) % 8;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        padding: 120,
        gap: 60,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 112,
          fontWeight: "bold",
          color: theme.textPrimary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`,
        }}
      >
        8 Difficulty Levels
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 48,
          color: theme.textSecondary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        Progressive challenge from casual to competitive
      </div>

      {/* Difficulty progression arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 20,
          opacity: interpolate(frame, [30, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={{ fontFamily, fontSize: 28, color: "#22c55e" }}>Easier</span>
        <svg width={400} height={40}>
          <defs>
            <linearGradient id="diffGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <line
            x1={20}
            y1={20}
            x2={380}
            y2={20}
            stroke="url(#diffGradient)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <polygon points="370,10 390,20 370,30" fill="#a855f7" />
        </svg>
        <span style={{ fontFamily, fontSize: 28, color: "#a855f7" }}>Harder</span>
      </div>

      {/* Level cards */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 40,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {difficulties.map((level, i) => (
          <LevelCard
            key={level.name}
            level={level}
            index={i}
            delay={10 + i * 5}
            isHighlighted={highlightIndex === i && frame > 60}
          />
        ))}
      </div>

      {/* Feature comparison */}
      <div
        style={{
          display: "flex",
          gap: 120,
          marginTop: 80,
          opacity: interpolate(frame, [70, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "Beginner", desc: "40% random moves", color: "#22c55e" },
          { label: "Hard+", desc: "Adversarial minimax", color: "#f97316" },
          { label: "Master", desc: "Learns your patterns", color: "#ec4899" },
          { label: "Grandmaster", desc: "Neural network AI", color: "#a855f7" },
        ].map((item) => (
          <div key={item.label} style={{ ...flexColumn, gap: 16 }}>
            <span
              style={{
                fontFamily,
                fontSize: 36,
                color: item.color,
                fontWeight: "bold",
              }}
            >
              {item.label}
            </span>
            <span style={{ fontFamily, fontSize: 26, color: theme.textMuted }}>
              {item.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          fontFamily,
          fontSize: 40,
          color: theme.accent,
          marginTop: 60,
          fontStyle: "italic",
          opacity: interpolate(frame, [90, 110], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        "Find your perfect opponent at any skill level"
      </div>
    </AbsoluteFill>
  );
};
