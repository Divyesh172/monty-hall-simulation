/* tslint:disable */
/* eslint-disable */

export class MontyHallEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Length of the convergence vectors
     */
    get_convergence_len(): number;
    /**
     * Pointer to stay strategy convergence f32 buffer in Wasm linear memory
     */
    get_stay_convergence_ptr(): number;
    /**
     * Pointer to switch strategy convergence f32 buffer in Wasm linear memory
     */
    get_switch_convergence_ptr(): number;
    constructor(seed: bigint, max_points: number);
    /**
     * Plays a single interactive round step
     */
    play_round(num_doors: number, player_pick: number, host_mode_code: number): any;
    /**
     * Reset RNG and cleared buffers
     */
    reset(seed: bigint): void;
    /**
     * Executes high-speed Monte Carlo batch simulation
     */
    run_batch(trials: number, num_doors: number, host_mode_code: number, sample_interval: number): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_montyhallengine_free: (a: number, b: number) => void;
    readonly montyhallengine_get_convergence_len: (a: number) => number;
    readonly montyhallengine_get_stay_convergence_ptr: (a: number) => number;
    readonly montyhallengine_get_switch_convergence_ptr: (a: number) => number;
    readonly montyhallengine_new: (a: bigint, b: number) => number;
    readonly montyhallengine_play_round: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly montyhallengine_reset: (a: number, b: bigint) => void;
    readonly montyhallengine_run_batch: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
