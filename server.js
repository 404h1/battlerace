require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'race.html'));
});

// 랭킹 상위 10명 조회
app.get('/api/scores', async (req, res) => {
  const { data, error } = await supabase
    .from('scores')
    .select('name, score')
    .order('score', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// HMAC 서명 기반 세션 (서버리스 환경에서도 동작)
const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-me';

function createToken(timestamp) {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(String(timestamp));
  return hmac.digest('hex') + ':' + timestamp;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split(':');
  if (parts.length !== 2) return null;
  const [hash, tsStr] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET);
  expected.update(String(ts));
  const expectedHash = expected.digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))) return null;
  } catch { return null; }
  return ts;
}

app.post('/api/session', (req, res) => {
  const token = createToken(Date.now());
  res.json({ sessionId: token });
});

// 점수 저장 (개인 최고 점수만 업데이트)
app.post('/api/scores', async (req, res) => {
  const { name, score, sessionId } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (typeof score !== 'number' || score < 0 || score > 100000)
    return res.status(400).json({ error: '유효하지 않은 점수입니다.' });

  // HMAC 서명 검증 (서버리스 호환, 주사율 무관)
  const startTime = verifyToken(sessionId);
  if (!startTime) return res.status(400).json({ error: '유효하지 않은 세션입니다.' });

  const cleanName = name.trim().slice(0, 20);
  const cleanScore = Math.floor(score);

  // 기존 점수 확인
  const { data: existing } = await supabase
    .from('scores')
    .select('score')
    .eq('name', cleanName)
    .maybeSingle();

  // 기존 최고 점수보다 낮으면 저장 안 함
  if (existing && existing.score >= cleanScore) {
    return res.json({ updated: false, best: existing.score });
  }

  // 없으면 insert, 있으면 update
  const { data, error } = await supabase
    .from('scores')
    .upsert({ name: cleanName, score: cleanScore }, { onConflict: 'name' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ updated: true, ...data });
});

// 특정 닉네임의 순위 조회
app.get('/api/rank/:name', async (req, res) => {
  const name = req.params.name;

  const { data, error } = await supabase
    .from('scores')
    .select('name, score')
    .order('score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const rank = data.findIndex(e => e.name === name) + 1;
  const total = data.length;
  const entry = data.find(e => e.name === name);

  res.json({ rank, total, score: entry?.score ?? 0 });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
