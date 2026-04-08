const fs = require('fs');
const https = require('https');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();

app.use(helmet());
app.use(morgan('combined'));

const PORT = process.env.PORT || 8443;
const DB_HOST = process.env.DB_HOST || 'mysql';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_NAME = process.env.DB_NAME || 'appdb';
const DB_USER = process.env.DB_USER || 'appuser';
const DB_PASSWORD = process.env.DB_PASSWORD || 'apppassword';
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || '/certs/backend.key';
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || '/certs/backend.crt';

let pool;

async function connectWithRetry() {
  const maxRetries = 30;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      pool = mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      await pool.query('SELECT 1');
      console.log('Connected to MySQL');
      return;
    } catch (error) {
      console.error(`MySQL connection attempt ${i}/${maxRetries} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw new Error('Unable to connect to MySQL after multiple retries.');
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'UP' });
  } catch (error) {
    res.status(500).json({ status: 'DOWN', database: 'DOWN', error: error.message });
  }
});

app.get('/api/items', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description FROM items ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load items' });
  }
});

app.get('/api/info', (_req, res) => {
  res.json({
    service: 'backend',
    version: '1.0.0',
    tls: true,
    hostname: require('os').hostname()
  });
});

(async () => {
  await connectWithRetry();

  const options = {
    key: fs.readFileSync(TLS_KEY_PATH),
    cert: fs.readFileSync(TLS_CERT_PATH)
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS API listening on port ${PORT}`);
  });
})();
