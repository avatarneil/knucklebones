/**
 * POST /api/game/simulate
 *
 * Simulates a single game between two AI players server-side.
 */

import { NextResponse } from "next/server";
import { getAIMove, applyMove, rollDie, calculateGridScore } from "@/engine";
import { createInitialState } from "@/engine/state";
import type { DifficultyLevel, GameState, Player } from "@/engine/types";

interface SimulateRequest {
  player1Strategy: DifficultyLevel;
  player2Strategy: DifficultyLevel;
  initialState?: GameState; // Optional initial state to start from
}

interface SimulateResponse {
  success: boolean;
  result?: {
    winner: Player | "draw";
    finalScore: { player1: number; player2: number };
    turnCount: number;
    moves: Array<{
      turn: number;
      player: Player;
      dieValue: number;
      column: number;
    }>;
  };
  error?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SimulateRequest;
    const { player1Strategy, player2Strategy, initialState } = body;

    let state = initialState ?? createInitialState();
    const moves: NonNullable<SimulateResponse["result"]>["moves"] = [];
    let turnCount = 0;
    const maxTurns = 100; // Safety limit to prevent infinite loops

    // Run the game until completion
    while (state.phase !== "ended" && turnCount < maxTurns) {
      // Roll die if needed
      if (state.phase === "rolling") {
        state = rollDie(state);
      }

      // Get AI move
      const currentStrategy =
        state.currentPlayer === "player1" ? player1Strategy : player2Strategy;
      const move = getAIMove(state, currentStrategy);

      if (move === null) {
        // No legal moves - should not happen, but handle gracefully
        break;
      }

      // Record move before applying
      moves.push({
        turn: state.turnNumber,
        player: state.currentPlayer,
        dieValue: state.currentDie!,
        column: move,
      });

      // Apply move
      const result = applyMove(state, move);
      if (!result) {
        break;
      }

      state = result.newState;
      turnCount = state.turnNumber;
    }

    const scores = {
      player1: calculateGridScore(state.grids.player1).total,
      player2: calculateGridScore(state.grids.player2).total,
    };

    const response: SimulateResponse = {
      success: true,
      result: {
        winner: state.winner || "draw",
        finalScore: scores,
        turnCount,
        moves,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error simulating game:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to simulate game",
      },
      { status: 500 },
    );
  }
}
