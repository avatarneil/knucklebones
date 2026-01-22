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

// Helper to calculate point on quadratic bezier curve
const getQuadraticBezierPoint = (
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) => {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
  return { x, y };
};

export const AlphaZeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Pulsing animation for the central fusion element
  const fusionPulse = 1 + Math.sin(frame * 0.1) * 0.08;
  const fusionGlow = 0.5 + Math.sin(frame * 0.08) * 0.3;

  // Data flow animation
  const flowProgress = (frame * 0.02) % 1;

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
          fontSize: 140,
          fontWeight: "bold",
          color: theme.textPrimary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`,
        }}
      >
        Grandmaster: Hybrid Neural MCTS
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 64,
          color: theme.accent,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        AlphaZero-inspired architecture for optimal play
      </div>

      {/* Main visualization */}
      <div
        style={{
          position: "relative",
          width: width - 400,
          height: 800,
          marginTop: 60,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 2400 800">
          {/* Neural Network box (left) */}
          <g
            style={{
              opacity: interpolate(frame, [20, 40], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <rect
              x={160}
              y={200}
              width={560}
              height={400}
              rx={32}
              fill={`${theme.secondary}22`}
              stroke={theme.secondary}
              strokeWidth={4}
            />
            {/* Network layers visualization */}
            {[0, 1, 2].map((layer) => (
              <g key={layer}>
                {Array.from({ length: 5 - layer }, (_, i) => (
                  <circle
                    key={i}
                    cx={280 + layer * 160}
                    cy={280 + i * 70 + layer * 20}
                    r={20}
                    fill={layer === 2 ? theme.accent : theme.secondary}
                    opacity={0.8}
                  />
                ))}
              </g>
            ))}
            {/* Connections */}
            {[0, 1].map((layer) =>
              Array.from({ length: 5 - layer }, (_, i) =>
                Array.from({ length: 4 - layer }, (_, j) => (
                  <line
                    key={`${layer}-${i}-${j}`}
                    x1={300 + layer * 160}
                    y1={280 + i * 70 + layer * 20}
                    x2={420 + layer * 160}
                    y2={300 + j * 70 + (layer + 1) * 20}
                    stroke={theme.textMuted}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                ))
              )
            )}
            <text
              x={440}
              y={160}
              textAnchor="middle"
              fill={theme.secondary}
              fontSize={52}
              fontFamily={fontFamily}
              fontWeight="bold"
            >
              Neural Network
            </text>
            <text
              x={440}
              y={660}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={36}
              fontFamily={monoFont}
            >
              Policy P(s,a) + Value V(s)
            </text>
          </g>

          {/* MCTS Tree box (right) */}
          <g
            style={{
              opacity: interpolate(frame, [30, 50], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <rect
              x={1680}
              y={200}
              width={560}
              height={400}
              rx={32}
              fill={`${theme.primary}22`}
              stroke={theme.primary}
              strokeWidth={4}
            />
            {/* Tree structure */}
            <circle cx={1960} cy={280} r={24} fill={theme.primary} />
            <circle cx={1840} cy={400} r={20} fill={theme.primary} opacity={0.7} />
            <circle cx={1960} cy={400} r={20} fill={theme.primary} opacity={0.7} />
            <circle cx={2080} cy={400} r={20} fill={theme.primary} opacity={0.7} />
            <circle cx={1800} cy={520} r={16} fill={theme.primary} opacity={0.5} />
            <circle cx={1880} cy={520} r={16} fill={theme.primary} opacity={0.5} />
            <circle cx={2000} cy={520} r={16} fill={theme.primary} opacity={0.5} />
            <circle cx={2120} cy={520} r={16} fill={theme.primary} opacity={0.5} />
            {/* Tree edges */}
            <line x1={1960} y1={304} x2={1840} y2={380} stroke={theme.textMuted} strokeWidth={3} />
            <line x1={1960} y1={304} x2={1960} y2={380} stroke={theme.textMuted} strokeWidth={3} />
            <line x1={1960} y1={304} x2={2080} y2={380} stroke={theme.textMuted} strokeWidth={3} />
            <line x1={1840} y1={420} x2={1800} y2={504} stroke={theme.textMuted} strokeWidth={2} />
            <line x1={1840} y1={420} x2={1880} y2={504} stroke={theme.textMuted} strokeWidth={2} />
            <line x1={2080} y1={420} x2={2000} y2={504} stroke={theme.textMuted} strokeWidth={2} />
            <line x1={2080} y1={420} x2={2120} y2={504} stroke={theme.textMuted} strokeWidth={2} />

            <text
              x={1960}
              y={160}
              textAnchor="middle"
              fill={theme.primary}
              fontSize={52}
              fontFamily={fontFamily}
              fontWeight="bold"
            >
              MCTS Search
            </text>
            <text
              x={1960}
              y={660}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={36}
              fontFamily={monoFont}
            >
              Guided exploration
            </text>
          </g>

          {/* Central fusion element */}
          <g
            style={{
              transform: `scale(${fusionPulse})`,
              transformOrigin: "1200px 400px",
              opacity: interpolate(frame, [40, 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {/* Glow effect */}
            <circle
              cx={1200}
              cy={400}
              r={140}
              fill={`${theme.accent}${Math.round(fusionGlow * 30).toString(16).padStart(2, "0")}`}
              filter="blur(30px)"
            />
            {/* Main circle */}
            <circle
              cx={1200}
              cy={400}
              r={110}
              fill={theme.background}
              stroke={theme.accent}
              strokeWidth={6}
            />
            {/* Inner pattern */}
            <circle cx={1200} cy={400} r={60} fill={`${theme.accent}44`} />
            <text
              x={1200}
              y={390}
              textAnchor="middle"
              fill={theme.accent}
              fontSize={40}
              fontFamily={fontFamily}
              fontWeight="bold"
            >
              PUCT
            </text>
            <text
              x={1200}
              y={424}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={28}
              fontFamily={monoFont}
            >
              fusion
            </text>
          </g>

          {/* Connecting arrows with data flow */}
          <g
            style={{
              opacity: interpolate(frame, [50, 70], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {/* NN to Fusion */}
            <path
              d="M720 360 Q900 360 1090 400"
              stroke={theme.secondary}
              strokeWidth={4}
              fill="none"
              markerEnd="url(#arrowNN)"
            />
            {(() => {
              const pos = getQuadraticBezierPoint(
                flowProgress,
                { x: 720, y: 360 },
                { x: 900, y: 360 },
                { x: 1090, y: 400 }
              );
              return <circle cx={pos.x} cy={pos.y} r={10} fill={theme.secondary} />;
            })()}
            <text
              x={840}
              y={330}
              textAnchor="middle"
              fill={theme.secondary}
              fontSize={32}
              fontFamily={monoFont}
            >
              P(s,a), V(s)
            </text>

            {/* Fusion to MCTS */}
            <path
              d="M1310 400 Q1500 360 1680 400"
              stroke={theme.primary}
              strokeWidth={4}
              fill="none"
              markerEnd="url(#arrowMCTS)"
            />
            {(() => {
              const pos = getQuadraticBezierPoint(
                flowProgress,
                { x: 1310, y: 400 },
                { x: 1500, y: 360 },
                { x: 1680, y: 400 }
              );
              return <circle cx={pos.x} cy={pos.y} r={10} fill={theme.primary} />;
            })()}
            <text
              x={1500}
              y={336}
              textAnchor="middle"
              fill={theme.primary}
              fontSize={32}
              fontFamily={monoFont}
            >
              guided search
            </text>
          </g>

          {/* Arrow markers */}
          <defs>
            <marker
              id="arrowNN"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={theme.secondary} />
            </marker>
            <marker
              id="arrowMCTS"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={theme.primary} />
            </marker>
          </defs>
        </svg>
      </div>

      {/* PUCT Formula */}
      <div
        style={{
          padding: "32px 80px",
          backgroundColor: `${theme.backgroundLight}cc`,
          borderRadius: 24,
          border: `2px solid ${theme.accent}44`,
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 44,
            color: theme.accent,
          }}
        >
          PUCT = Q(s,a) + c × P(s,a) × √N(s) / (1 + N(s,a))
        </span>
      </div>

      {/* Feature highlights */}
      <div
        style={{
          display: "flex",
          gap: 120,
          marginTop: 40,
          opacity: interpolate(frame, [80, 100], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { icon: "🧠", label: "Policy Prior", desc: "Network guides exploration" },
          { icon: "🎯", label: "Value Estimation", desc: "Network evaluates leaves" },
          { icon: "⚡", label: "Best of Both", desc: "Deep search + learned priors" },
        ].map((feature) => (
          <div key={feature.label} style={{ ...flexColumn, gap: 16 }}>
            <span style={{ fontSize: 64 }}>{feature.icon}</span>
            <span
              style={{
                fontFamily,
                fontSize: 44,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {feature.label}
            </span>
            <span style={{ fontFamily, fontSize: 34, color: theme.textMuted }}>
              {feature.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          fontFamily,
          fontSize: 52,
          color: theme.textSecondary,
          fontStyle: "italic",
          marginTop: 40,
          opacity: interpolate(frame, [100, 115], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        "The same technique that mastered Chess, Go, and Shogi"
      </div>
    </AbsoluteFill>
  );
};
