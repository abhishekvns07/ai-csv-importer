const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Papa = require('papaparse');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Initialization
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT,
        name TEXT,
        email TEXT,
        country_code TEXT,
        mobile_without_country_code TEXT,
        company TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        lead_owner TEXT,
        crm_status TEXT,
        crm_note TEXT,
        data_source TEXT,
        possession_time TEXT,
        description TEXT
      )
    `);
  }
});

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractFieldsPrompt = `
You are an AI assistant that extracts CRM leads from CSV rows into a strict JSON format.

Below is a batch of CSV rows representing leads.
For each lead, extract and map the information to the following standard CRM fields:
- created_at: Lead creation date (must be convertible using JavaScript new Date(), e.g. YYYY-MM-DD HH:MM:SS)
- name: Lead name
- email: Primary email
- country_code: Country code (e.g. +91, 1)
- mobile_without_country_code: Mobile number without country code
- company: Company name
- city: City
- state: State
- country: Country
- lead_owner: Lead owner email/name
- crm_status: Lead status. MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE
- crm_note: Notes/remarks. Also append any extra email addresses or extra phone numbers here.
- data_source: Source. MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If none match confidently, leave blank.
- possession_time: Property possession time
- description: Additional description

RULES:
1. If multiple emails exist, put the first in 'email' and the rest in 'crm_note'.
2. If multiple mobile numbers exist, put the first in 'mobile_without_country_code' and the rest in 'crm_note'.
3. If a record contains NEITHER an email NOR a mobile number, SKIP it (do not include it in the output array).
4. Do NOT include markdown blocks in your response (e.g. \`\`\`json). Return raw valid JSON.
5. The output must be a JSON array of objects representing the parsed leads. If there are no valid leads, return an empty array [].

CSV Headers & Rows:
`;

async function callGeminiWithRetry(prompt, maxRetries = 3) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json/, '').replace(/```$/, '');
      }
      return JSON.parse(responseText);
    } catch (err) {
      console.error(`Gemini Attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) throw err;
      // Exponential backoff
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }
}

app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    const csvString = req.file.buffer.toString('utf8');
    
    // Parse CSV with Papaparse
    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.error("CSV Parse Errors:", parsed.errors);
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    const headers = parsed.meta.fields || Object.keys(rows[0] || {});

    // Batching logic (50 rows at a time)
    const BATCH_SIZE = 50;
    let allExtractedLeads = [];
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batchRows = rows.slice(i, i + BATCH_SIZE);
      const csvData = [headers.join(','), ...batchRows.map(r => Object.values(r).join(','))].join('\n');
      const prompt = extractFieldsPrompt + '\n' + csvData;
      
      try {
        const extractedBatch = await callGeminiWithRetry(prompt, 3);
        if (Array.isArray(extractedBatch)) {
          allExtractedLeads = allExtractedLeads.concat(extractedBatch);
        }
      } catch (err) {
        console.error("Failed to parse batch:", err);
        // Continue with the next batch even if this one fails entirely
      }
    }

    // Insert leads into database
    let insertedCount = 0;
    const stmt = db.prepare(`
      INSERT INTO leads (created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lead of allExtractedLeads) {
      stmt.run(
        lead.created_at || null, lead.name || null, lead.email || null, lead.country_code || null,
        lead.mobile_without_country_code || null, lead.company || null, lead.city || null, lead.state || null,
        lead.country || null, lead.lead_owner || null, lead.crm_status || null, lead.crm_note || null,
        lead.data_source || null, lead.possession_time || null, lead.description || null,
        (err) => {
          if (err) console.error("DB Insert Error:", err.message);
        }
      );
      insertedCount++;
    }
    stmt.finalize();

    res.json({
      success: true,
      totalReceived: rows.length,
      totalImported: insertedCount,
      skipped: rows.length - insertedCount,
      data: allExtractedLeads
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/leads', (req, res) => {
  db.all("SELECT * FROM leads ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, data: rows });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
