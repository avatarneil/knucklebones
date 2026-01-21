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

export const OverEngineeredScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Question appears first
  const questionSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Answer appears with dramatic delay
  const answerDelay = 45;
  const answerSpring = spring({
    frame: frame - answerDelay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Tech list appears after answer
  const listDelay = 75;

  const techItems = [
    { text: "Neural Networks", icon: "🧠" },
    { text: "Monte Carlo Tree Search", icon: "🌳" },
    { text: "Expectimax Algorithm", icon: "📊" },
    { text: "Rust + WebAssembly", icon: "⚡" },
    { text: "Self-Play Training", icon: "🔄" },
    { text: "Adaptive Learning", icon: "🎯" },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        padding: 120,
        gap: 80,
      }}
    >
      {/* Question */}
      <div
        style={{
          fontFamily,
          fontSize: 84,
          color: theme.textSecondary,
          opacity: interpolate(questionSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(questionSpring, [0, 1], [-40, 0])}px)`,
          textAlign: "center",
          maxWidth: 1800,
          lineHeight: 1.4,
        }}
      >
        "Is this over-engineered for a 3×3 dice game?"
      </div>

      {/* Answer - dramatic reveal */}
      <div
        style={{
          ...flexColumn,
          gap: 16,
          opacity: interpolate(answerSpring, [0, 1], [0, 1]),
          transform: `scale(${interpolate(answerSpring, [0, 1], [0.5, 1])})`,
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 144,
            fontWeight: "bold",
            color: theme.accent,
            textShadow: `0 0 80px ${theme.accent}66`,
          }}
        >
          Absolutely.
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 56,
            color: theme.textMuted,
            marginTop: 16,
          }}
        >
          But where's the fun in doing things the easy way?
        </div>
      </div>

      {/* Tech recap - scrolling badges */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          justifyContent: "center",
          maxWidth: 1600,
          marginTop: 60,
        }}
      >
        {techItems.map((item, i) => {
          const itemDelay = listDelay + i * 8;
          const itemSpring = spring({
            frame: frame - itemDelay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={item.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "24px 40px",
                backgroundColor: `${theme.backgroundLight}cc`,
                borderRadius: 60,
                border: `2px solid ${theme.accent}33`,
                opacity: interpolate(itemSpring, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(itemSpring, [0, 1], [40, 0])}px)`,
              }}
            >
              <span style={{ fontSize: 40 }}>{item.icon}</span>
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: 28,
                  color: theme.textSecondary,
                }}
              >
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Punchline */}
      <div
        style={{
          fontFamily,
          fontSize: 40,
          color: theme.primary,
          marginTop: 60,
          opacity: interpolate(frame, [120, 135], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        ...all for a game you can learn in 30 seconds 🎲
      </div>
    </AbsoluteFill>
  );
};
