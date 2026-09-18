// Educational Discussion Questions & Export Utility

export const TEACHER_QUESTIONS = [
  {
    q: "Which choice gives you a better chance of winning: Keeping your door or Switching?",
    context: "Ask this before showing any simulations or math charts.",
    insight: "Almost everyone says 50/50! We naturally think: 'There are two doors left, so each has an equal chance.' Seeing that switching actually wins 2 out of 3 times sparks genuine curiosity."
  },
  {
    q: "Did your test results match your original guess?",
    context: "Ask this after playing a few rounds on the stage and running a test in the Fast Simulator.",
    insight: "Testing hundreds of games proves that switching consistently wins around 67% of the time. Real evidence is the best way to break the 50/50 illusion."
  },
  {
    q: "Why does the host opening a door give us valuable information?",
    context: "Focus on the fact that the host knows where the car is.",
    insight: "The host is not picking at random! He always avoids the car and avoids your door. When he opens a goat, he does the hard work for you by eliminating a losing door from the other pair."
  },
  {
    q: "How can we map out every possible outcome to prove it?",
    context: "Walk through all three doors where the car could be placed.",
    insight: "In 2 out of 3 possibilities, your very first pick is a goat. In both of those cases, switching guarantees you win the car! Only in the 1 rare case where you started with the car does staying win."
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
        <strong>The Simple Explanation:</strong> ${item.insight}
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
