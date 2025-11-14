const $ = (q) => document.querySelector(q);
const apiBase = ''; // mismo host del server (sirviendo /public)

const form = $('#searchForm');
const inputError = $('#errorCode');
const inputStart = $('#start');
const inputEnd = $('#end');
const tblBody = $('#results tbody');
const totalEl = $('#total');
const btnExport = $('#btnExport');

let lastQuery = null;
let currentRows = [];

function setDefaultDateTimes() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now);   end.setHours(23,59,0,0);

  const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  inputStart.value = toLocal(start);
  inputEnd.value = toLocal(end);
}

function renderTable(rows) {
  tblBody.innerHTML = '';
  const frag = document.createDocumentFragment();
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${r.conversationId}</td>
      <td class="nowrap">${new Date(r.conversationStart).toLocaleString()}</td>
      <td>${r.agentName || ''}</td>
      <td class="mono">${r.agentUserId || ''}</td>
      <td>${r.queueName || ''}</td>
      <td>${r.ani || ''}</td>
      <td>${r.dnis || ''}</td>
      <td>${r.disconnectType || ''}</td>
      <td class="mono">${r.errorCode || ''}</td>
    `;
    frag.appendChild(tr);
  });
  tblBody.appendChild(frag);
  totalEl.textContent = rows.length;
  btnExport.disabled = rows.length === 0;
}

async function doSearch(q) {
  lastQuery = q;
  const res = await fetch(`${apiBase}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(q)
  });
  if (!res.ok) throw new Error('Error en búsqueda');
  const json = await res.json();
  currentRows = json.rows || [];
  renderTable(currentRows);
  renderChartFromRows(currentRows);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const q = {
      errorCode: inputError.value.trim(),
      start: new Date(inputStart.value).toISOString(),
      end: new Date(inputEnd.value).toISOString()
    };
    if (!q.errorCode) { alert('Ingresa errorCode'); return; }
    if (isNaN(Date.parse(q.start)) || isNaN(Date.parse(q.end))) {
      alert('Fechas inválidas');
      return;
    }
    renderTable([]); // limpiar mientras
    await doSearch(q);
  } catch (err) {
    console.error(err);
    alert(err.message || 'Fallo la búsqueda');
  }
});

btnExport.addEventListener('click', async () => {
  if (!lastQuery) return;
  const res = await fetch(`${apiBase}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lastQuery)
  });
  if (!res.ok) { alert('No se pudo exportar'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `errores_${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

setDefaultDateTimes();
