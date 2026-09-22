// Educational Discussion Questions & Export Utility

export const TEACHER_QUESTIONS = [
  {
    q: "Keep or switch: which gives higher win probability?",
    context: "Pose before running simulations.",
    insight: "Most assume 50/50. Switching actually wins 2/3 (67%) because the initial pick has only a 1/3 chance of holding the car."
  },
  {
    q: "Did simulation data match your intuition?",
    context: "Review after bulk Monte Carlo trials.",
    insight: "Empirical win rates converge to 66.7% switch and 33.3% keep over large sample sizes, breaking the 50/50 illusion."
  },
  {
    q: "Why does Monty's reveal provide information?",
    context: "Examine the host's constraints.",
    insight: "The host never reveals the car. His deliberate filter channels all remaining probability into the unopened door."
  },
  {
    q: "How does enumeration prove switching?",
    context: "Analyze the 3 car placement scenarios.",
    insight: "In 2 of 3 cases your initial pick is a goat; switching then guarantees the car. Keeping wins in only 1 of 3 cases."
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
        <strong>Insight:</strong> ${item.insight}
      </div>
    </div>
  `).join('');
}

export function exportSessionCSV(stats) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + "Metric,Value\n"
    + `Total Games Played,${stats.total}\n`
    + `Keep Wins,${stats.stayWins}\n`
    + `Switch Wins,${stats.switchWins}\n`
    + `Keep Win Rate,${stats.total > 0 ? ((stats.stayWins / stats.total) * 100).toFixed(1) : 0}%\n`
    + `Switch Win Rate,${stats.total > 0 ? ((stats.switchWins / stats.total) * 100).toFixed(1) : 0}%\n`
    + `Expected Keep Rate,33.3%\n`
    + `Expected Switch Rate,66.7%\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `monty_hall_score_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
