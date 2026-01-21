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

type TreeNodeProps = {
  type: "max" | "min" | "chance";
  label: string;
  value?: string;
  x: number;
  y: number;
  delay: number;
  highlighted?: boolean;
};

const TreeNode: React.FC<TreeNodeProps> = ({
  type,
  label,
  value,
  x,
  y,
  delay,
  highlighted,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const scale = interpolate(enterSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(enterSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const colors = {
    max: theme.accent,
    min: theme.primary,
    chance: theme.secondary,
  };

  const shapes = {
    max: "polygon(50% 0%, 100% 100%, 0% 100%)", // Triangle up
    min: "polygon(0% 0%, 100% 0%, 50% 100%)", // Triangle down
    chance: "circle(50%)", // Circle
  };

  const pulseScale = highlighted
    ? 1 + Math.sin(frame * 0.15) * 0.08
    : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale * pulseScale})`,
        opacity,
        ...flexColumn,
        gap: 16,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          backgroundColor: colors[type],
          clipPath: shapes[type],
          boxShadow: highlighted ? `0 0 60px ${colors[type]}` : "none",
          ...flexCenter,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: theme.background,
            fontWeight: "bold",
            marginTop: type === "max" ? 40 : type === "min" ? -20 : 0,
          }}
        >
          {label}
        </span>
      </div>
      {value && (
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            color: theme.textPrimary,
            fontWeight: "bold",
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
};

const TreeEdge: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}> = ({ x1, y1, x2, y2, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x1 + (x2 - x1) * progress}
      y2={y1 + (y2 - y1) * progress}
      stroke={theme.textMuted}
      strokeWidth={4}
      strokeOpacity={0.5}
    />
  );
};

export const ExpectimaxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Title animation
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Highlight moves through tree over time
  const highlightIndex = Math.floor((frame - 60) / 20) % 4;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        ...flexColumn,
        padding: 120,
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
          marginBottom: 40,
        }}
      >
        Expectimax Search Algorithm
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 48,
          color: theme.textSecondary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          marginBottom: 80,
        }}
      >
        Deep game tree analysis with chance nodes for dice rolls
      </div>

      {/* Tree visualization */}
      <div
        style={{
          position: "relative",
          width: width - 400,
          height: 900,
          marginTop: 40,
        }}
      >
        {/* SVG for edges */}
        <svg
          style={{ position: "absolute", width: "100%", height: "100%" }}
        >
          {/* Level 1 edges */}
          <TreeEdge x1={width / 2 - 200} y1={120} x2={width / 2 - 700} y2={320} delay={10} />
          <TreeEdge x1={width / 2 - 200} y1={120} x2={width / 2 - 200} y2={320} delay={12} />
          <TreeEdge x1={width / 2 - 200} y1={120} x2={width / 2 + 300} y2={320} delay={14} />

          {/* Level 2 edges (from chance to min) */}
          <TreeEdge x1={width / 2 - 700} y1={400} x2={width / 2 - 900} y2={600} delay={25} />
          <TreeEdge x1={width / 2 - 700} y1={400} x2={width / 2 - 700} y2={600} delay={27} />
          <TreeEdge x1={width / 2 - 700} y1={400} x2={width / 2 - 500} y2={600} delay={29} />

          <TreeEdge x1={width / 2 - 200} y1={400} x2={width / 2 - 360} y2={600} delay={31} />
          <TreeEdge x1={width / 2 - 200} y1={400} x2={width / 2 - 200} y2={600} delay={33} />
          <TreeEdge x1={width / 2 - 200} y1={400} x2={width / 2 - 40} y2={600} delay={35} />

          {/* Level 2 edges for Col 3 */}
          <TreeEdge x1={width / 2 + 300} y1={400} x2={width / 2 + 140} y2={600} delay={37} />
          <TreeEdge x1={width / 2 + 300} y1={400} x2={width / 2 + 300} y2={600} delay={39} />
          <TreeEdge x1={width / 2 + 300} y1={400} x2={width / 2 + 460} y2={600} delay={41} />
        </svg>

        {/* Root MAX node */}
        <TreeNode
          type="max"
          label="MAX"
          value="Best"
          x={width / 2 - 200}
          y={80}
          delay={0}
          highlighted={highlightIndex === 0}
        />

        {/* Level 1: CHANCE nodes (dice outcomes) */}
        <TreeNode
          type="chance"
          label="?"
          value="Col 1"
          x={width / 2 - 700}
          y={360}
          delay={15}
          highlighted={highlightIndex === 1}
        />
        <TreeNode
          type="chance"
          label="?"
          value="Col 2"
          x={width / 2 - 200}
          y={360}
          delay={18}
        />
        <TreeNode
          type="chance"
          label="?"
          value="Col 3"
          x={width / 2 + 300}
          y={360}
          delay={21}
        />

        {/* Level 2: MIN nodes (opponent moves) */}
        <TreeNode
          type="min"
          label="MIN"
          value="-3"
          x={width / 2 - 900}
          y={640}
          delay={30}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="+5"
          x={width / 2 - 700}
          y={640}
          delay={33}
          highlighted={highlightIndex === 2}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="+2"
          x={width / 2 - 500}
          y={640}
          delay={36}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="-1"
          x={width / 2 - 360}
          y={640}
          delay={39}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="+4"
          x={width / 2 - 200}
          y={640}
          delay={42}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="+1"
          x={width / 2 - 40}
          y={640}
          delay={45}
        />

        {/* Level 2: MIN nodes for Col 3 */}
        <TreeNode
          type="min"
          label="MIN"
          value="+3"
          x={width / 2 + 140}
          y={640}
          delay={48}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="-2"
          x={width / 2 + 300}
          y={640}
          delay={51}
        />
        <TreeNode
          type="min"
          label="MIN"
          value="+6"
          x={width / 2 + 460}
          y={640}
          delay={54}
          highlighted={highlightIndex === 3}
        />

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 80,
            ...flexColumn,
            alignItems: "flex-start",
            gap: 32,
            opacity: interpolate(frame, [50, 70], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: theme.accent,
                clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
              }}
            />
            <span style={{ fontFamily, fontSize: 36, color: theme.textSecondary }}>
              MAX: Your best move
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: theme.primary,
                clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
              }}
            />
            <span style={{ fontFamily, fontSize: 36, color: theme.textSecondary }}>
              MIN: Opponent's best
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: theme.secondary,
                borderRadius: "50%",
              }}
            />
            <span style={{ fontFamily, fontSize: 36, color: theme.textSecondary }}>
              CHANCE: Dice roll
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
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
          { label: "Search Depth", value: "6 plies" },
          { label: "Nodes/Move", value: "500,000" },
          { label: "Time Budget", value: "100ms" },
        ].map((stat) => (
          <div key={stat.label} style={{ ...flexColumn, gap: 16 }}>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 64,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {stat.value}
            </span>
            <span style={{ fontFamily, fontSize: 32, color: theme.textMuted }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
