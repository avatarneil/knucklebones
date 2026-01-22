import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { theme } from "../theme";

type DiceProps = {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
  delay?: number;
  rolling?: boolean;
};

const dotPositions: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 50, y: 50 }],
  2: [
    { x: 25, y: 25 },
    { x: 75, y: 75 },
  ],
  3: [
    { x: 25, y: 25 },
    { x: 50, y: 50 },
    { x: 75, y: 75 },
  ],
  4: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
  5: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 50, y: 50 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
  6: [
    { x: 25, y: 25 },
    { x: 75, y: 25 },
    { x: 25, y: 50 },
    { x: 75, y: 50 },
    { x: 25, y: 75 },
    { x: 75, y: 75 },
  ],
};

export const Dice: React.FC<DiceProps> = ({
  value,
  size = 100,
  delay = 0,
  rolling = false,
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

  const rotation = rolling
    ? interpolate(frame, [0, fps * 2], [0, 720])
    : interpolate(enterSpring, [0, 1], [-180, 0]);

  const colors = theme.dice[value];
  const dots = dotPositions[value];
  const dotSize = size * 0.18;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.15,
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        boxShadow: `
          0 ${size * 0.05}px ${size * 0.15}px rgba(0, 0, 0, 0.4),
          inset 0 ${size * 0.02}px ${size * 0.05}px rgba(255, 255, 255, 0.2)
        `,
        position: "relative",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: `inset 0 ${dotSize * 0.1}px ${dotSize * 0.2}px rgba(0, 0, 0, 0.3)`,
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};
