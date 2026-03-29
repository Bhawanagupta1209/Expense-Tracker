let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let pieChart = null;
let barChart = null;

window.onload = function () {
  renderAll();
};

// Filter by month and search
function getFilteredTransactions() {
  const monthFilter = document.getElementById('month-filter').value;
  const search = document.getElementById('search-bar').value.toLowerCase().trim();

  return transactions.filter(t => {
    const date = new Date(t.date || t.id);
    const matchesMonth = monthFilter === 'all' || date.getMonth() === parseInt(monthFilter);
    const matchesSearch = t.desc.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
    return matchesMonth && matchesSearch;
  });
}

// Add transaction
function addTransaction() {
  const desc     = document.getElementById('desc').value.trim();
  const amount   = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const type     = document.getElementById('type').value;

  if (!desc || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid description and amount!');
    return;
  }

  const transaction = {
    id: Date.now(),
    desc,
    amount,
    category,
    type,
    date: new Date().toISOString()
  };

  transactions.push(transaction);
  saveToLocalStorage();
  renderAll();

  document.getElementById('desc').value   = '';
  document.getElementById('amount').value = '';
}

// Delete transaction
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  renderAll();
}

function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function renderAll() {
  renderSummary();
  renderList();
  renderCharts();
  updateGoal();
}

// Summary cards
function renderSummary() {
  const filtered = getFilteredTransactions();

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  document.getElementById('total-income').textContent  = '₹' + totalIncome.toLocaleString();
  document.getElementById('total-expense').textContent = '₹' + totalExpense.toLocaleString();

  const balanceEl = document.getElementById('balance');
  balanceEl.textContent  = '₹' + balance.toLocaleString();
  balanceEl.style.color  = balance >= 0 ? '#a78bfa' : '#f07fa8';
}

// Transaction list
function renderList() {
  const list     = document.getElementById('transaction-list');
  const filtered = getFilteredTransactions();
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:#c4a0bc; text-align:center; padding:20px;">No transactions found!</p>';
    return;
  }

  [...filtered].reverse().forEach(t => {
    const date = new Date(t.date || t.id);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const li = document.createElement('li');
    li.className = t.type;
    li.innerHTML = `
      <div class="tx-left">
        <span class="tx-desc">${t.desc}</span>
        <span class="tx-cat">${t.category} · ${dateStr}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString()}</span>
        <button class="tx-delete" onclick="deleteTransaction(${t.id})">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
}

// Charts
function renderCharts() {
  renderPieChart();
  renderBarChart();
}

function renderPieChart() {
  const expenses = getFilteredTransactions().filter(t => t.type === 'expense');
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data   = Object.values(categoryTotals);
  const pastelColors = ['#fda4c8','#86efac','#c4b5fd','#fde68a','#a5f3fc','#fca5a5','#d9f99d','#f9a8d4'];

  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  if (labels.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '14px Segoe UI';
    ctx.fillStyle = '#c4a0bc';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses yet!', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: pastelColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#b89ab8', font: { size: 12, family: 'Segoe UI' }, padding: 12 }
        }
      },
      cutout: '65%'
    }
  });
}

function renderBarChart() {
  const filtered     = getFilteredTransactions();
  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const ctx = document.getElementById('barChart').getContext('2d');
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ['#86efac', '#fda4c8'],
        borderRadius: 12,
        borderSkipped: false,
        barThickness: 60
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid:  { color: '#fce4ef' },
          ticks: { color: '#c4a0bc', font: { family: 'Segoe UI' } }
        },
        x: {
          grid:  { display: false },
          ticks: { color: '#b89ab8', font: { size: 13, family: 'Segoe UI' } }
        }
      }
    }
  });
}

// Budget goal + progress bar
function updateGoal() {
  const goalInput  = document.getElementById('budget-goal');
  const goal       = parseFloat(goalInput.value);
  const bar        = document.getElementById('progress-bar');
  const label      = document.getElementById('goal-label');
  const status     = document.getElementById('goal-status');
  const filtered   = getFilteredTransactions();
  const totalSpent = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (!goal || isNaN(goal) || goal <= 0) {
    bar.style.width      = '0%';
    bar.style.background = 'linear-gradient(90deg, #f7a8c8, #d98bbf)';
    label.textContent    = 'Set a budget goal above';
    status.textContent   = '';
    return;
  }

  const percent = Math.min((totalSpent / goal) * 100, 100);
  bar.style.width = percent + '%';

  if (percent >= 100) {
    bar.style.background = 'linear-gradient(90deg, #f07fa8, #e05577)';
    status.textContent   = '🚨 Over budget!';
    status.style.color   = '#f07fa8';
    label.textContent    = `₹${totalSpent.toLocaleString()} spent of ₹${goal.toLocaleString()} — over by ₹${(totalSpent - goal).toLocaleString()}`;
  } else if (percent >= 80) {
    bar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    status.textContent   = '⚠️ Almost there!';
    status.style.color   = '#f59e0b';
    label.textContent    = `₹${totalSpent.toLocaleString()} spent of ₹${goal.toLocaleString()} (${Math.round(percent)}%)`;
  } else {
    bar.style.background = 'linear-gradient(90deg, #f7a8c8, #d98bbf)';
    status.textContent   = '✅ On track!';
    status.style.color   = '#6dbf8a';
    label.textContent    = `₹${totalSpent.toLocaleString()} spent of ₹${goal.toLocaleString()} (${Math.round(percent)}%)`;
  }
}