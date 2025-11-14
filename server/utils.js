function sanitizeCSV(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).replace(/\r/g, ' ').replace(/\n/g, ' ');
  if (s.includes(',') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach(r => {
    lines.push(headers.map(h => sanitizeCSV(r[h])).join(','));
  });
  return lines.join('\n');
}

module.exports = { sanitizeCSV, toCSV };
