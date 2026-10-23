/** All money is stored as integer paise (1 rupee = 100 paise). */

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  return (Number(paise) || 0) / 100;
}

export function roundPaise(value) {
  return Math.round(Number(value) || 0);
}

export function formatINR(paise, { withSymbol = true } = {}) {
  const rupees = paiseToRupees(paise);
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `₹${formatted}` : formatted;
}

export function parseRupeeInput(text) {
  if (text == null || text === '') return 0;
  const cleaned = String(text).replace(/[₹,\s]/g, '');
  return rupeesToPaise(cleaned);
}

export function percentOfPaise(paise, percent) {
  return roundPaise((Number(paise) || 0) * (Number(percent) || 0) / 100);
}
