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

type BarComparisonProps = {
  label: string;
  jsValue: number;
  wasmValue: number;
  unit: string;
  delay: number;
  lowerIsBetter?: boolean;
};

const BarComparison: React.FC<BarComparisonProps> = ({
  label,
  jsValue,
  wasmValue,
  unit,
  delay,
  lowerIsBetter = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const maxVal = Math.max(jsValue, wasmValue);
  const jsProgress = interpolate(frame - delay - 10, [0, 40], [0, jsValue / maxVal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wasmProgress = interpolate(frame - delay - 20, [0, 40], [0, wasmValue / maxVal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const improvement = lowerIsBetter
    ? Math.round(jsValue / wasmValue)
    : Math.round(wasmValue / jsValue);

  return (
    <div
      style={{
        ...flexColumn,
        alignItems: "flex-start",
        gap: 32,
        width: "100%",
        opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(enterSpring, [0, 1], [-60, 0])}px)`,
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 40,
          color: theme.textPrimary,
          fontWeight: "bold",
        }}
      >
        {label}
      </span>

      {/* JavaScript bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 32, width: "100%" }}>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: theme.textMuted,
            width: 160,
          }}
        >
          JavaScript
        </span>
        <div
          style={{
            flex: 1,
            height: 48,
            backgroundColor: `${theme.textMuted}22`,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${jsProgress * 100}%`,
              height: "100%",
              backgroundColor: theme.primary,
              borderRadius: 24,
            }}
          />
        </div>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            color: theme.primary,
            width: 200,
            textAlign: "right",
          }}
        >
          {Math.round(jsProgress * jsValue)}{unit}
        </span>
      </div>

      {/* WASM bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 32, width: "100%" }}>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: theme.textMuted,
            width: 160,
          }}
        >
          Rust/WASM
        </span>
        <div
          style={{
            flex: 1,
            height: 48,
            backgroundColor: `${theme.textMuted}22`,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${wasmProgress * 100}%`,
              height: "100%",
              backgroundColor: "#22c55e",
              borderRadius: 24,
              boxShadow: "0 0 30px #22c55e66",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            color: "#22c55e",
            width: 200,
            textAlign: "right",
          }}
        >
          {Math.round(wasmProgress * wasmValue)}{unit}
        </span>
      </div>

      {/* Improvement badge */}
      <div
        style={{
          alignSelf: "flex-end",
          padding: "12px 32px",
          backgroundColor: "#22c55e22",
          borderRadius: 40,
          border: "2px solid #22c55e44",
          opacity: interpolate(frame - delay, [50, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            color: "#22c55e",
            fontWeight: "bold",
          }}
        >
          {improvement}x faster
        </span>
      </div>
    </div>
  );
};

export const WasmPerformanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Animated Rust logo rotation
  const rustRotation = frame * 0.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        padding: 120,
        gap: 80,
      }}
    >
      {/* Title with Rust + WASM logos */}
      <div style={{ ...flexCenter, gap: 60 }}>
        {/* Rust gear logo */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          style={{
            transform: `rotate(${rustRotation}deg)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          <circle cx="50" cy="50" r="35" fill="none" stroke="#f74c00" strokeWidth="8" />
          {/* Gear teeth */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect
              key={angle}
              x="46"
              y="10"
              width="8"
              height="15"
              fill="#f74c00"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="12" fill="#f74c00" />
        </svg>

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
          Blazing Fast Engine
        </div>

        {/* WASM logo */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          style={{
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="#654ff0"
          />
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="bold"
            fontFamily={monoFont}
          >
            W
          </text>
        </svg>
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
        Rust + WebAssembly for native-level performance in your browser
      </div>

      {/* Performance comparisons */}
      <div
        style={{
          ...flexColumn,
          gap: 100,
          width: "80%",
          maxWidth: 1800,
          marginTop: 60,
        }}
      >
        <BarComparison
          label="Move Calculation Time"
          jsValue={1000}
          wasmValue={10}
          unit="ms"
          delay={20}
        />
        <BarComparison
          label="Nodes Evaluated per Second"
          jsValue={5000}
          wasmValue={500000}
          unit=""
          delay={40}
          lowerIsBetter={false}
        />
      </div>

      {/* Tech badges */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 100,
          opacity: interpolate(frame, [90, 110], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "Zero-copy structs", color: "#f74c00" },
          { label: "9-byte grids", color: "#654ff0" },
          { label: "Client-side AI", color: "#22c55e" },
          { label: "No server needed", color: theme.accent },
        ].map((badge) => (
          <div
            key={badge.label}
            style={{
              fontFamily: monoFont,
              fontSize: 28,
              color: badge.color,
              padding: "20px 40px",
              borderRadius: 50,
              border: `2px solid ${badge.color}66`,
              backgroundColor: `${badge.color}11`,
            }}
          >
            {badge.label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
