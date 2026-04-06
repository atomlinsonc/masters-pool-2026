/**
 * Fetches live Masters leaderboard data from the ESPN API.
 * Returns a normalized array of golfer standings.
 */

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';

function normalizeName(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '')
    .trim();
}

/**
 * Find the closest matching golfer in the ESPN data for a given draft name.
 */
function matchGolfer(draftName, espnPlayers) {
  const dn = normalizeName(draftName);

  // 1. Exact match
  let match = espnPlayers.find((p) => normalizeName(p.name) === dn);
  if (match) return match;

  // 2. Last-name match (both must share last word)
  const draftLastName = dn.split(' ').pop();
  const lastNameMatches = espnPlayers.filter((p) => {
    const en = normalizeName(p.name);
    return en.split(' ').pop() === draftLastName;
  });
  if (lastNameMatches.length === 1) return lastNameMatches[0];

  // 3. Contains check (e.g. "K.H. Lee" vs "Kyoung-Hoon Lee")
  match = espnPlayers.find((p) => {
    const en = normalizeName(p.name);
    return en.includes(dn) || dn.includes(en);
  });
  if (match) return match;

  // 4. Two-word overlap
  const draftWords = dn.split(' ').filter((w) => w.length > 2);
  match = espnPlayers.find((p) => {
    const espnWords = normalizeName(p.name).split(' ');
    return draftWords.filter((w) => espnWords.includes(w)).length >= 2;
  });
  return match || null;
}

async function fetchMastersLeaderboard() {
  const res = await fetch(ESPN_URL, {
    headers: { 'User-Agent': 'masters-pool/1.0' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);

  const data = await res.json();

  // Find Masters event (may be first or by name)
  const mastersEvent =
    data.events?.find((e) =>
      e.name?.toLowerCase().includes('master')
    ) || data.events?.[0];

  if (!mastersEvent) throw new Error('Masters event not found in ESPN response');

  const competition = mastersEvent.competitions?.[0];
  if (!competition) throw new Error('No competition data found');

  const eventName = mastersEvent.name || 'Masters Tournament';
  const eventStatus = mastersEvent.status?.type?.description || 'Unknown';
  const eventRound = mastersEvent.status?.period || 0;

  const players = (competition.competitors || []).map((comp) => {
    const pos =
      comp.status?.position?.displayName ||
      comp.status?.leaderboardDisplayValue ||
      comp.status?.displayValue ||
      '--';

    const scoreDisplay = comp.score?.displayValue ?? 'E';
    const scoreValue =
      typeof comp.score?.value === 'number' ? comp.score.value : null;

    const thru = comp.status?.thru ?? '--';

    return {
      name: comp.athlete?.displayName || comp.athlete?.fullName || 'Unknown',
      position: pos,
      score: scoreDisplay,
      scoreValue,
      thru: String(thru),
      sortOrder: comp.sortOrder ?? comp.order ?? 9999,
    };
  });

  // Sort by sortOrder ascending (ESPN already does this but be safe)
  players.sort((a, b) => a.sortOrder - b.sortOrder);

  return { players, eventName, eventStatus, eventRound };
}

module.exports = { fetchMastersLeaderboard, matchGolfer };
