// Pedagogical Visualizers & Educational Guides based on Maths Ideas.pdf

export const TEACHER_QUESTIONS = [
  {
    q: "Which choice do you think gives a better chance? Why?",
    context: "Ask students before showing any mathematical proofs or automated simulations.",
    insight: "Most learners intuitively assume 50/50 symmetry ('two doors left, so equal odds'). This creates the cognitive dissonance needed for deep mathematical inquiry."
  },
  {
    q: "Does your experimental result match your initial prediction?",
    context: "Ask after playing 10 manual rounds on the Stage and running 1,000 trials in the Laboratory.",
    insight: "Students observe empirical convergence: switching consistently yields ~66.7% (2/3) wins, directly shattering the 50/50 illusion."
  },
  {
    q: "Why does opening one door change the information available to us?",
    context: "Focus on the host's constraints and conditional probability.",
    insight: "Monty is not a random selector! He is an active information filter: he always avoids the car and avoids your door. When he opens a goat, the entire 2/3 probability mass of the other two doors concentrates into the single unopened door."
  },
  {
    q: "Can we represent the possible outcomes systematically?",
    context: "Guide students to construct a complete sample space truth table.",
    insight: "Breaking the 3 equally likely initial door placements into a 3-case permutation table shows that switching wins in 2 out of 3 cases."
  }
];

export function renderTeacherQuestions(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = TEACHER_QUESTIONS.map((item, idx) => `
    <div class="inquiry-item">
      <span class="inquiry-tag">Question ${idx + 1}</span>
      <h4 class="inquiry-title">${item.q}</h4>
      <p class="inquiry-context"><strong>When to ask:</strong> ${item.context}</p>
      <div class="inquiry-solution">
        <strong>Mathematical Principle:</strong> ${item.insight}
      </div>
    </div>
  `).join('');
}

export function exportSessionCSV(stats) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + "Metric,Value\n"
    + `Total Rounds Played,${stats.total}\n`
    + `Stay Wins,${stats.stayWins}\n`
    + `Switch Wins,${stats.switchWins}\n`
    + `Stay Win Rate,${stats.total > 0 ? ((stats.stayWins / stats.total) * 100).toFixed(2) : 0}%\n`
    + `Switch Win Rate,${stats.total > 0 ? ((stats.switchWins / stats.total) * 100).toFixed(2) : 0}%\n`
    + `Theoretical Stay Rate,33.33%\n`
    + `Theoretical Switch Rate,66.67%\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `monty_hall_session_data_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
