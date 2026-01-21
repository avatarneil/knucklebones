import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadBodyFont } from "@remotion/google-fonts/Inter";
import { theme, flexColumn } from "../theme";
import { Dice } from "./Dice";

const { fontFamily: titleFont } = loadFont();
const { fontFamily: bodyFont } = loadBodyFont();

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Title animation
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const titleY = interpolate(titleSpring, [0, 1], [100, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle animation
  const subtitleSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);

  // Background glow animation
  const glowPulse = Math.sin(frame * 0.05) * 0.3 + 0.7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        gap: 80,
        overflow: "hidden",
      }}
    >
      {/* Animated background glow */}
      <div
        style={{
          position: "absolute",
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.primary}22 0%, transparent 70%)`,
          opacity: glowPulse,
          filter: "blur(200px)",
        }}
      />

      {/* Decorative dice floating around */}
      <div style={{ position: "absolute", top: "15%", left: "10%" }}>
        <Dice value={6} size={160} delay={20} />
      </div>
      <div style={{ position: "absolute", top: "20%", right: "15%" }}>
        <Dice value={3} size={120} delay={25} />
      </div>
      <div style={{ position: "absolute", bottom: "25%", left: "15%" }}>
        <Dice value={5} size={140} delay={30} />
      </div>
      <div style={{ position: "absolute", bottom: "20%", right: "10%" }}>
        <Dice value={1} size={130} delay={35} />
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 240,
          fontWeight: "bold",
          color: theme.accent,
          textShadow: `0 0 120px ${theme.accent}66`,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          letterSpacing: "0.05em",
          zIndex: 1,
        }}
      >
        KnuckleTrainer
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 72,
          color: theme.textSecondary,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          maxWidth: 1600,
          textAlign: "center",
          lineHeight: 1.5,
          zIndex: 1,
        }}
      >
        Master the dice game from Cult of the Lamb
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 48,
          color: theme.textMuted,
          opacity: interpolate(frame, [fps * 1.5, fps * 2], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          marginTop: 40,
          zIndex: 1,
        }}
      >
        Train with AI. Compete online. Become the champion.
      </div>
    </AbsoluteFill>
  );
};
