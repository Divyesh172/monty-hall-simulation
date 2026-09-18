use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

pub mod simulation;
use simulation::{BatchResult, HostMode, InteractiveRound, SimulationRunner};

#[wasm_bindgen]
pub struct MontyHallEngine {
    runner: SimulationRunner,
}

#[wasm_bindgen]
impl MontyHallEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64, max_points: usize) -> Self {
        Self {
            runner: SimulationRunner::new(seed, max_points),
        }
    }

    /// Reset RNG and cleared buffers
    pub fn reset(&mut self, seed: u64) {
        self.runner.reset(seed);
    }

    /// Plays a single interactive round step
    pub fn play_round(
        &mut self,
        num_doors: u32,
        player_pick: u32,
        host_mode_code: u8,
    ) -> Result<JsValue, JsValue> {
        let host_mode = if host_mode_code == 1 {
            HostMode::MontyFall
        } else {
            HostMode::StandardMonty
        };

        let round: InteractiveRound = self.runner.play_round(num_doors, player_pick, host_mode);
        to_value(&round).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Executes high-speed Monte Carlo batch simulation
    pub fn run_batch(
        &mut self,
        trials: u32,
        num_doors: u32,
        host_mode_code: u8,
        sample_interval: u32,
    ) -> Result<JsValue, JsValue> {
        let host_mode = if host_mode_code == 1 {
            HostMode::MontyFall
        } else {
            HostMode::StandardMonty
        };

        let result: BatchResult = self
            .runner
            .run_batch(trials, num_doors, host_mode, sample_interval);
        to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // --- ZERO-COPY POINTER GETTERS FOR CANVAS RENDERING ---

    /// Pointer to stay strategy convergence f32 buffer in Wasm linear memory
    pub fn get_stay_convergence_ptr(&self) -> *const f32 {
        self.runner.stay_convergence.as_ptr()
    }

    /// Pointer to switch strategy convergence f32 buffer in Wasm linear memory
    pub fn get_switch_convergence_ptr(&self) -> *const f32 {
        self.runner.switch_convergence.as_ptr()
    }

    /// Length of the convergence vectors
    pub fn get_convergence_len(&self) -> usize {
        self.runner.stay_convergence.len()
    }
}
