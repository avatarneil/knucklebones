"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DIFFICULTY_CONFIGS, getAllDifficultyLevels } from "@/engine";
import type { DifficultyLevel } from "@/engine/types";

export default function DocsPage() {
  const difficultyLevels = getAllDifficultyLevels();

  return (
    <main className="min-h-[100dvh] flex flex-col p-[clamp(1rem,3vw,2rem)] overflow-auto pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-3xl font-bold">AI Methodology</h1>
              <p className="text-muted-foreground">
                Understanding how the AI strategies work
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              The KnuckleTrainer AI uses a combination of search algorithms and
              evaluation heuristics to make decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The game engine implements multiple AI strategies ranging from
              simple greedy algorithms to sophisticated expectimax search with
              advanced position evaluation. Each strategy balances computational
              complexity with playing strength.
            </p>
          </CardContent>
        </Card>

        {/* Strategy Details */}
        <div className="space-y-6 mb-6">
          <h2 className="text-2xl font-bold">AI Strategies</h2>

          {difficultyLevels.map((level) => {
            const config = DIFFICULTY_CONFIGS[level];
            return (
              <Card key={level}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{config.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      Depth: {config.depth}
                    </span>
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-2">Configuration:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>Search Depth: {config.depth}</li>
                        <li>
                          Randomness: {Math.round(config.randomness * 100)}%
                        </li>
                        <li>
                          Considers Opponent:{" "}
                          {config.considerOpponent ? "Yes" : "No"}
                        </li>
                        <li>
                          Advanced Evaluation:{" "}
                          {config.advancedEval ? "Yes" : "No"}
                        </li>
                        <li>
                          Offense Weight:{" "}
                          {Math.round(config.offenseWeight * 100)}%
                        </li>
                        <li>
                          Defense Weight:{" "}
                          {Math.round(config.defenseWeight * 100)}%
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-2">How it works:</p>
                      <p className="text-muted-foreground">
                        {getStrategyExplanation(level, config)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Algorithms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Core Algorithms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Greedy Algorithm */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Greedy Algorithm</h3>
              <p className="text-muted-foreground mb-3">
                The simplest strategy, used by the "Greedy" difficulty level.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
                <p className="mb-2">
                  <span className="text-accent">function</span>{" "}
                  <span className="text-primary">getGreedyMove</span>(state):
                </p>
                <p className="ml-4 mb-2">legalMoves = getLegalMoves(state)</p>
                <p className="ml-4 mb-2">
                  scoredMoves = legalMoves.map(move =&gt; {"{"}
                </p>
                <p className="ml-8 mb-2">
                  score = immediateScoreGain(move) + opponentScoreLoss(move)
                </p>
                <p className="ml-4 mb-2">{"}"})</p>
                <p className="ml-4">return max(scoredMoves, by=score)</p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This algorithm evaluates each legal move by calculating the
                immediate score gain from placing the die and the score loss
                inflicted on the opponent. It picks the move with the highest
                combined value, without looking ahead.
              </p>
            </div>

            {/* Expectimax */}
            <div>
              <h3 className="text-xl font-semibold mb-2">Expectimax Search</h3>
              <p className="text-muted-foreground mb-3">
                Used by intermediate and advanced difficulty levels. A variant
                of minimax that handles chance nodes (dice rolls).
              </p>
              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
                <p className="mb-2">
                  <span className="text-accent">function</span>{" "}
                  <span className="text-primary">expectimax</span>(state, depth,
                  player):
                </p>
                <p className="ml-4 mb-2">
                  <span className="text-accent">if</span> depth == 0{" "}
                  <span className="text-accent">or</span> gameEnded(state):
                </p>
                <p className="ml-8 mb-2">
                  <span className="text-accent">return</span> evaluate(state,
                  player)
                </p>
                <p className="ml-4 mb-2">
                  <span className="text-accent">if</span> state.phase ==
                  "rolling":
                </p>
                <p className="ml-8 mb-2">
                  <span className="text-accent">return</span>{" "}
                  average(expectimax(rollDie(state, value), depth-1){" "}
                  <span className="text-accent">for</span> value{" "}
                  <span className="text-accent">in</span> [1..6])
                </p>
                <p className="ml-4 mb-2">
                  <span className="text-accent">if</span> state.currentPlayer ==
                  player:
                </p>
                <p className="ml-8 mb-2">
                  <span className="text-accent">return</span>{" "}
                  max(expectimax(applyMove(state, move), depth-1){" "}
                  <span className="text-accent">for</span> move{" "}
                  <span className="text-accent">in</span> legalMoves)
                </p>
                <p className="ml-4 mb-2">
                  <span className="text-accent">else</span>:
                </p>
                <p className="ml-8">
                  <span className="text-accent">return</span>{" "}
                  min(expectimax(applyMove(state, move), depth-1){" "}
                  <span className="text-accent">for</span> move{" "}
                  <span className="text-accent">in</span> legalMoves)
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Expectimax alternates between MAX nodes (choosing the best move
                for the current player), MIN nodes (assuming the opponent makes
                the worst move for us), and CHANCE nodes (averaging over all
                possible dice rolls, each with 1/6 probability). The search
                depth determines how many moves ahead the algorithm looks.
              </p>
            </div>

            {/* Evaluation Function */}
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Position Evaluation
              </h3>
              <p className="text-muted-foreground mb-3">
                The evaluation function scores game positions to guide the
                search algorithm.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Basic Evaluation:</strong>{" "}
                  Simple score difference between players.
                </p>
                <p>
                  <strong className="text-foreground">
                    Advanced Evaluation:
                  </strong>{" "}
                  Considers multiple factors:
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>
                    <strong>Score Difference:</strong> Current point advantage
                  </li>
                  <li>
                    <strong>Combo Potential:</strong> Likelihood of forming
                    matching dice combinations
                  </li>
                  <li>
                    <strong>Vulnerability:</strong> Risk of losing dice to
                    opponent attacks
                  </li>
                  <li>
                    <strong>Column Control:</strong> Having dice that opponent
                    cannot remove
                  </li>
                  <li>
                    <strong>Attack Potential:</strong> Ability to remove
                    opponent&apos;s dice
                  </li>
                  <li>
                    <strong>Game Phase:</strong> Different weights for early,
                    mid, and late game
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Considerations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance & Limitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Computational Complexity
              </h3>
              <p className="text-muted-foreground mb-3">
                The search space grows exponentially with depth:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                <li>
                  • <strong>Greedy:</strong> O(n) where n is the number of legal
                  moves (typically 1-3)
                </li>
                <li>
                  • <strong>Depth 1:</strong> ~6 nodes (one chance node)
                </li>
                <li>
                  • <strong>Depth 2:</strong> ~36 nodes (chance + move)
                </li>
                <li>
                  • <strong>Depth 3:</strong> ~216 nodes
                </li>
                <li>
                  • <strong>Depth 4:</strong> ~1,296 nodes
                </li>
                <li>
                  • <strong>Depth 5:</strong> ~7,776 nodes
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Optimizations</h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                <li>
                  • <strong>Move Ordering:</strong> Evaluates promising moves
                  first to enable better pruning
                </li>
                <li>
                  • <strong>Transposition Table:</strong> Caches evaluated
                  positions to avoid redundant calculations
                </li>
                <li>
                  • <strong>Node Limit:</strong> Maximum of 500,000 nodes to
                  prevent UI freezing
                </li>
                <li>
                  • <strong>Early Termination:</strong> Stops search when game
                  ends or depth limit reached
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Using AI vs AI Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The AI vs AI mode allows you to compare different strategies
              side-by-side:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground ml-4 list-disc">
              <li>
                Start with <strong>Greedy vs Medium</strong> to see how a simple
                strategy performs against a more sophisticated one
              </li>
              <li>
                Try <strong>Expert vs Expert</strong> to watch two optimal
                strategies compete
              </li>
              <li>
                Experiment with different combinations to understand the
                trade-offs between strategies
              </li>
              <li>
                Use the settings to change strategies mid-game (will start a new
                game)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getStrategyExplanation(
  level: DifficultyLevel,
  config: (typeof DIFFICULTY_CONFIGS)[DifficultyLevel],
): string {
  switch (level) {
    case "greedy":
      return `Uses a greedy algorithm that always picks the move with the highest immediate score gain. It evaluates each legal move by calculating the score gained from placing the die plus the score lost by the opponent, then selects the maximum. This is the fastest strategy but doesn't look ahead, making it vulnerable to traps and long-term planning.`;

    case "beginner":
      return `Uses a shallow expectimax search (depth 1) with high randomness (40%). It occasionally makes good moves but often makes suboptimal choices. The randomness makes it unpredictable and easier to beat.`;

    case "easy":
      return `Uses expectimax with depth 2 and moderate randomness (25%). It considers opponent moves but makes occasional mistakes. The randomness prevents it from being too predictable while still playing reasonably well.`;

    case "medium":
      return `Uses expectimax with depth 3 and low randomness (10%). It employs advanced evaluation heuristics that consider combo potential, vulnerability, and positional factors. This provides a good challenge for most players.`;

    case "hard":
      return `Uses expectimax with depth 4 and no randomness. It employs advanced evaluation with perfect play. The deeper search allows it to see further ahead and make more strategic decisions.`;

    case "expert":
      return `Uses expectimax with maximum depth (5) and no randomness. It employs advanced evaluation heuristics and considers all factors including combo potential, vulnerability, column control, and attack potential. This is the strongest AI strategy available.`;

    default:
      return "";
  }
}
