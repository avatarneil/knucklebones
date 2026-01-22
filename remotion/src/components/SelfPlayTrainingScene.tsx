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

type TrainingStepProps = {
  step: number;
  title: string;
  icon: React.ReactNode;
  delay: number;
  isActive: boolean;
  color: string;
};

const TrainingStep: React.FC<TrainingStepProps> = ({
  step,
  title,
  icon,
  delay,
  isActive,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const pulseScale = isActive ? 1 + Math.sin(frame * 0.15) * 0.08 : 1;

  return (
    <div
      style={{
        ...flexColumn,
        gap: 24,
        padding: 48,
        backgroundColor: isActive ? `${color}22` : `${theme.backgroundLight}aa`,
        borderRadius: 32,
        border: `4px solid ${isActive ? color : theme.textMuted}44`,
        width: 320,
        opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        transform: `scale(${interpolate(enterSpring, [0, 1], [0.8, 1]) * pulseScale})`,
        boxShadow: isActive ? `0 0 50px ${color}44` : "none",
      }}
    >
      {/* Step number */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: color,
          ...flexCenter,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            fontWeight: "bold",
            color: theme.background,
          }}
        >
          {step}
        </span>
      </div>

      {/* Icon */}
      {icon}

      {/* Title */}
      <span
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: "bold",
          color: isActive ? color : theme.textPrimary,
          textAlign: "center",
        }}
      >
        {title}
      </span>
    </div>
  );
};

// Training loop icons
const SelfPlayIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="8" cy="12" r="4" />
    <circle cx="16" cy="12" r="4" />
    <path d="M12 8v-4m0 16v-4" strokeLinecap="round" />
    <circle cx="12" cy="2" r="1.5" fill={color} />
    <circle cx="12" cy="22" r="1.5" fill={color} />
  </svg>
);

const MCTSIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="4" r="2" />
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="12" r="2" />
    <circle cx="4" cy="20" r="2" />
    <circle cx="12" cy="20" r="2" />
    <circle cx="20" cy="20" r="2" />
    <line x1="12" y1="6" x2="6" y2="10" />
    <line x1="12" y1="6" x2="18" y2="10" />
    <line x1="6" y1="14" x2="4" y2="18" />
    <line x1="6" y1="14" x2="12" y2="18" />
    <line x1="18" y1="14" x2="20" y2="18" />
  </svg>
);

const TrainIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    <circle cx="12" cy="12" r="4" fill={color} fillOpacity={0.3} />
  </svg>
);

const UpdateIcon = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <circle cx="12" cy="12" r="3" fill={color} stroke="none" />
  </svg>
);

export const SelfPlayTrainingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Cycle through training steps
  const stepDuration = 25;
  const cycleFrame = frame - 50;
  const activeStep = cycleFrame > 0 ? Math.floor((cycleFrame / stepDuration) % 4) : -1;

  const steps = [
    { step: 1, title: "Self-Play", icon: <SelfPlayIcon color={theme.accent} />, color: theme.accent },
    { step: 2, title: "MCTS Search", icon: <MCTSIcon color={theme.secondary} />, color: theme.secondary },
    { step: 3, title: "Train Network", icon: <TrainIcon color="#22c55e" />, color: "#22c55e" },
    { step: 4, title: "Update Weights", icon: <UpdateIcon color={theme.primary} />, color: theme.primary },
  ];

  // Training progress animation
  const progressValue = interpolate(frame, [40, 120], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        Train Your Own AI
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 48,
          color: theme.accent,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        Self-play reinforcement learning with PyTorch
      </div>

      {/* Training loop visualization */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          marginTop: 60,
        }}
      >
        {steps.map((step, i) => (
          <React.Fragment key={step.step}>
            <TrainingStep
              {...step}
              delay={15 + i * 8}
              isActive={activeStep === i}
            />
            {i < steps.length - 1 && (
              <svg
                width={120}
                height={60}
                style={{
                  opacity: interpolate(frame, [30 + i * 8, 45 + i * 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <path
                  d="M10 30 L90 30"
                  stroke={theme.textMuted}
                  strokeWidth={4}
                  strokeOpacity={0.5}
                />
                <polygon points="90,20 110,30 90,40" fill={theme.textMuted} fillOpacity={0.5} />
                {activeStep === i && (
                  <circle
                    cx={10 + ((frame - 50 - i * stepDuration) % stepDuration) * 4}
                    cy={30}
                    r={8}
                    fill={step.color}
                  />
                )}
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Loop back indicator */}
      <svg
        width={1600}
        height={120}
        style={{
          marginTop: -20,
          opacity: interpolate(frame, [60, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <path
          d="M1440 20 Q1560 20 1560 60 Q1560 100 1440 100 L160 100 Q40 100 40 60 Q40 20 160 20"
          stroke={theme.textMuted}
          strokeWidth={4}
          strokeOpacity={0.3}
          fill="none"
          strokeDasharray="16 8"
        />
        <text x={800} y={76} textAnchor="middle" fill={theme.textMuted} fontSize={24} fontFamily={monoFont}>
          Repeat 10-100 iterations
        </text>
      </svg>

      {/* Training config */}
      <div
        style={{
          display: "flex",
          gap: 100,
          marginTop: 40,
          opacity: interpolate(frame, [70, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "Games/Iteration", value: "100" },
          { label: "MCTS Sims", value: "200" },
          { label: "Batch Size", value: "128" },
          { label: "Learning Rate", value: "0.001" },
        ].map((config) => (
          <div key={config.label} style={{ ...flexColumn, gap: 12 }}>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 48,
                color: theme.accent,
                fontWeight: "bold",
              }}
            >
              {config.value}
            </span>
            <span style={{ fontFamily, fontSize: 24, color: theme.textMuted }}>
              {config.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          ...flexColumn,
          gap: 24,
          marginTop: 60,
          width: "80%",
          opacity: interpolate(frame, [80, 100], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontFamily, fontSize: 28, color: theme.textSecondary }}>
            Training Progress
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 28, color: theme.accent }}>
            {Math.round(progressValue)}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 24,
            backgroundColor: `${theme.textMuted}33`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressValue}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${theme.secondary}, ${theme.accent}, #22c55e)`,
              borderRadius: 12,
              boxShadow: `0 0 30px ${theme.accent}66`,
            }}
          />
        </div>
      </div>

      {/* Tech badges */}
      <div
        style={{
          display: "flex",
          gap: 40,
          marginTop: 60,
          opacity: interpolate(frame, [100, 115], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[
          { label: "PyTorch", color: "#ee4c2c" },
          { label: "Apple MPS", color: "#a855f7" },
          { label: "CUDA Support", color: "#76b900" },
          { label: "W&B Logging", color: "#ffbe00" },
        ].map((badge) => (
          <div
            key={badge.label}
            style={{
              fontFamily: monoFont,
              fontSize: 26,
              color: badge.color,
              padding: "16px 32px",
              borderRadius: 40,
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
