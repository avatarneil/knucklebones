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

type PatternCardProps = {
  icon: string;
  title: string;
  description: string;
  value: number;
  maxValue: number;
  delay: number;
  color: string;
};

const PatternCard: React.FC<PatternCardProps> = ({
  icon,
  title,
  description,
  value,
  maxValue,
  delay,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const barProgress = interpolate(frame - delay - 15, [0, 30], [0, value / maxValue], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        ...flexColumn,
        alignItems: "flex-start",
        gap: 24,
        padding: 48,
        backgroundColor: `${theme.backgroundLight}cc`,
        borderRadius: 32,
        border: `2px solid ${color}33`,
        width: 560,
        opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(enterSpring, [0, 1], [60, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontSize: 56 }}>{icon}</span>
        <span
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: "bold",
            color: theme.textPrimary,
          }}
        >
          {title}
        </span>
      </div>
      <span
        style={{
          fontFamily,
          fontSize: 28,
          color: theme.textSecondary,
        }}
      >
        {description}
      </span>
      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: 16,
          backgroundColor: `${theme.textMuted}33`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barProgress * 100}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 8,
            boxShadow: `0 0 20px ${color}88`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: monoFont,
          fontSize: 32,
          color,
          fontWeight: "bold",
        }}
      >
        {Math.round(barProgress * maxValue)}%
      </span>
    </div>
  );
};

export const MasterAIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Title animation
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Brain pulse animation
  const brainPulse = Math.sin(frame * 0.1) * 0.1 + 1;

  // Learning indicator
  const learningDots = Math.floor((frame / 15) % 4);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        padding: 120,
        gap: 80,
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
        Adaptive Opponent Learning
      </div>

      {/* Subtitle with learning indicator */}
      <div
        style={{
          fontFamily,
          fontSize: 48,
          color: theme.accent,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span>Master AI is learning</span>
        <span style={{ fontFamily: monoFont }}>
          {".".repeat(learningDots + 1)}
        </span>
      </div>

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 160,
          marginTop: 40,
        }}
      >
        {/* Brain visualization */}
        <div
          style={{
            ...flexColumn,
            gap: 40,
          }}
        >
          <svg
            width="400"
            height="400"
            viewBox="0 0 100 100"
            style={{
              transform: `scale(${brainPulse})`,
              filter: `drop-shadow(0 0 40px ${theme.secondary}66)`,
            }}
          >
            {/* Brain outline */}
            <path
              d="M50 10 C20 10, 10 30, 15 50 C10 60, 15 80, 35 85 C40 90, 60 90, 65 85 C85 80, 90 60, 85 50 C90 30, 80 10, 50 10"
              fill="none"
              stroke={theme.secondary}
              strokeWidth="2"
            />
            {/* Brain lobes */}
            <path
              d="M50 10 C50 30, 30 40, 25 50 M50 10 C50 30, 70 40, 75 50"
              fill="none"
              stroke={theme.secondary}
              strokeWidth="1.5"
              opacity={0.6}
            />
            {/* Neural connections (animated) */}
            {[0, 1, 2, 3, 4].map((i) => {
              const progress = ((frame * 0.05 + i * 0.2) % 1);
              return (
                <circle
                  key={i}
                  cx={30 + i * 10}
                  cy={40 + Math.sin(i * 1.5) * 15}
                  r={3}
                  fill={theme.accent}
                  opacity={0.3 + progress * 0.7}
                />
              );
            })}
          </svg>
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 28,
              color: theme.textMuted,
              textAlign: "center",
            }}
          >
            Real-time pattern analysis
          </span>
        </div>

        {/* Pattern cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 40,
          }}
        >
          <PatternCard
            icon="🎯"
            title="Column Preference"
            description="Detects favorite placement columns"
            value={72}
            maxValue={100}
            delay={15}
            color={theme.accent}
          />
          <PatternCard
            icon="⚔️"
            title="Attack Rate"
            description="Tracks aggressive vs defensive play"
            value={45}
            maxValue={100}
            delay={25}
            color={theme.primary}
          />
          <PatternCard
            icon="🎲"
            title="High Dice Placement"
            description="Where opponent places 5s and 6s"
            value={63}
            maxValue={100}
            delay={35}
            color={theme.secondary}
          />
          <PatternCard
            icon="🛡️"
            title="Defense Adjustment"
            description="AI adapts defensive weight"
            value={58}
            maxValue={100}
            delay={45}
            color="#22c55e"
          />
        </div>
      </div>

      {/* Bottom quote */}
      <div
        style={{
          fontFamily,
          fontSize: 40,
          color: theme.textSecondary,
          fontStyle: "italic",
          marginTop: 80,
          opacity: interpolate(frame, [80, 100], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        "After just 3 games, the AI knows your weaknesses"
      </div>
    </AbsoluteFill>
  );
};
