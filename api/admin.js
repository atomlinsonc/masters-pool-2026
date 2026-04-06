const { resetDraft } = require('../lib/storage');

const ADMIN_PASSWORD = 'masters2026';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid password' });
  }

  try {
    await resetDraft();
    return res.status(200).json({ success: true, message: 'Draft has been reset' });
  } catch (err) {
    console.error('POST /api/admin error:', err);
    return res.status(500).json({ error: 'Failed to reset draft' });
  }
};
