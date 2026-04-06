const { getDraft, setDraft } = require('../lib/storage');
const { DRAFT_ORDER, GOLFER_POOL } = require('../lib/data');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/draft — return full draft state
  if (req.method === 'GET') {
    try {
      const draft = await getDraft();
      const nextPick = DRAFT_ORDER.find(
        (d) => !draft.picks.find((p) => p.pickNumber === d.pick)
      );
      return res.status(200).json({
        picks: draft.picks,
        draftOrder: DRAFT_ORDER,
        nextPick: nextPick || null,
        isComplete: !nextPick,
      });
    } catch (err) {
      console.error('GET /api/draft error:', err);
      return res.status(500).json({ error: 'Failed to load draft state' });
    }
  }

  // POST /api/draft — submit a pick { pickNumber, golfer }
  if (req.method === 'POST') {
    try {
      const { pickNumber, golfer } = req.body || {};

      if (!pickNumber || !golfer) {
        return res.status(400).json({ error: 'pickNumber and golfer are required' });
      }

      const pickDef = DRAFT_ORDER.find((d) => d.pick === pickNumber);
      if (!pickDef) {
        return res.status(400).json({ error: `Invalid pick number: ${pickNumber}` });
      }

      if (!GOLFER_POOL.includes(golfer)) {
        return res.status(400).json({ error: `Unknown golfer: ${golfer}` });
      }

      const draft = await getDraft();

      // Check this pick slot is still open
      if (draft.picks.find((p) => p.pickNumber === pickNumber)) {
        return res.status(409).json({ error: 'This pick has already been made' });
      }

      // Check previous picks are all done (enforce order)
      const expectedNext = DRAFT_ORDER.find(
        (d) => !draft.picks.find((p) => p.pickNumber === d.pick)
      );
      if (!expectedNext || expectedNext.pick !== pickNumber) {
        return res.status(400).json({
          error: `It is not pick ${pickNumber}'s turn. Current pick: ${expectedNext?.pick ?? 'draft complete'}`,
        });
      }

      // Check golfer not already drafted
      if (draft.picks.find((p) => p.golfer === golfer)) {
        return res.status(409).json({ error: `${golfer} has already been drafted` });
      }

      // Record pick
      draft.picks.push({
        pickNumber,
        golfer,
        player: pickDef.player,
        groups: pickDef.groups,
        timestamp: new Date().toISOString(),
      });

      await setDraft(draft);

      const nextPick = DRAFT_ORDER.find(
        (d) => !draft.picks.find((p) => p.pickNumber === d.pick)
      );

      return res.status(200).json({
        success: true,
        pick: draft.picks[draft.picks.length - 1],
        nextPick: nextPick || null,
        isComplete: !nextPick,
      });
    } catch (err) {
      console.error('POST /api/draft error:', err);
      return res.status(500).json({ error: 'Failed to save pick' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
