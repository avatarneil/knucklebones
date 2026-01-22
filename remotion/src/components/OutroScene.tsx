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

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Logo animation
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1], {
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  // URL animation
  const urlSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
  });

  // CTA animation
  const ctaSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200 },
  });

  // Pulsing glow
  const glowPulse = Math.sin(frame * 0.08) * 0.4 + 0.6;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        gap: 80,
        overflow: "hidden",
      }}
    >
      {/* Radial glow background */}
      <div
        style={{
          position: "absolute",
          width: width,
          height: width,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.accent}22 0%, transparent 60%)`,
          opacity: glowPulse,
          filter: "blur(160px)",
        }}
      />

      {/* Decorative dice */}
      <div style={{ position: "absolute", top: "12%", left: "8%" }}>
        <Dice value={6} size={140} delay={5} />
      </div>
      <div style={{ position: "absolute", top: "15%", right: "12%" }}>
        <Dice value={4} size={110} delay={10} />
      </div>
      <div style={{ position: "absolute", bottom: "18%", left: "12%" }}>
        <Dice value={2} size={120} delay={15} />
      </div>
      <div style={{ position: "absolute", bottom: "15%", right: "8%" }}>
        <Dice value={5} size={130} delay={20} />
      </div>

      {/* Logo / Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 240,
          fontWeight: "bold",
          color: theme.accent,
          textShadow: `0 0 ${120 * glowPulse}px ${theme.accent}88`,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          zIndex: 1,
        }}
      >
        KnuckleTrainer
      </div>

      {/* URL */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 104,
          fontWeight: "bold",
          color: theme.textPrimary,
          opacity: interpolate(urlSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(urlSpring, [0, 1], [40, 0])}px)`,
          zIndex: 1,
          letterSpacing: "0.02em",
        }}
      >
        knuckletrainer.com
      </div>

      {/* CTA */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 72,
          color: theme.primary,
          opacity: interpolate(ctaSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(ctaSpring, [0, 1], [40, 0])}px)`,
          zIndex: 1,
          marginTop: 40,
        }}
      >
        Play free. No ads. No paywalls.
      </div>

      {/* Platform badges */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 60,
          opacity: interpolate(frame, [fps * 2, fps * 2.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 1,
        }}
      >
        {["Web", "iOS", "Android"].map((platform) => (
          <div
            key={platform}
            style={{
              fontFamily: bodyFont,
              fontSize: 44,
              color: theme.textSecondary,
              padding: "24px 48px",
              borderRadius: 60,
              border: `2px solid ${theme.textMuted}`,
              backgroundColor: `${theme.backgroundLight}88`,
            }}
          >
            {platform}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
