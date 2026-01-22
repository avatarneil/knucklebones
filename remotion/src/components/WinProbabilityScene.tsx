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
import { Dice } from "./Dice";

const { fontFamily } = loadFont();
const { fontFamily: monoFont } = loadMonoFont();

type MoveOptionProps = {
  column: number;
  probability: number;
  scoreGain: string;
  delay: number;
  isRecommended: boolean;
};

const MoveOption: React.FC<MoveOptionProps> = ({
  column,
  probability,
  scoreGain,
  delay,
  isRecommended,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const probProgress = interpolate(frame - delay - 10, [0, 30], [0, probability], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Color based on probability
  const getColor = (prob: number) => {
    if (prob >= 60) return "#22c55e"; // Green
    if (prob >= 40) return theme.accent; // Yellow/amber
    return theme.primary; // Red
  };

  const color = getColor(probability);
  const pulseScale = isRecommended ? 1 + Math.sin(frame * 0.12) * 0.05 : 1;

  return (
    <div
      style={{
        ...flexColumn,
        gap: 32,
        padding: 56,
        backgroundColor: isRecommended
          ? `${color}22`
          : `${theme.backgroundLight}cc`,
        borderRadius: 40,
        border: `4px solid ${isRecommended ? color : theme.textMuted}44`,
        width: 400,
        opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        transform: `scale(${interpolate(enterSpring, [0, 1], [0.8, 1]) * pulseScale})`,
        boxShadow: isRecommended ? `0 0 60px ${color}33` : "none",
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 56,
          color: theme.textSecondary,
          fontWeight: "bold",
        }}
      >
        Column {column}
      </span>

      {/* Circular progress */}
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <svg width="220" height="220" viewBox="0 0 110 110">
          {/* Background circle */}
          <circle
            cx="55"
            cy="55"
            r="48"
            fill="none"
            stroke={`${theme.textMuted}33`}
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="55"
            cy="55"
            r="48"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${probProgress * 3.016} 301.6`}
            transform="rotate(-90 55 55)"
            style={{
              filter: `drop-shadow(0 0 16px ${color}88)`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            ...flexColumn,
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 56,
              fontWeight: "bold",
              color,
            }}
          >
            {Math.round(probProgress)}%
          </span>
        </div>
      </div>

      <div style={{ ...flexColumn, gap: 8 }}>
        <span style={{ fontFamily, fontSize: 36, color: theme.textMuted }}>
          Score gain
        </span>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 52,
            color: theme.textPrimary,
            fontWeight: "bold",
          }}
        >
          {scoreGain}
        </span>
      </div>

      {isRecommended && (
        <div
          style={{
            fontFamily,
            fontSize: 32,
            color,
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          ★ Best Move
        </div>
      )}
    </div>
  );
};

export const WinProbabilityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

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
          fontSize: 140,
          fontWeight: "bold",
          color: theme.textPrimary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`,
        }}
      >
        Real-Time Win Probability
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 64,
          color: theme.textSecondary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        See the impact of every move before you make it
      </div>

      {/* Current die display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          marginTop: 40,
          opacity: interpolate(frame, [20, 35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={{ fontFamily, fontSize: 52, color: theme.textMuted }}>
          Current die:
        </span>
        <Dice value={5} size={120} delay={20} />
      </div>

      {/* Move options */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginTop: 80,
        }}
      >
        <MoveOption
          column={1}
          probability={42}
          scoreGain="+5"
          delay={30}
          isRecommended={false}
        />
        <MoveOption
          column={2}
          probability={68}
          scoreGain="+15"
          delay={40}
          isRecommended={true}
        />
        <MoveOption
          column={3}
          probability={31}
          scoreGain="+5"
          delay={50}
          isRecommended={false}
        />
      </div>

      {/* Analysis breakdown */}
      <div
        style={{
          display: "flex",
          gap: 120,
          marginTop: 100,
          opacity: interpolate(frame, [70, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { icon: "📊", label: "Score Gain", value: "+15 pts" },
          { icon: "💥", label: "Dice Removed", value: "2 opponent" },
          { icon: "🎯", label: "Combo Potential", value: "Triple 5s" },
        ].map((item) => (
          <div key={item.label} style={{ ...flexColumn, gap: 16 }}>
            <span style={{ fontSize: 64 }}>{item.icon}</span>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 56,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {item.value}
            </span>
            <span style={{ fontFamily, fontSize: 36, color: theme.textMuted }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
