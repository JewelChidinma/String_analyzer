const express = require('express');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

async function readDB() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeDB({ strings: [] });
      return { strings: [] };
    }
    throw err;
  }
}
async function writeDB(obj) {
  await fs.writeFile(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

// Helpers
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function isPalindrome(value) {
  const cleaned = value.toLowerCase();

  const rev = cleaned.split('').reverse().join('');
  return cleaned === rev;
}
function charFrequencyMap(value) {
  const map = {};
  for (const ch of value) map[ch] = (map[ch] || 0) + 1;
  return map;
}
function analyzeString(value) {
  if (typeof value !== 'string') throw new Error('value must be string');
  const len = value.length;
  const is_pal = isPalindrome(value);
  const freq = charFrequencyMap(value);
  const unique_characters = Object.keys(freq).length;
  const word_count = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;
  const hash = sha256(value);
  return {
    length: len,
    is_palindrome: is_pal,
    unique_characters,
    word_count,
    sha256_hash: hash,
    character_frequency_map: freq
  };
}

// Validation
function requireValueField(req, res, next) {
  if (!req.body || !req.body.hasOwnProperty('value')) 
    return res.status(400).json({ error: 'Invalid request body or missing "value" field' });
  if (typeof req.body.value !== 'string') 
    return res.status(422).json({ error: 'Invalid data type for "value" (must be string)' });
  next();
}

app.post('/strings', requireValueField, async (req, res) => {
  try {
    const value = req.body.value;
    const props = analyzeString(value);
    const id = props.sha256_hash;

    const db = await readDB();
    const exists = db.strings.find(s => s.id === id);
    if (exists) return res.status(409).json({ error: 'String already exists in the system' });

    const record = {
      id,
      value,
      properties: props,
      created_at: new Date().toISOString()
    };
    db.strings.push(record);
    await writeDB(db);
    return res.status(201).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/strings/filter-by-natural-language', async (req, res) => {
  try {
    const q = req.query.query;
    if (!q) return res.status(400).json({ error: 'query parameter is required' });

    let parsed;
    try {
      parsed = parseNaturalLanguageQuery(decodeURIComponent(q));
    } catch (err) {
      if (err.code === 422) return res.status(422).json({ error: err.message });
      return res.status(400).json({ error: 'Unable to parse natural language query' });
    }

    const db = await readDB();
    let results = db.strings.slice();
    const f = parsed.parsedFilters;

    results = results.filter(rec => {
      const p = rec.properties;
      if (f.is_palindrome !== undefined && p.is_palindrome !== f.is_palindrome) return false;
      if (f.min_length !== undefined && p.length < f.min_length) return false;
      if (f.max_length !== undefined && p.length > f.max_length) return false;
      if (f.word_count !== undefined && p.word_count !== f.word_count) return false;
      if (f.contains_character !== undefined && !rec.value.includes(f.contains_character)) return false;
      return true;
    });

    return res.status(200).json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: q,
        parsed_filters: f
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/strings', async (req, res) => {
  try {
    const {
      is_palindrome,
      min_length,
      max_length,
      word_count,
      contains_character
    } = req.query;

    const filters = {};
    if (typeof is_palindrome !== 'undefined') {
      if (!['true', 'false'].includes(is_palindrome.toLowerCase()))
        return res.status(400).json({ error: 'is_palindrome must be true or false' });
      filters.is_palindrome = is_palindrome.toLowerCase() === 'true';
    }
    if (typeof min_length !== 'undefined') {
      const i = parseInt(min_length, 10);
      if (Number.isNaN(i)) return res.status(400).json({ error: 'min_length must be integer' });
      filters.min_length = i;
    }
    if (typeof max_length !== 'undefined') {
      const i = parseInt(max_length, 10);
      if (Number.isNaN(i)) return res.status(400).json({ error: 'max_length must be integer' });
      filters.max_length = i;
    }
    if (typeof word_count !== 'undefined') {
      const i = parseInt(word_count, 10);
      if (Number.isNaN(i)) return res.status(400).json({ error: 'word_count must be integer' });
      filters.word_count = i;
    }
    if (typeof contains_character !== 'undefined') {
      const cc = contains_character;
      if (typeof cc !== 'string' || cc.length !== 1) return res.status(400).json({ error: 'contains_character must be a single character string' });
      filters.contains_character = cc;
    }

    const db = await readDB();
    let results = db.strings.slice();

    results = results.filter(rec => {
      const p = rec.properties;
      if (filters.is_palindrome !== undefined && p.is_palindrome !== filters.is_palindrome) return false;
      if (filters.min_length !== undefined && p.length < filters.min_length) return false;
      if (filters.max_length !== undefined && p.length > filters.max_length) return false;
      if (filters.word_count !== undefined && p.word_count !== filters.word_count) return false;
      if (filters.contains_character !== undefined && !rec.value.includes(filters.contains_character)) return false;
      return true;
    });

    return res.status(200).json({
      data: results,
      count: results.length,
      filters_applied: filters
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/strings/:value', async (req, res) => {
  try {
    const rawValue = decodeURIComponent(req.params.value);
    const id = sha256(rawValue);
    const db = await readDB();
    const rec = db.strings.find(s => s.id === id);
    if (!rec) return res.status(404).json({ error: 'String does not exist in the system' });
    return res.status(200).json(rec);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/strings/:value', async (req, res) => {
  try {
    const rawValue = decodeURIComponent(req.params.value);
    const id = sha256(rawValue);
    const db = await readDB();
    const idx = db.strings.findIndex(s => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'String does not exist in the system' });
    db.strings.splice(idx, 1);
    await writeDB(db);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function parseNaturalLanguageQuery(q) {

  if (!q || typeof q !== 'string') throw new Error('empty query');

  const txt = q.toLowerCase();
  const parsed = {};

  if (txt.includes('palindrom') || txt.includes('palindromic')) parsed.is_palindrome = true;
  if (txt.match(/\bsingle word\b/) || txt.match(/\b1 word\b/) || txt.match(/\bword_count=1\b/)) parsed.word_count = 1;

  const longerMatch = txt.match(/longer than (\d+)/);
  if (longerMatch) parsed.min_length = parseInt(longerMatch[1], 10) + 1;

  const shorterMatch = txt.match(/shorter than (\d+)/);
  if (shorterMatch) parsed.max_length = parseInt(shorterMatch[1], 10) - 1;

  const lenMatch = txt.match(/\b(length|long) (\d+)\b/);
  if (lenMatch) {
    parsed.min_length = parseInt(lenMatch[2], 10);
    parsed.max_length = parseInt(lenMatch[2], 10);
  }

  const containsMatch = txt.match(/(contain|containing|contains)\s+(the\s+letter\s+)?([a-z0-9])/);
  if (containsMatch) parsed.contains_character = containsMatch[3];

  if (txt.includes('first vowel')) parsed.contains_character = 'a';

  if (Object.keys(parsed).length === 0) throw new Error('Unable to parse natural language query');

  if (parsed.min_length !== undefined && parsed.max_length !== undefined && parsed.min_length > parsed.max_length) {
    const e = new Error('Query parsed but resulted in conflicting filters');
    e.code = 422;
    throw e;
  }

  return { parsedFilters: parsed };
}

app.get('/', (req, res) => {
  res.json({ service: 'String Analyzer', version: '1.0' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
