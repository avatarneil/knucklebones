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

type NeuronProps = {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  label?: string;
  pulse?: boolean;
};

const Neuron: React.FC<NeuronProps> = ({
  x,
  y,
  size,
  color,
  delay,
  label,
  pulse,
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

  const pulseScale = pulse ? 1 + Math.sin(frame * 0.12) * 0.1 : 1;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={size * scale * pulseScale}
        fill={color}
        opacity={0.9}
        style={{
          filter: pulse ? `drop-shadow(0 0 20px ${color})` : undefined,
        }}
      />
      {label && scale > 0.5 && (
        <text
          x={x}
          y={y + 8}
          textAnchor="middle"
          fill={theme.background}
          fontSize={size * 0.7}
          fontFamily={monoFont}
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  );
};

type ConnectionProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  animated?: boolean;
};

const Connection: React.FC<ConnectionProps> = ({
  x1,
  y1,
  x2,
  y2,
  delay,
  animated,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated data flow
  const flowProgress = animated
    ? ((frame - delay) * 0.02) % 1
    : 0;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x1 + (x2 - x1) * progress}
        y2={y1 + (y2 - y1) * progress}
        stroke={theme.textMuted}
        strokeWidth={2}
        strokeOpacity={0.3}
      />
      {animated && progress >= 1 && (
        <circle
          cx={x1 + (x2 - x1) * flowProgress}
          cy={y1 + (y2 - y1) * flowProgress}
          r={6}
          fill={theme.accent}
          opacity={0.8}
        />
      )}
    </g>
  );
};

export const NeuralNetworkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Network layer positions - scaled for 4K
  const inputX = 500;
  const hiddenX = 1100;
  const outputX = 1700;

  // Generate neuron positions - scaled for 4K
  const inputNeurons = Array.from({ length: 8 }, (_, i) => ({
    y: 360 + i * 110,
    label: i === 0 ? "G1" : i === 3 ? "G2" : i === 6 ? "P" : i === 7 ? "D" : "",
  }));

  const hiddenNeurons = Array.from({ length: 10 }, (_, i) => ({
    y: 330 + i * 90,
  }));

  // Output neurons - policy (3) and value (1)
  const policyNeurons = [
    { y: 560, label: "C1" },
    { y: 700, label: "C2" },
    { y: 840, label: "C3" },
  ];
  const valueNeuron = { y: 1040, label: "V" };

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
          fontSize: 140,
          fontWeight: "bold",
          color: theme.textPrimary,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`,
          marginBottom: 20,
        }}
      >
        Neural Network Architecture
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 64,
          color: theme.accent,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          marginBottom: 60,
        }}
      >
        AlphaZero-inspired Policy-Value Network
      </div>

      {/* Network visualization */}
      <div style={{ position: "relative", width: width - 400, height: 1100 }}>
        <svg width="100%" height="100%" viewBox="0 0 2200 1200">
          {/* Connections - Input to Hidden */}
          {inputNeurons.map((input, i) =>
            hiddenNeurons.map((hidden, j) => (
              <Connection
                key={`ih-${i}-${j}`}
                x1={inputX + 40}
                y1={input.y}
                x2={hiddenX - 40}
                y2={hidden.y}
                delay={5 + i * 2}
                animated={i === 0 && j === 0}
              />
            ))
          )}

          {/* Connections - Hidden to Policy */}
          {hiddenNeurons.map((hidden, i) =>
            policyNeurons.map((policy, j) => (
              <Connection
                key={`hp-${i}-${j}`}
                x1={hiddenX + 40}
                y1={hidden.y}
                x2={outputX - 40}
                y2={policy.y}
                delay={30 + i * 2}
                animated={i === 2 && j === 1}
              />
            ))
          )}

          {/* Connections - Hidden to Value */}
          {hiddenNeurons.map((hidden, i) => (
            <Connection
              key={`hv-${i}`}
              x1={hiddenX + 40}
              y1={hidden.y}
              x2={outputX - 40}
              y2={valueNeuron.y}
              delay={30 + i * 2}
              animated={i === 7}
            />
          ))}

          {/* Input layer neurons */}
          {inputNeurons.map((neuron, i) => (
            <Neuron
              key={`input-${i}`}
              x={inputX}
              y={neuron.y}
              size={36}
              color={theme.secondary}
              delay={5 + i * 3}
              label={neuron.label}
            />
          ))}

          {/* Hidden layer neurons */}
          {hiddenNeurons.map((neuron, i) => (
            <Neuron
              key={`hidden-${i}`}
              x={hiddenX}
              y={neuron.y}
              size={32}
              color={theme.textMuted}
              delay={25 + i * 2}
            />
          ))}

          {/* Policy head neurons */}
          {policyNeurons.map((neuron, i) => (
            <Neuron
              key={`policy-${i}`}
              x={outputX}
              y={neuron.y}
              size={44}
              color={theme.accent}
              delay={50 + i * 5}
              label={neuron.label}
              pulse
            />
          ))}

          {/* Value head neuron */}
          <Neuron
            x={outputX}
            y={valueNeuron.y}
            size={44}
            color="#22c55e"
            delay={65}
            label={valueNeuron.label}
            pulse
          />

          {/* Layer labels */}
          <text
            x={inputX}
            y={200}
            textAnchor="middle"
            fill={theme.textSecondary}
            fontSize={52}
            fontFamily={fontFamily}
            fontWeight="bold"
          >
            Input Layer
          </text>
          <text
            x={inputX}
            y={250}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={44}
            fontFamily={monoFont}
          >
            43 features
          </text>

          <text
            x={hiddenX}
            y={200}
            textAnchor="middle"
            fill={theme.textSecondary}
            fontSize={52}
            fontFamily={fontFamily}
            fontWeight="bold"
          >
            Hidden Layer
          </text>
          <text
            x={hiddenX}
            y={250}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={44}
            fontFamily={monoFont}
          >
            128 neurons + ReLU
          </text>

          <text
            x={outputX}
            y={440}
            textAnchor="middle"
            fill={theme.accent}
            fontSize={44}
            fontFamily={fontFamily}
            fontWeight="bold"
          >
            Policy Head
          </text>
          <text
            x={outputX}
            y={484}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={32}
            fontFamily={monoFont}
          >
            Softmax → [p1, p2, p3]
          </text>

          <text
            x={outputX}
            y={940}
            textAnchor="middle"
            fill="#22c55e"
            fontSize={44}
            fontFamily={fontFamily}
            fontWeight="bold"
          >
            Value Head
          </text>
          <text
            x={outputX}
            y={976}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={32}
            fontFamily={monoFont}
          >
            Tanh → v ∈ [-1, 1]
          </text>
        </svg>

        {/* Input feature labels */}
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 300,
            ...flexColumn,
            alignItems: "flex-start",
            gap: 16,
            opacity: interpolate(frame, [40, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div style={{ fontFamily: monoFont, fontSize: 32, color: theme.textMuted }}>
            Grid 1: 18 features
          </div>
          <div style={{ fontFamily: monoFont, fontSize: 32, color: theme.textMuted, marginTop: 200 }}>
            Grid 2: 18 features
          </div>
          <div style={{ fontFamily: monoFont, fontSize: 32, color: theme.textMuted, marginTop: 160 }}>
            Player: 1 feature
          </div>
          <div style={{ fontFamily: monoFont, fontSize: 32, color: theme.textMuted, marginTop: 40 }}>
            Die: 6 features
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 160,
          marginTop: 40,
          opacity: interpolate(frame, [70, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "Parameters", value: "~6,000" },
          { label: "Checkpoint Size", value: "82KB" },
          { label: "Inference", value: "<1ms" },
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
