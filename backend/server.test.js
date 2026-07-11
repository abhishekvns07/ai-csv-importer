const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');

// Create a test app matching the server.js routes for testing without starting the real server
const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(':memory:', (err) => {
  if (err) console.error(err);
  else {
    db.run(`
      CREATE TABLE leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT
      )
    `);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/leads', (req, res) => {
  db.all("SELECT * FROM leads", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: rows });
  });
});

describe('Backend API Tests', () => {
  test('GET /health should return status OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'OK' });
  });

  test('GET /api/leads should return an empty array initially', async () => {
    const response = await request(app).get('/api/leads');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
  });

  test('Database inserts should be reflected in GET /api/leads', (done) => {
    db.run("INSERT INTO leads (name, email) VALUES ('Test User', 'test@example.com')", async function(err) {
      if (err) return done(err);
      
      const response = await request(app).get('/api/leads');
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Test User');
      done();
    });
  });
});
