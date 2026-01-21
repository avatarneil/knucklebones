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

type MCTSPhaseProps = {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
  isActive: boolean;
};

const MCTSPhase: React.FC<MCTSPhaseProps> = ({
  number,
  title,
  description,
  icon,
  color,
  delay,
  isActive,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const pulseScale = isActive ? 1 + Math.sin(frame * 0.15) * 0.05 : 1;

  return (
    <div
      style={{
        ...flexColumn,
        gap: 24,
        padding: 48,
        backgroundColor: isActive ? `${color}22` : `${theme.backgroundLight}cc`,
        borderRadius: 40,
        border: `4px solid ${isActive ? color : theme.textMuted}44`,
        width: 440,
        opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        transform: `scale(${interpolate(enterSpring, [0, 1], [0.8, 1]) * pulseScale})`,
        boxShadow: isActive ? `0 0 60px ${color}33` : "none",
      }}
    >
      {/* Phase number badge */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: color,
          ...flexCenter,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 36,
            fontWeight: "bold",
            color: theme.background,
          }}
        >
          {number}
        </span>
      </div>

      {/* Icon */}
      <div style={{ marginBottom: 8 }}>{icon}</div>

      {/* Title */}
      <span
        style={{
          fontFamily,
          fontSize: 40,
          fontWeight: "bold",
          color: isActive ? color : theme.textPrimary,
        }}
      >
        {title}
      </span>

      {/* Description */}
      <span
        style={{
          fontFamily,
          fontSize: 26,
          color: theme.textSecondary,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </div>
  );
};

// Icons for each phase
const SelectionIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="6" cy="17" r="3" fill={color} fillOpacity={0.3} />
    <circle cx="18" cy="17" r="3" />
    <line x1="12" y1="12" x2="6" y2="14" />
    <line x1="12" y1="12" x2="18" y2="14" />
  </svg>
);

const ExpansionIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="8" r="3" />
    <circle cx="12" cy="18" r="3" strokeDasharray="4 2" />
    <line x1="12" y1="11" x2="12" y2="15" />
    <path d="M9 18h-3m9 0h3" strokeLinecap="round" />
  </svg>
);

const SimulationIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
    <circle cx="19" cy="12" r="2" fill={color} />
  </svg>
);

const BackpropIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="5" r="3" />
    <circle cx="12" cy="19" r="3" />
    <path d="M12 8v8" />
    <path d="M9 11l3-3 3 3" />
    <text x="12" y="21" textAnchor="middle" fontSize="6" fill={color}>+1</text>
  </svg>
);

export const MCTSScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Cycle through phases
  const phaseDuration = 30; // frames per phase
  const cycleFrame = frame - 40; // Start cycling after initial animation
  const activePhase = cycleFrame > 0 ? Math.floor((cycleFrame / phaseDuration) % 4) : -1;

  const phases = [
    {
      number: 1,
      title: "Selection",
      description: "Traverse tree using UCB1 to balance exploration & exploitation",
      icon: <SelectionIcon color={theme.accent} />,
      color: theme.accent,
    },
    {
      number: 2,
      title: "Expansion",
      description: "Add new child node for an unexplored action",
      icon: <ExpansionIcon color={theme.secondary} />,
      color: theme.secondary,
    },
    {
      number: 3,
      title: "Simulation",
      description: "Random or heuristic playout to terminal state",
      icon: <SimulationIcon color={theme.primary} />,
      color: theme.primary,
    },
    {
      number: 4,
      title: "Backprop",
      description: "Update Q-values along the path from leaf to root",
      icon: <BackpropIcon color="#22c55e" />,
      color: "#22c55e",
    },
  ];

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
        Monte Carlo Tree Search
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
        Build understanding through simulated gameplay
      </div>

      {/* UCB1 Formula */}
      <div
        style={{
          padding: "32px 64px",
          backgroundColor: `${theme.backgroundLight}cc`,
          borderRadius: 24,
          border: `2px solid ${theme.accent}44`,
          opacity: interpolate(frame, [20, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 40,
            color: theme.accent,
          }}
        >
          UCB1 = Q(s,a)/N(s,a) + c×√(ln(N(s))/N(s,a))
        </span>
      </div>

      {/* Phase cards with inline arrows */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginTop: 40,
        }}
      >
        {phases.map((phase, i) => {
          const isAnimating = activePhase === i;
          const progress = interpolate(
            (cycleFrame - i * phaseDuration) % (phaseDuration * 4),
            [0, phaseDuration],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <React.Fragment key={phase.title}>
              <MCTSPhase
                {...phase}
                delay={10 + i * 10}
                isActive={activePhase === i}
              />
              {i < phases.length - 1 && (
                <svg
                  width={120}
                  height={80}
                  style={{
                    opacity: interpolate(frame, [30 + i * 10, 45 + i * 10], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                    flexShrink: 0,
                  }}
                >
                  <defs>
                    <marker
                      id={`arrowhead-${i}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={theme.textMuted}
                        fillOpacity={0.5}
                      />
                    </marker>
                  </defs>
                  <line
                    x1={10}
                    y1={40}
                    x2={100}
                    y2={40}
                    stroke={theme.textMuted}
                    strokeWidth={4}
                    strokeOpacity={0.5}
                    markerEnd={`url(#arrowhead-${i})`}
                  />
                  {isAnimating && (
                    <circle
                      cx={10 + progress * 90}
                      cy={40}
                      r={10}
                      fill={phase.color}
                    />
                  )}
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Loop indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 32,
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <svg width={48} height={48} viewBox="0 0 24 24">
          <path
            d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            fill={theme.textMuted}
            fillOpacity={0.6}
          />
        </svg>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: theme.textMuted,
          }}
        >
          Repeat 200-2,000 times per move
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 160,
          marginTop: 60,
          opacity: interpolate(frame, [70, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "Simulations/Move", value: "200-2,000" },
          { label: "Exploration Constant", value: "c = √2" },
          { label: "Heuristic Ratio", value: "30-70%" },
        ].map((stat) => (
          <div key={stat.label} style={{ ...flexColumn, gap: 16 }}>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 56,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {stat.value}
            </span>
            <span style={{ fontFamily, fontSize: 28, color: theme.textMuted }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
