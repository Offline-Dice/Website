
function changeRollCounter(delta) {
  const value = document.getElementById('rollCounterValue');
  if (!value) return;
  let current = parseInt(String(value.textContent || '0').replace(/[^0-9-]/g, ''), 10);
  if (Number.isNaN(current)) current = 0;
  current += Number(delta) || 0;
  value.textContent = current >= 0 ? '+' + current : String(current);
  try { localStorage.setItem('offlineDiceRollCounter', String(current)); } catch (e) {}
}

(function restoreRollCounter() {
  const value = document.getElementById('rollCounterValue');
  if (!value) return;
  try {
    const saved = localStorage.getItem('offlineDiceRollCounter');
    if (saved !== null && saved !== '' && Number.isFinite(Number(saved))) {
      const current = Number(saved);
      value.textContent = current >= 0 ? '+' + current : String(current);
    }
  } catch (e) {}
})();
