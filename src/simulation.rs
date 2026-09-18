use rand_core::{RngCore, SeedableRng};
use rand_xoshiro::Xoshiro256PlusPlus;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HostMode {
    StandardMonty = 0, // Host knows where the car is, always reveals a goat
    MontyFall = 1,     // Host is uninformed, opens a door randomly (may reveal car)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub total_trials: u32,
    pub valid_trials: u32,
    pub stay_wins: u32,
    pub switch_wins: u32,
    pub stay_win_rate: f32,
    pub switch_win_rate: f32,
    pub car_revealed_by_host: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveRound {
    pub car_door: u32,
    pub player_pick: u32,
    pub host_revealed: u32,
    pub alternate_door: u32,
    pub host_revealed_car: bool, // True only in Monty Fall if host slipped
    pub stay_wins: bool,
    pub switch_wins: bool,
}

pub struct SimulationRunner {
    pub rng: Xoshiro256PlusPlus,
    pub stay_convergence: Vec<f32>,
    pub switch_convergence: Vec<f32>,
    max_points: usize,
}

impl SimulationRunner {
    pub fn new(seed: u64, max_points: usize) -> Self {
        Self {
            rng: Xoshiro256PlusPlus::seed_from_u64(seed),
            stay_convergence: Vec::with_capacity(max_points),
            switch_convergence: Vec::with_capacity(max_points),
            max_points,
        }
    }

    pub fn reset(&mut self, seed: u64) {
        self.rng = Xoshiro256PlusPlus::seed_from_u64(seed);
        self.stay_convergence.clear();
        self.switch_convergence.clear();
    }

    /// Single interactive game round logic
    pub fn play_round(&mut self, num_doors: u32, player_pick: u32, host_mode: HostMode) -> InteractiveRound {
        let num_doors = num_doors.max(3);
        let player_pick = player_pick % num_doors;
        let car_door = self.rng.next_u32() % num_doors;

        let mut host_revealed_car = false;
        let host_revealed = match host_mode {
            HostMode::StandardMonty => {
                // Host picks an unchosen door that is NOT the car
                let mut candidates = Vec::with_capacity(num_doors as usize);
                for d in 0..num_doors {
                    if d != player_pick && d != car_door {
                        candidates.push(d);
                    }
                }
                let idx = (self.rng.next_u32() as usize) % candidates.len();
                candidates[idx]
            }
            HostMode::MontyFall => {
                // Host picks any unchosen door at random
                let mut candidates = Vec::with_capacity(num_doors as usize);
                for d in 0..num_doors {
                    if d != player_pick {
                        candidates.push(d);
                    }
                }
                let idx = (self.rng.next_u32() as usize) % candidates.len();
                let chosen = candidates[idx];
                if chosen == car_door {
                    host_revealed_car = true;
                }
                chosen
            }
        };

        // Alternate door available for switching:
        // If 3 doors: exactly one remaining door
        // If N > 3: if car is among unopened doors, host leaves it; pick unopened candidate
        let alternate_door = if num_doors == 3 {
            3 - player_pick - host_revealed
        } else {
            // For N-door generalization (10 or 100 doors):
            // If car is not player pick, host reveals N-2 goats leaving the car!
            // If car is player pick, host reveals N-2 goats leaving a random goat.
            if car_door != player_pick {
                car_door
            } else {
                let mut candidates = Vec::new();
                for d in 0..num_doors {
                    if d != player_pick && d != host_revealed {
                        candidates.push(d);
                    }
                }
                let idx = (self.rng.next_u32() as usize) % candidates.len();
                candidates[idx]
            }
        };

        let stay_wins = player_pick == car_door;
        let switch_wins = alternate_door == car_door;

        InteractiveRound {
            car_door,
            player_pick,
            host_revealed,
            alternate_door,
            host_revealed_car,
            stay_wins,
            switch_wins,
        }
    }

    /// Fast Monte Carlo batch simulation
    pub fn run_batch(
        &mut self,
        trials: u32,
        num_doors: u32,
        host_mode: HostMode,
        sample_interval: u32,
    ) -> BatchResult {
        self.stay_convergence.clear();
        self.switch_convergence.clear();

        let num_doors = num_doors.max(3);
        let sample_interval = sample_interval.max(1);

        let mut stay_wins = 0u32;
        let mut switch_wins = 0u32;
        let mut valid_trials = 0u32;
        let mut car_revealed_by_host = 0u32;

        for t in 1..=trials {
            let car_door = self.rng.next_u32() % num_doors;
            let player_pick = self.rng.next_u32() % num_doors;

            let host_opened = match host_mode {
                HostMode::StandardMonty => {
                    let mut candidates = Vec::with_capacity(num_doors as usize);
                    for d in 0..num_doors {
                        if d != player_pick && d != car_door {
                            candidates.push(d);
                        }
                    }
                    let idx = (self.rng.next_u32() as usize) % candidates.len();
                    candidates[idx]
                }
                HostMode::MontyFall => {
                    let mut candidates = Vec::with_capacity(num_doors as usize);
                    for d in 0..num_doors {
                        if d != player_pick {
                            candidates.push(d);
                        }
                    }
                    let idx = (self.rng.next_u32() as usize) % candidates.len();
                    let picked = candidates[idx];
                    if picked == car_door {
                        car_revealed_by_host += 1;
                        continue; // Invalid round under Monty Fall condition
                    }
                    picked
                }
            };

            valid_trials += 1;
            if player_pick == car_door {
                stay_wins += 1;
            }

            // In switching strategy:
            let switch_pick = if num_doors == 3 {
                3 - player_pick - host_opened
            } else {
                // In N-doors game where host reveals N-2 goats leaving only 1 other door:
                if car_door != player_pick {
                    car_door
                } else {
                    let mut candidates = Vec::new();
                    for d in 0..num_doors {
                        if d != player_pick && d != host_opened {
                            candidates.push(d);
                        }
                    }
                    candidates[(self.rng.next_u32() as usize) % candidates.len()]
                }
            };

            if switch_pick == car_door {
                switch_wins += 1;
            }

            // Capture point for live convergence curve
            if t % sample_interval == 0 || t == trials {
                if valid_trials > 0 && self.stay_convergence.len() < self.max_points {
                    self.stay_convergence.push(stay_wins as f32 / valid_trials as f32);
                    self.switch_convergence.push(switch_wins as f32 / valid_trials as f32);
                }
            }
        }

        let stay_win_rate = if valid_trials > 0 {
            stay_wins as f32 / valid_trials as f32
        } else {
            0.0
        };
        let switch_win_rate = if valid_trials > 0 {
            switch_wins as f32 / valid_trials as f32
        } else {
            0.0
        };

        BatchResult {
            total_trials: trials,
            valid_trials,
            stay_wins,
            switch_wins,
            stay_win_rate,
            switch_win_rate,
            car_revealed_by_host,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_standard_3_doors_convergence() {
        let mut runner = SimulationRunner::new(42, 1000);
        let result = runner.run_batch(500_000, 3, HostMode::StandardMonty, 1000);
        
        // Theoretical: Stay = 1/3 (~0.3333), Switch = 2/3 (~0.6667)
        assert!((result.stay_win_rate - (1.0 / 3.0)).abs() < 0.003, "Stay rate should be ~0.333, got {}", result.stay_win_rate);
        assert!((result.switch_win_rate - (2.0 / 3.0)).abs() < 0.003, "Switch rate should be ~0.667, got {}", result.switch_win_rate);
    }

    #[test]
    fn test_monty_fall_50_50_convergence() {
        let mut runner = SimulationRunner::new(1337, 1000);
        let result = runner.run_batch(500_000, 3, HostMode::MontyFall, 1000);
        
        // When host does not know and reveals goat by pure luck, P(Win|Goat revealed) = 50%
        assert!((result.stay_win_rate - 0.50).abs() < 0.005, "Monty Fall stay rate should be ~0.50, got {}", result.stay_win_rate);
        assert!((result.switch_win_rate - 0.50).abs() < 0.005, "Monty Fall switch rate should be ~0.50, got {}", result.switch_win_rate);
    }

    #[test]
    fn test_100_doors_convergence() {
        let mut runner = SimulationRunner::new(999, 1000);
        let result = runner.run_batch(100_000, 100, HostMode::StandardMonty, 100);
        
        // For 100 doors where host reveals 98 goats:
        // Stay = 1/100 (1%), Switch = 99/100 (99%)
        assert!((result.stay_win_rate - 0.01).abs() < 0.002, "100-door stay rate should be ~0.01, got {}", result.stay_win_rate);
        assert!((result.switch_win_rate - 0.99).abs() < 0.002, "100-door switch rate should be ~0.99, got {}", result.switch_win_rate);
    }
}
