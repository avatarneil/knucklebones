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
            fontSize: 44,
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
          fontSize: 52,
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
          fontSize: 34,
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
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Tree - root */}
    <circle cx="12" cy="3" r="2" fill={color} />
    {/* Level 2 */}
    <circle cx="6" cy="11" r="2" fill={color} />
    <circle cx="18" cy="11" r="2" />
    {/* Level 3 - selected path ends here */}
    <circle cx="3" cy="19" r="2" />
    <circle cx="9" cy="19" r="2" fill={color} />
    <circle cx="21" cy="19" r="2" />
    {/* Connections - dim */}
    <line x1="12" y1="5" x2="18" y2="9" opacity="0.3" />
    <line x1="18" y1="13" x2="21" y2="17" opacity="0.3" />
    <line x1="6" y1="13" x2="3" y2="17" opacity="0.3" />
    {/* Connections - highlighted path */}
    <line x1="12" y1="5" x2="6" y2="9" />
    <line x1="6" y1="13" x2="9" y2="17" />
  </svg>
);

const ExpansionIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Parent node */}
    <circle cx="12" cy="5" r="3" />
    {/* Arrow pointing down */}
    <line x1="12" y1="8" x2="12" y2="15" />
    <line x1="9" y1="12" x2="12" y2="15" />
    <line x1="15" y1="12" x2="12" y2="15" />
    {/* New child node - filled to show it's being added */}
    <circle cx="12" cy="19" r="3" fill={color} />
  </svg>
);

const SimulationIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Starting node */}
    <circle cx="3" cy="12" r="2" fill={color} fillOpacity="0.3" />
    {/* Branching paths */}
    <line x1="5" y1="12" x2="8" y2="6" />
    <line x1="8" y1="6" x2="12" y2="4" />
    <line x1="12" y1="4" x2="18" y2="4" />
    <line x1="5" y1="12" x2="18" y2="12" strokeWidth="2" />
    <line x1="5" y1="12" x2="8" y2="18" />
    <line x1="8" y1="18" x2="12" y2="20" />
    <line x1="12" y1="20" x2="18" y2="20" />
    {/* Terminal states */}
    <circle cx="20" cy="4" r="2" fill={color} fillOpacity="0.4" />
    <circle cx="20" cy="12" r="2" fill={color} />
    <circle cx="20" cy="20" r="2" fill={color} fillOpacity="0.4" />
  </svg>
);

const BackpropIcon = ({ color }: { color: string }) => (
  <svg width="144" height="96" viewBox="0 0 36 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Root node (left) */}
    <circle cx="4" cy="12" r="2.5" fill={color} fillOpacity="0.3" />
    {/* Middle node */}
    <circle cx="18" cy="12" r="2.5" fill={color} fillOpacity="0.6" />
    {/* Leaf node (right) */}
    <circle cx="32" cy="12" r="2.5" fill={color} />
    {/* Arrow from leaf to middle */}
    <line x1="29" y1="12" x2="21" y2="12" />
    <line x1="23" y1="10" x2="21" y2="12" />
    <line x1="23" y1="14" x2="21" y2="12" />
    {/* Arrow from middle to root */}
    <line x1="15" y1="12" x2="7" y2="12" />
    <line x1="9" y1="10" x2="7" y2="12" />
    <line x1="9" y1="14" x2="7" y2="12" />
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

  // Progress through phases (no looping)
  const phaseDuration = 30; // frames per phase
  const cycleFrame = frame - 40; // Start after initial animation
  const activePhase = cycleFrame > 0 ? Math.min(Math.floor(cycleFrame / phaseDuration), 3) : -1;

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
          fontSize: 140,
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
          fontSize: 64,
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
            fontSize: 52,
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
            fontSize: 36,
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
                fontSize: 72,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {stat.value}
            </span>
            <span style={{ fontFamily, fontSize: 36, color: theme.textMuted }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
