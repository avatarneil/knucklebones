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
    pub adversarial: bool,
    pub time_budget_ms: f64,
}

// Transposition table entry
#[derive(Clone)]
struct TTEntry {
    depth: u32,
    value: f64,
}

// Search context passed through the tree
struct SearchContext {
    tt: HashMap<u64, TTEntry>,
    nodes_explored: u32,
    max_nodes: u32,
    start_time: f64,
    time_budget_ms: f64,
    aborted: bool,
    use_adversarial: bool,
}

impl SearchContext {
    fn new() -> Self {
        SearchContext {
            tt: HashMap::with_capacity(100000),
            nodes_explored: 0,
            max_nodes: 500000,
            start_time: 0.0,
            time_budget_ms: 0.0,
            aborted: false,
            use_adversarial: false,
        }
    }
    
    fn clear(&mut self) {
        self.tt.clear();
        self.nodes_explored = 0;
        self.aborted = false;
    }
    
    fn should_abort(&mut self) -> bool {
        if self.aborted {
            return true;
        }
        if self.time_budget_ms <= 0.0 {
            return false;
        }
        // Check time every 1000 nodes to avoid overhead
        if self.nodes_explored % 1000 == 0 {
            let elapsed = js_sys::Date::now() - self.start_time;
            if elapsed >= self.time_budget_ms {
                self.aborted = true;
                return true;
            }
        }
        false
    }
}

// Fast hash function for game state
fn hash_state(state: &GameState, depth: u32, is_max: bool) -> u64 {
    let mut hash = 0u64;
    // Hash grids
    for i in 0..9 {
        hash = hash.wrapping_mul(31).wrapping_add(state.grid1.data[i] as u64);
        hash = hash.wrapping_mul(31).wrapping_add(state.grid2.data[i] as u64);
    }
    hash = hash.wrapping_mul(31).wrapping_add(state.current_player as u64);
    hash = hash.wrapping_mul(31).wrapping_add(state.current_die.unwrap_or(0) as u64);
    hash = hash.wrapping_mul(31).wrapping_add(depth as u64);
    hash = hash.wrapping_mul(31).wrapping_add(if is_max { 1 } else { 0 });
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
    
    if ctx.nodes_explored > ctx.max_nodes || ctx.should_abort() || state.phase == GamePhase::Ended || depth == 0 {
        return evaluate(state, player, player_config);
    }
    
    if state.phase == GamePhase::Rolling {
        return chance_node(state, depth, player, player_config, opponent_config, ctx);
    }
    
    // Check transposition table
    let hash = hash_state(state, depth, true);
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
    
    // Store in transposition table (limit size)
    if ctx.tt.len() < 100000 {
        ctx.tt.insert(hash, TTEntry { depth, value: max_value });
    }
    
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
    
    if ctx.nodes_explored > ctx.max_nodes || ctx.should_abort() || state.phase == GamePhase::Ended || depth == 0 {
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

    // TRUE ADVERSARIAL SEARCH: opponent plays optimally against us
    if ctx.use_adversarial {
        // Check transposition table
        let hash = hash_state(state, depth, false);
        if let Some(entry) = ctx.tt.get(&hash) {
            if entry.depth >= depth {
                return entry.value;
            }
        }
        
        // Order moves from opponent's perspective (best for them)
        let ordered = order_moves(state, &legal_columns, state.current_player);
        let mut min_value = f64::INFINITY;
        
        for col in ordered {
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
        
        // Store in transposition table
        if ctx.tt.len() < 100000 {
            ctx.tt.insert(hash, TTEntry { depth, value: min_value });
        }
        
        return min_value;
    }
    
    // MODELED OPPONENT: Use opponent's config to determine their move
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
                    chance_node(&new_state, opponent_search_depth.saturating_sub(1), opponent, &limited_opponent_config, player_config, ctx)
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
    
    if ctx.nodes_explored > ctx.max_nodes || ctx.should_abort() {
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

/// Internal expectimax search
fn expectimax_internal(
    state: &GameState,
    player: Player,
    player_config: &DifficultyConfig,
    opponent_config: &DifficultyConfig,
    ctx: &mut SearchContext,
) -> (Option<usize>, f64) {
    if state.phase != GamePhase::Placing || state.current_die.is_none() {
        return (None, 0.0);
    }
    
    let grid = match player {
        Player::Player1 => &state.grid1,
        Player::Player2 => &state.grid2,
    };
    
    let legal_columns: Vec<usize> = (0..3)
        .filter(|&col| !grid.is_column_full(col))
        .collect();
    
    if legal_columns.is_empty() {
        return (None, 0.0);
    }
    
    if legal_columns.len() == 1 {
        return (Some(legal_columns[0]), 0.0);
    }
    
    let ordered = order_moves(state, &legal_columns, player);
    let mut best_move: Option<usize> = None;
    let mut best_value = f64::NEG_INFINITY;
    
    for col in ordered {
        if ctx.should_abort() {
            break;
        }
        
        if let Some(new_state) = apply_move(state, col) {
            let value = if new_state.phase == GamePhase::Ended {
                evaluate(&new_state, player, player_config)
            } else {
                chance_node(&new_state, player_config.depth.saturating_sub(1), player, player_config, opponent_config, ctx)
            };
            
            if value > best_value {
                best_value = value;
                best_move = Some(col);
            }
        }
    }
    
    (best_move, best_value)
}

/// Iterative deepening search with time budget
fn iterative_deepening(
    state: &GameState,
    player: Player,
    player_config: &DifficultyConfig,
    opponent_config: &DifficultyConfig,
    ctx: &mut SearchContext,
) -> (Option<usize>, f64, u32) {
    let start_time = js_sys::Date::now();
    let time_budget_ms = player_config.time_budget_ms;
    
    let mut best_move: Option<usize> = None;
    let mut best_value = f64::NEG_INFINITY;
    let mut depth_reached = 0u32;
    
    // Start from depth 1 and increase
    for depth in 1..=player_config.depth {
        let elapsed = js_sys::Date::now() - start_time;
        if elapsed >= time_budget_ms * 0.8 {
            // Leave some time buffer
            break;
        }
        
        let depth_config = DifficultyConfig {
            depth,
            ..*player_config
        };
        
        ctx.start_time = start_time;
        ctx.time_budget_ms = time_budget_ms;
        ctx.aborted = false;
        
        let (move_opt, value) = expectimax_internal(state, player, &depth_config, opponent_config, ctx);
        
        if !ctx.aborted {
            if let Some(m) = move_opt {
                best_move = Some(m);
                best_value = value;
                depth_reached = depth;
            }
        }
        
        if ctx.aborted {
            break;
        }
    }
    
    (best_move, best_value, depth_reached)
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
        // Call the extended version with default adversarial=false and time_budget=0
        self.get_best_move_extended(
            grid1, grid2, current_player, current_die,
            depth, randomness, offense_weight, defense_weight, advanced_eval,
            false, 0.0,  // adversarial, time_budget_ms
            opponent_depth, opponent_randomness, opponent_offense_weight, opponent_defense_weight, opponent_advanced_eval,
            false, 0.0,  // opponent adversarial, time_budget_ms
        )
    }
    
    #[wasm_bindgen]
    pub fn get_best_move_extended(
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
        adversarial: bool,
        time_budget_ms: f64,
        opponent_depth: u32,
        opponent_randomness: f64,
        opponent_offense_weight: f64,
        opponent_defense_weight: f64,
        opponent_advanced_eval: bool,
        opponent_adversarial: bool,
        opponent_time_budget_ms: f64,
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
        
        // Copy grid data
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
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
        
        // Setup configs
        let player_config = DifficultyConfig {
            depth,
            randomness,
            offense_weight,
            defense_weight,
            advanced_eval,
            adversarial,
            time_budget_ms,
        };
        
        let opponent_config = DifficultyConfig {
            depth: opponent_depth,
            randomness: opponent_randomness,
            offense_weight: opponent_offense_weight,
            defense_weight: opponent_defense_weight,
            advanced_eval: opponent_advanced_eval,
            adversarial: opponent_adversarial,
            time_budget_ms: opponent_time_budget_ms,
        };
        
        // Setup context
        self.ctx.use_adversarial = adversarial;
        self.ctx.start_time = js_sys::Date::now();
        self.ctx.time_budget_ms = time_budget_ms;
        self.ctx.aborted = false;
        
        // Use iterative deepening if time budget is set
        let best_move = if time_budget_ms > 0.0 {
            let (move_opt, _, _) = iterative_deepening(&state, player, &player_config, &opponent_config, &mut self.ctx);
            move_opt
        } else {
            let (move_opt, _) = expectimax_internal(&state, player, &player_config, &opponent_config, &mut self.ctx);
            move_opt
        };
        
        match best_move {
            Some(col) => col as i32,
            None => legal_columns[0] as i32,
        }
    }
    
    /// Get the best move using Master AI with adaptive weights from opponent profile
    #[wasm_bindgen]
    pub fn get_master_move(
        &mut self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
        profile: &OpponentProfile,
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
        
        // Copy grid data
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
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
        
        // Get adaptive config from profile
        let adaptive_config = profile.get_adaptive_config();
        
        // Use expert-level opponent modeling with adversarial search
        let opponent_config = DifficultyConfig {
            depth: 3,
            randomness: 0.0,
            offense_weight: 0.5,
            defense_weight: 0.5,
            advanced_eval: true,
            adversarial: true,
            time_budget_ms: 0.0,
        };
        
        // Setup context for adversarial search
        self.ctx.use_adversarial = true;
        self.ctx.start_time = js_sys::Date::now();
        self.ctx.time_budget_ms = 100.0; // 100ms budget for master
        self.ctx.aborted = false;
        
        // Order moves with adaptive bias from profile
        let ordered = order_moves_with_profile(&state, &legal_columns, player, profile);
        let mut best_move: i32 = -1;
        let mut best_value = f64::NEG_INFINITY;
        
        for col in ordered {
            if self.ctx.should_abort() {
                break;
            }
            
            if let Some(new_state) = apply_move(&state, col) {
                let base_value = if new_state.phase == GamePhase::Ended {
                    evaluate(&new_state, player, &adaptive_config)
                } else {
                    chance_node(&new_state, adaptive_config.depth.saturating_sub(1), player, &adaptive_config, &opponent_config, &mut self.ctx)
                };
                
                // Apply column bias from learned opponent patterns
                let column_bias = profile.get_column_attack_bonus(col);
                let value = base_value + column_bias;
                
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

// ============================================================================
// Master AI - Opponent Profile for Adaptive Learning
// ============================================================================

// Constants for Master AI adaptive learning
/// Default frequency when no data available (1/3 for 3 columns)
const UNIFORM_COLUMN_FREQUENCY: f64 = 0.333;

/// Scaling factor for column preference bonus based on opponent usage patterns
const COLUMN_PREFERENCE_SCALE: f64 = 3.0;

/// Scaling factor for high dice placement bonus (targets opponent's high-value columns)
const HIGH_DICE_BONUS_SCALE: f64 = 5.0;

/// Multiplier for profile-based bonus in move ordering (balances learned patterns vs immediate value)
const PROFILE_BONUS_MULTIPLIER: f64 = 2.0;

/// Attack rate threshold for aggressive opponent detection
const AGGRESSIVE_ATTACK_THRESHOLD: f64 = 0.4;

/// Attack rate threshold for passive opponent detection  
const PASSIVE_ATTACK_THRESHOLD: f64 = 0.2;

/// Opponent behavior profile that learns patterns across games
#[wasm_bindgen]
pub struct OpponentProfile {
    // Column usage frequency [col0, col1, col2]
    column_usage: [u32; 3],
    total_moves: u32,
    
    // Attack stats: times opponent removed dice
    attack_moves: u32,
    
    // Die placement patterns by column
    // High dice (5-6) placements per column
    high_dice_placements: [u32; 3],
    // Low dice (1-2) placements per column
    low_dice_placements: [u32; 3],
    
    // Total score lost to opponent attacks (for defense learning)
    score_lost_to_attacks: u32,
    
    // Games completed for stability weighting
    games_completed: u32,
}

#[wasm_bindgen]
impl OpponentProfile {
    /// Create a new empty opponent profile
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        OpponentProfile {
            column_usage: [0; 3],
            total_moves: 0,
            attack_moves: 0,
            high_dice_placements: [0; 3],
            low_dice_placements: [0; 3],
            score_lost_to_attacks: 0,
            games_completed: 0,
        }
    }
    
    /// Record an opponent move for learning
    #[wasm_bindgen]
    pub fn record_move(&mut self, col: u8, die_value: u8, removed_count: u8, score_lost: u32) {
        if col > 2 || die_value == 0 || die_value > 6 {
            return;
        }
        
        let col_idx = col as usize;
        
        self.column_usage[col_idx] = self.column_usage[col_idx].saturating_add(1);
        self.total_moves = self.total_moves.saturating_add(1);
        
        if removed_count > 0 {
            self.attack_moves = self.attack_moves.saturating_add(1);
            self.score_lost_to_attacks = self.score_lost_to_attacks.saturating_add(score_lost);
        }
        
        if die_value >= 5 {
            self.high_dice_placements[col_idx] = self.high_dice_placements[col_idx].saturating_add(1);
        } else if die_value <= 2 {
            self.low_dice_placements[col_idx] = self.low_dice_placements[col_idx].saturating_add(1);
        }
    }
    
    /// Mark end of game for stability tracking
    #[wasm_bindgen]
    pub fn end_game(&mut self) {
        self.games_completed = self.games_completed.saturating_add(1);
    }
    
    /// Reset all learned data
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.column_usage = [0; 3];
        self.total_moves = 0;
        self.attack_moves = 0;
        self.high_dice_placements = [0; 3];
        self.low_dice_placements = [0; 3];
        self.score_lost_to_attacks = 0;
        self.games_completed = 0;
    }
    
    /// Get the number of games completed
    #[wasm_bindgen]
    pub fn get_games_completed(&self) -> u32 {
        self.games_completed
    }
    
    /// Get total moves recorded
    #[wasm_bindgen]
    pub fn get_total_moves(&self) -> u32 {
        self.total_moves
    }
    
    /// Get attack rate (0.0 to 1.0)
    #[wasm_bindgen]
    pub fn get_attack_rate(&self) -> f64 {
        if self.total_moves == 0 {
            return 0.0;
        }
        self.attack_moves as f64 / self.total_moves as f64
    }
    
    /// Get column usage frequency for a column (0.0 to 1.0)
    #[wasm_bindgen]
    pub fn get_column_frequency(&self, col: u8) -> f64 {
        if col > 2 {
            return 0.0;
        }
        if self.total_moves == 0 {
            return UNIFORM_COLUMN_FREQUENCY;
        }
        self.column_usage[col as usize] as f64 / self.total_moves as f64
    }
}

impl OpponentProfile {
    /// Calculate adaptive difficulty config based on learned opponent patterns.
    fn get_adaptive_config(&self) -> DifficultyConfig {
        let mut config = DifficultyConfig {
            depth: 5,
            randomness: 0.0,
            offense_weight: 0.5,
            defense_weight: 0.5,
            advanced_eval: true,
            adversarial: true,
            time_budget_ms: 100.0,
        };
        
        if self.games_completed < 3 || self.total_moves < 10 {
            return config;
        }
        
        let attack_rate = self.get_attack_rate();
        
        if attack_rate > AGGRESSIVE_ATTACK_THRESHOLD {
            config.defense_weight = (0.6 + (attack_rate - AGGRESSIVE_ATTACK_THRESHOLD) * 0.5).clamp(0.0, 1.0);
            config.offense_weight = 1.0 - config.defense_weight;
        } else if attack_rate < PASSIVE_ATTACK_THRESHOLD {
            config.offense_weight = 0.7;
            config.defense_weight = 0.3;
        }
        
        config
    }
    
    /// Get bonus for attacking a specific column based on opponent patterns.
    fn get_column_attack_bonus(&self, col: usize) -> f64 {
        if self.total_moves < 10 || col > 2 {
            return 0.0;
        }
        
        let col_freq = self.column_usage[col] as f64 / self.total_moves as f64;
        let preference_delta = col_freq - UNIFORM_COLUMN_FREQUENCY;
        
        let total_high_dice: u32 = self.high_dice_placements.iter().sum();
        let high_dice_ratio = if total_high_dice > 0 {
            self.high_dice_placements[col] as f64 / total_high_dice as f64
        } else {
            UNIFORM_COLUMN_FREQUENCY
        };
        
        let high_dice_bonus = (high_dice_ratio - UNIFORM_COLUMN_FREQUENCY) * HIGH_DICE_BONUS_SCALE;
        
        preference_delta * COLUMN_PREFERENCE_SCALE + high_dice_bonus
    }
}

/// Order moves considering both quick evaluation and profile-based bias.
fn order_moves_with_profile(
    state: &GameState, 
    columns: &[usize], 
    player: Player,
    profile: &OpponentProfile,
) -> Vec<usize> {
    if let Some(die_value) = state.current_die {
        let mut scored: Vec<(usize, f64)> = columns.iter()
            .map(|&col| {
                let base_score = evaluate_move_quick(state, col, die_value, player);
                let profile_bonus = profile.get_column_attack_bonus(col);
                (col, base_score + profile_bonus * PROFILE_BONUS_MULTIPLIER)
            })
            .collect();
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored.into_iter().map(|(col, _)| col).collect()
    } else {
        columns.to_vec()
    }
}

// ============================================================================
// Neural Network for Policy/Value Prediction
// ============================================================================

/// State encoding size:
/// - 36 features for each player's grid (6 possible die values × 3 columns × 2 for count encoding)
/// - Actually: 3 cols × 3 rows × 7 (one-hot for 0-6) × 2 players = 126
/// - Simplified: 18 (grid1) + 18 (grid2) + 1 (current player) + 6 (current die one-hot) = 43
/// Using compact encoding: counts per face per column for both players
/// 6 faces × 3 columns × 2 players = 36 + 1 (player) + 6 (die one-hot) = 43

const STATE_ENCODING_SIZE: usize = 43;
const HIDDEN_SIZE: usize = 128;  // Doubled from 64 for more capacity
const POLICY_OUTPUT_SIZE: usize = 3;  // 3 columns

/// Encode game state into feature vector
fn encode_state(state: &GameState) -> [f64; STATE_ENCODING_SIZE] {
    let mut features = [0.0f64; STATE_ENCODING_SIZE];
    let mut idx = 0;
    
    // Encode grid1: counts per die value per column (6 × 3 = 18 features)
    for col in 0..3 {
        let mut counts = [0u8; 7]; // indices 1-6 used
        for row in 0..3 {
            let v = state.grid1.get(col, row);
            if v > 0 && v <= 6 {
                counts[v as usize] += 1;
            }
        }
        for die in 1..=6 {
            features[idx] = counts[die] as f64 / 3.0; // Normalize by max possible
            idx += 1;
        }
    }
    
    // Encode grid2: same format (18 features)
    for col in 0..3 {
        let mut counts = [0u8; 7];
        for row in 0..3 {
            let v = state.grid2.get(col, row);
            if v > 0 && v <= 6 {
                counts[v as usize] += 1;
            }
        }
        for die in 1..=6 {
            features[idx] = counts[die] as f64 / 3.0;
            idx += 1;
        }
    }
    
    // Current player (1 feature)
    features[idx] = if state.current_player == Player::Player1 { 0.0 } else { 1.0 };
    idx += 1;
    
    // Current die one-hot (6 features)
    if let Some(die) = state.current_die {
        if die >= 1 && die <= 6 {
            features[idx + (die as usize - 1)] = 1.0;
        }
    }
    
    features
}

/// Simple MLP for policy and value prediction
/// Architecture: input -> hidden (ReLU) -> policy head (softmax) + value head (tanh)
#[wasm_bindgen]
pub struct PolicyValueNetwork {
    // Weights for input -> hidden layer
    w1: Vec<f64>,  // HIDDEN_SIZE × STATE_ENCODING_SIZE
    b1: Vec<f64>,  // HIDDEN_SIZE
    
    // Weights for hidden -> policy output
    w_policy: Vec<f64>,  // POLICY_OUTPUT_SIZE × HIDDEN_SIZE
    b_policy: Vec<f64>,  // POLICY_OUTPUT_SIZE
    
    // Weights for hidden -> value output
    w_value: Vec<f64>,  // 1 × HIDDEN_SIZE
    b_value: f64,
    
    // Whether weights have been loaded
    initialized: bool,
}

#[wasm_bindgen]
impl PolicyValueNetwork {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // Initialize with small random weights (Xavier initialization)
        let scale1 = (2.0 / (STATE_ENCODING_SIZE + HIDDEN_SIZE) as f64).sqrt();
        let scale_policy = (2.0 / (HIDDEN_SIZE + POLICY_OUTPUT_SIZE) as f64).sqrt();
        let scale_value = (2.0 / (HIDDEN_SIZE + 1) as f64).sqrt();
        
        let mut w1 = vec![0.0; HIDDEN_SIZE * STATE_ENCODING_SIZE];
        let mut b1 = vec![0.0; HIDDEN_SIZE];
        let mut w_policy = vec![0.0; POLICY_OUTPUT_SIZE * HIDDEN_SIZE];
        let mut b_policy = vec![0.0; POLICY_OUTPUT_SIZE];
        let mut w_value = vec![0.0; HIDDEN_SIZE];
        
        // Initialize with small random values
        for i in 0..w1.len() {
            w1[i] = (js_sys::Math::random() - 0.5) * 2.0 * scale1;
        }
        for i in 0..w_policy.len() {
            w_policy[i] = (js_sys::Math::random() - 0.5) * 2.0 * scale_policy;
        }
        for i in 0..w_value.len() {
            w_value[i] = (js_sys::Math::random() - 0.5) * 2.0 * scale_value;
        }
        
        PolicyValueNetwork {
            w1,
            b1,
            w_policy,
            b_policy,
            w_value,
            b_value: 0.0,
            initialized: false,
        }
    }
    
    /// Load weights from a flat array
    /// Format: [w1..., b1..., w_policy..., b_policy..., w_value..., b_value]
    #[wasm_bindgen]
    pub fn load_weights(&mut self, weights: &[f64]) -> bool {
        let expected_size = 
            HIDDEN_SIZE * STATE_ENCODING_SIZE +  // w1
            HIDDEN_SIZE +                         // b1
            POLICY_OUTPUT_SIZE * HIDDEN_SIZE +    // w_policy
            POLICY_OUTPUT_SIZE +                  // b_policy
            HIDDEN_SIZE +                         // w_value
            1;                                    // b_value
        
        if weights.len() != expected_size {
            return false;
        }
        
        let mut idx = 0;
        
        // Load w1
        for i in 0..self.w1.len() {
            self.w1[i] = weights[idx];
            idx += 1;
        }
        
        // Load b1
        for i in 0..self.b1.len() {
            self.b1[i] = weights[idx];
            idx += 1;
        }
        
        // Load w_policy
        for i in 0..self.w_policy.len() {
            self.w_policy[i] = weights[idx];
            idx += 1;
        }
        
        // Load b_policy
        for i in 0..self.b_policy.len() {
            self.b_policy[i] = weights[idx];
            idx += 1;
        }
        
        // Load w_value
        for i in 0..self.w_value.len() {
            self.w_value[i] = weights[idx];
            idx += 1;
        }
        
        // Load b_value
        self.b_value = weights[idx];
        
        self.initialized = true;
        true
    }
    
    /// Check if network has been initialized with weights
    #[wasm_bindgen]
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }
    
    /// Get the total number of weights in the network
    #[wasm_bindgen]
    pub fn get_weight_count(&self) -> usize {
        HIDDEN_SIZE * STATE_ENCODING_SIZE +
        HIDDEN_SIZE +
        POLICY_OUTPUT_SIZE * HIDDEN_SIZE +
        POLICY_OUTPUT_SIZE +
        HIDDEN_SIZE +
        1
    }
}

impl PolicyValueNetwork {
    /// Forward pass: returns (policy, value)
    /// Policy is a probability distribution over 3 columns
    /// Value is in range [-1, 1]
    fn forward(&self, state: &GameState) -> ([f64; 3], f64) {
        let input = encode_state(state);
        
        // Hidden layer with ReLU
        let mut hidden = [0.0f64; HIDDEN_SIZE];
        for i in 0..HIDDEN_SIZE {
            let mut sum = self.b1[i];
            for j in 0..STATE_ENCODING_SIZE {
                sum += self.w1[i * STATE_ENCODING_SIZE + j] * input[j];
            }
            hidden[i] = sum.max(0.0); // ReLU
        }
        
        // Policy head with softmax
        let mut policy_logits = [0.0f64; POLICY_OUTPUT_SIZE];
        for i in 0..POLICY_OUTPUT_SIZE {
            let mut sum = self.b_policy[i];
            for j in 0..HIDDEN_SIZE {
                sum += self.w_policy[i * HIDDEN_SIZE + j] * hidden[j];
            }
            policy_logits[i] = sum;
        }
        
        // Softmax
        let max_logit = policy_logits.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let mut exp_sum = 0.0;
        let mut policy = [0.0f64; POLICY_OUTPUT_SIZE];
        for i in 0..POLICY_OUTPUT_SIZE {
            policy[i] = (policy_logits[i] - max_logit).exp();
            exp_sum += policy[i];
        }
        for i in 0..POLICY_OUTPUT_SIZE {
            policy[i] /= exp_sum;
        }
        
        // Value head with tanh
        let mut value_sum = self.b_value;
        for j in 0..HIDDEN_SIZE {
            value_sum += self.w_value[j] * hidden[j];
        }
        let value = value_sum.tanh();
        
        (policy, value)
    }
    
    /// Get policy for legal moves only (renormalized)
    fn get_policy_for_legal(&self, state: &GameState, legal_cols: &[usize]) -> Vec<(usize, f64)> {
        let (policy, _) = self.forward(state);
        
        // Collect policy for legal moves
        let mut legal_probs: Vec<(usize, f64)> = legal_cols.iter()
            .map(|&col| (col, policy[col]))
            .collect();
        
        // Renormalize
        let sum: f64 = legal_probs.iter().map(|(_, p)| p).sum();
        if sum > 0.0 {
            for (_, p) in &mut legal_probs {
                *p /= sum;
            }
        } else {
            // Uniform if sum is 0
            let uniform = 1.0 / legal_probs.len() as f64;
            for (_, p) in &mut legal_probs {
                *p = uniform;
            }
        }
        
        legal_probs
    }
    
    /// Get value estimate for a state
    fn get_value(&self, state: &GameState) -> f64 {
        let (_, value) = self.forward(state);
        value
    }
}

// ============================================================================
// MCTS (Monte Carlo Tree Search) with PUCT
// ============================================================================

/// MCTS Configuration
const MCTS_C_PUCT: f64 = 1.5;  // Exploration constant for PUCT
const MCTS_DEFAULT_SIMULATIONS: u32 = 800;  // Default number of simulations

/// MCTS Node representing a game state
#[derive(Clone)]
struct MCTSNode {
    /// Number of times this node has been visited
    visits: u32,
    /// Total value accumulated from this node (from the perspective of the player who moved here)
    total_value: f64,
    /// Prior probability for this action (from policy network or uniform)
    prior: f64,
    /// Children keyed by action (column index 0-2)
    children: HashMap<usize, MCTSNode>,
    /// The player who is to move at this node
    player_to_move: Player,
    /// Whether this is a terminal state
    is_terminal: bool,
    /// Terminal value if is_terminal
    terminal_value: f64,
}

impl MCTSNode {
    fn new(prior: f64, player_to_move: Player) -> Self {
        MCTSNode {
            visits: 0,
            total_value: 0.0,
            prior,
            children: HashMap::new(),
            player_to_move,
            is_terminal: false,
            terminal_value: 0.0,
        }
    }
    
    fn new_terminal(value: f64) -> Self {
        MCTSNode {
            visits: 1,
            total_value: value,
            prior: 1.0,
            children: HashMap::new(),
            player_to_move: Player::Player1,
            is_terminal: true,
            terminal_value: value,
        }
    }
    
    /// Get the mean value of this node
    fn mean_value(&self) -> f64 {
        if self.visits == 0 {
            0.0
        } else {
            self.total_value / self.visits as f64
        }
    }
    
    /// PUCT score for child selection
    fn puct_score(&self, child: &MCTSNode, parent_visits: u32) -> f64 {
        let q = child.mean_value();
        let u = MCTS_C_PUCT * child.prior * (parent_visits as f64).sqrt() / (1.0 + child.visits as f64);
        q + u
    }
    
    /// Select the best child according to PUCT
    fn select_child(&self) -> Option<usize> {
        if self.children.is_empty() {
            return None;
        }
        
        let mut best_action = None;
        let mut best_score = f64::NEG_INFINITY;
        
        for (&action, child) in &self.children {
            let score = self.puct_score(child, self.visits);
            if score > best_score {
                best_score = score;
                best_action = Some(action);
            }
        }
        
        best_action
    }
    
    /// Select the best action based on visit counts (for final move selection)
    fn best_action_by_visits(&self) -> Option<usize> {
        if self.children.is_empty() {
            return None;
        }
        
        let mut best_action = None;
        let mut best_visits = 0;
        
        for (&action, child) in &self.children {
            if child.visits > best_visits {
                best_visits = child.visits;
                best_action = Some(action);
            }
        }
        
        best_action
    }
}

/// MCTS Search Context
struct MCTSContext {
    /// Root node
    root: MCTSNode,
    /// Start time for time budget
    start_time: f64,
    /// Time budget in ms
    time_budget_ms: f64,
    /// Number of simulations run
    simulations: u32,
    /// Player we're optimizing for
    root_player: Player,
}

impl MCTSContext {
    fn new(player: Player, time_budget_ms: f64) -> Self {
        MCTSContext {
            root: MCTSNode::new(1.0, player),
            start_time: js_sys::Date::now(),
            time_budget_ms,
            simulations: 0,
            root_player: player,
        }
    }
    
    fn should_stop(&self) -> bool {
        if self.time_budget_ms <= 0.0 {
            return self.simulations >= MCTS_DEFAULT_SIMULATIONS;
        }
        let elapsed = js_sys::Date::now() - self.start_time;
        elapsed >= self.time_budget_ms
    }
}

/// Get legal columns for a state
fn get_legal_columns(state: &GameState) -> Vec<usize> {
    let grid = match state.current_player {
        Player::Player1 => &state.grid1,
        Player::Player2 => &state.grid2,
    };
    
    (0..3).filter(|&col| !grid.is_column_full(col)).collect()
}

/// Get uniform prior for legal actions
fn get_uniform_prior(num_legal: usize) -> f64 {
    if num_legal == 0 {
        0.0
    } else {
        1.0 / num_legal as f64
    }
}

/// Evaluate a state from a player's perspective (normalized to [-1, 1])
fn evaluate_normalized(state: &GameState, player: Player) -> f64 {
    let config = DifficultyConfig {
        depth: 0,
        randomness: 0.0,
        offense_weight: 0.5,
        defense_weight: 0.5,
        advanced_eval: true,
        adversarial: true,
        time_budget_ms: 0.0,
    };
    
    let raw_eval = evaluate_advanced(state, player, &config);
    
    // Handle terminal states
    if raw_eval >= 10000.0 {
        return 1.0;
    } else if raw_eval <= -10000.0 {
        return -1.0;
    }
    
    // Normalize to roughly [-1, 1] range
    // Typical score differences are in range [-200, 200]
    (raw_eval / 200.0).clamp(-1.0, 1.0)
}

/// Expand a node by adding children for all legal actions
fn mcts_expand(node: &mut MCTSNode, state: &GameState) {
    if state.phase == GamePhase::Ended {
        return;
    }
    
    let legal_columns = get_legal_columns(state);
    if legal_columns.is_empty() {
        return;
    }
    
    let prior = get_uniform_prior(legal_columns.len());
    
    for col in legal_columns {
        if !node.children.contains_key(&col) {
            // Determine the player who will move after this action
            let next_player = match state.current_player {
                Player::Player1 => Player::Player2,
                Player::Player2 => Player::Player1,
            };
            node.children.insert(col, MCTSNode::new(prior, next_player));
        }
    }
}

/// Simulate a game from a state to get a value
fn mcts_simulate(state: &GameState, player: Player) -> f64 {
    // Use evaluation function as a quick rollout replacement
    evaluate_normalized(state, player)
}

/// Run one MCTS iteration (selection, expansion, simulation, backpropagation)
fn mcts_iterate(
    node: &mut MCTSNode,
    state: &GameState,
    root_player: Player,
) -> f64 {
    node.visits += 1;
    
    // Terminal state
    if state.phase == GamePhase::Ended {
        let value = evaluate_normalized(state, root_player);
        node.is_terminal = true;
        node.terminal_value = value;
        node.total_value += value;
        return value;
    }
    
    // Handle chance nodes (rolling phase) - sample a die
    if state.phase == GamePhase::Rolling {
        // Sample a random die value
        let die_value = (js_sys::Math::random() * 6.0) as u8 + 1;
        let rolled_state = roll_die(state, die_value);
        let value = mcts_iterate(node, &rolled_state, root_player);
        node.total_value += value;
        return value;
    }
    
    // Expand if not expanded
    if node.children.is_empty() {
        mcts_expand(node, state);
        
        // If still no children, this is a terminal-like state
        if node.children.is_empty() {
            let value = evaluate_normalized(state, root_player);
            node.total_value += value;
            return value;
        }
        
        // Select one child for rollout
        if let Some(action) = node.select_child() {
            if let Some(new_state) = apply_move(state, action) {
                let value = mcts_simulate(&new_state, root_player);
                if let Some(child) = node.children.get_mut(&action) {
                    child.visits += 1;
                    child.total_value += value;
                }
                node.total_value += value;
                return value;
            }
        }
        
        let value = evaluate_normalized(state, root_player);
        node.total_value += value;
        return value;
    }
    
    // Selection - pick best child via PUCT
    if let Some(action) = node.select_child() {
        if let Some(new_state) = apply_move(state, action) {
            // Recursively iterate
            if let Some(child) = node.children.get_mut(&action) {
                let value = mcts_iterate(child, &new_state, root_player);
                node.total_value += value;
                return value;
            }
        }
    }
    
    // Fallback
    let value = evaluate_normalized(state, root_player);
    node.total_value += value;
    value
}

/// Run MCTS search and return the best action
fn mcts_search(state: &GameState, time_budget_ms: f64) -> Option<usize> {
    if state.phase != GamePhase::Placing || state.current_die.is_none() {
        return None;
    }
    
    let player = state.current_player;
    let legal_columns = get_legal_columns(state);
    
    if legal_columns.is_empty() {
        return None;
    }
    
    if legal_columns.len() == 1 {
        return Some(legal_columns[0]);
    }
    
    let mut ctx = MCTSContext::new(player, time_budget_ms);
    
    // Expand root
    mcts_expand(&mut ctx.root, state);
    
    // Run simulations until time budget is exhausted
    while !ctx.should_stop() {
        mcts_iterate(&mut ctx.root, state, player);
        ctx.simulations += 1;
    }
    
    // Select best action by visit count
    ctx.root.best_action_by_visits()
}

// Add MCTS method to AIEngine
#[wasm_bindgen]
impl AIEngine {
    /// Get the best move using MCTS (Monte Carlo Tree Search)
    #[wasm_bindgen]
    pub fn get_mcts_move(
        &mut self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
        time_budget_ms: f64,
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
        
        // Copy grid data
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
        for i in len2..9 {
            state.grid2.data[i] = 0;
        }
        
        if state.phase != GamePhase::Placing || state.current_die.is_none() {
            return -1;
        }
        
        match mcts_search(&state, time_budget_ms) {
            Some(col) => col as i32,
            None => -1,
        }
    }
    
    /// Get the best move using hybrid approach: MCTS with neural network priors
    /// For now, uses uniform priors until policy network is trained
    #[wasm_bindgen]
    pub fn get_hybrid_move(
        &mut self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
        time_budget_ms: f64,
        policy_weights: Option<Vec<f64>>,
    ) -> i32 {
        // For now, just use MCTS with uniform priors
        // Policy weights will be used when we have a trained model
        let _ = policy_weights;
        self.get_mcts_move(grid1, grid2, current_player, current_die, time_budget_ms)
    }
}

// ============================================================================
// Neural Network-Guided MCTS
// ============================================================================

/// Expand a node using neural network policy priors
fn mcts_expand_with_nn(node: &mut MCTSNode, state: &GameState, network: &PolicyValueNetwork) {
    if state.phase == GamePhase::Ended {
        return;
    }
    
    let legal_columns = get_legal_columns(state);
    if legal_columns.is_empty() {
        return;
    }
    
    // Get policy priors from network
    let policy_probs = network.get_policy_for_legal(state, &legal_columns);
    
    for (col, prior) in policy_probs {
        if !node.children.contains_key(&col) {
            let next_player = match state.current_player {
                Player::Player1 => Player::Player2,
                Player::Player2 => Player::Player1,
            };
            node.children.insert(col, MCTSNode::new(prior, next_player));
        }
    }
}

/// Run one MCTS iteration with neural network guidance
fn mcts_iterate_with_nn(
    node: &mut MCTSNode,
    state: &GameState,
    root_player: Player,
    network: &PolicyValueNetwork,
) -> f64 {
    node.visits += 1;
    
    // Terminal state
    if state.phase == GamePhase::Ended {
        let value = evaluate_normalized(state, root_player);
        node.is_terminal = true;
        node.terminal_value = value;
        node.total_value += value;
        return value;
    }
    
    // Handle chance nodes (rolling phase) - sample a die
    if state.phase == GamePhase::Rolling {
        let die_value = (js_sys::Math::random() * 6.0) as u8 + 1;
        let rolled_state = roll_die(state, die_value);
        let value = mcts_iterate_with_nn(node, &rolled_state, root_player, network);
        node.total_value += value;
        return value;
    }
    
    // Expand if not expanded
    if node.children.is_empty() {
        mcts_expand_with_nn(node, state, network);
        
        if node.children.is_empty() {
            let value = network.get_value(state);
            // Convert to root player's perspective
            let adjusted_value = if state.current_player == root_player {
                value
            } else {
                -value
            };
            node.total_value += adjusted_value;
            return adjusted_value;
        }
        
        // Use network value instead of rollout
        let value = network.get_value(state);
        let adjusted_value = if state.current_player == root_player {
            value
        } else {
            -value
        };
        
        // Still need to propagate to children
        if let Some(action) = node.select_child() {
            if let Some(child) = node.children.get_mut(&action) {
                child.visits += 1;
                child.total_value += adjusted_value;
            }
        }
        
        node.total_value += adjusted_value;
        return adjusted_value;
    }
    
    // Selection - pick best child via PUCT
    if let Some(action) = node.select_child() {
        if let Some(new_state) = apply_move(state, action) {
            if let Some(child) = node.children.get_mut(&action) {
                let value = mcts_iterate_with_nn(child, &new_state, root_player, network);
                node.total_value += value;
                return value;
            }
        }
    }
    
    // Fallback
    let value = network.get_value(state);
    let adjusted_value = if state.current_player == root_player {
        value
    } else {
        -value
    };
    node.total_value += adjusted_value;
    adjusted_value
}

/// Run neural network-guided MCTS search
fn mcts_search_with_nn(
    state: &GameState, 
    time_budget_ms: f64,
    network: &PolicyValueNetwork,
) -> Option<usize> {
    if state.phase != GamePhase::Placing || state.current_die.is_none() {
        return None;
    }
    
    let player = state.current_player;
    let legal_columns = get_legal_columns(state);
    
    if legal_columns.is_empty() {
        return None;
    }
    
    if legal_columns.len() == 1 {
        return Some(legal_columns[0]);
    }
    
    let mut ctx = MCTSContext::new(player, time_budget_ms);
    
    // Expand root with network priors
    mcts_expand_with_nn(&mut ctx.root, state, network);
    
    // Run simulations
    while !ctx.should_stop() {
        mcts_iterate_with_nn(&mut ctx.root, state, player, network);
        ctx.simulations += 1;
    }
    
    ctx.root.best_action_by_visits()
}

/// Hybrid AI Engine that combines MCTS with neural network
#[wasm_bindgen]
pub struct HybridAIEngine {
    network: PolicyValueNetwork,
}

#[wasm_bindgen]
impl HybridAIEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        HybridAIEngine {
            network: PolicyValueNetwork::new(),
        }
    }
    
    /// Load weights into the neural network
    #[wasm_bindgen]
    pub fn load_weights(&mut self, weights: &[f64]) -> bool {
        self.network.load_weights(weights)
    }
    
    /// Check if the network is initialized
    #[wasm_bindgen]
    pub fn is_network_initialized(&self) -> bool {
        self.network.is_initialized()
    }
    
    /// Get the weight count for the network
    #[wasm_bindgen]
    pub fn get_weight_count(&self) -> usize {
        self.network.get_weight_count()
    }
    
    /// Get the best move using neural network-guided MCTS
    #[wasm_bindgen]
    pub fn get_move(
        &self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
        time_budget_ms: f64,
    ) -> i32 {
        let mut state = GameState {
            grid1: Grid { data: [0; 9] },
            grid2: Grid { data: [0; 9] },
            current_player: if current_player == 0 { Player::Player1 } else { Player::Player2 },
            current_die: if current_die == 0 { None } else { Some(current_die) },
            phase: if current_die == 0 { GamePhase::Rolling } else { GamePhase::Placing },
            turn_number: 1,
        };
        
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
        for i in len2..9 {
            state.grid2.data[i] = 0;
        }
        
        if state.phase != GamePhase::Placing || state.current_die.is_none() {
            return -1;
        }
        
        match mcts_search_with_nn(&state, time_budget_ms, &self.network) {
            Some(col) => col as i32,
            None => -1,
        }
    }
    
    /// Get policy and value outputs for a state (for debugging/analysis)
    #[wasm_bindgen]
    pub fn get_policy_value(
        &self,
        grid1: &[u8],
        grid2: &[u8],
        current_player: u8,
        current_die: u8,
    ) -> Vec<f64> {
        let mut state = GameState {
            grid1: Grid { data: [0; 9] },
            grid2: Grid { data: [0; 9] },
            current_player: if current_player == 0 { Player::Player1 } else { Player::Player2 },
            current_die: if current_die == 0 { None } else { Some(current_die) },
            phase: if current_die == 0 { GamePhase::Rolling } else { GamePhase::Placing },
            turn_number: 1,
        };
        
        let len1 = grid1.len().min(9);
        for i in 0..len1 {
            state.grid1.data[i] = grid1[i];
        }
        for i in len1..9 {
            state.grid1.data[i] = 0;
        }
        let len2 = grid2.len().min(9);
        for i in 0..len2 {
            state.grid2.data[i] = grid2[i];
        }
        for i in len2..9 {
            state.grid2.data[i] = 0;
        }
        
        let (policy, value) = self.network.forward(&state);
        
        // Return [policy[0], policy[1], policy[2], value]
        vec![policy[0], policy[1], policy[2], value]
    }
}
