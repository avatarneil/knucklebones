use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Use wee_alloc as the global allocator for smaller WASM binary
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Types
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[wasm_bindgen]
pub enum DieValue {
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[wasm_bindgen]
pub enum Player {
    Player1,
    Player2,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GamePhase {
    Rolling,
    Placing,
    Ended,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ColumnIndex {
    Zero = 0,
    One = 1,
    Two = 2,
}

// Compact representation: 3 columns × 3 rows = 9 slots per grid
// Each slot: 0 = empty, 1-6 = die value
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Grid {
    data: [u8; 9], // 3 columns × 3 rows
}

impl Grid {
    fn new() -> Self {
        Grid { data: [0; 9] }
    }

    #[inline]
    fn get(&self, col: usize, row: usize) -> u8 {
        self.data[col * 3 + row]
    }

    #[inline]
    fn set(&mut self, col: usize, row: usize, value: u8) {
        self.data[col * 3 + row] = value;
    }

    #[inline]
    fn is_column_full(&self, col: usize) -> bool {
        self.get(col, 0) != 0 && self.get(col, 1) != 0 && self.get(col, 2) != 0
    }

    #[inline]
    fn get_empty_row(&self, col: usize) -> Option<usize> {
        for row in 0..3 {
            if self.get(col, row) == 0 {
                return Some(row);
            }
        }
        None
    }

    fn place_die(&mut self, col: usize, value: u8) -> bool {
        if let Some(row) = self.get_empty_row(col) {
            self.set(col, row, value);
            true
        } else {
            false
        }
    }

    fn remove_matching(&mut self, col: usize, value: u8) -> usize {
        let mut removed = 0;
        // Remove matching dice and shift down
        let mut new_col = [0u8; 3];
        let mut idx = 0;
        for row in 0..3 {
            let v = self.get(col, row);
            if v != 0 && v != value {
                new_col[idx] = v;
                idx += 1;
            } else if v == value {
                removed += 1;
            }
        }
        // Write back (fill rest with zeros)
        for row in 0..3 {
            self.set(col, row, if row < idx { new_col[row] } else { 0 });
        }
        removed
    }

    fn is_full(&self) -> bool {
        self.data.iter().all(|&v| v != 0)
    }
}

#[derive(Clone, Debug)]
pub struct GameState {
    grid1: Grid,
    grid2: Grid,
    current_player: Player,
    current_die: Option<u8>,
    phase: GamePhase,
    turn_number: u32,
}

#[derive(Clone, Copy, Debug)]
pub struct DifficultyConfig {
    pub depth: u32,
    pub randomness: f64,
    pub offense_weight: f64,
    pub defense_weight: f64,
    pub advanced_eval: bool,
}

// Transposition table entry
#[derive(Clone)]
struct TTEntry {
    depth: u32,
    value: f64,
}

// Fast hash function for game state
fn hash_state(state: &GameState, depth: u32) -> u64 {
    let mut hash = 0u64;
    // Hash grids
    for i in 0..9 {
        hash = hash.wrapping_mul(31).wrapping_add(state.grid1.data[i] as u64);
        hash = hash.wrapping_mul(31).wrapping_add(state.grid2.data[i] as u64);
    }
    hash = hash.wrapping_mul(31).wrapping_add(state.current_player as u64);
    hash = hash.wrapping_mul(31).wrapping_add(state.current_die.unwrap_or(0) as u64);
    hash = hash.wrapping_mul(31).wrapping_add(depth as u64);
    hash
}

// Scoring functions (optimized)
#[inline]
fn calculate_column_score(column: &[u8; 3]) -> i32 {
    let mut counts = [0u8; 7]; // indices 1-6 used
    for &v in column.iter() {
        if v != 0 {
            counts[v as usize] += 1;
        }
    }
    let mut total = 0;
    for value in 1..=6 {
        let count = counts[value] as i32;
        total += value as i32 * count * count;
    }
    total
}

#[inline]
fn calculate_grid_score(grid: &Grid) -> i32 {
    let mut total = 0;
    for col in 0..3 {
        let column = [
            grid.get(col, 0),
            grid.get(col, 1),
            grid.get(col, 2),
        ];
        total += calculate_column_score(&column);
    }
    total
}

#[inline]
fn calculate_move_score_gain(grid: &Grid, col: usize, die_value: u8) -> i32 {
    let column = [
        grid.get(col, 0),
        grid.get(col, 1),
        grid.get(col, 2),
    ];
    let current_score = calculate_column_score(&column);
    
    let mut new_column = column;
    for row in 0..3 {
        if new_column[row] == 0 {
            new_column[row] = die_value;
            break;
        }
    }
    let new_score = calculate_column_score(&new_column);
    new_score - current_score
}

#[inline]
fn calculate_opponent_score_loss(opponent_grid: &Grid, col: usize, die_value: u8) -> i32 {
    let column = [
        opponent_grid.get(col, 0),
        opponent_grid.get(col, 1),
        opponent_grid.get(col, 2),
    ];
    let current_score = calculate_column_score(&column);
    
    let mut new_column = column;
    for row in 0..3 {
        if new_column[row] == die_value {
            new_column[row] = 0;
        }
    }
    // Compact
    let mut compacted = [0u8; 3];
    let mut idx = 0;
    for row in 0..3 {
        if new_column[row] != 0 {
            compacted[idx] = new_column[row];
            idx += 1;
        }
    }
    let new_score = calculate_column_score(&compacted);
    current_score - new_score
}

// Evaluation functions
fn evaluate_basic(state: &GameState, player: Player) -> f64 {
    let score1 = calculate_grid_score(&state.grid1) as f64;
    let score2 = calculate_grid_score(&state.grid2) as f64;
    match player {
        Player::Player1 => score1 - score2,
        Player::Player2 => score2 - score1,
    }
}

fn evaluate_advanced(state: &GameState, player: Player, config: &DifficultyConfig) -> f64 {
    let (my_grid, opp_grid) = match player {
        Player::Player1 => (&state.grid1, &state.grid2),
        Player::Player2 => (&state.grid2, &state.grid1),
    };
    
    let my_score = calculate_grid_score(my_grid) as f64;
    let opp_score = calculate_grid_score(opp_grid) as f64;
    
    let base_score = my_score - opp_score;
    
    // Game end check
    if state.phase == GamePhase::Ended {
        if base_score > 0.0 {
            return 10000.0;
        } else if base_score < 0.0 {
            return -10000.0;
        } else {
            return 0.0;
        }
    }
    
    // Positional evaluation (simplified for performance)
    let mut positional = 0.0;
    let total_dice = my_grid.data.iter().filter(|&&v| v != 0).count() as f64;
    let game_progress = total_dice / 9.0;
    
    for col in 0..3 {
        // Attack potential
        if !opp_grid.is_column_full(col) {
            let potential_damage = calculate_opponent_score_loss(opp_grid, col, 6) as f64;
            positional += (potential_damage / 6.0) * (1.0 - game_progress * 0.3) * config.offense_weight;
        }
        
        // Defense (vulnerability)
        let my_col = [
            my_grid.get(col, 0),
            my_grid.get(col, 1),
            my_grid.get(col, 2),
        ];
        let opp_col = [
            opp_grid.get(col, 0),
            opp_grid.get(col, 1),
            opp_grid.get(col, 2),
        ];
        
        let opp_empty = opp_col.iter().filter(|&&v| v == 0).count();
        if opp_empty > 0 {
            let vulnerability: f64 = my_col.iter()
                .filter(|&&v| v != 0)
                .map(|&v| v as f64 * 0.5)
                .sum();
            positional -= vulnerability * game_progress * config.defense_weight;
        }
    }
    
    base_score * config.offense_weight + positional
}

fn evaluate(state: &GameState, player: Player, config: &DifficultyConfig) -> f64 {
    if config.advanced_eval {
        evaluate_advanced(state, player, config)
    } else {
        evaluate_basic(state, player)
    }
}

fn evaluate_move_quick(state: &GameState, col: usize, die_value: u8, player: Player) -> f64 {
    let (my_grid, opp_grid) = match player {
        Player::Player1 => (&state.grid1, &state.grid2),
        Player::Player2 => (&state.grid2, &state.grid1),
    };
    
    let score_gain = calculate_move_score_gain(my_grid, col, die_value) as f64;
    let opponent_loss = calculate_opponent_score_loss(opp_grid, col, die_value) as f64;
    score_gain + opponent_loss
}

// Expectimax search
struct SearchContext {
    tt: HashMap<u64, TTEntry>,
    nodes_explored: u32,
    max_nodes: u32,
}

impl SearchContext {
    fn new() -> Self {
        SearchContext {
            tt: HashMap::with_capacity(10000),
            nodes_explored: 0,
            max_nodes: 500000,
        }
    }
    
    fn clear(&mut self) {
        self.tt.clear();
        self.nodes_explored = 0;
    }
}

fn order_moves(state: &GameState, columns: &[usize], player: Player) -> Vec<usize> {
    if let Some(die_value) = state.current_die {
        let mut scored: Vec<(usize, f64)> = columns.iter()
            .map(|&col| (col, evaluate_move_quick(state, col, die_value, player)))
            .collect();
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored.into_iter().map(|(col, _)| col).collect()
    } else {
        columns.to_vec()
    }
}

fn apply_move(state: &GameState, col: usize) -> Option<GameState> {
    let die_value = state.current_die?;
    let mut new_state = state.clone();
    
    let (my_grid, opp_grid) = match state.current_player {
        Player::Player1 => (&mut new_state.grid1, &mut new_state.grid2),
        Player::Player2 => (&mut new_state.grid2, &mut new_state.grid1),
    };
    
    if !my_grid.place_die(col, die_value) {
        return None;
    }
    
    opp_grid.remove_matching(col, die_value);
    
    // Check if game ended
    if my_grid.is_full() {
        new_state.phase = GamePhase::Ended;
        return Some(new_state);
    }
    
    // Switch player
    new_state.current_player = match state.current_player {
        Player::Player1 => Player::Player2,
        Player::Player2 => Player::Player1,
    };
    new_state.current_die = None;
    new_state.phase = GamePhase::Rolling;
    new_state.turn_number += 1;
    
    Some(new_state)
}

fn roll_die(state: &GameState, die_value: u8) -> GameState {
    let mut new_state = state.clone();
    new_state.current_die = Some(die_value);
    new_state.phase = GamePhase::Placing;
    new_state
}

fn max_node(
    state: &GameState,
    depth: u32,
    player: Player,
    player_config: &DifficultyConfig,
    opponent_config: &DifficultyConfig,
    ctx: &mut SearchContext,
) -> f64 {
    ctx.nodes_explored += 1;
    
    if ctx.nodes_explored > ctx.max_nodes || state.phase == GamePhase::Ended || depth == 0 {
        return evaluate(state, player, player_config);
    }
    
    if state.phase == GamePhase::Rolling {
        return chance_node(state, depth, player, player_config, opponent_config, ctx);
    }
    
    // Check transposition table
    let hash = hash_state(state, depth);
    if let Some(entry) = ctx.tt.get(&hash) {
        if entry.depth >= depth {
            return entry.value;
        }
    }
    
    let grid = match state.current_player {
        Player::Player1 => &state.grid1,
        Player::Player2 => &state.grid2,
    };
    
    let legal_columns: Vec<usize> = (0..3)
        .filter(|&col| !grid.is_column_full(col))
        .collect();
    
    if legal_columns.is_empty() {
        return evaluate(state, player, player_config);
    }
    
    let ordered = order_moves(state, &legal_columns, player);
    let mut max_value = f64::NEG_INFINITY;
    
    for col in ordered {
        if let Some(new_state) = apply_move(state, col) {
            let value = if new_state.phase == GamePhase::Ended {
                evaluate(&new_state, player, player_config)
            } else if new_state.current_player == player {
                chance_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            } else {
                min_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            };
            
            max_value = max_value.max(value);
        }
    }
    
    // Store in transposition table
    ctx.tt.insert(hash, TTEntry { depth, value: max_value });
    
    max_value
}

fn min_node(
    state: &GameState,
    depth: u32,
    player: Player,
    player_config: &DifficultyConfig,
    opponent_config: &DifficultyConfig,
    ctx: &mut SearchContext,
) -> f64 {
    ctx.nodes_explored += 1;
    
    if ctx.nodes_explored > ctx.max_nodes || state.phase == GamePhase::Ended || depth == 0 {
        return evaluate(state, player, player_config);
    }
    
    if state.phase == GamePhase::Rolling {
        return chance_node(state, depth, player, player_config, opponent_config, ctx);
    }
    
    let grid = match state.current_player {
        Player::Player1 => &state.grid1,
        Player::Player2 => &state.grid2,
    };
    
    let legal_columns: Vec<usize> = (0..3)
        .filter(|&col| !grid.is_column_full(col))
        .collect();
    
    if legal_columns.is_empty() {
        return evaluate(state, player, player_config);
    }
    
    // Determine opponent's move based on their config
    let opponent = state.current_player;
    let opponent_move: Option<usize> = if opponent_config.depth == 0 {
        // Greedy opponent
        if let Some(die_value) = state.current_die {
            let mut best_col = legal_columns[0];
            let mut best_score = f64::NEG_INFINITY;
            for &col in &legal_columns {
                let score = evaluate_move_quick(state, col, die_value, opponent);
                if score > best_score {
                    best_score = score;
                    best_col = col;
                }
            }
            Some(best_col)
        } else {
            None
        }
    } else if opponent_config.randomness > 0.0 && js_sys::Math::random() < opponent_config.randomness {
        // Random move
        let idx = (js_sys::Math::random() * legal_columns.len() as f64) as usize;
        Some(legal_columns[idx])
    } else {
        // Opponent uses expectimax - find their best move
        let opponent_search_depth = opponent_config.depth.min(depth);
        let limited_opponent_config = DifficultyConfig {
            depth: opponent_search_depth,
            ..*opponent_config
        };
        let ordered = order_moves(state, &legal_columns, opponent);
        let mut best_move: Option<usize> = None;
        let mut best_value = f64::NEG_INFINITY;
        
        for col in ordered {
            if let Some(new_state) = apply_move(state, col) {
                let value = if new_state.phase == GamePhase::Ended {
                    evaluate(&new_state, opponent, &limited_opponent_config)
                } else {
                    chance_node(&new_state, opponent_search_depth - 1, opponent, &limited_opponent_config, player_config, ctx)
                };
                
                if value > best_value {
                    best_value = value;
                    best_move = Some(col);
                }
            }
        }
        best_move
    };
    
    // Evaluate opponent's chosen move from our perspective
    if let Some(opp_col) = opponent_move {
        if let Some(new_state) = apply_move(state, opp_col) {
            let value = if new_state.phase == GamePhase::Ended {
                evaluate(&new_state, player, player_config)
            } else if new_state.current_player == player {
                chance_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            } else {
                chance_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            };
            return value;
        }
    }
    
    // Fallback: evaluate all moves and take minimum
    let mut min_value = f64::INFINITY;
    for col in legal_columns {
        if let Some(new_state) = apply_move(state, col) {
            let value = if new_state.phase == GamePhase::Ended {
                evaluate(&new_state, player, player_config)
            } else if new_state.current_player == player {
                chance_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            } else {
                chance_node(&new_state, depth - 1, player, player_config, opponent_config, ctx)
            };
            min_value = min_value.min(value);
        }
    }
    
    min_value
}

fn chance_node(
    state: &GameState,
    depth: u32,
    player: Player,
    player_config: &DifficultyConfig,
    opponent_config: &DifficultyConfig,
    ctx: &mut SearchContext,
) -> f64 {
    ctx.nodes_explored += 1;
    
    if ctx.nodes_explored > ctx.max_nodes {
        return evaluate(state, player, player_config);
    }
    
    if state.phase != GamePhase::Rolling {
        return if state.current_player == player {
            max_node(state, depth, player, player_config, opponent_config, ctx)
        } else {
            min_node(state, depth, player, player_config, opponent_config, ctx)
        };
    }
    
    let mut total_value = 0.0;
    for die_value in 1..=6 {
        let rolled_state = roll_die(state, die_value);
        let value = if rolled_state.current_player == player {
            max_node(&rolled_state, depth, player, player_config, opponent_config, ctx)
        } else {
            min_node(&rolled_state, depth, player, player_config, opponent_config, ctx)
        };
        total_value += value / 6.0;
    }
    
    total_value
}

// WASM bindings
#[wasm_bindgen]
pub struct AIEngine {
    ctx: SearchContext,
}

#[wasm_bindgen]
impl AIEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        AIEngine {
            ctx: SearchContext::new(),
        }
    }
    
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.ctx.clear();
    }
    
    #[wasm_bindgen]
    pub fn get_best_move(
        &mut self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
        depth: u32,
        randomness: f64,
        offense_weight: f64,
        defense_weight: f64,
        advanced_eval: bool,
        opponent_depth: u32,
        opponent_randomness: f64,
        opponent_offense_weight: f64,
        opponent_defense_weight: f64,
        opponent_advanced_eval: bool,
    ) -> i32 {
        // Convert from JS arrays to GameState
        let mut state = GameState {
            grid1: Grid { data: [0; 9] },
            grid2: Grid { data: [0; 9] },
            current_player: if current_player == 0 { Player::Player1 } else { Player::Player2 },
            current_die: if current_die == 0 { None } else { Some(current_die) },
            phase: if current_die == 0 { GamePhase::Rolling } else { GamePhase::Placing },
            turn_number: 1,
        };
        
        // Copy grid data (JS sends flat arrays of length 9)
        // Ensure we don't go out of bounds
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        // Fill remaining with zeros if needed
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
        // Fill remaining with zeros if needed
        for i in len2..9 {
            state.grid2.data[i] = 0;
        }
        
        if state.phase != GamePhase::Placing || state.current_die.is_none() {
            return -1;
        }
        
        let player = state.current_player;
        let grid = match player {
            Player::Player1 => &state.grid1,
            Player::Player2 => &state.grid2,
        };
        
        let legal_columns: Vec<usize> = (0..3)
            .filter(|&col| !grid.is_column_full(col))
            .collect();
        
        if legal_columns.is_empty() {
            return -1;
        }
        
        if legal_columns.len() == 1 {
            return legal_columns[0] as i32;
        }
        
        // Random move based on difficulty
        if randomness > 0.0 && js_sys::Math::random() < randomness {
            let idx = (js_sys::Math::random() * legal_columns.len() as f64) as usize;
            return legal_columns[idx] as i32;
        }
        
        // Greedy (depth 0)
        if depth == 0 {
            let die_value = state.current_die.unwrap();
            let mut best_col = legal_columns[0];
            let mut best_score = f64::NEG_INFINITY;
            for &col in &legal_columns {
                let score = evaluate_move_quick(&state, col, die_value, player);
                if score > best_score {
                    best_score = score;
                    best_col = col;
                }
            }
            return best_col as i32;
        }
        
        // Expectimax search
        let player_config = DifficultyConfig {
            depth,
            randomness,
            offense_weight,
            defense_weight,
            advanced_eval,
        };
        
        let opponent_config = DifficultyConfig {
            depth: opponent_depth,
            randomness: opponent_randomness,
            offense_weight: opponent_offense_weight,
            defense_weight: opponent_defense_weight,
            advanced_eval: opponent_advanced_eval,
        };
        
        let ordered = order_moves(&state, &legal_columns, player);
        let mut best_move: i32 = -1;
        let mut best_value = f64::NEG_INFINITY;
        
        for col in ordered {
            if let Some(new_state) = apply_move(&state, col) {
                let value = if new_state.phase == GamePhase::Ended {
                    evaluate(&new_state, player, &player_config)
                } else {
                    chance_node(&new_state, depth - 1, player, &player_config, &opponent_config, &mut self.ctx)
                };
                
                if value > best_value {
                    best_value = value;
                    best_move = col as i32;
                }
            }
        }
        
        if best_move == -1 {
            best_move = legal_columns[0] as i32;
        }
        
        best_move
    }
}
