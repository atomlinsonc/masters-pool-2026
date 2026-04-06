const { getDraft } = require('../lib/storage');
const { DRAFT_ORDER, GROUP_NAMES } = require('../lib/data');
const { fetchMastersLeaderboard, matchGolfer } = require('../lib/espn');

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
    const picks = draft.picks || [];

    // Fetch live ESPN data
    let espnData = null;
    let espnError = null;
    let eventName = 'Masters Tournament';
    let eventStatus = 'Unknown';

    try {
      const result = await fetchMastersLeaderboard();
      espnData = result.players;
      eventName = result.eventName;
      eventStatus = result.eventStatus;
    } catch (err) {
      espnError = err.message;
    }

    // Build group leaderboards
    const groups = [1, 2, 3, 4].map((groupNum) => {
      const groupPicks = picks.filter((p) => p.groups.includes(groupNum));

      const entries = groupPicks.map((pick) => {
        let liveData = null;
        if (espnData) {
          liveData = matchGolfer(pick.golfer, espnData);
        }

        return {
          golfer: pick.golfer,
          draftedBy: pick.player,
          pickNumber: pick.pickNumber,
          position: liveData?.position ?? '--',
          score: liveData?.score ?? '--',
          scoreValue: liveData?.scoreValue ?? null,
          thru: liveData?.thru ?? '--',
          sortOrder: liveData?.sortOrder ?? 9999,
        };
      });

      // Sort by sortOrder (live position), then alphabetically for ties at 9999
      entries.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.golfer.localeCompare(b.golfer);
      });

      return {
        group: groupNum,
        name: GROUP_NAMES[groupNum],
        entries,
      };
    });

    // Per-player pick summaries
    const playerSummaries = {};
    for (const pick of picks) {
      if (!playerSummaries[pick.player]) {
        playerSummaries[pick.player] = [];
      }
      let liveData = espnData ? matchGolfer(pick.golfer, espnData) : null;
      playerSummaries[pick.player].push({
        pickNumber: pick.pickNumber,
        golfer: pick.golfer,
        groups: pick.groups,
        position: liveData?.position ?? '--',
        score: liveData?.score ?? '--',
        thru: liveData?.thru ?? '--',
      });
    }

    return res.status(200).json({
      groups,
      playerSummaries,
      eventName,
      eventStatus,
      espnError,
      updatedAt: new Date().toISOString(),
      draftComplete: picks.length === DRAFT_ORDER.length,
    });
  } catch (err) {
    console.error('GET /api/standings error:', err);
    return res.status(500).json({ error: 'Failed to compute standings' });
  }
};
