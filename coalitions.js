// coalitions.js
// Reines Logikmodul für Koalitionsbildung und -verhandlungen in MACHTSPIEL

// ========== Basisfunktionen ==========

export function computeTotalSeats(parties) {
  return parties.reduce((s, p) => s + (p.seats || 0), 0);
}

export function computeMajorityThreshold(totalSeats) {
  return Math.floor(totalSeats / 2) + 1;
}

// alle Koalitionen mit Mehrheit, Formateur muss enthalten sein
export function generateCoalitions(allParties, formateurId) {
  const totalSeats = computeTotalSeats(allParties);
  const threshold = computeMajorityThreshold(totalSeats);

  const parties = allParties.filter(p => p.seats > 0);
  if (!parties.length) return [];

  const formateur =
    parties.find(p => p.id === formateurId) ||
    parties.slice().sort((a, b) => b.seats - a.seats)[0];

  const result = [];
  const n = parties.length;

  // Hinweis: bei >8 Parteien ggf. mask-Limit setzen, um Kombi-Explosion zu vermeiden
  for (let mask = 1; mask < (1 << n); mask++) {
    const coalitionParties = [];
    let hasFormateur = false;
    let seatSum = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const p = parties[i];
        coalitionParties.push(p);
        seatSum += p.seats;
        if (p.id === formateur.id) hasFormateur = true;
      }
    }
    if (!hasFormateur) continue;
    if (seatSum < threshold) continue;

    result.push({
      parties: coalitionParties,
      seats: seatSum,
      seatShare: seatSum / totalSeats,
    });
  }

  return result;
}

// ========== Kohäsion & Ranking ==========

export function computeCohesion(parties) {
  let maxDist = 0;
  for (let i = 0; i < parties.length; i++) {
    for (let j = i + 1; j < parties.length; j++) {
      const a = parties[i].alignment || { economic: 0, social: 0 };
      const b = parties[j].alignment || { economic: 0, social: 0 };
      const de = a.economic - b.economic;
      const ds = a.social - b.social;
      const dist = Math.sqrt(de * de + ds * ds);
      if (dist > maxDist) maxDist = dist;
    }
  }
  // 0..1, je enger, desto näher an 1
  return 1 / (1 + maxDist);
}

export function scoreCoalition(coalitionInfo, formateurId, totalSeats) {
  const { parties, seatShare } = coalitionInfo;
  const cohesion = computeCohesion(parties);
  const formateur = parties.find(p => p.id === formateurId);
  const formateurSeatShare = formateur ? formateur.seats / totalSeats : 0;

  // Gewichtung kannst du später tweaken
  return seatShare * 0.6 + cohesion * 0.3 + formateurSeatShare * 0.1;
}

export function rankCoalitions(allParties, formateurId) {
  const totalSeats = computeTotalSeats(allParties);
  const coalitions = generateCoalitions(allParties, formateurId);

  coalitions.forEach(c => {
    c.cohesion = computeCohesion(c.parties);
    c.score = scoreCoalition(c, formateurId, totalSeats);
  });

  return coalitions.sort((a, b) => b.score - a.score);
}

// ========== Ministeriums-Präferenzen & Zufriedenheit ==========

// einfache Heuristik für Ressort-Präferenzen anhand deiner alignment-Achsen
export function ministryPreference(party, ministryId) {
  const a = party.alignment || { economic: 0, social: 0 };
  const e = a.economic;
  const s = a.social;

  switch (ministryId) {
    case 'finanzen':
    case 'wirtschaft':
      return Math.max(0, 0.5 + e);           // marktwirtschaftlich freut sich
    case 'arbeit':
    case 'soziales':
      return Math.max(0, 0.5 - e);           // linkere Parteien freuen sich
    case 'umwelt':
      return Math.max(0, 0.3 - e + 0.3 - s); // eher links/ökologisch
    case 'inneres':
    case 'verteidigung':
      return Math.max(0, 0.3 + s);           // eher gesellschaftlich konservativ
    case 'bildung':
    case 'digitalisierung':
      return 0.4;
    case 'gesundheit':
    case 'wohnen':
    case 'verkehr':
      return 0.3;
    default:
      return 0.2;
  }
}

// assignedMinistries: [{ id: 'finanzen', partyId: 'sozialdemokraten' }, ...]
export function coalitionSatisfaction(party, coalitionInfo, assignedMinistries) {
  const { parties, seats } = coalitionInfo;
  const totalMinistries = assignedMinistries.length || 1;

  const seatShare = (party.seats || 0) / seats;
  const ministriesForParty = assignedMinistries.filter(m => m.partyId === party.id);
  const gotShare = ministriesForParty.length / totalMinistries;

  // 1) Anteil an Posten vs. Sitzanspruch
  const officeScore = 1 - Math.abs(gotShare - seatShare); // 0..1

  // 2) Wie passend sind die Ressorts?
  let prefScore = 0;
  if (ministriesForParty.length) {
    const prefs = ministriesForParty.map(m => ministryPreference(party, m.id));
    prefScore = prefs.reduce((a, b) => a + b, 0) / prefs.length; // 0..1+
    // auf 0..1 clampen
    prefScore = Math.max(0, Math.min(1, prefScore));
  }

  const combined = 0.5 * officeScore + 0.5 * prefScore;
  // clamp auf 0..1
  return Math.max(0, Math.min(1, combined));
}

// ========== Verhandlungs-„State Machine“ ==========

export function startNegotiations(allParties, playerPartyId, optionsLimit = 5) {
  const options = rankCoalitions(allParties, playerPartyId).slice(0, optionsLimit);

  return {
    formateurId: playerPartyId,
    allParties,
    options,
    currentIndex: 0,
    assignedMinistries: [], // vom UI zu befüllen: [{ id, partyId }]
    finished: false,
    result: null,           // { type: 'coalition' | 'minority' | 'failed', coalition?, ministries? }
  };
}

// prüft, ob aktuelle Koalitionsoption mit den zugewiesenen Ministerien zustande kommt
export function evaluateOffer(negotiationState, satisfactionThreshold = 0.4) {
  const option = negotiationState.options[negotiationState.currentIndex];
  if (!option) {
    return { success: false, reason: 'no_options_left', failedParties: [] };
  }

  const failedParties = option.parties.filter(p => {
    if (p.id === negotiationState.formateurId) return false;
    const sat = coalitionSatisfaction(p, option, negotiationState.assignedMinistries);
    return sat < satisfactionThreshold;
  });

  if (failedParties.length) {
    return { success: false, reason: 'partners_unhappy', failedParties };
  }

  return {
    success: true,
    coalition: option,
    ministries: negotiationState.assignedMinistries.slice(),
  };
}

// nächste Koalitionsoption, falls aktuelle gescheitert ist
export function pickNextOption(negotiationState) {
  negotiationState.currentIndex++;
  negotiationState.assignedMinistries = [];

  if (negotiationState.currentIndex >= negotiationState.options.length) {
    negotiationState.finished = true;
    negotiationState.result = { type: 'failed' };
  }

  return negotiationState;
}

// ========== Bequeme Sammel-API ==========

export const CoalitionEngine = {
  computeTotalSeats,
  computeMajorityThreshold,
  generateCoalitions,
  computeCohesion,
  scoreCoalition,
  rankCoalitions,
  ministryPreference,
  coalitionSatisfaction,
  startNegotiations,
  evaluateOffer,
  pickNextOption,
};
