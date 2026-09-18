import init, { MontyHallEngine } from './pkg/monty_hall_simulation.js';
import { SimulationCharts } from './chart.js';
import { sound } from './sound.js';
import { renderTeacherQuestions, exportSessionCSV } from './pedagogy.js';

let wasmInstance = null;
let engine = null;
let charts = null;

// Persistent Session Telemetry
const sessionStats = {
  total: 0,
  stayWins: 0,
  switchWins: 0
};

// Game Show Stage State
const STAGE_STATE = {
  PICK: 0,
  REVEALED: 1,
  DECIDED: 2,
  RESULT: 3
};

let currentStage = STAGE_STATE.PICK;
let selectedDoor = null;
let currentRoundData = null;

// -----------------------------------------------------------------------------
// APP INITIALIZATION
// -----------------------------------------------------------------------------
async function initApp() {
  try {
    // 1. Initialize Wasm Engine
    wasmInstance = await init();
    engine = new MontyHallEngine(BigInt(Date.now()), 2000);
    console.log('Rust Monty Hall Wasm Engine initialized');

    // 2. Initialize Charts
    charts = new SimulationCharts('convCanvas', 'barCanvas');

    // 3. Render Inquiries
    renderTeacherQuestions('inquiryContainer');

    // 4. Setup Router & Event Listeners
    setupRouter();
    setupStageGame();
    setupLabControls();
    setupIntuitionScaler();
    setupGlobalActions();

    // 5. Default Simulation Data for the Laboratory
    runLaboratoryBatch(1000, 0);

  } catch (err) {
    console.error('Error initializing application:', err);
  }
}

// -----------------------------------------------------------------------------
// CLIENT-SIDE HASH ROUTER
// -----------------------------------------------------------------------------
const ROUTES = {
  '#/': { viewId: 'view-hub', title: 'Exhibit Rotunda' },
  '#/game-show': { viewId: 'view-game-show', title: 'The Game Show' },
  '#/laboratory': { viewId: 'view-laboratory', title: 'The Laboratory' },
  '#/intuition': { viewId: 'view-intuition', title: 'The Intuition Workshop' },
  '#/educator': { viewId: 'view-educator', title: "The Educator's Deck" }
};

function setupRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  // Initial route
  if (!window.location.hash || !ROUTES[window.location.hash]) {
    window.location.hash = '#/';
  } else {
    handleRouteChange();
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // Esc or H: Return to Hub
    if (e.key === 'Escape' || (e.key.toLowerCase() === 'h' && document.activeElement.tagName !== 'INPUT')) {
      window.location.hash = '#/';
      sound.playKnock();
    }
    // 1, 2, 3 in Game Show
    if (window.location.hash === '#/game-show' && (e.key === '1' || e.key === '2' || e.key === '3')) {
      handleStageDoorClick(parseInt(e.key, 10) - 1);
    }
  });
}

function handleRouteChange() {
  const hash = window.location.hash || '#/';
  const route = ROUTES[hash] || ROUTES['#/'];

  // Toggle page views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  const activeView = document.getElementById(route.viewId);
  if (activeView) {
    activeView.classList.add('active');
  }

  // Update Breadcrumb Label
  const breadcrumbEl = document.getElementById('breadcrumbCurrent');
  if (breadcrumbEl) {
    breadcrumbEl.innerText = route.title;
  }

  // Refresh charts when entering the laboratory
  if (route.viewId === 'view-laboratory' && charts) {
    setTimeout(() => charts.refreshSize(), 40);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// MODULE 1: THE GAME SHOW
// -----------------------------------------------------------------------------
function setupStageGame() {
  const doorItems = document.querySelectorAll('.stage-door-item');
  const btnStay = document.getElementById('btnStayStage');
  const btnSwitch = document.getElementById('btnSwitchStage');
  const btnNext = document.getElementById('btnNextRoundStage');

  doorItems.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-door'), 10);
      handleStageDoorClick(idx);
    });
  });

  btnStay.addEventListener('click', () => {
    handleStageDecision(false);
  });

  btnSwitch.addEventListener('click', () => {
    handleStageDecision(true);
  });

  btnNext.addEventListener('click', () => {
    resetStageRound();
  });
}

function handleStageDoorClick(doorIndex) {
  if (currentStage !== STAGE_STATE.PICK) return;
  sound.playKnock();
  sound.playSuspenseSwell(0.85); // Dramatic drumroll & rising tension swell!

  selectedDoor = doorIndex;
  currentStage = STAGE_STATE.REVEALED;

  // Highlight player's pick
  const doorItems = document.querySelectorAll('.stage-door-item');
  doorItems[doorIndex].classList.add('selected');
  const badge = document.getElementById(`stageBadge${doorIndex}`);
  badge.innerText = 'YOUR PICK';
  badge.style.background = 'var(--color-amber)';
  badge.style.color = '#000';

  // Request round from Rust Wasm
  currentRoundData = engine.play_round(3, doorIndex, 0);

  // Host opens goat door right at the climax of the drumroll
  setTimeout(() => {
    revealHostGoatDoor(currentRoundData.host_revealed);
  }, 650);
}

function revealHostGoatDoor(hostDoor) {
  sound.playDoorOpen();
  setTimeout(() => {
    sound.playGoatBleat(); // Realistic synthesized goat bleat!
    sound.startDecisionTicker(); // Ticking tension clock begins
  }, 120);

  const hostLeaf = document.getElementById(`stageLeaf${hostDoor}`);
  if (hostLeaf) hostLeaf.classList.add('open');

  const alcove = document.getElementById(`stageAlcove${hostDoor}`);
  if (alcove) {
    alcove.className = 'door-alcove';
    alcove.innerHTML = `
      <div class="prize-spotlight">
        <span class="prize-emoji">🐐</span>
        <span class="prize-name">Goat</span>
      </div>
    `;
  }

  const hostBadge = document.getElementById(`stageBadge${hostDoor}`);
  hostBadge.innerText = 'MONTY REVEALED (GOAT)';
  hostBadge.style.background = '#EF4444';
  hostBadge.style.color = '#fff';

  // Mark alternate door
  const altDoor = currentRoundData.alternate_door;
  document.querySelector(`.stage-door-item[data-door="${altDoor}"]`).classList.add('alternate');
  const altBadge = document.getElementById(`stageBadge${altDoor}`);
  altBadge.innerText = 'SWITCH TARGET';
  altBadge.style.background = 'var(--color-sage)';
  altBadge.style.color = '#fff';

  // Monty Speech
  document.getElementById('montyMessage').innerHTML = `
    "I've opened <strong>Door ${hostDoor + 1}</strong> to show you a Goat!<br>
    Now, the pivotal question: Do you want to <strong>KEEP</strong> Door ${selectedDoor + 1}, or <strong>SWITCH</strong> to Door ${altDoor + 1}?"
  `;

  document.getElementById('stayDoorText').innerText = `Door ${selectedDoor + 1}`;
  document.getElementById('switchDoorText').innerText = `Door ${altDoor + 1}`;

  document.getElementById('dockChoices').style.display = 'flex';
  currentStage = STAGE_STATE.DECIDED;
}

function handleStageDecision(switched) {
  if (currentStage !== STAGE_STATE.DECIDED) return;
  currentStage = STAGE_STATE.RESULT;

  sound.stopDecisionTicker(); // Stop tension clock
  sound.playDoorOpen();

  const finalDoor = switched ? currentRoundData.alternate_door : selectedDoor;
  const won = finalDoor === currentRoundData.car_door;

  // Populate alcoves and swing remaining door leaves open on hinges
  for (let i = 0; i < 3; i++) {
    const alcove = document.getElementById(`stageAlcove${i}`);
    if (i === currentRoundData.car_door) {
      if (alcove) {
        alcove.className = 'door-alcove win';
        alcove.innerHTML = `
          <div class="prize-spotlight">
            <span class="prize-emoji">🚗</span>
            <span class="prize-name" style="color: var(--color-amber-dark);">Sports Car!</span>
          </div>
        `;
      }
    } else {
      if (alcove) {
        alcove.className = 'door-alcove';
        alcove.innerHTML = `
          <div class="prize-spotlight">
            <span class="prize-emoji">🐐</span>
            <span class="prize-name">Goat</span>
          </div>
        `;
      }
    }

    // Stagger opening for smooth dramatic effect
    setTimeout(() => {
      const leaf = document.getElementById(`stageLeaf${i}`);
      if (leaf) leaf.classList.add('open');
    }, i * 80);
  }

  // Outcome Badge
  const finalBadge = document.getElementById(`stageBadge${finalDoor}`);
  finalBadge.innerText = won ? 'WINNER! 🎉' : 'GOAT 🐐';
  finalBadge.style.background = won ? 'var(--color-sage)' : '#EF4444';
  finalBadge.style.color = '#fff';

  // Audio & Host reaction
  if (won) {
    sound.playVictoryFanfare(); // Full game-show brass fanfare & chimes!
    document.getElementById('montyMessage').innerHTML = `
      🎉 <strong>SPECTACULAR!</strong> You ${switched ? 'SWITCHED' : 'KEPT YOUR DOOR'} and won the brand-new Sports Car!
    `;
  } else {
    sound.playSadTrombone(); // Comical wah-wah-wah-waaah!
    document.getElementById('montyMessage').innerHTML = `
      🐐 <strong>Baah!</strong> You ${switched ? 'SWITCHED' : 'KEPT YOUR DOOR'} and found a goat. The car was behind Door ${currentRoundData.car_door + 1}.
    `;
  }

  // Update session stats
  sessionStats.total += 1;
  if (currentRoundData.stay_wins) sessionStats.stayWins += 1;
  if (currentRoundData.switch_wins) sessionStats.switchWins += 1;
  updateTelemetryUI();

  document.getElementById('dockChoices').style.display = 'none';
  document.getElementById('dockNext').style.display = 'block';
}

function resetStageRound() {
  sound.stopDecisionTicker();
  sound.playKnock();
  currentStage = STAGE_STATE.PICK;
  selectedDoor = null;
  currentRoundData = null;

  document.querySelectorAll('.stage-door-item').forEach(el => {
    el.classList.remove('selected', 'alternate');
  });

  document.querySelectorAll('.door-leaf').forEach(leaf => {
    leaf.classList.remove('open');
  });

  for (let i = 0; i < 3; i++) {
    const b = document.getElementById(`stageBadge${i}`);
    b.innerText = '';
    b.style.background = 'transparent';
  }

  document.getElementById('montyMessage').innerHTML =
    '"Choose a door! Behind one is the <strong>Sports Car</strong>, behind two are <strong>Goats</strong>."';
  document.getElementById('dockChoices').style.display = 'none';
  document.getElementById('dockNext').style.display = 'none';
}

// -----------------------------------------------------------------------------
// MODULE 2: THE LABORATORY
// -----------------------------------------------------------------------------
function setupLabControls() {
  const gearBtns = document.querySelectorAll('.gear-btn');
  const customInput = document.getElementById('labCustomTrials');
  const hostSelect = document.getElementById('labHostMode');
  const btnRun = document.getElementById('btnLabRun');

  gearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playKnock();
      gearBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customInput.value = btn.getAttribute('data-trials');
    });
  });

  btnRun.addEventListener('click', () => {
    sound.playKnock();
    const trials = parseInt(customInput.value, 10) || 1000;
    const hostMode = parseInt(hostSelect.value, 10) || 0;
    runLaboratoryBatch(trials, hostMode);
  });
}

function runLaboratoryBatch(trials, hostMode) {
  if (!engine || !wasmInstance) return;

  const sampleInterval = Math.max(1, Math.floor(trials / 350));
  const res = engine.run_batch(trials, 3, hostMode, sampleInterval);

  // --- ZERO-COPY EXTRACTION OVER WASM LINEAR MEMORY ---
  const memBuffer = wasmInstance.memory.buffer;
  const len = engine.get_convergence_len();
  const stayPtr = engine.get_stay_convergence_ptr();
  const switchPtr = engine.get_switch_convergence_ptr();

  const stayArray = new Float32Array(memBuffer, stayPtr, len);
  const switchArray = new Float32Array(memBuffer, switchPtr, len);

  // Render Charts
  charts.drawBars(res);
  charts.drawConvergence(stayArray, switchArray, trials);
}

// -----------------------------------------------------------------------------
// MODULE 3: THE INTUITION WORKSHOP
// -----------------------------------------------------------------------------
function setupIntuitionScaler() {
  const slider = document.getElementById('scalerRange');
  const label = document.getElementById('scalerDoorsLabel');
  const stayVal = document.getElementById('scalerStayPct');
  const goatsVal = document.getElementById('scalerGoatsOut');
  const switchVal = document.getElementById('scalerSwitchPct');

  slider.addEventListener('input', () => {
    const n = parseInt(slider.value, 10);
    label.innerText = `${n} Doors`;

    const stayPct = ((1 / n) * 100).toFixed(1);
    const switchPct = (((n - 1) / n) * 100).toFixed(1);

    stayVal.innerText = `1 / ${n} (${stayPct}%)`;
    goatsVal.innerText = `${n - 2} Goats`;
    switchVal.innerText = `${n - 1} / ${n} (${switchPct}%)`;
  });
}

// -----------------------------------------------------------------------------
// GLOBAL ACTIONS & TELEMETRY
// -----------------------------------------------------------------------------
function setupGlobalActions() {
  const btnMusic = document.getElementById('btnMusicToggle');
  const musicIcon = document.getElementById('musicIcon');
  const btnSound = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const btnReset = document.getElementById('btnResetSession');
  const btnExport = document.getElementById('btnExportCSV');

  // Start BGM on first user interaction (browser autoplay compliance)
  window.addEventListener('pointerdown', () => {
    sound.startBGM();
  }, { once: true });

  if (btnMusic) {
    btnMusic.addEventListener('click', () => {
      const isEnabled = sound.toggleBGM();
      musicIcon.innerText = isEnabled ? '🎵' : '🔇';
    });
  }

  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      soundIcon.innerText = isMuted ? '🔇' : '🔊';
      if (musicIcon) {
        musicIcon.innerText = isMuted ? '🔇' : (sound.bgmEnabled ? '🎵' : '🔇');
      }
    });
  }

  btnReset.addEventListener('click', () => {
    sound.playKnock();
    sessionStats.total = 0;
    sessionStats.stayWins = 0;
    sessionStats.switchWins = 0;
    updateTelemetryUI();
    resetStageRound();
    if (engine) {
      engine.reset(BigInt(Date.now()));
    }
  });

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      sound.playKnock();
      exportSessionCSV(sessionStats);
    });
  }
}

function updateTelemetryUI() {
  document.getElementById('navTotalPlays').innerText = sessionStats.total;
  document.getElementById('navSwitchWins').innerText = sessionStats.switchWins;
  document.getElementById('navStayWins').innerText = sessionStats.stayWins;

  const hubBadge = document.getElementById('hubGameBadge');
  if (hubBadge) {
    const switchPct = sessionStats.total > 0 ? ((sessionStats.switchWins / sessionStats.total) * 100).toFixed(0) : '0';
    hubBadge.innerText = `${sessionStats.total} played (${switchPct}% switch win)`;
  }
}

// Start
window.addEventListener('DOMContentLoaded', initApp);
