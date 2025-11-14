// require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { initGenesys } = require('./genesysClient');
const { queryErrors } = require('./queryErrors');
const { toCSV } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let apis = null;

// Inicialización una vez al arrancar
(async () => {
  try {
    apis = await initGenesys();
    console.log('Genesys SDK listo.');
  } catch (e) {
    console.error('Error iniciando Genesys SDK:', e);
    process.exit(1);
  }
})();

// Buscar (JSON)
app.post('/api/search', async (req, res) => {
  try {
    const { errorCode, start, end } = req.body || {};
    if (!errorCode || !start || !end) {
      return res.status(400).json({ error: 'Falta errorCode, start o end' });
    }
    const interval = `${new Date(start).toISOString()}/${new Date(end).toISOString()}`;
    const rows = await queryErrors(apis, { interval, errorCode: String(errorCode).trim() });
    res.json({ rows, total: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Error interno' });
  }
});

// Exportar CSV
app.post('/api/export', async (req, res) => {
  try {
    const { errorCode, start, end } = req.body || {};
    const interval = `${new Date(start).toISOString()}/${new Date(end).toISOString()}`;
    const rows = await queryErrors(apis, { interval, errorCode: String(errorCode).trim() });

    const csv = toCSV(rows);
    res.setHeader('Content-Disposition', `attachment; filename="errores_${Date.now()}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error generando CSV');
  }
});

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});