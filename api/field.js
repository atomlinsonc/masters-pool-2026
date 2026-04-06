const { getDraft } = require('../lib/storage');
const { GOLFER_POOL } = require('../lib/data');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const draft = await getDraft();
    const draftedGolfers = new Set(draft.picks.map((p) => p.golfer));
    const available = GOLFER_POOL.filter((g) => !draftedGolfers.has(g));
    return res.status(200).json({ available, total: GOLFER_POOL.length });
  } catch (err) {
    console.error('GET /api/field error:', err);
    return res.status(500).json({ error: 'Failed to load field' });
  }
};
