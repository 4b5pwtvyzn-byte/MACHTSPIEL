/* ============================================================
   MACHTSPIEL v3 — Vollständige Spielengine
   Politische Tiefensimulation mit erweiterter Koalitionsdynamik,
   Gesetzgebungspipeline, differenziertem Oppositionsspiel und
   mehrstufigem Wahlkampf.
   ============================================================ */

'use strict';

// ============================================================
// ABSCHNITT 1: AUDIO ENGINE
// ============================================================

const AudioEngine = {
  ctx: null,
  muted: false,
  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  play(type, freq = 440, dur = 0.1, vol = 0.15) {
    if (this.muted || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch(e) {}
  },
  click()    { this.play('sine', 800, 0.06, 0.1); },
  hover()    { this.play('sine', 600, 0.03, 0.05); },
  success()  { this.play('sine', 523, 0.15, 0.12); setTimeout(() => this.play('sine', 659, 0.15, 0.12), 100); setTimeout(() => this.play('sine', 784, 0.2, 0.12), 200); },
  failure()  { this.play('sawtooth', 200, 0.3, 0.1); setTimeout(() => this.play('sawtooth', 150, 0.4, 0.1), 150); },
  election() { this.play('sine', 440, 0.1, 0.1); setTimeout(() => this.play('sine', 554, 0.1, 0.1), 100); setTimeout(() => this.play('sine', 659, 0.1, 0.1), 200); setTimeout(() => this.play('sine', 880, 0.3, 0.15), 300); },
  alert()    { this.play('square', 880, 0.08, 0.08); setTimeout(() => this.play('square', 880, 0.08, 0.08), 150); },
  debate()   { this.play('triangle', 330, 0.15, 0.1); setTimeout(() => this.play('triangle', 440, 0.15, 0.1), 120); },
  budget()   { this.play('sine', 660, 0.08, 0.08); },
  fanfare()  { [523,659,784,1047].forEach((f,i) => setTimeout(() => this.play('sine',f,0.2,0.12), i*120)); },
  tension()  { this.play('sawtooth', 120, 0.5, 0.06); },
  toggle()   { this.muted = !this.muted; },
};

// ============================================================
// ABSCHNITT 2: BASISTHEMEN & WÄHLERGRUPPEN
// ============================================================

const TOPICS = [
  { id: 'wirtschaft',      name: 'Wirtschaft',        icon: '📊' },
  { id: 'migration',       name: 'Migration',          icon: '🌍' },
  { id: 'klima',           name: 'Klima/Umwelt',       icon: '🌱' },
  { id: 'sicherheit',      name: 'Sicherheit',         icon: '🛡️' },
  { id: 'bildung',         name: 'Bildung',            icon: '🎓' },
  { id: 'digitalisierung', name: 'Digitalisierung',    icon: '💻' },
  { id: 'gesundheit',      name: 'Gesundheit',         icon: '🏥' },
  { id: 'soziales',        name: 'Soziales',           icon: '🤝' },
  { id: 'wohnen',          name: 'Wohnen',             icon: '🏠' },
  { id: 'verteidigung',    name: 'Verteidigung',       icon: '🎖️' },
  { id: 'europa',          name: 'Europa',             icon: '🇪🇺' },
  { id: 'justiz',          name: 'Justiz',             icon: '⚖️' },
  { id: 'verkehr',         name: 'Verkehr/Infrastr.',  icon: '🚄' },
];

const VOTER_GROUPS = [
  { id: 'arbeiter',        name: 'Arbeiter',            icon: '🔧', weight: 0.22 },
  { id: 'akademiker',      name: 'Akademiker',          icon: '🎓', weight: 0.18 },
  { id: 'rentner',         name: 'Rentner',             icon: '👴', weight: 0.20 },
  { id: 'jugend',          name: 'Jugend',              icon: '🧑', weight: 0.15 },
  { id: 'selbststaendige', name: 'Selbstständige',      icon: '💼', weight: 0.12 },
  { id: 'land',            name: 'Landbevölkerung',     icon: '🌾', weight: 0.13 },
];

// ============================================================
// ABSCHNITT 3: BUNDESLÄNDER
// ============================================================

const BUNDESLAENDER = [
  { id: 'nrw',   name: 'Nordrhein-Westfalen',    short: 'NRW', wahlkreise: 64, lean: 0.0,  population: 18 },
  { id: 'bay',   name: 'Bayern',                  short: 'BAY', wahlkreise: 46, lean: 0.4,  population: 13 },
  { id: 'bw',    name: 'Baden-Württemberg',       short: 'BW',  wahlkreise: 38, lean: 0.2,  population: 11 },
  { id: 'nds',   name: 'Niedersachsen',           short: 'NDS', wahlkreise: 30, lean: -0.1, population: 8  },
  { id: 'hes',   name: 'Hessen',                  short: 'HES', wahlkreise: 22, lean: 0.1,  population: 6  },
  { id: 'sac',   name: 'Sachsen',                 short: 'SAC', wahlkreise: 16, lean: 0.3,  population: 4  },
  { id: 'rlp',   name: 'Rheinland-Pfalz',         short: 'RLP', wahlkreise: 15, lean: 0.0,  population: 4  },
  { id: 'ber',   name: 'Berlin',                  short: 'BER', wahlkreise: 12, lean: -0.4, population: 4  },
  { id: 'sh',    name: 'Schleswig-Holstein',       short: 'SH',  wahlkreise: 11, lean: 0.1,  population: 3  },
  { id: 'bbg',   name: 'Brandenburg',             short: 'BBG', wahlkreise: 10, lean: 0.1,  population: 3  },
  { id: 'st',    name: 'Sachsen-Anhalt',           short: 'ST',  wahlkreise: 9,  lean: 0.2,  population: 2  },
  { id: 'thu',   name: 'Thüringen',               short: 'THU', wahlkreise: 8,  lean: 0.2,  population: 2  },
  { id: 'hh',    name: 'Hamburg',                  short: 'HH',  wahlkreise: 6,  lean: -0.3, population: 2  },
  { id: 'mv',    name: 'Mecklenburg-Vorpommern',  short: 'MV',  wahlkreise: 6,  lean: 0.1,  population: 2  },
  { id: 'saar',  name: 'Saarland',                short: 'SAR', wahlkreise: 4,  lean: -0.1, population: 1  },
  { id: 'hb',    name: 'Bremen',                  short: 'HB',  wahlkreise: 2,  lean: -0.3, population: 1  },
];

const TOTAL_WAHLKREISE = BUNDESLAENDER.reduce((s, b) => s + b.wahlkreise, 0); // 299

// ============================================================
// ABSCHNITT 4: PARTEI- UND MINISTERÄMTER
// ============================================================

const PARTY_POSITIONS = [
  { id: 'generalsekretaer',   name: 'Generalsekretär/in',       icon: '📋', effect: 'campaign',  desc: 'Verbessert Kampagnenorganisation' },
  { id: 'fraktionsvorsitz',   name: 'Fraktionsvorsitzende/r',   icon: '🏛️', effect: 'bundestag', desc: 'Stärkt Bundestagspräsenz' },
  { id: 'schatzmeister',      name: 'Schatzmeister/in',         icon: '💰', effect: 'budget',    desc: 'Bessere Budgetverwaltung' },
  { id: 'pressesprecher',     name: 'Pressesprecher/in',        icon: '📺', effect: 'media',     desc: 'Bessere Medienberichterstattung' },
  { id: 'stellvertreter1',    name: 'Stellv. Vorsitzende/r I',  icon: '👥', effect: 'loyalty',   desc: 'Stärkt Parteieinheit' },
  { id: 'stellvertreter2',    name: 'Stellv. Vorsitzende/r II', icon: '👥', effect: 'loyalty',   desc: 'Stärkt Parteieinheit' },
];

const MINISTER_POSITIONS = [
  { id: 'finanzen',     name: 'Bundesfinanzminister/in',          icon: '💶' },
  { id: 'inneres',      name: 'Bundesinnenminister/in',            icon: '🏢' },
  { id: 'aeusseres',    name: 'Bundesaußenminister/in',            icon: '🌐' },
  { id: 'verteidigung', name: 'Bundesverteidigungsminister/in',    icon: '🎖️' },
  { id: 'wirtschaft',   name: 'Bundeswirtschaftsminister/in',      icon: '📈' },
  { id: 'arbeit',       name: 'Bundesarbeitsminister/in',          icon: '🤝' },
  { id: 'justiz',       name: 'Bundesjustizminister/in',           icon: '⚖️' },
  { id: 'gesundheit',   name: 'Bundesgesundheitsminister/in',      icon: '🏥' },
  { id: 'bildung',      name: 'Bundesbildungsminister/in',         icon: '🎓' },
  { id: 'umwelt',       name: 'Bundesumweltminister/in',           icon: '🌿' },
  { id: 'verkehr',      name: 'Bundesverkehrsminister/in',         icon: '🚄' },
  { id: 'wohnen',       name: 'Bundesbauminister/in',              icon: '🏗️' },
];

// Schlüsselthemen für Koalitionsverhandlungen
const COALITION_POLICY_AREAS = [
  { id: 'haushalt',      name: 'Haushalt & Steuern',        icon: '💰' },
  { id: 'migration',     name: 'Migration & Integration',   icon: '🌍' },
  { id: 'klima',         name: 'Klima & Energie',           icon: '🌱' },
  { id: 'soziales',      name: 'Soziales & Rente',          icon: '🤝' },
  { id: 'sicherheit',    name: 'Sicherheit & Justiz',       icon: '🛡️' },
];

// ============================================================
// ABSCHNITT 5: NAMEN & EXPERTISE
// ============================================================

const FIRST_NAMES_M = ['Thomas','Stefan','Andreas','Michael','Jürgen','Markus','Christian','Wolfgang','Peter','Klaus','Hans','Dieter','Frank','Martin','Bernd','Rainer','Uwe','Gerhard','Friedrich','Karl','Olaf','Robert','Armin','Cem','Marco','Hubertus','Norbert','Volker','Heiko','Alexander','Tobias','Sebastian','Florian','Jonas','Maximilian','Lukas','Jan','Tim','Felix','Moritz'];
const FIRST_NAMES_F = ['Annalena','Christine','Ursula','Katarina','Brigitte','Andrea','Monika','Sabine','Petra','Claudia','Renate','Susanne','Karin','Heike','Bettina','Franziska','Dorothee','Svenja','Klara','Ricarda','Lisa','Marie','Julia','Sarah','Nadine','Eva','Anja','Nicole','Martina','Silke','Katharina','Hannah','Lena','Sophie','Laura','Anna','Johanna','Miriam','Carla','Vera'];
const LAST_NAMES = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Wolf','Schröder','Neumann','Schwarz','Braun','Zimmermann','Hartmann','Krüger','Lange','Werner','Lehmann','König','Baumann','Keller','Winkler','Lorenz','Albrecht','Berger','Vogt','Roth','Seidel','Franke','Vogel','Beck','Engel','Schuster','Friedrich','Haas'];
const EXPERTISE_AREAS = ['Wirtschaft','Innenpolitik','Außenpolitik','Sozialpolitik','Umweltpolitik','Bildung','Digitalisierung','Finanzen','Justiz','Gesundheit','Verteidigung','Verkehr'];
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// ============================================================
// ABSCHNITT 6: KI-PARTEIEN
// ============================================================

const AI_PARTIES = [
  { id: 'volkspartei',     name: 'Volkspartei Mitte',             short: 'VPM', color: '#1e3a5f', baseApproval: 27,
    alignment: { economic: 0.3, social: 0.2 }, topics: ['wirtschaft','sicherheit','bildung'],
    voterBase: { arbeiter: 0.25, akademiker: 0.2, rentner: 0.35, jugend: 0.1, selbststaendige: 0.3, land: 0.35 },
    demandMinisterien: ['inneres','wirtschaft','finanzen'],
  },
  { id: 'sozialdemokraten', name: 'Sozialdemokratische Allianz', short: 'SDA', color: '#c0392b', baseApproval: 22,
    alignment: { economic: -0.3, social: -0.1 }, topics: ['soziales','wirtschaft','gesundheit'],
    voterBase: { arbeiter: 0.35, akademiker: 0.25, rentner: 0.25, jugend: 0.15, selbststaendige: 0.1, land: 0.2 },
    demandMinisterien: ['arbeit','gesundheit','bildung'],
  },
  { id: 'gruene',          name: 'Grüne Zukunft',                 short: 'GZ',  color: '#27ae60', baseApproval: 14,
    alignment: { economic: -0.2, social: -0.5 }, topics: ['klima','bildung','digitalisierung'],
    voterBase: { arbeiter: 0.1, akademiker: 0.35, rentner: 0.05, jugend: 0.35, selbststaendige: 0.15, land: 0.05 },
    demandMinisterien: ['umwelt','verkehr','aeusseres'],
  },
  { id: 'freie',           name: 'Freie Demokraten',              short: 'FD',  color: '#f1c40f', baseApproval: 9,
    alignment: { economic: 0.5, social: -0.3 }, topics: ['wirtschaft','digitalisierung','bildung'],
    voterBase: { arbeiter: 0.05, akademiker: 0.25, rentner: 0.1, jugend: 0.15, selbststaendige: 0.4, land: 0.08 },
    demandMinisterien: ['finanzen','wirtschaft','justiz'],
  },
  { id: 'linke',           name: 'Linke Alternative',             short: 'LA',  color: '#8e44ad', baseApproval: 7,
    alignment: { economic: -0.7, social: -0.4 }, topics: ['soziales','wohnen','gesundheit'],
    voterBase: { arbeiter: 0.25, akademiker: 0.15, rentner: 0.15, jugend: 0.2, selbststaendige: 0.02, land: 0.1 },
    demandMinisterien: ['arbeit','wohnen','gesundheit'],
  },
  { id: 'nationale',       name: 'Nationale Bewegung',            short: 'NB',  color: '#5d4037', baseApproval: 12,
    alignment: { economic: 0.1, social: 0.7 }, topics: ['migration','sicherheit','wirtschaft'],
    voterBase: { arbeiter: 0.2, akademiker: 0.05, rentner: 0.15, jugend: 0.1, selbststaendige: 0.15, land: 0.35 },
    demandMinisterien: ['inneres','verteidigung'],
  },
];

// ============================================================
// ABSCHNITT 7: HILFSFUNKTIONEN
// ============================================================

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function fmt(n) { return Math.round(n).toLocaleString('de-DE'); }
function fmtCurrency(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs/1e6).toFixed(1)} Mio. €`;
  if (abs >= 1e3) return `${sign}${(abs/1e3).toFixed(0)} Tsd. €`;
  return `${sign}${fmt(abs)} €`;
}
function fmtPct(n) { return `${n.toFixed(1)}%`; }

let _personId = 1;
function generatePerson(wing) {
  const isFemale = Math.random() < 0.45;
  const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  const lastName = pick(LAST_NAMES);
  const wings = ['left','center','right'];
  const personWing = wing || pick(wings);
  return {
    id: `person_${_personId++}`,
    name: `${firstName} ${lastName}`,
    firstName, lastName,
    age: randInt(32, 68),
    gender: isFemale ? 'f' : 'm',
    skill: randInt(30, 95),
    loyalty: randInt(30, 95),
    expertise: pick(EXPERTISE_AREAS),
    wing: personWing,
    months: 0,
    scandals: 0,
  };
}

function generatePersonnelPool(count, avgAlignment) {
  const wingBias = avgAlignment < -0.2 ? 'left' : avgAlignment > 0.2 ? 'right' : 'center';
  return Array.from({ length: count }, () => {
    const r = Math.random();
    const w = r < 0.5 ? wingBias : r < 0.75 ? 'center' : pick(['left','center','right']);
    return generatePerson(w);
  });
}

// ============================================================
// ABSCHNITT 8: SPIELZUSTAND
// ============================================================

let state = null;

function createInitialState() {
  return {
    // Spielphasen-Steuerung
    phase: 'title',
    month: 0,
    year: 1,
    totalMonths: 0,
    electionCount: 0,
    activeTab: 'event',

    // Phasen-Zeitrahmen
    maxPreElectionMonths: 12,
    campaignMonths: 4,
    governanceMonths: 48,
    governanceMonth: 0,
    campaignMonth: 0,

    // Spieler-Partei
    player: {
      name: '',
      short: '',
      color: '#3b82f6',
      alignment: { economic: 0, social: 0 },
      topics: [],
      approval: 8,
      media: 50,
      credibility: 70,
      partyUnity: 70,
      seats: 0,
      passedThreshold: false,
      inGovernment: false,
      isKanzler: false,
      isOpposition: false,
      governmentAgenda: [],

      // Koalitionsmanagement
      coalitionPartners: [],       // Array von Partei-Objekten
      coalitionSatisfaction: 70,   // 0–100
      coalitionAgreements: {},     // { policyArea: 'compromise' }
      coalitionBroken: false,

      // Gesetzgebung
      pendingLaw: null,
      lawPipeline: [],             // Gesetze in verschiedenen Stufen
      passedLaws: [],
      failedLaws: [],
      lawsPassed: 0,

      // Wahlkampfmittel
      campaignTools: {
        plakate: 0, tvSpots: 0, socialMedia: 0, kundgebungen: 0,
        haustuer: {}, wahlkampfbus: 0,
      },

      // Oppositionswerkzeuge
      oppositionActions: [],
      oppositionCooldowns: {},

      // TV-Duell-Ergebnisse
      tvDuellResults: [],
      tvDuellRound: 0,
      currentTvDuellOpponent: null,

      // Wählergruppen-Zustimmung
      voterApproval: {
        arbeiter: 8, akademiker: 8, rentner: 8,
        jugend: 8, selbststaendige: 8, land: 8,
      },

      // Budget
      budget: {
        balance: 500000,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        memberDues: 150000,
        donations: 50000,
        stateFunding: 0,
        staffCosts: 120000,
        officeCosts: 30000,
        campaignSpending: {},
        mediaSpending: 0,
        debt: 0,
      },

      // Personal
      personnel: [],
      positions: {},               // { positionId: personObject }
      ministers: {},               // { ministeriumId: personObject }

      // Regionale Daten
      regional: {},
      regionalResults: {},

      // Historische Daten
      lastParteitag: -1,
      approvalHistory: [],
    },

    // KI-Parteien
    parties: [],

    // Globale Spielereignisse
    currentEvent: null,
    usedEvents: [],                // IDs bereits gezeigter Events
    usedGovernanceEvents: [],
    usedCampaignEvents: [],
    newsHistory: [],

    // Schwebende Sonderaktionen
    pendingDonation: null,
    pendingParteitag: false,
    currentParteitagTopic: null,
    parteitagResult: null,
    pendingPlenarDebatte: null,
    pendingLandtagswahl: null,
    debateResult: null,
    pendingVertrauensfrage: false,
    pendingKoalitionskrise: false,

    // Wahl- & Koalitionsdaten
    electionResults: null,
    coalitionOptions: [],
    selectedCoalition: null,

    // Koalitionsverhandlungs-Zustand (mehrstufig)
    coalitionNegotiation: null,    // { phase, partner, round, agreements, ... }

    // Bundesinstitutionen
    bundespraesident: null,
    bpElectionHeld: false,
  };
}

function initPlayerRegional() {
  BUNDESLAENDER.forEach(bl => {
    state.player.regional[bl.id] = {
      workers: 0,
      investment: 0,
      approval: state.player.approval + (Math.random() * 4 - 2),
    };
  });
}

// ============================================================
// ABSCHNITT 9: KERNLOGIK — SPIELSTART & PARTEIGRÜNDUNG
// ============================================================

function startNewGame() {
  state = createInitialState();
  renderScreen();
}

function finalizePartyCreation(name, shortName, economic, social, topics) {
  state.player.name = name;
  state.player.short = shortName || name.substring(0, 3).toUpperCase();
  state.player.alignment.economic = economic;
  state.player.alignment.social = social;
  state.player.topics = topics;

  const baseApproval = rand(6, 11);
  state.player.approval = baseApproval;
  const va = state.player.voterApproval;

  VOTER_GROUPS.forEach(g => {
    let bonus = 0;
    if (g.id === 'arbeiter'        && economic < 0) bonus = Math.abs(economic) * 4;
    if (g.id === 'selbststaendige' && economic > 0) bonus = economic * 5;
    if (g.id === 'akademiker'      && social < 0)   bonus = Math.abs(social) * 3;
    if (g.id === 'jugend'          && social < 0)   bonus = Math.abs(social) * 2;
    if (g.id === 'rentner'         && economic > 0) bonus = economic * 2;
    if (g.id === 'land'            && social > 0)   bonus = social * 4;
    va[g.id] = clamp(baseApproval + bonus + rand(-1, 1), 2, 16);
  });

  state.parties = AI_PARTIES.map(p => ({
    ...p,
    approval: p.baseApproval + rand(-2, 2),
    seats: 0,
    passedThreshold: false,
  }));

  const avgAlignment = (economic + social) / 2;
  state.player.personnel = generatePersonnelPool(20, avgAlignment);
  initPlayerRegional();

  state.phase = 'personnelSetup';
  renderScreen();
}

function assignPosition(positionId, personId) {
  const person = state.player.personnel.find(p => p.id === personId);
  if (!person) {
    // Leere Position
    state.player.positions[positionId] = null;
    AudioEngine.click();
    renderScreen();
    return;
  }
  // Vorhandene Zuweisung entfernen
  Object.keys(state.player.positions).forEach(pid => {
    if (state.player.positions[pid] && state.player.positions[pid].id === personId) {
      state.player.positions[pid] = null;
    }
  });
  state.player.positions[positionId] = person;
  AudioEngine.click();
  renderScreen();
}

function startPreElection() {
  state.phase = 'preElection';
  state.month = 0;
  state.year = 1;
  state.totalMonths = 0;
  state.player.isOpposition = false;
  state.player.isKanzler = false;
  nextMonth();
}

// ============================================================
// ABSCHNITT 10: MONATSZYKLUS
// ============================================================

function nextMonth() {
  state.month++;
  state.totalMonths++;
  if (state.month > 12) { state.month = 1; state.year++; }

  // Personal altert
  state.player.personnel.forEach(p => p.months++);

  updateBudget();
  fluctuateAIParties();
  recalculateApproval();
  updateRegionalApprovals();

  // Zustimmungshistorie aufzeichnen
  state.player.approvalHistory.push({ month: state.totalMonths, approval: state.player.approval });
  if (state.player.approvalHistory.length > 60) state.player.approvalHistory.shift();

  // Ministerskandale (nur als Kanzler)
  if (state.phase === 'governance' && state.player.isKanzler && Math.random() < 0.04) {
    const ministerIds = Object.keys(state.player.ministers).filter(k => state.player.ministers[k]);
    if (ministerIds.length > 0) {
      const scandalMinId = pick(ministerIds);
      const scandalMin = state.player.ministers[scandalMinId];
      if (scandalMin && scandalMin.skill < 50 && Math.random() < 0.3) {
        scandalMin.scandals++;
        state.player.media = clamp(state.player.media - 3, 0, 100);
        const posName = MINISTER_POSITIONS.find(m => m.id === scandalMinId)?.name || 'Minister/in';
        addNews(`Skandal: ${scandalMin.name} (${posName}) unter massivem Druck`);
      }
    }
  }

  // Koalitionszufriedenheit sinkt langsam
  if (state.phase === 'governance' && state.player.isKanzler && state.player.coalitionPartners.length > 0) {
    state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction - rand(0.3, 1.2), 0, 100);
    if (state.player.coalitionSatisfaction < 30 && Math.random() < 0.15) {
      state.pendingKoalitionskrise = true;
    }
  }

  // Spendenangebot (10% Chance, nicht in Wahlkampf)
  if (Math.random() < 0.1 && state.phase !== 'campaign') {
    if (typeof DONATION_EVENTS !== 'undefined' && DONATION_EVENTS.length > 0) {
      state.pendingDonation = pick(DONATION_EVENTS);
    }
  }

  // Parteitag (alle 6 Monate)
  if (state.totalMonths - state.player.lastParteitag >= 6 && state.phase !== 'campaign') {
    state.pendingParteitag = true;
  }

  // Plenardebatte (als Kanzler, 20% Chance)
  if (state.phase === 'governance' && state.player.isKanzler && Math.random() < 0.2
      && !state.pendingDonation && !state.pendingParteitag) {
    if (typeof PLENARDEBATTE_TOPICS !== 'undefined' && PLENARDEBATTE_TOPICS.length > 0) {
      state.pendingPlenarDebatte = pick(PLENARDEBATTE_TOPICS);
    }
  }

  // Saisonale Effekte (Sommerloch)
  if (state.month >= 6 && state.month <= 8) {
    state.player.media = clamp(state.player.media - 1, 20, 100);
  }

  // Landtagswahl (6% Chance während Regierung)
  if (state.phase === 'governance' && Math.random() < 0.06
      && !state.pendingDonation && !state.pendingParteitag && !state.pendingPlenarDebatte) {
    state.pendingLandtagswahl = pick(BUNDESLAENDER);
  }

  // Bundespräsidentenwahl
  if (state.phase === 'governance' && state.player.isKanzler && !state.bpElectionHeld
      && state.governanceMonth >= 12 && state.governanceMonth <= 18 && !state.bundespraesident) {
    if (Math.random() < 0.3) holdBundespraesidentWahl();
  }

  // Vertrauensfrage bei sehr niedrigem Rückhalt
  if (state.phase === 'governance' && state.player.isKanzler && state.player.approval < 15
      && Math.random() < 0.08 && !state.pendingVertrauensfrage) {
    state.pendingVertrauensfrage = true;
  }

  // Campaign month advance
  if (state.phase === 'campaign') {
    state.campaignMonth = (state.campaignMonth || 0) + 1;
    if (state.campaignMonth >= state.campaignMonths) {
      runElection();
      return;
    }
  }

  // Governance month advance
  if (state.phase === 'governance') {
    state.governanceMonth = (state.governanceMonth || 0) + 1;
    if (state.governanceMonth >= state.governanceMonths) {
      triggerReElection();
      return;
    }
  }

  // Event generieren
  nextEvent();
  renderScreen();
}

function nextEvent() {
  // Event-Pool je nach Phase auswählen
  let pool = [];
  if (state.phase === 'campaign') {
    if (typeof CAMPAIGN_EVENTS !== 'undefined') pool = CAMPAIGN_EVENTS;
    else pool = typeof EVENTS_POOL !== 'undefined' ? EVENTS_POOL : [];
  } else if (state.phase === 'governance') {
    const base = typeof EVENTS_POOL !== 'undefined' ? EVENTS_POOL : [];
    const gov = typeof GOVERNANCE_EVENTS !== 'undefined' ? GOVERNANCE_EVENTS : [];
    pool = [...base, ...gov];
    // Regierungsspezifische Events filtern
    if (state.player.isKanzler) {
      pool = pool.filter(e => !e.isOppositionOnly);
    } else {
      pool = pool.filter(e => !e.isGovernmentOnly && !e.requiresKanzler);
    }
  } else {
    pool = typeof EVENTS_POOL !== 'undefined' ? EVENTS_POOL : [];
    pool = pool.filter(e => !e.isGovernmentOnly && !e.isOppositionOnly);
  }

  if (pool.length === 0) return;

  // Bereits benutzte Events vermeiden (Puffer von 20)
  const usedSet = state.usedEvents;
  const available = pool.filter(e => !usedSet.includes(e.id));
  const refreshed = available.length > 0 ? available : pool;

  // Themen-Bonifikation für Kernthemen der Partei
  const preferred = refreshed.filter(e => state.player.topics.includes(e.topic));
  const source = preferred.length > 0 && Math.random() < 0.5 ? preferred : refreshed;
  const event = pick(source);

  state.currentEvent = event;
  state.usedEvents.push(event.id);
  if (state.usedEvents.length > 20) state.usedEvents.shift();

  addNews(event.headline);
}

function addNews(headline) {
  state.newsHistory.unshift({ headline, month: state.totalMonths });
  if (state.newsHistory.length > 30) state.newsHistory.pop();
}

// ============================================================
// ABSCHNITT 11: ENTSCHEIDUNGSVERARBEITUNG
// ============================================================

function applyDecision(optionIndex) {
  if (!state.currentEvent) return;
  const event = state.currentEvent;
  const option = event.options[optionIndex];
  if (!option) return;
  const eff = option.effects || {};
  const va = state.player.voterApproval;

  // Bonifikationen berechnen
  const topicBonus = state.player.topics.includes(event.topic) ? 1.3 : 1.0;
  const pressSkill = state.player.positions['pressesprecher'];
  const pressBonus = pressSkill ? 1 + (pressSkill.skill - 50) / 200 : 1.0;

  VOTER_GROUPS.forEach(g => {
    const base = eff[g.id] || 0;
    va[g.id] = clamp(va[g.id] + base * topicBonus * pressBonus, 0, 60);
  });

  if (eff.media !== undefined) {
    state.player.media = clamp(state.player.media + eff.media * pressBonus, 0, 100);
  }
  if (eff.credibility !== undefined) {
    state.player.credibility = clamp(state.player.credibility + eff.credibility, 0, 100);
  }
  if (eff.budget !== undefined) {
    const treasurerSkill = state.player.positions['schatzmeister'];
    const treasBonus = treasurerSkill ? 1 + (treasurerSkill.skill - 50) / 200 : 1;
    state.player.budget.balance += eff.budget * (eff.budget > 0 ? treasBonus : (2 - treasBonus));
  }

  // Koalitionszufriedenheit beeinflusst Entscheidungen
  if (state.phase === 'governance' && state.player.isKanzler && state.player.coalitionPartners.length > 0) {
    const stanceEffect = option.stance === 'radical' ? -5 : option.stance === 'progressive' ? -2 : option.stance === 'conservative' ? -2 : 0;
    state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction + stanceEffect + rand(-1, 2), 0, 100);
  }

  recalculateApproval();
  state.currentEvent = null;
  advancePhase();
}

function advancePhase() {
  if (state.phase === 'preElection') {
    if (state.totalMonths >= state.maxPreElectionMonths) {
      state.phase = 'campaign';
      state.campaignMonth = 0;
      state.activeTab = 'campaign';
    }
    advanceToNextAction();
  } else if (state.phase === 'campaign') {
    // Campaign months are advanced in nextMonth() — just route to next action
    advanceToNextAction();
  } else if (state.phase === 'governance') {
    // Governance months are advanced in nextMonth() — just route to next action
    advanceToNextAction();
  }
}

function advanceToNextAction() {
  if (state.pendingDonation)      { renderScreen(); return; }
  if (state.pendingParteitag)     { renderScreen(); return; }
  if (state.currentParteitagTopic){ renderScreen(); return; }
  if (state.pendingPlenarDebatte) { renderScreen(); return; }
  if (state.pendingLandtagswahl)  { renderScreen(); return; }
  if (state.pendingVertrauensfrage){ renderScreen(); return; }
  if (state.pendingKoalitionskrise){ renderScreen(); return; }
  renderScreen();
}

// ============================================================
// ABSCHNITT 12: BUDGET
// ============================================================

function updateBudget() {
  const b = state.player.budget;
  const treasurerSkill = state.player.positions['schatzmeister'] ?
    state.player.positions['schatzmeister'].skill / 100 : 0.5;

  b.memberDues = Math.round(100000 + state.player.approval * 5000 * treasurerSkill);
  b.donations  = Math.round(30000 + state.player.approval * 2000 + Math.random() * 20000);
  b.stateFunding = Math.round(state.player.approval * 8000);

  // Als Kanzler zusätzliche Staatsfinanzierung
  if (state.player.isKanzler) {
    b.stateFunding += Math.round(state.player.seats * 1200);
  }

  b.monthlyIncome = b.memberDues + b.donations + b.stateFunding;

  const personnelCount = Object.values(state.player.positions).filter(Boolean).length;
  const ministerCount = Object.values(state.player.ministers).filter(Boolean).length;
  b.staffCosts = Math.round(80000 + personnelCount * 15000 + ministerCount * 10000);
  b.officeCosts = 30000;
  const campaignTotal = Object.values(b.campaignSpending).reduce((s, v) => s + v, 0);
  b.monthlyExpenses = b.staffCosts + b.officeCosts + campaignTotal + b.mediaSpending;

  b.balance += b.monthlyIncome - b.monthlyExpenses;

  if (b.balance < 0) {
    b.debt = Math.abs(b.balance);
    state.player.credibility = clamp(state.player.credibility - 2, 0, 100);
  } else {
    b.debt = 0;
  }
}

// ============================================================
// ABSCHNITT 13: ZUSTIMMUNGSBERECHNUNG & KI-SCHWANKUNGEN
// ============================================================

function recalculateApproval() {
  const va = state.player.voterApproval;
  let sum = 0;
  VOTER_GROUPS.forEach(g => { sum += va[g.id] * g.weight; });

  const mediaMod   = (state.player.media - 50) * 0.05;
  const credMod    = (state.player.credibility - 50) * 0.03;
  const unityMod   = (state.player.partyUnity - 50) * 0.02;
  const coalMod    = state.player.isKanzler ?
    (state.player.coalitionSatisfaction - 50) * 0.015 : 0;

  state.player.approval = clamp(sum + mediaMod + credMod + unityMod + coalMod, 1, 55);
}

function fluctuateAIParties() {
  state.parties.forEach(p => {
    p.approval = clamp(p.approval + rand(-1.2, 1.2), 3, 40);
  });
  const playerApp = state.player.approval;
  const totalAI = state.parties.reduce((s, p) => s + p.approval, 0);
  const target = 100 - playerApp;
  if (totalAI > 0) {
    const scale = target / totalAI;
    state.parties.forEach(p => { p.approval = clamp(p.approval * scale, 2, 40); });
  }
}

function updateRegionalApprovals() {
  BUNDESLAENDER.forEach(bl => {
    const r = state.player.regional[bl.id];
    if (!r) return;
    const leanEffect  = -bl.lean * state.player.alignment.economic * 2;
    const workerEff   = r.workers * 0.3;
    const investEff   = r.investment * 0.0001;
    const genSkill    = state.player.positions['generalsekretaer'] ?
      state.player.positions['generalsekretaer'].skill / 200 : 0;
    r.approval = clamp(state.player.approval + leanEffect + workerEff + investEff + genSkill + rand(-0.5, 0.5), 1, 55);
  });
}

// ============================================================
// ABSCHNITT 14: PARTEITAG
// ============================================================

function runParteitag(argumentIndex) {
  const topic = state.currentParteitagTopic;
  if (!topic) return;
  const arg = topic.arguments[argumentIndex];
  // Map data wings to left/center/right spectrum
  const wingToSpectrum = w => (w === 'links' || w === 'mitte-links') ? 'left' :
    (w === 'rechts' || w === 'mitte-rechts') ? 'right' : 'center';
  const playerWing = state.player.alignment.economic < -0.2 ? 'left' :
                     state.player.alignment.economic > 0.2 ? 'right' : 'center';
  const argSpectrum = wingToSpectrum(arg.wing);
  const wingMatch = argSpectrum === playerWing ? 1.3 : argSpectrum === 'center' ? 1.0 : 0.7;
  const stellvBonus = (state.player.positions['stellvertreter1']?.loyalty || 50) / 200 +
                      (state.player.positions['stellvertreter2']?.loyalty || 50) / 200;
  const baseStrength = arg.strength || 0.75; // Default strength if not defined
  const success = baseStrength * wingMatch * (0.8 + stellvBonus) + rand(-0.1, 0.1);

  if (success > 0.7) {
    state.player.partyUnity = clamp(state.player.partyUnity + randInt(3, 8), 0, 100);
    state.player.media = clamp(state.player.media + 2, 0, 100);
    state.parteitagResult = { success: true, text: 'Ihr Antrag wurde mit großer Mehrheit angenommen!' };
    AudioEngine.success();
  } else {
    state.player.partyUnity = clamp(state.player.partyUnity - randInt(3, 8), 0, 100);
    state.player.media = clamp(state.player.media - 1, 0, 100);
    state.parteitagResult = { success: false, text: 'Ihr Antrag wurde knapp abgelehnt. Die Delegierten sind unzufrieden.' };
    AudioEngine.failure();
  }

  state.player.lastParteitag = state.totalMonths;
  state.pendingParteitag = false;
  state.currentParteitagTopic = null;
  recalculateApproval();
  renderScreen();
}

// ============================================================
// ABSCHNITT 15: PLENARDEBATTE
// ============================================================

function handlePlenarDebatte(argIndex) {
  const debate = state.pendingPlenarDebatte;
  const fraktionSkill = state.player.positions['fraktionsvorsitz'] ?
    state.player.positions['fraktionsvorsitz'].skill / 100 : 0.5;
  const success = Math.random() < (0.4 + fraktionSkill * 0.4);

  if (success) {
    state.player.media = clamp(state.player.media + 3, 0, 100);
    state.player.lawsPassed = (state.player.lawsPassed || 0) + 1;
    VOTER_GROUPS.forEach(g => {
      state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] + rand(0.5, 2), 0, 60);
    });
    addNews(`Gesetz „${debate.title}" im Bundestag verabschiedet`);
    state.debateResult = { type: 'plenar', success: true, title: debate.title };
    AudioEngine.success();
  } else {
    state.player.media = clamp(state.player.media - 2, 0, 100);
    VOTER_GROUPS.forEach(g => {
      state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] - rand(0.3, 1), 0, 60);
    });
    addNews(`Regierung scheitert mit „${debate.title}" im Bundestag`);
    state.debateResult = { type: 'plenar', success: false, title: debate.title };
    AudioEngine.failure();
  }

  state.pendingPlenarDebatte = null;
  recalculateApproval();
  renderScreen();
}

// ============================================================
// ABSCHNITT 16: SPENDE
// ============================================================

function handleDonation(accept) {
  const d = state.pendingDonation;
  if (!d) return;

  if (accept) {
    state.player.budget.balance += d.amount;
    Object.entries(d.effectAccept || {}).forEach(([group, val]) => {
      if (state.player.voterApproval[group] !== undefined)
        state.player.voterApproval[group] = clamp(state.player.voterApproval[group] + val, 0, 60);
    });
    state.player.credibility = clamp(state.player.credibility - 3, 0, 100);
    addNews(`${state.player.short} nimmt Großspende von ${d.donor} an (${fmtCurrency(d.amount)})`);
  } else {
    Object.entries(d.effectReject || {}).forEach(([group, val]) => {
      if (state.player.voterApproval[group] !== undefined)
        state.player.voterApproval[group] = clamp(state.player.voterApproval[group] + val, 0, 60);
    });
    state.player.credibility = clamp(state.player.credibility + 2, 0, 100);
    addNews(`${state.player.short} lehnt Großspende von ${d.donor} ab`);
  }
  state.pendingDonation = null;
  recalculateApproval();
  AudioEngine.click();
  renderScreen();
}

// ============================================================
// ABSCHNITT 17: LANDTAGSWAHL
// ============================================================

function handleLandtagswahl() {
  const bl = state.pendingLandtagswahl;
  const r = state.player.regional[bl.id];
  const result = r ? r.approval : state.player.approval;
  const diff = (result - state.player.approval) * 0.1;
  state.player.approval = clamp(state.player.approval + diff, 1, 55);
  addNews(`Landtagswahl in ${bl.name}: ${state.player.short} erzielt ${fmtPct(result)}`);
  state.pendingLandtagswahl = null;
  AudioEngine.election();
  renderScreen();
}

// ============================================================
// ABSCHNITT 18: BUNDESPRÄSIDENT
// ============================================================

function holdBundespraesidentWahl() {
  const winner = generatePerson('center');
  state.bundespraesident = {
    name: winner.name,
    age: winner.age,
    party: state.player.isKanzler ? state.player.short : state.parties[0].short,
  };
  state.bpElectionHeld = true;
  addNews(`${winner.name} zum Bundespräsidenten gewählt`);
}

// ============================================================
// ABSCHNITT 19: VERTRAUENSFRAGE
// ============================================================

function handleVertrauensfrage(vertrauen) {
  if (vertrauen) {
    // Kanzler gewinnt Vertrauensfrage
    state.player.partyUnity = clamp(state.player.partyUnity + 5, 0, 100);
    state.player.media = clamp(state.player.media + 3, 0, 100);
    addNews(`${state.player.short} gewinnt Vertrauensfrage im Bundestag`);
    AudioEngine.success();
  } else {
    // Niederlage → Neuwahl
    addNews(`${state.player.short} verliert Vertrauensfrage — Neuwahlen erforderlich`);
    AudioEngine.failure();
    state.pendingVertrauensfrage = false;
    state.debateResult = { type: 'vertrauensfrage', success: false };
    renderScreen();
    return;
  }
  state.pendingVertrauensfrage = false;
  renderScreen();
}

function handleKoalitionskrise(option) {
  // option: 'concede' (nachgeben), 'stand_firm' (hart bleiben), 'neuwahlen'
  if (option === 'concede') {
    state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction + 20, 0, 100);
    state.player.approval = clamp(state.player.approval - 1, 1, 55);
    state.player.credibility = clamp(state.player.credibility - 3, 0, 100);
    addNews(`Koalitionskrise gelöst: ${state.player.short} macht Zugeständnisse`);
    AudioEngine.click();
  } else if (option === 'stand_firm') {
    const koalBreaks = Math.random() < 0.4;
    if (koalBreaks) {
      state.player.coalitionBroken = true;
      state.player.coalitionPartners = [];
      state.player.inGovernment = false;
      state.player.isKanzler = false;
      addNews(`Koalitionsbruch! ${state.player.short} verliert Regierungsmehrheit`);
      AudioEngine.failure();
      state.pendingKoalitionskrise = false;
      state.phase = 'governance';
      state.player.isOpposition = true;
      renderScreen();
      return;
    } else {
      state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction - 5, 0, 100);
      state.player.media = clamp(state.player.media + 2, 0, 100);
      addNews(`${state.player.short} bleibt in Koalitionskrise standhaft`);
      AudioEngine.click();
    }
  } else if (option === 'neuwahlen') {
    addNews(`${state.player.short} löst Koalition auf — Neuwahlen`);
    state.pendingKoalitionskrise = false;
    triggerReElection();
    return;
  }
  state.pendingKoalitionskrise = false;
  renderScreen();
}

// ============================================================
// ABSCHNITT 20: WAHLKAMPF — KAMPAGNENWERKZEUGE
// ============================================================

function applyCampaignTool(toolId, amount) {
  const b = state.player.budget;
  if (b.balance < amount) {
    showToast('Nicht genug Budget für diese Kampagnenmaßnahme!');
    return;
  }
  b.balance -= amount;
  const va = state.player.voterApproval;

  switch (toolId) {
    case 'plakate':
      state.player.campaignTools.plakate += amount;
      va.land     = clamp(va.land + rand(1, 3), 0, 60);
      va.rentner  = clamp(va.rentner + rand(0.5, 2), 0, 60);
      state.player.media = clamp(state.player.media + rand(1, 2), 0, 100);
      addNews(`${state.player.short} startet großangelegte Plakatwahlkampf`);
      break;
    case 'tvSpots':
      state.player.campaignTools.tvSpots += amount;
      va.rentner  = clamp(va.rentner + rand(1, 3), 0, 60);
      va.arbeiter = clamp(va.arbeiter + rand(0.5, 2), 0, 60);
      state.player.media = clamp(state.player.media + rand(2, 4), 0, 100);
      addNews(`${state.player.short} schaltet TV-Wahlwerbespots`);
      break;
    case 'socialMedia':
      state.player.campaignTools.socialMedia += amount;
      va.jugend       = clamp(va.jugend + rand(2, 4), 0, 60);
      va.akademiker   = clamp(va.akademiker + rand(1, 2), 0, 60);
      state.player.media = clamp(state.player.media + rand(1, 2), 0, 100);
      addNews(`${state.player.short} dominiert soziale Medien`);
      break;
    case 'kundgebungen':
      state.player.campaignTools.kundgebungen += amount;
      VOTER_GROUPS.forEach(g => { va[g.id] = clamp(va[g.id] + rand(0.5, 1.5), 0, 60); });
      state.player.partyUnity = clamp(state.player.partyUnity + rand(2, 5), 0, 100);
      addNews(`${state.player.short} mobilisiert Tausende bei Großkundgebung`);
      break;
    case 'haustuer':
      state.player.campaignTools.wahlkampfbus += amount;
      va.arbeiter = clamp(va.arbeiter + rand(1, 3), 0, 60);
      va.rentner  = clamp(va.rentner + rand(1, 2), 0, 60);
      BUNDESLAENDER.forEach(bl => {
        const r = state.player.regional[bl.id];
        if (r) r.approval = clamp(r.approval + rand(0.2, 0.8), 1, 55);
      });
      addNews(`${state.player.short} startet Haustür-Wahlkampf`);
      break;
    case 'wahlkampfbus':
      state.player.campaignTools.wahlkampfbus += amount;
      va.land     = clamp(va.land + rand(2, 4), 0, 60);
      va.arbeiter = clamp(va.arbeiter + rand(1, 2), 0, 60);
      addNews(`${state.player.short}-Bus-Tour durch alle 16 Bundesländer`);
      break;
  }

  recalculateApproval();
  AudioEngine.budget();
  renderScreen();
}

// TV-DUELLE
function startTvDuell() {
  // Gegner: meistgewählte KI-Partei
  const opponent = state.parties.slice().sort((a, b) => b.approval - a.approval)[0];
  state.player.currentTvDuellOpponent = opponent;
  state.player.tvDuellRound = 0;
  state.phase = 'tvDuell';
  renderScreen();
}

function applyTvDuellStrategy(strategy) {
  const opponent = state.player.currentTvDuellOpponent;
  const pressSkill  = state.player.positions['pressesprecher'] ?
    state.player.positions['pressesprecher'].skill / 100 : 0.5;
  const fraktionSkill = state.player.positions['fraktionsvorsitz'] ?
    state.player.positions['fraktionsvorsitz'].skill / 100 : 0.5;
  const debateSkill = (pressSkill + fraktionSkill) / 2;
  const va = state.player.voterApproval;

  const strategies = {
    angriff:   { arbeiter: 2, akademiker: -1, rentner: 1, jugend: 3, selbststaendige: 0, land: 1, media: 3, risk: 0.35 },
    sachlich:  { arbeiter: 1, akademiker: 3, rentner: 2, jugend: 0, selbststaendige: 2, land: 1, media: 1, risk: 0.1  },
    emotional: { arbeiter: 3, akademiker: -1, rentner: 3, jugend: 2, selbststaendige: -1, land: 3, media: 2, risk: 0.2 },
    visionaer: { arbeiter: 0, akademiker: 2, rentner: -1, jugend: 4, selbststaendige: 1, land: 0, media: 2, risk: 0.15 },
  };

  const s = strategies[strategy];
  if (!s) return;

  const success = Math.random() > s.risk * (1 - debateSkill);
  const multiplier = success ? 1 : -0.5;

  VOTER_GROUPS.forEach(g => {
    const effect = (s[g.id] || 0) * multiplier * debateSkill * 1.5;
    va[g.id] = clamp(va[g.id] + effect, 0, 60);
  });
  state.player.media = clamp(state.player.media + (s.media || 0) * multiplier, 0, 100);

  const round = state.player.tvDuellRound + 1;
  state.player.tvDuellResults.push({ round, strategy, success });
  state.player.tvDuellRound = round;

  recalculateApproval();

  if (round >= 3) {
    // TV-Duell abgeschlossen
    const wins = state.player.tvDuellResults.filter(r => r.success).length;
    state.debateResult = { type: 'tvduell', success: wins >= 2, wins, rounds: round };
    state.phase = 'campaign';
    AudioEngine.debate();
    renderScreen();
  } else {
    AudioEngine.debate();
    renderScreen();
  }
}

// ============================================================
// ABSCHNITT 21: BUNDESTAGSWAHL
// ============================================================

function runElection() {
  state.phase = 'election';
  const totalSeats = 598;
  const playerPercent = state.player.approval;
  const passedThreshold = playerPercent >= 5;
  state.player.passedThreshold = passedThreshold;

  const allParties = [
    { id: 'player', name: state.player.name, short: state.player.short,
      color: state.player.color, percent: playerPercent, passedThreshold },
    ...state.parties.map(p => ({ ...p, percent: p.approval, passedThreshold: p.approval >= 5 })),
  ];

  const validParties = allParties.filter(p => p.passedThreshold);
  const totalValid = validParties.reduce((s, p) => s + p.percent, 0);

  validParties.forEach(p => {
    p.seats = Math.round((p.percent / totalValid) * totalSeats);
  });

  // Sitzkorrektur
  const totalAssigned = validParties.reduce((s, p) => s + p.seats, 0);
  if (totalAssigned !== totalSeats && validParties.length > 0) {
    validParties[0].seats += totalSeats - totalAssigned;
  }

  const playerResult = validParties.find(p => p.id === 'player');
  state.player.seats = playerResult ? playerResult.seats : 0;

  state.parties.forEach(p => {
    const r = validParties.find(v => v.id === p.id);
    p.seats = r ? r.seats : 0;
    p.passedThreshold = p.approval >= 5;
  });

  // Direktmandate
  const direktResults = {};
  BUNDESLAENDER.forEach(bl => {
    const r = state.player.regional[bl.id];
    const playerRegional = r ? r.approval : state.player.approval;
    const playerShare = playerRegional / 100;
    const won = Math.round(bl.wahlkreise * playerShare * (0.8 + Math.random() * 0.4));
    direktResults[bl.id] = clamp(won, 0, bl.wahlkreise);
  });
  state.player.regionalResults = direktResults;
  const totalDirekt = Object.values(direktResults).reduce((s, v) => s + v, 0);

  // Überhangmandate
  const ueberhang = Math.max(0, totalDirekt - (state.player.seats || 0));
  if (ueberhang > 0) state.player.seats += ueberhang;

  state.electionResults = {
    allParties: validParties,
    playerPercent,
    passedThreshold,
    totalDirekt,
    ueberhang,
    direktResults,
  };

  state.player.budget.stateFunding = Math.round(playerPercent * 12000);
  AudioEngine.election();
  renderScreen();
}

// ============================================================
// ABSCHNITT 22: KOALITIONSFINDUNG & VERHANDLUNG
// ============================================================

function findCoalitionOptions() {
  const majority = 300;
  const options = [];
  const eligible = state.parties.filter(p => p.passedThreshold && p.seats > 0);

  if (state.player.seats >= majority) {
    options.push({ partners: [], totalSeats: state.player.seats, name: 'Alleinregierung', compatibility: 100 });
  }

  for (let i = 0; i < eligible.length; i++) {
    const total = state.player.seats + eligible[i].seats;
    if (total >= majority) {
      const compat = calculateCoalitionCompat(eligible[i]);
      options.push({
        partners: [eligible[i]], totalSeats: total,
        name: `${state.player.short}–${eligible[i].short}`, compatibility: compat,
      });
    }
  }

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const total = state.player.seats + eligible[i].seats + eligible[j].seats;
      if (total >= majority) {
        const compat = (calculateCoalitionCompat(eligible[i]) + calculateCoalitionCompat(eligible[j])) / 2;
        options.push({
          partners: [eligible[i], eligible[j]], totalSeats: total,
          name: `${state.player.short}–${eligible[i].short}–${eligible[j].short}`, compatibility: compat,
        });
      }
    }
  }

  options.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));
  return options.slice(0, 6);
}

function calculateCoalitionCompat(party) {
  const pe = state.player.alignment.economic;
  const ps = state.player.alignment.social;
  const ae = party.alignment.economic;
  const as = party.alignment.social;
  const dist = Math.sqrt((pe - ae) ** 2 + (ps - as) ** 2);
  return clamp(100 - dist * 50, 10, 100);
}

// Koalitionsverhandlung starten
function startCoalitionNegotiation(optionIndex) {
  const option = state.coalitionOptions[optionIndex];
  if (!option) return;

  if (option.partners.length === 0) {
    // Alleinregierung — direkt zu Kabinettsbildung
    state.selectedCoalition = option;
    state.player.inGovernment = true;
    state.player.isKanzler = true;
    state.player.coalitionPartners = [];
    state.player.coalitionSatisfaction = 100;
    state.phase = 'ministerSelection';
    AudioEngine.success();
    renderScreen();
    return;
  }

  // Mehrstufige Verhandlung starten
  state.coalitionNegotiation = {
    phase: 'sondierung',       // 'sondierung' → 'verhandlung' → 'vertrag'
    option: option,
    currentPartnerIndex: 0,
    sondierungRound: 0,
    maxSondierungsRounds: 3,
    agreements: {},            // { policyArea: compromise }
    partnerDemands: generatePartnerDemands(option.partners),
    concessions: 0,
    failed: false,
  };
  state.phase = 'coalition';
  AudioEngine.click();
  renderScreen();
}

function generatePartnerDemands(partners) {
  const demands = [];
  partners.forEach(partner => {
    COALITION_POLICY_AREAS.forEach(area => {
      const stance = Math.random() < 0.5 ? 'links' : 'rechts';
      const strength = rand(0.3, 0.9);
      demands.push({ partner: partner.id, area: area.id, stance, strength });
    });
    // Ministeriumsforderungen
    const ministerDemands = (partner.demandMinisterien || []).slice(0, 2);
    demands.push({ partner: partner.id, type: 'minister', ministerien: ministerDemands });
  });
  return demands;
}

function advanceCoalitionNegotiation(choice) {
  const neg = state.coalitionNegotiation;
  if (!neg) return;

  if (neg.phase === 'sondierung') {
    // choice: 'agree', 'compromise', 'reject'
    if (choice === 'agree') {
      neg.sondierungRound++;
      COALITION_POLICY_AREAS.forEach(area => {
        neg.agreements[area.id] = 'einigung';
      });
    } else if (choice === 'compromise') {
      neg.sondierungRound++;
      neg.concessions++;
      COALITION_POLICY_AREAS.forEach(area => {
        if (!neg.agreements[area.id]) neg.agreements[area.id] = 'kompromiss';
      });
    } else {
      // Sondierung gescheitert
      neg.failed = true;
    }

    if (neg.failed || neg.sondierungRound >= neg.maxSondierungsRounds) {
      if (!neg.failed) neg.phase = 'verhandlung';
    }

  } else if (neg.phase === 'verhandlung') {
    // Formale Verhandlungen — Policy-Bereiche durchgehen
    const nextArea = COALITION_POLICY_AREAS.find(a => !neg.agreements[a.id] || neg.agreements[a.id] === 'offen');
    if (choice === 'accept') {
      if (nextArea) neg.agreements[nextArea.id] = 'akzeptiert';
    } else if (choice === 'counter') {
      if (nextArea) neg.agreements[nextArea.id] = 'gegenentwurf';
      neg.concessions++;
    } else if (choice === 'reject') {
      if (nextArea) neg.agreements[nextArea.id] = 'abgelehnt';
    }

    const allDone = COALITION_POLICY_AREAS.every(a => neg.agreements[a.id] && neg.agreements[a.id] !== 'offen');
    const rejected = Object.values(neg.agreements).filter(v => v === 'abgelehnt').length;

    if (allDone) {
      if (rejected > 2) {
        neg.failed = true;
      } else {
        neg.phase = 'vertrag';
      }
    }

  } else if (neg.phase === 'vertrag') {
    // Koalitionsvertrag unterschreiben
    if (choice === 'sign') {
      finalizeCoalition(neg);
      return;
    } else {
      neg.failed = true;
    }
  }

  if (neg.failed) {
    // Verhandlung gescheitert
    showToast('Koalitionsverhandlungen gescheitert. Neue Sondierungen nötig.');
    state.coalitionNegotiation = null;
    state.phase = 'election';
    renderScreen();
    return;
  }

  renderScreen();
}

function finalizeCoalition(neg) {
  const option = neg.option;
  state.selectedCoalition = option;
  state.player.inGovernment = true;
  state.player.isKanzler = true;
  state.player.coalitionPartners = option.partners;
  state.player.coalitionSatisfaction = 70;
  state.player.coalitionAgreements = neg.agreements;
  state.player.coalitionBroken = false;

  // Koalitionspartner-Zustimmung leicht senken bei vielen Zugeständnissen
  if (neg.concessions > 3) {
    state.player.approval = clamp(state.player.approval - 0.5, 1, 55);
    state.player.credibility = clamp(state.player.credibility - 3, 0, 100);
  }

  const partnerNames = option.partners.map(p => p.short).join(', ');
  addNews(`Koalitionsvertrag unterzeichnet: ${state.player.short}${partnerNames ? ' mit ' + partnerNames : ''}`);
  state.coalitionNegotiation = null;
  AudioEngine.fanfare();
  state.phase = 'ministerSelection';
  renderScreen();
}

function goToOpposition() {
  state.player.inGovernment = false;
  state.player.isKanzler = false;
  state.player.isOpposition = true;
  state.player.coalitionPartners = [];
  state.phase = 'governance';
  state.governanceMonth = 0;
  addNews(`${state.player.short} geht in die Opposition`);
  nextMonth();
}

// ============================================================
// ABSCHNITT 23: KABINETTSBILDUNG
// ============================================================

function assignMinister(positionId, personId) {
  const person = state.player.personnel.find(p => p.id === personId);
  if (!person) {
    state.player.ministers[positionId] = null;
    AudioEngine.click();
    renderScreen();
    return;
  }
  Object.keys(state.player.ministers).forEach(mid => {
    if (state.player.ministers[mid] && state.player.ministers[mid].id === personId) {
      state.player.ministers[mid] = null;
    }
  });
  state.player.ministers[positionId] = person;
  AudioEngine.click();
  renderScreen();
}

function startGovernance() {
  state.phase = 'governance';
  state.governanceMonth = 0;
  state.activeTab = 'event';
  nextMonth();
}

// ============================================================
// ABSCHNITT 24: GESETZGEBUNGSPIPELINE (als Kanzler)
// ============================================================

function proposeLaw(lawId) {
  if (typeof GESETZGEBUNG_POOL === 'undefined') return;
  const law = GESETZGEBUNG_POOL.find(l => l.id === lawId);
  if (!law) return;

  state.player.pendingLaw = {
    ...law,
    title: law.title || law.name,  // Daten verwenden 'name', Engine erwartet 'title'
    requiresBundesrat: law.requiresBundesrat ?? law.zustimmungspflichtig ?? false,
    stage: 'ersteLesung',  // ersteLesung → ausschuss → zweiteLesung → bundesrat → veroeffentlicht
    supportPercent: calculateLawSupport(law),
    amendmentsApplied: false,
  };
  state.activeTab = 'gesetze';
  AudioEngine.click();
  renderScreen();
}

function calculateLawSupport(law) {
  const coalition = state.player.seats / 598 * 100;
  const agendaBonus = state.player.governmentAgenda.includes(law.topic) ? 5 : 0;
  const approvalFactor = (state.player.approval / 30) * 10;
  return clamp(coalition + agendaBonus + approvalFactor + rand(-5, 5), 10, 99);
}

function advanceLaw(choice) {
  const law = state.player.pendingLaw;
  if (!law) return;

  if (law.stage === 'ersteLesung') {
    law.stage = choice === 'ausschuss' ? 'ausschuss' : 'ausschuss';
    addNews(`Gesetzentwurf „${law.title}" in Erste Lesung eingebracht`);

  } else if (law.stage === 'ausschuss') {
    if (choice === 'amend') {
      law.amendmentsApplied = true;
      law.supportPercent = clamp(law.supportPercent + rand(3, 8), 10, 99);
      addNews(`Ausschuss: „${law.title}" wurde überarbeitet`);
    }
    law.stage = 'zweiteLesung';

  } else if (law.stage === 'zweiteLesung') {
    law.stage = 'dritterLesung';

  } else if (law.stage === 'dritterLesung') {
    // Abstimmung
    const passes = law.supportPercent > 50;
    if (passes) {
      // Bundesrat-Check (zustimmungspflichtig?)
      if (law.requiresBundesrat) {
        law.stage = 'bundesrat';
        addNews(`„${law.title}" geht in den Bundesrat`);
      } else {
        passLaw(law);
        return;
      }
    } else {
      failLaw(law);
      return;
    }

  } else if (law.stage === 'bundesrat') {
    const bundesratApproves = Math.random() < 0.6;
    if (bundesratApproves) {
      passLaw(law);
    } else {
      law.stage = 'vermittlung';
      addNews(`Bundesrat lehnt „${law.title}" ab — Vermittlungsausschuss`);
    }

  } else if (law.stage === 'vermittlung') {
    if (choice === 'compromise') {
      passLaw(law);
    } else {
      failLaw(law);
    }
  }

  renderScreen();
}

function passLaw(law) {
  state.player.passedLaws.push({ id: law.id, title: law.title || law.name, icon: law.icon });
  state.player.lawsPassed = (state.player.lawsPassed || 0) + 1;
  state.player.pendingLaw = null;

  // Effekte anwenden — Datenformat: { arbeiter: 5, media: 2, budget: -200000, ... }
  const eff = law.effects || {};
  if (typeof eff === 'object' && !Array.isArray(eff)) {
    Object.entries(eff).forEach(([key, val]) => {
      if (state.player.voterApproval[key] !== undefined) {
        state.player.voterApproval[key] = clamp(state.player.voterApproval[key] + val, 0, 60);
      } else if (key === 'media')       state.player.media = clamp(state.player.media + val, 0, 100);
      else if (key === 'budget')        state.player.budget.balance += val;
      else if (key === 'credibility')   state.player.credibility = clamp(state.player.credibility + val, 0, 100);
      else if (key === 'coalition')     state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction + val, 0, 100);
    });
  }

  addNews(`Gesetz „${law.title}" verabschiedet!`);
  recalculateApproval();
  AudioEngine.success();
  renderScreen();
}

function failLaw(law) {
  state.player.failedLaws.push({ id: law.id, title: law.title || law.name, icon: law.icon });
  state.player.pendingLaw = null;
  state.player.media = clamp(state.player.media - 3, 0, 100);
  addNews(`Gesetz „${law.title}" gescheitert`);
  recalculateApproval();
  AudioEngine.failure();
  renderScreen();
}

// Regierungsaktionen (monatlich)
function performGovernmentAction(action) {
  const va = state.player.voterApproval;

  switch (action) {
    case 'mediaKampagne':
      if (state.player.budget.balance < 300000) { showToast('Nicht genug Budget!'); return; }
      state.player.budget.balance -= 300000;
      state.player.media = clamp(state.player.media + rand(3, 6), 0, 100);
      addNews(`${state.player.short} startet Medienoffensive`);
      AudioEngine.budget();
      break;
    case 'kabinettsitzung':
      state.player.partyUnity = clamp(state.player.partyUnity + rand(2, 5), 0, 100);
      state.player.coalitionSatisfaction = clamp(state.player.coalitionSatisfaction + rand(3, 7), 0, 100);
      addNews(`${state.player.short} hält produktive Kabinettssitzung ab`);
      AudioEngine.click();
      break;
    case 'internationalGipfel':
      va.akademiker = clamp(va.akademiker + rand(1, 3), 0, 60);
      state.player.media = clamp(state.player.media + rand(1, 3), 0, 100);
      state.player.credibility = clamp(state.player.credibility + rand(1, 3), 0, 100);
      addNews(`${state.player.short} beim Internationalen Gipfel erfolgreich`);
      AudioEngine.click();
      break;
    case 'buergergespraeche':
      VOTER_GROUPS.forEach(g => { va[g.id] = clamp(va[g.id] + rand(0.3, 1), 0, 60); });
      state.player.credibility = clamp(state.player.credibility + rand(1, 3), 0, 100);
      addNews(`${state.player.short} führt Bürgergespräche durch`);
      AudioEngine.click();
      break;
  }
  recalculateApproval();
  renderScreen();
}

// ============================================================
// ABSCHNITT 25: OPPOSITIONSAKTIONEN
// ============================================================

function performOppositionAction(actionId) {
  if (typeof OPPOSITION_ACTIONS === 'undefined') return;
  const action = OPPOSITION_ACTIONS.find(a => a.id === actionId);
  if (!action) return;

  // Abkühlzeit prüfen
  const cooldown = state.player.oppositionCooldowns[actionId] || 0;
  if (state.totalMonths < cooldown) {
    showToast(`Diese Aktion ist noch ${cooldown - state.totalMonths} Monat(e) gesperrt!`);
    return;
  }

  // Abgeordnetenmindestzahl prüfen
  if (action.requiresFraction && state.player.seats < (action.minMandates || 5)) {
    showToast(`Dafür benötigen Sie mindestens ${action.minMandates} Sitze im Bundestag!`);
    return;
  }

  // Effekte anwenden
  const eff = action.effects || {};
  if (eff.media)       state.player.media = clamp(state.player.media + eff.media, 0, 100);
  if (eff.credibility) state.player.credibility = clamp(state.player.credibility + eff.credibility, 0, 100);
  if (eff.approval)    state.player.approval = clamp(state.player.approval + eff.approval, 1, 55);

  // Regierung schwächen (Debuff)
  if (action.governmentDebuff) {
    const govDebuff = action.governmentDebuff;
    if (govDebuff.media) {
      // Wirkt auf Umfragen der Gegner
      state.parties.forEach(p => {
        if (p.seats > 0) p.approval = clamp(p.approval - 0.5, 2, 40);
      });
    }
  }

  // Abkühlzeit setzen
  state.player.oppositionCooldowns[actionId] = state.totalMonths + (action.cooldownMonths || 1);
  state.player.oppositionActions.push({ id: actionId, month: state.totalMonths, name: action.name });

  addNews(`Opposition: ${state.player.short} — ${action.name}`);
  recalculateApproval();
  AudioEngine.click();
  showToast(`${action.name} gestartet!`);
  renderScreen();
}

// ============================================================
// ABSCHNITT 26: REGIONALE KAMPAGNE
// ============================================================

function allocateRegionalCampaign(allocations) {
  Object.entries(allocations).forEach(([blId, alloc]) => {
    if (!state.player.regional[blId]) return;
    state.player.regional[blId].workers   = alloc.workers || 0;
    state.player.regional[blId].investment = alloc.investment || 0;
    state.player.budget.campaignSpending[blId] = alloc.investment || 0;
  });
  updateRegionalApprovals();
  AudioEngine.budget();
  showToast('Regionaler Einsatz aktualisiert!');
  renderScreen();
}

// ============================================================
// ABSCHNITT 27: NEUWAHL / TRIGGERRESET
// ============================================================

function triggerReElection() {
  addNews(`${state.player.short}: Legislaturperiode endet — Neuwahlen`);
  state.phase = 'preElection';
  state.totalMonths = 0;
  state.month = 0;
  state.year = 1;
  state.electionCount++;
  state.player.inGovernment = false;
  state.player.isKanzler = false;
  state.player.isOpposition = false;
  state.player.ministers = {};
  state.player.coalitionPartners = [];
  state.player.coalitionSatisfaction = 70;
  state.player.coalitionBroken = false;
  state.player.pendingLaw = null;
  state.player.lawPipeline = [];
  state.selectedCoalition = null;
  state.coalitionNegotiation = null;
  state.bpElectionHeld = false;
  state.pendingVertrauensfrage = false;
  state.pendingKoalitionskrise = false;
  startPreElection();
}

// ============================================================
// ABSCHNITT 28: SVG-HELFER (Karte, Hemizyklus, Sparkline)
// ============================================================

function generateGermanyMapPaths() {
  return {
    sh:   'M 170 20 L 210 15 L 230 40 L 220 70 L 195 80 L 175 60 L 160 45 Z',
    mv:   'M 230 25 L 310 20 L 320 55 L 280 70 L 230 65 Z',
    hh:   'M 185 75 L 200 70 L 210 80 L 195 90 Z',
    hb:   'M 150 95 L 165 90 L 170 100 L 155 105 Z',
    nds:  'M 100 70 L 175 60 L 195 90 L 210 120 L 190 155 L 140 160 L 100 140 L 85 105 Z',
    bbg:  'M 270 70 L 320 65 L 340 110 L 320 155 L 275 150 L 255 110 Z',
    ber:  'M 285 100 L 305 95 L 310 115 L 290 118 Z',
    st:   'M 230 110 L 275 105 L 280 155 L 240 165 L 225 140 Z',
    nrw:  'M 80 145 L 140 140 L 155 185 L 140 220 L 95 225 L 70 190 Z',
    hes:  'M 140 180 L 180 170 L 200 210 L 185 250 L 145 250 L 130 220 Z',
    thu:  'M 210 170 L 260 165 L 270 200 L 240 215 L 210 205 Z',
    sac:  'M 260 160 L 320 155 L 330 195 L 290 210 L 260 200 Z',
    rlp:  'M 75 225 L 130 220 L 140 260 L 120 290 L 80 280 Z',
    saar: 'M 65 280 L 85 275 L 90 300 L 70 305 Z',
    bw:   'M 105 270 L 160 260 L 180 310 L 160 350 L 110 340 L 95 300 Z',
    bay:  'M 160 250 L 220 235 L 270 250 L 290 310 L 260 360 L 190 370 L 160 340 Z',
  };
}

function generateHemicycleSVG(results) {
  const parties = results.allParties.filter(p => p.seats > 0).sort((a, b) => {
    const orderMap = { player: 3 };
    AI_PARTIES.forEach((ap, i) => { orderMap[ap.id] = i; });
    return (orderMap[a.id] ?? 3) - (orderMap[b.id] ?? 3);
  });

  const cx = 250, cy = 220, outerR = 200, innerR = 80, rows = 8;
  const totalSeats = parties.reduce((s, p) => s + p.seats, 0);
  let angle = Math.PI;
  let dots = '';

  parties.forEach(p => {
    const partyAngle = (p.seats / totalSeats) * Math.PI;
    const seatsPerRow = Math.ceil(p.seats / rows);
    let placed = 0;
    for (let row = 0; row < rows && placed < p.seats; row++) {
      const r = innerR + (outerR - innerR) * (row / (rows - 1));
      const rowSeats = Math.min(seatsPerRow, p.seats - placed);
      for (let s = 0; s < rowSeats && placed < p.seats; s++) {
        const a = angle + partyAngle * (s + 0.5) / rowSeats;
        const x = cx + r * Math.cos(a);
        const y = cy - r * Math.sin(a);
        dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${p.color || '#3b82f6'}"/>`;
        placed++;
      }
    }
    angle += partyAngle;
  });

  return `<svg viewBox="0 0 500 240" class="hemicycle-svg">${dots}</svg>`;
}

function renderSparklineSVG() {
  const history = state.player.approvalHistory;
  if (history.length < 2) return '';
  const w = 200, h = 40;
  const maxV = Math.max(...history.map(d => d.approval), 30);
  const minV = Math.min(...history.map(d => d.approval), 0);
  const range = maxV - minV || 1;
  const points = history.map((d, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((d.approval - minV) / range) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:40px;overflow:visible;">
    <polyline points="${points}" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ============================================================
// ABSCHNITT 29: HAUPT-RENDERFUNKTION
// ============================================================

function renderScreen() {
  const content      = document.getElementById('game-content');
  const headerStatus = document.getElementById('header-status');
  const tickerContent = document.getElementById('news-ticker-content');

  if (!content) return;

  // Nachrichtenticker
  if (state && state.newsHistory.length > 0) {
    tickerContent.textContent = state.newsHistory.slice(0, 5).map(n => n.headline).join('  +++  ');
  }

  // Kopfzeilen-Status
  if (state && state.phase !== 'title') {
    const monthName = MONTH_NAMES[(state.month - 1 + 12) % 12] || 'Januar';
    const roleLabel = state.player.isKanzler ? '🏛️ Kanzler' : state.player.isOpposition ? '🗣️ Opposition' : '';
    headerStatus.innerHTML = `
      <span class="game-header__badge">${state.player.short || '???'}</span>
      <span class="game-header__badge">${fmtPct(state.player.approval)}</span>
      <span class="game-header__badge">Jahr ${state.year}, ${monthName}</span>
      <span class="game-header__badge" style="color:${state.player.budget.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">💰 ${fmtCurrency(state.player.budget.balance)}</span>
      ${roleLabel ? `<span class="game-header__badge">${roleLabel}</span>` : ''}
      <span class="game-header__badge" id="btn-save-header" style="cursor:pointer;color:var(--color-primary);">💾</span>
    `;
  } else {
    headerStatus.innerHTML = '<span class="game-header__badge" id="btn-save-header" style="cursor:pointer;color:var(--color-primary);">💾</span>';
  }

  if (!state) { content.innerHTML = renderTitelBildschirm(); attachListeners(); return; }

  switch (state.phase) {
    case 'title':          content.innerHTML = renderTitelBildschirm(); break;
    case 'creation':       content.innerHTML = renderParteigründung(); break;
    case 'personnelSetup': content.innerHTML = renderPersonalaufstellung(); break;
    case 'preElection':
    case 'campaign':       content.innerHTML = renderHauptDashboard(); break;
    case 'election':       content.innerHTML = renderWahlergebnis(); break;
    case 'coalition':      content.innerHTML = renderKoalitionsverhandlung(); break;
    case 'ministerSelection': content.innerHTML = renderKabinettsbildung(); break;
    case 'governance':     content.innerHTML = renderHauptDashboard(); break;
    case 'tvDuell':        content.innerHTML = renderTvDuell(); break;
    case 'gameOver':       content.innerHTML = renderSpielEnde(); break;
    default:               content.innerHTML = renderTitelBildschirm(); break;
  }
  attachListeners();

  // Autosave nach jeder Aktion (nicht auf Titelbildschirm)
  if (state && state.phase && state.phase !== 'title') {
    autoSave();
  }
}

// ============================================================
// ABSCHNITT 30: TITELBILDSCHIRM
// ============================================================

function renderTitelBildschirm() {
  return `
    <div class="panel panel--highlight text-center" style="padding: var(--space-16) var(--space-8);">
      <div style="margin-bottom: var(--space-8);">
        <svg viewBox="0 0 64 64" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
          <rect x="4" y="16" width="56" height="40" rx="4" stroke="#3b82f6" stroke-width="3" fill="none"/>
          <path d="M32 8l10 8H22l10-8z" fill="#3b82f6"/>
          <rect x="12" y="26" width="40" height="3" rx="1.5" fill="#1e293b"/>
          <rect x="12" y="34" width="28" height="3" rx="1.5" fill="#1e293b"/>
          <circle cx="44" cy="44" r="10" fill="none" stroke="#22c55e" stroke-width="2.5"/>
          <path d="M40 44l4 4 6-6" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); margin-bottom: var(--space-4);">
        MACHT<span style="color: var(--color-primary);">SPIEL</span>
      </h1>
      <p style="font-size: var(--text-lg); color: var(--color-text-muted); max-width: 500px; margin: 0 auto var(--space-2);">
        Politische Simulation — Version 3
      </p>
      <p style="font-size: var(--text-sm); color: var(--color-text-faint); max-width: 500px; margin: 0 auto var(--space-8);">
        Gründe deine Partei, forme dein Team, führe Wahlkampf in 16 Bundesländern,
        handle Koalitionsverhandlungen und regiere Deutschland.
      </p>
      <div style="display: flex; flex-direction: column; gap: var(--space-3); max-width: 320px; margin: 0 auto;">
        <button class="btn btn--primary btn--lg btn--block" id="btn-start">Neues Spiel starten</button>
        ${localStorage.getItem(AUTOSAVE_KEY) || localStorage.getItem(SAVE_KEY_PREFIX + '1') || localStorage.getItem(SAVE_KEY_PREFIX + '2') || localStorage.getItem(SAVE_KEY_PREFIX + '3') ? `<button class="btn btn--secondary btn--lg btn--block" id="btn-load-saves">💾 Spielstand laden</button>` : ''}
      </div>
      <div style="margin-top: var(--space-8); display: flex; gap: var(--space-6); justify-content: center; flex-wrap: wrap;">
        <div class="text-xs text-muted">🏛️ 16 Bundesländer</div>
        <div class="text-xs text-muted">👥 Personalmanagement</div>
        <div class="text-xs text-muted">💰 Parteibudget</div>
        <div class="text-xs text-muted">🗳️ Bundestagswahl</div>
        <div class="text-xs text-muted">📺 TV-Duelle</div>
        <div class="text-xs text-muted">🤝 Koalitionsverhandlung</div>
        <div class="text-xs text-muted">⚖️ Gesetzgebung</div>
        <div class="text-xs text-muted">🗣️ Opposition</div>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 31: PARTEIGRÜNDUNG
// ============================================================

function renderParteigründung() {
  const topicsHTML = TOPICS.map(t =>
    `<button class="topic-tag" data-topic="${t.id}">${t.icon} ${t.name}</button>`
  ).join('');

  return `
    <div class="panel">
      <div class="panel__header">
        <h2 class="panel__title">🏛️ Parteigründung</h2>
        <span class="panel__subtitle">Gestalten Sie Ihre politische Partei.</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6);" class="mobile-stack">
        <div class="input-group">
          <label class="input-label">Parteiname</label>
          <input type="text" class="input-field" id="party-name" placeholder="z. B. Zukunftspartei" maxlength="30">
        </div>
        <div class="input-group">
          <label class="input-label">Kürzel (2–5 Zeichen)</label>
          <input type="text" class="input-field" id="party-short" placeholder="z. B. ZP" maxlength="5">
        </div>
      </div>

      <div class="spectrum-container" style="margin-bottom: var(--space-6);">
        <div class="spectrum-axis">
          <div class="spectrum-axis__label"><span>← Links (Staat)</span><span>Rechts (Markt) →</span></div>
          <input type="range" id="economic-axis" min="-100" max="100" value="0">
          <div class="text-xs text-center text-muted">Wirtschaftliche Ausrichtung</div>
        </div>
        <div class="spectrum-axis">
          <div class="spectrum-axis__label"><span>← Progressiv</span><span>Konservativ →</span></div>
          <input type="range" id="social-axis" min="-100" max="100" value="0">
          <div class="text-xs text-center text-muted">Gesellschaftliche Ausrichtung</div>
        </div>
      </div>

      <div style="margin-bottom: var(--space-6);">
        <label class="input-label" style="margin-bottom: var(--space-3);">Kernthemen wählen <span class="text-muted" id="topic-count">(0/3)</span></label>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);" id="topics-container">
          ${topicsHTML}
        </div>
      </div>

      <button class="btn btn--primary btn--lg btn--block" id="btn-create" disabled>Partei gründen</button>
    </div>`;
}

// ============================================================
// ABSCHNITT 32: PERSONALAUFSTELLUNG
// ============================================================

function renderPersonalaufstellung() {
  const positionsHTML = PARTY_POSITIONS.map(pos => {
    const assigned = state.player.positions[pos.id];
    const available = state.player.personnel.filter(p => {
      const isAssigned = Object.values(state.player.positions).some(ap => ap && ap.id === p.id);
      return !isAssigned || (assigned && assigned.id === p.id);
    });

    const optionsHTML = available.map(p =>
      `<option value="${p.id}" ${assigned && assigned.id === p.id ? 'selected' : ''}>
        ${p.name} (${p.expertise}, Skill: ${p.skill}, Loyalität: ${p.loyalty}, Flügel: ${p.wing === 'left' ? 'Links' : p.wing === 'right' ? 'Rechts' : 'Mitte'})
      </option>`
    ).join('');

    return `
      <div class="personnel-card">
        <div class="personnel-card__header">
          <span class="personnel-card__icon">${pos.icon}</span>
          <div>
            <div class="personnel-card__title">${pos.name}</div>
            <div class="personnel-card__desc">${pos.desc}</div>
          </div>
        </div>
        <select class="input-field position-select" data-position="${pos.id}" style="width: 100%; margin-top: var(--space-2);">
          <option value="">— Nicht besetzt —</option>
          ${optionsHTML}
        </select>
        ${assigned ? `<div class="personnel-card__stats">
          <span class="effect-badge effect-badge--${assigned.skill > 60 ? 'positive' : assigned.skill > 40 ? 'neutral' : 'negative'}">Skill: ${assigned.skill}</span>
          <span class="effect-badge effect-badge--${assigned.loyalty > 60 ? 'positive' : assigned.loyalty > 40 ? 'neutral' : 'negative'}">Loyalität: ${assigned.loyalty}</span>
        </div>` : ''}
      </div>`;
  }).join('');

  const allAssigned = PARTY_POSITIONS.every(pos => state.player.positions[pos.id]);

  return `
    <div class="panel">
      <div class="panel__header">
        <h2 class="panel__title">👥 Parteiämter besetzen</h2>
        <span class="panel__subtitle">Sie sind Parteivorsitzende/r. Wählen Sie Ihr Team.</span>
      </div>
      <div class="personnel-grid">${positionsHTML}</div>
      <button class="btn btn--primary btn--lg btn--block mt-6" id="btn-start-game">
        ${allAssigned ? 'Spiel starten →' : 'Spiel starten (Positionen können auch später besetzt werden)'}
      </button>
    </div>`;
}

// ============================================================
// ABSCHNITT 33: HAUPT-DASHBOARD
// ============================================================

function renderHauptDashboard() {
  // Sonderbildschirme haben Vorrang
  if (state.pendingDonation)       return renderSpendeEvent();
  if (state.pendingParteitag && !state.currentParteitagTopic) return renderParteitagStart();
  if (state.currentParteitagTopic) return renderParteitagDebatte();
  if (state.pendingPlenarDebatte)  return renderPlenarDebatten();
  if (state.pendingLandtagswahl)   return renderLandtagswahlEvent();
  if (state.pendingVertrauensfrage) return renderVertrauensfrage();
  if (state.pendingKoalitionskrise) return renderKoalitionskrise();
  if (state.debateResult)          return renderDebatten_Ergebnis();

  // Wahlkampfphase ohne Ereignis → Wahlkampf-Dashboard
  if (state.phase === 'campaign' && !state.currentEvent) return renderWahlkampfDashboard();

  const phaseLabel = state.phase === 'preElection' ? 'Vorwahlphase' :
    state.phase === 'campaign' ? 'Wahlkampf' :
    state.player.isKanzler ? 'Regierung' : 'Opposition';
  const monthName = MONTH_NAMES[(state.month - 1 + 12) % 12] || 'Januar';

  let progress = 0, progressMax = 1, progressLabel = '';
  if (state.phase === 'preElection') {
    progress = state.totalMonths; progressMax = state.maxPreElectionMonths;
    progressLabel = `Monat ${state.totalMonths} / ${state.maxPreElectionMonths} bis zur Wahl`;
  } else if (state.phase === 'campaign') {
    progress = state.campaignMonth || 0; progressMax = state.campaignMonths;
    progressLabel = `Wahlkampf: Monat ${progress} / ${progressMax}`;
  } else {
    progress = state.governanceMonth || 0; progressMax = state.governanceMonths;
    progressLabel = `Legislatur: Monat ${progress} / ${progressMax}`;
  }

  // Tabs je nach Rolle und Phase
  const tabs = buildTabs();
  const activeTab = state.activeTab || 'event';

  let tabContent = '';
  switch (activeTab) {
    case 'event':      tabContent = renderEreignisTab(); break;
    case 'polls':      tabContent = renderUmfragenTab(); break;
    case 'budget':     tabContent = renderBudgetTab(); break;
    case 'map':        tabContent = renderKarteTab(); break;
    case 'team':       tabContent = renderTeamTab(); break;
    case 'gesetze':    tabContent = renderGesetzeTab(); break;
    case 'opposition': tabContent = renderOppositionsTab(); break;
    case 'campaign':   tabContent = renderWahlkampfTab(); break;
    default:           tabContent = renderEreignisTab();
  }

  return `
    <div class="dashboard-header">
      <div class="dashboard-phase">
        <span class="game-header__badge game-header__badge--live">${phaseLabel}</span>
        <span class="text-sm text-muted">Jahr ${state.year}, ${monthName}</span>
        ${state.bundespraesident ? `<span class="text-xs text-muted">BP: ${state.bundespraesident.name}</span>` : ''}
        ${state.player.isKanzler && state.player.coalitionPartners.length > 0 ? `<span class="text-xs text-muted">Koalition: ${state.player.coalitionPartners.map(p=>p.short).join('/')}</span>` : ''}
      </div>
      <div class="stat-bar" style="max-width: 400px;">
        <div class="stat-bar__label"><span>${progressLabel}</span><span>${Math.round(progress/progressMax*100)}%</span></div>
        <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${(progress/progressMax*100)}%"></div></div>
      </div>
    </div>

    <div class="tab-nav" id="tab-nav">
      ${tabs.map(t => `<button class="tab-btn ${t.id === activeTab ? 'tab-btn--active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>

    <div class="tab-content" id="tab-content">
      ${tabContent}
    </div>`;
}

function buildTabs() {
  const tabs = [
    { id: 'event',  label: '📰 Aktuell' },
    { id: 'polls',  label: '📊 Umfragen' },
    { id: 'budget', label: '💰 Budget' },
    { id: 'map',    label: '🗺️ Wahlkreise' },
    { id: 'team',   label: '👥 Team' },
  ];

  if (state.phase === 'campaign' || state.phase === 'preElection') {
    tabs.push({ id: 'campaign', label: '🗓️ Wahlkampf' });
  }

  if (state.phase === 'governance') {
    if (state.player.isKanzler) {
      tabs.push({ id: 'gesetze', label: '⚖️ Gesetze' });
    } else if (state.player.isOpposition || !state.player.isKanzler) {
      tabs.push({ id: 'opposition', label: '🗣️ Opposition' });
    }
  }

  return tabs;
}

// ============================================================
// ABSCHNITT 34: EREIGNIS-TAB
// ============================================================

function renderEreignisTab() {
  const ev = state.currentEvent;

  if (!ev) {
    const nextMonthBtn = `<button class="btn btn--primary btn--lg btn--block mt-4" id="btn-next-month">Nächster Monat →</button>`;

    // Regierungsaktionen anzeigen wenn kein Ereignis
    if (state.phase === 'governance' && state.player.isKanzler) {
      return `
        <div class="panel">
          <h3 class="panel__title">🏛️ Regierungsaktionen</h3>
          <p class="text-sm text-muted mb-4">Diesen Monat kein besonderes Ereignis. Führen Sie eine Regierungsaktion durch oder gehen Sie zum nächsten Monat.</p>
          <div class="decision-options">
            <button class="decision-option" data-gov-action="mediaKampagne">
              <div class="decision-option__icon">📺</div>
              <div class="decision-option__content">
                <div class="decision-option__title">Medienkampagne (300.000 €)</div>
                <div class="decision-option__desc">Verbesserung der Medienberichterstattung und öffentlichen Wahrnehmung.</div>
              </div>
            </button>
            <button class="decision-option" data-gov-action="kabinettsitzung">
              <div class="decision-option__icon">🏛️</div>
              <div class="decision-option__content">
                <div class="decision-option__title">Kabinettssitzung</div>
                <div class="decision-option__desc">Stärkt Parteieinheit und Koalitionszufriedenheit.</div>
              </div>
            </button>
            <button class="decision-option" data-gov-action="internationalGipfel">
              <div class="decision-option__icon">🌐</div>
              <div class="decision-option__content">
                <div class="decision-option__title">Internationaler Gipfel</div>
                <div class="decision-option__desc">Verbessert Glaubwürdigkeit und Medien-Score bei Akademikern.</div>
              </div>
            </button>
            <button class="decision-option" data-gov-action="buergergespraeche">
              <div class="decision-option__icon">🗣️</div>
              <div class="decision-option__content">
                <div class="decision-option__title">Bürgergespräche</div>
                <div class="decision-option__desc">Stärkt Zustimmung aller Wählergruppen und Glaubwürdigkeit.</div>
              </div>
            </button>
          </div>
          ${nextMonthBtn}
        </div>
        <div class="dashboard-sidebar" style="margin-top: var(--space-4);">${renderMiniUmfragen()}</div>`;
    }

    return `
      <div class="panel text-center text-muted" style="padding: var(--space-8);">
        Kein aktuelles Ereignis. Weiter zum nächsten Monat.
      </div>
      ${nextMonthBtn}`;
  }

  const optionsHTML = ev.options.map((opt, i) => `
    <button class="decision-option" data-decision="${i}">
      <div class="decision-option__icon">${opt.icon || '📌'}</div>
      <div class="decision-option__content">
        <div class="decision-option__title">${opt.label}</div>
        <div class="decision-option__desc">${opt.desc}</div>
        ${opt.effects && opt.effects.budget ? `<div class="text-xs mt-2" style="color: ${opt.effects.budget < 0 ? 'var(--color-error)' : 'var(--color-success)'}">Budget: ${opt.effects.budget > 0 ? '+' : ''}${fmtCurrency(opt.effects.budget)}</div>` : ''}
      </div>
    </button>`).join('');

  return `
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <div class="event-card">
          <div class="event-card__breaking">EILMELDUNG — ${ev.category.toUpperCase()}</div>
          <div class="event-card__body">
            <div class="event-card__category">${ev.category}</div>
            <h3 class="event-card__headline">${ev.headline}</h3>
            <p class="event-card__description">${ev.description}</p>
            <div class="decision-options">${optionsHTML}</div>
          </div>
        </div>
      </div>
      <div class="dashboard-sidebar">
        ${renderSchnellStats()}
        ${renderMiniUmfragen()}
      </div>
    </div>`;
}

function renderSchnellStats() {
  return `
    <div class="quick-stats">
      <div class="quick-stat">
        <div class="quick-stat__label">Zustimmung</div>
        <div class="quick-stat__value" style="color: ${state.player.approval > 20 ? 'var(--color-success)' : state.player.approval > 10 ? 'var(--color-warning)' : 'var(--color-error)'}">
          ${fmtPct(state.player.approval)}
        </div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__label">Medien</div>
        <div class="quick-stat__value">${Math.round(state.player.media)}/100</div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__label">Parteieinheit</div>
        <div class="quick-stat__value">${Math.round(state.player.partyUnity)}/100</div>
      </div>
      <div class="quick-stat">
        <div class="quick-stat__label">Budget</div>
        <div class="quick-stat__value" style="color: ${state.player.budget.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">
          ${fmtCurrency(state.player.budget.balance)}
        </div>
      </div>
      ${state.player.isKanzler ? `
      <div class="quick-stat">
        <div class="quick-stat__label">Koalition</div>
        <div class="quick-stat__value" style="color: ${state.player.coalitionSatisfaction > 50 ? 'var(--color-success)' : state.player.coalitionSatisfaction > 30 ? 'var(--color-warning)' : 'var(--color-error)'}">
          ${Math.round(state.player.coalitionSatisfaction)}%
        </div>
      </div>` : ''}
    </div>
    ${state.player.approvalHistory.length > 2 ? `
    <div style="margin-bottom: var(--space-3);">
      <div class="text-xs text-muted mb-2">Zustimmungsverlauf</div>
      ${renderSparklineSVG()}
    </div>` : ''}`;
}

function renderMiniUmfragen() {
  const allParties = [
    { name: state.player.short, approval: state.player.approval, color: state.player.color },
    ...state.parties.map(p => ({ name: p.short, approval: p.approval, color: p.color })),
  ].sort((a, b) => b.approval - a.approval);

  return `
    <div class="mini-polls">
      <div class="mini-polls__title">Sonntagsfrage</div>
      ${allParties.map(p => `
        <div class="mini-poll-row">
          <span class="party-color-dot" style="background: ${p.color}"></span>
          <span class="mini-poll-name">${p.name}</span>
          <div class="mini-poll-bar"><div class="mini-poll-fill" style="width: ${Math.min(p.approval * 2, 100)}%; background: ${p.color}"></div></div>
          <span class="mini-poll-value">${fmtPct(p.approval)}</span>
        </div>
      `).join('')}
    </div>`;
}

// ============================================================
// ABSCHNITT 35: UMFRAGEN-TAB
// ============================================================

function renderUmfragenTab() {
  const allParties = [
    { name: state.player.name, short: state.player.short, approval: state.player.approval, color: state.player.color, isPlayer: true, seats: state.player.seats },
    ...state.parties.map(p => ({ ...p, isPlayer: false })),
  ].sort((a, b) => b.approval - a.approval);

  const voterHTML = VOTER_GROUPS.map(g => `
    <div class="stat-bar">
      <div class="stat-bar__label"><span>${g.icon} ${g.name}</span><span class="stat-bar__value">${fmtPct(state.player.voterApproval[g.id])}</span></div>
      <div class="stat-bar__track"><div class="stat-bar__fill${state.player.voterApproval[g.id] > 15 ? '--success' : state.player.voterApproval[g.id] > 8 ? '' : '--error'}" style="width: ${Math.min(state.player.voterApproval[g.id] * 2, 100)}%"></div></div>
    </div>
  `).join('');

  return `
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <div class="panel">
          <h3 class="panel__title">📊 Aktuelle Umfragewerte</h3>
          <table class="polling-table">
            <thead><tr><th>Partei</th><th>Prognose</th><th>Sitze</th><th>Status</th></tr></thead>
            <tbody>
              ${allParties.map(p => `
                <tr${p.isPlayer ? ' style="background: var(--color-primary-glow);"' : ''}>
                  <td><span class="party-color-dot" style="background: ${p.color}"></span>${p.short}</td>
                  <td style="font-weight: 700;">${fmtPct(p.approval)}</td>
                  <td>${p.seats || '–'}</td>
                  <td>${p.approval >= 5 ? '<span style="color:var(--color-success);">Im Bundestag</span>' : '<span style="color:var(--color-error);">Unter 5%</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${state.player.approvalHistory.length > 2 ? `
        <div class="panel mt-4">
          <h3 class="panel__title" style="font-size: var(--text-base);">Zustimmungsverlauf</h3>
          <div style="padding: var(--space-2);">${renderSparklineSVG()}</div>
        </div>` : ''}
      </div>
      <div class="dashboard-sidebar">
        <div class="panel">
          <h3 class="panel__title" style="font-size: var(--text-base);">Wählergruppen</h3>
          <div class="flex flex-col gap-3">${voterHTML}</div>
        </div>
        <div class="panel mt-4">
          <h3 class="panel__title" style="font-size: var(--text-base);">Kennzahlen</h3>
          <div class="budget-line"><span>Medien-Score</span><span>${Math.round(state.player.media)}/100</span></div>
          <div class="budget-line"><span>Glaubwürdigkeit</span><span>${Math.round(state.player.credibility)}/100</span></div>
          <div class="budget-line"><span>Parteieinheit</span><span>${Math.round(state.player.partyUnity)}/100</span></div>
          ${state.player.isKanzler ? `<div class="budget-line"><span>Koalitionszufriedenheit</span><span style="color:${state.player.coalitionSatisfaction>50?'var(--color-success)':state.player.coalitionSatisfaction>30?'var(--color-warning)':'var(--color-error)'}">${Math.round(state.player.coalitionSatisfaction)}%</span></div>` : ''}
          ${state.player.lawsPassed ? `<div class="budget-line"><span>Gesetze verabschiedet</span><span>${state.player.lawsPassed}</span></div>` : ''}
        </div>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 36: BUDGET-TAB
// ============================================================

function renderBudgetTab() {
  const b = state.player.budget;
  const netMonthly = b.monthlyIncome - b.monthlyExpenses;
  return `
    <div class="panel">
      <h3 class="panel__title">💰 Parteibudget</h3>
      <div class="budget-overview">
        <div class="budget-card budget-card--balance">
          <div class="budget-card__label">Kontostand</div>
          <div class="budget-card__value" style="color: ${b.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">${fmtCurrency(b.balance)}</div>
          ${b.debt > 0 ? `<div class="text-xs" style="color: var(--color-error);">⚠ Schulden: ${fmtCurrency(b.debt)}</div>` : ''}
        </div>
        <div class="budget-card">
          <div class="budget-card__label">Monatliche Einnahmen</div>
          <div class="budget-card__value" style="color: var(--color-success);">+${fmtCurrency(b.monthlyIncome)}</div>
        </div>
        <div class="budget-card">
          <div class="budget-card__label">Monatliche Ausgaben</div>
          <div class="budget-card__value" style="color: var(--color-error);">-${fmtCurrency(b.monthlyExpenses)}</div>
        </div>
      </div>
      <div class="budget-card mt-4" style="text-align: center;">
        <div class="budget-card__label">Monatliches Netto</div>
        <div class="budget-card__value" style="color: ${netMonthly >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">${netMonthly >= 0 ? '+' : ''}${fmtCurrency(netMonthly)}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-top: var(--space-6);" class="mobile-stack">
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-success);">Einnahmen</h4>
          <div class="budget-line"><span>Mitgliedsbeiträge</span><span>+${fmtCurrency(b.memberDues)}</span></div>
          <div class="budget-line"><span>Parteispenden</span><span>+${fmtCurrency(b.donations)}</span></div>
          <div class="budget-line"><span>Staatl. Finanzierung</span><span>+${fmtCurrency(b.stateFunding)}</span></div>
        </div>
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-error);">Ausgaben</h4>
          <div class="budget-line"><span>Personalkosten</span><span>-${fmtCurrency(b.staffCosts)}</span></div>
          <div class="budget-line"><span>Bürokosten</span><span>-${fmtCurrency(b.officeCosts)}</span></div>
          <div class="budget-line"><span>Medienkampagnen</span><span>-${fmtCurrency(b.mediaSpending)}</span></div>
          <div class="budget-line"><span>Regionalwahlkampf</span><span>-${fmtCurrency(Object.values(b.campaignSpending).reduce((s,v)=>s+v,0))}</span></div>
        </div>
      </div>

      <div style="margin-top: var(--space-6);">
        <h4 class="text-sm font-bold mb-2">Medienkampagnen-Budget (monatlich)</h4>
        <div class="budget-slider">
          <div class="budget-slider__header">
            <span class="budget-slider__name">Medienausgaben</span>
            <span class="budget-slider__pct">${fmtCurrency(b.mediaSpending)}</span>
          </div>
          <input type="range" id="media-spending-slider" min="0" max="300000" step="10000" value="${b.mediaSpending}">
        </div>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 37: KARTE-TAB
// ============================================================

function renderKarteTab() {
  const paths = generateGermanyMapPaths();
  const maxApproval = 40;

  const mapPaths = BUNDESLAENDER.map(bl => {
    const r = state.player.regional[bl.id];
    const approval = r ? r.approval : 0;
    const intensity = clamp(approval / maxApproval, 0, 1);
    const fill = `rgba(59, 130, 246, ${0.15 + intensity * 0.7})`;
    return `<path d="${paths[bl.id]}" fill="${fill}" stroke="var(--color-border)" stroke-width="1.5" data-bl="${bl.id}" class="map-region">
              <title>${bl.name}: ${fmtPct(approval)}</title>
            </path>`;
  }).join('');

  const labels = BUNDESLAENDER.map(bl => {
    const path = paths[bl.id];
    const nums = path.match(/[\d.]+/g).map(Number);
    let cx = 0, cy = 0, count = 0;
    for (let i = 0; i < nums.length; i += 2) { cx += nums[i]; cy += nums[i+1]; count++; }
    cx /= count; cy /= count;
    return `<text x="${cx}" y="${cy}" class="map-label">${bl.short}</text>`;
  }).join('');

  const tableRows = BUNDESLAENDER.map(bl => {
    const r = state.player.regional[bl.id];
    return `<tr>
      <td>${bl.short}</td>
      <td>${fmtPct(r ? r.approval : 0)}</td>
      <td>${bl.wahlkreise}</td>
      <td>
        <div style="display:flex;gap:var(--space-2);align-items:center;">
          <input type="number" class="input-field regional-workers" data-bl="${bl.id}" value="${r ? r.workers : 0}" min="0" max="20" style="width:60px;padding:var(--space-1) var(--space-2);font-size:var(--text-xs);">
          <input type="number" class="input-field regional-invest" data-bl="${bl.id}" value="${r ? r.investment : 0}" min="0" max="100000" step="5000" style="width:90px;padding:var(--space-1) var(--space-2);font-size:var(--text-xs);">
        </div>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="dashboard-grid">
      <div class="dashboard-main">
        <div class="panel">
          <h3 class="panel__title">🗺️ Bundesländer-Karte</h3>
          <div class="map-container">
            <svg viewBox="40 0 320 390" class="germany-map">${mapPaths}${labels}</svg>
          </div>
          <div class="map-legend">
            <span>Schwach</span>
            <div class="map-legend-gradient"></div>
            <span>Stark</span>
          </div>
        </div>
      </div>
      <div class="dashboard-sidebar">
        <div class="panel" style="overflow-x: auto;">
          <h3 class="panel__title" style="font-size: var(--text-base);">Wahlkampf-Einsatz</h3>
          <p class="text-xs text-muted mb-4">Helfer und Investition (€/Monat) pro Land</p>
          <table class="polling-table" style="font-size: var(--text-xs);">
            <thead><tr><th>Land</th><th>%</th><th>WK</th><th>Helfer / €</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <button class="btn btn--primary btn--sm btn--block mt-4" id="btn-apply-regional">Einsatz übernehmen</button>
        </div>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 38: TEAM-TAB
// ============================================================

function renderTeamTab() {
  const positionsHTML = PARTY_POSITIONS.map(pos => {
    const person = state.player.positions[pos.id];
    return `
      <div class="personnel-card personnel-card--compact">
        <div class="personnel-card__header">
          <span class="personnel-card__icon">${pos.icon}</span>
          <div>
            <div class="personnel-card__title">${pos.name}</div>
            ${person ? `<div class="text-xs text-muted">${person.name}, ${person.age} J.</div>` : '<div class="text-xs" style="color: var(--color-error);">Nicht besetzt</div>'}
          </div>
        </div>
        ${person ? `
          <div class="personnel-card__stats">
            <span class="effect-badge effect-badge--${person.skill > 60 ? 'positive' : 'neutral'}">Skill: ${person.skill}</span>
            <span class="effect-badge effect-badge--${person.loyalty > 60 ? 'positive' : 'neutral'}">Loyalität: ${person.loyalty}</span>
            <span class="text-xs text-muted">${person.expertise} · ${person.wing === 'left' ? 'Links' : person.wing === 'right' ? 'Rechts' : 'Mitte'}</span>
          </div>` : ''}
      </div>`;
  }).join('');

  let ministersHTML = '';
  if (state.player.isKanzler) {
    const minister_html = MINISTER_POSITIONS.map(pos => {
      const person = state.player.ministers[pos.id];
      const scandalBadge = person && person.scandals > 0 ?
        `<span class="effect-badge effect-badge--negative">⚠ ${person.scandals} Skandal${person.scandals > 1 ? 'e' : ''}</span>` : '';
      return `
        <div class="personnel-card personnel-card--compact">
          <div class="personnel-card__header">
            <span class="personnel-card__icon">${pos.icon}</span>
            <div>
              <div class="personnel-card__title" style="font-size: var(--text-xs);">${pos.name}</div>
              ${person ? `<div class="text-xs text-muted">${person.name} (Skill: ${person.skill})</div>` : '<div class="text-xs" style="color: var(--color-warning);">Nicht besetzt</div>'}
            </div>
          </div>
          ${scandalBadge}
        </div>`;
    }).join('');

    ministersHTML = `
      <div class="panel mt-4">
        <h3 class="panel__title" style="font-size: var(--text-base);">🏛️ Kabinett</h3>
        <div class="personnel-grid">${minister_html}</div>
      </div>`;
  }

  return `
    <div class="panel">
      <h3 class="panel__title">👥 Parteiämter</h3>
      <div class="personnel-grid">${positionsHTML}</div>
      <div class="text-xs text-muted mt-4">
        Parteieinheit: ${Math.round(state.player.partyUnity)}/100 ·
        Glaubwürdigkeit: ${Math.round(state.player.credibility)}/100
      </div>
    </div>
    ${ministersHTML}
    ${state.bundespraesident ? `
    <div class="panel mt-4">
      <h3 class="panel__title" style="font-size: var(--text-base);">🇩🇪 Bundespräsident</h3>
      <div class="personnel-card personnel-card--compact">
        <div class="personnel-card__header">
          <span class="personnel-card__icon">🇩🇪</span>
          <div>
            <div class="personnel-card__title">${state.bundespraesident.name}</div>
            <div class="text-xs text-muted">Alter: ${state.bundespraesident.age} · Nominiert von: ${state.bundespraesident.party}</div>
          </div>
        </div>
      </div>
    </div>` : ''}`;
}

// ============================================================
// ABSCHNITT 39: GESETZ-TAB (Kanzler)
// ============================================================

function renderGesetzeTab() {
  const pending = state.player.pendingLaw;

  const stageNames = {
    ersteLesung:   '1. Lesung',
    ausschuss:     'Ausschussberatung',
    zweiteLesung:  '2. Lesung',
    dritterLesung: '3. Lesung (Abstimmung)',
    bundesrat:     'Bundesrat',
    vermittlung:   'Vermittlungsausschuss',
  };

  let pendingHTML = '';
  if (pending) {
    const stage = stageNames[pending.stage] || pending.stage;
    let actionBtn = '';
    if (pending.stage === 'ausschuss') {
      actionBtn = `
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
          <button class="btn btn--primary" data-law-action="amend">Ausschuss: Änderungen einbringen</button>
          <button class="btn btn--secondary" data-law-action="next">Unverändert weiter →</button>
        </div>`;
    } else if (pending.stage === 'vermittlung') {
      actionBtn = `
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
          <button class="btn btn--primary" data-law-action="compromise">Kompromiss annehmen</button>
          <button class="btn btn--danger" data-law-action="abandon">Gesetz aufgeben</button>
        </div>`;
    } else {
      actionBtn = `<button class="btn btn--primary mt-4" data-law-action="next">Nächste Stufe →</button>`;
    }

    pendingHTML = `
      <div class="panel panel--highlight">
        <h3 class="panel__title">📋 Gesetz in Bearbeitung: ${pending.title}</h3>
        <div class="text-sm text-muted mb-4">${pending.description || ''}</div>
        <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-4);">
          <div><span class="text-xs text-muted">Aktuelle Stufe:</span><br><strong>${stage}</strong></div>
          <div><span class="text-xs text-muted">Unterstützung:</span><br><strong style="color:${pending.supportPercent>50?'var(--color-success)':'var(--color-error)'}">${Math.round(pending.supportPercent)}%</strong></div>
          ${pending.requiresBundesrat ? '<div><span class="text-xs text-muted">Bundesratspflichtig:</span><br><strong>Ja</strong></div>' : ''}
          ${pending.amendmentsApplied ? '<div><span class="text-xs text-muted">Status:</span><br><strong style="color:var(--color-success)">Überarbeitet ✓</strong></div>' : ''}
        </div>

        <!-- Pipeline-Fortschritt -->
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4);">
          ${['ersteLesung','ausschuss','zweiteLesung','dritterLesung','bundesrat'].map(s => {
            const stagesOrder = ['ersteLesung','ausschuss','zweiteLesung','dritterLesung','bundesrat','vermittlung'];
            const current = stagesOrder.indexOf(pending.stage);
            const this_s = stagesOrder.indexOf(s);
            const done = this_s < current;
            const active = this_s === current;
            return `<span class="effect-badge ${done ? 'effect-badge--positive' : active ? 'effect-badge--neutral' : ''}">${done?'✓ ':''}${stageNames[s]}</span>`;
          }).join('')}
        </div>
        ${actionBtn}
      </div>`;
  }

  // Verfügbare Gesetze
  let poolHTML = '';
  if (!pending && typeof GESETZGEBUNG_POOL !== 'undefined') {
    const available = GESETZGEBUNG_POOL.filter(l =>
      !state.player.passedLaws.find(p => p.id === l.id) &&
      !state.player.failedLaws.find(f => f.id === l.id)
    ).slice(0, 6);

    poolHTML = `
      <div class="panel">
        <h3 class="panel__title">📜 Gesetzgebung einbringen</h3>
        <p class="text-sm text-muted mb-4">Wählen Sie einen Gesetzentwurf, um ihn in den Bundestag einzubringen.</p>
        <div class="decision-options">
          ${available.map(law => `
            <button class="decision-option" data-propose-law="${law.id}">
              <div class="decision-option__icon">${law.icon || '📜'}</div>
              <div class="decision-option__content">
                <div class="decision-option__title">${law.title || law.name}</div>
                <div class="decision-option__desc">${law.description || ''}</div>
                ${(law.requiresBundesrat || law.zustimmungspflichtig) ? '<div class="text-xs mt-1" style="color:var(--color-warning)">Bundesratspflichtig</div>' : ''}
              </div>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // Bereits verabschiedete Gesetze
  const passedHTML = state.player.passedLaws.length > 0 ? `
    <div class="panel">
      <h3 class="panel__title" style="font-size:var(--text-base);">✅ Verabschiedete Gesetze (${state.player.passedLaws.length})</h3>
      ${state.player.passedLaws.map(l => `
        <div class="budget-line"><span>${l.icon || '📜'} ${l.title}</span><span class="effect-badge effect-badge--positive">Verabschiedet</span></div>
      `).join('')}
    </div>` : '';

  const failedHTML = state.player.failedLaws.length > 0 ? `
    <div class="panel">
      <h3 class="panel__title" style="font-size:var(--text-base);">❌ Gescheiterte Gesetze (${state.player.failedLaws.length})</h3>
      ${state.player.failedLaws.map(l => `
        <div class="budget-line"><span>${l.icon || '📜'} ${l.title}</span><span class="effect-badge effect-badge--negative">Gescheitert</span></div>
      `).join('')}
    </div>` : '';

  return pendingHTML + poolHTML + passedHTML + failedHTML ||
    `<div class="panel text-center text-muted" style="padding:var(--space-8);">Kein Gesetzentwurf verfügbar.</div>`;
}

// ============================================================
// ABSCHNITT 40: OPPOSITIONS-TAB
// ============================================================

function renderOppositionsTab() {
  if (typeof OPPOSITION_ACTIONS === 'undefined') {
    return `<div class="panel text-center text-muted" style="padding:var(--space-8);">Keine Oppositionsaktionen verfügbar.</div>`;
  }

  const actionsHTML = OPPOSITION_ACTIONS.map(action => {
    const cooldown = state.player.oppositionCooldowns[action.id] || 0;
    const onCooldown = state.totalMonths < cooldown;
    const noSeats = action.requiresFraction && state.player.seats < (action.minMandates || 5);
    const disabled = onCooldown || noSeats;

    return `
      <button class="decision-option ${disabled ? 'opacity-50' : ''}" data-opp-action="${action.id}" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        <div class="decision-option__icon">${action.icon || '📋'}</div>
        <div class="decision-option__content">
          <div class="decision-option__title">${action.name}</div>
          <div class="decision-option__desc">${action.description}</div>
          <div class="text-xs mt-1" style="color:var(--color-text-faint);">
            Kategorie: ${action.category}
            ${action.requiresFraction ? ` · Benötigt ${action.minMandates} Sitze` : ''}
            ${onCooldown ? ` · Gesperrt für ${cooldown - state.totalMonths} Monat(e)` : ''}
            ${noSeats ? ' · Zu wenig Sitze' : ''}
          </div>
          <div class="text-xs mt-1" style="color:var(--color-primary);">
            Effekte: ${Object.entries(action.effects || {}).map(([k,v]) => `${k} ${v>0?'+':''}${v}`).join(', ')}
          </div>
        </div>
      </button>`;
  }).join('');

  const historyHTML = state.player.oppositionActions.length > 0 ? `
    <div class="panel mt-4">
      <h3 class="panel__title" style="font-size:var(--text-base);">Bisherige Oppositionsaktionen</h3>
      ${state.player.oppositionActions.slice(-5).reverse().map(a => `
        <div class="budget-line"><span>${a.name}</span><span class="text-xs text-muted">Monat ${a.month}</span></div>
      `).join('')}
    </div>` : '';

  return `
    <div class="panel">
      <h3 class="panel__title">🗣️ Oppositionsaktionen</h3>
      <p class="text-sm text-muted mb-4">Sie sind in der Opposition. Setzen Sie parlamentarische Mittel ein, um die Regierung zu kontrollieren und Ihre Glaubwürdigkeit zu stärken.</p>
      <div class="decision-options">${actionsHTML}</div>
    </div>
    ${historyHTML}`;
}

// ============================================================
// ABSCHNITT 41: WAHLKAMPF-TAB
// ============================================================

function renderWahlkampfTab() {
  const b = state.player.budget;

  const tools = [
    { id: 'plakate',     name: 'Plakataktionen',         icon: '📋', desc: 'Stärkt Landbevölkerung und Rentner. Sichtbarkeit steigt.',     costs: [100000, 300000, 500000] },
    { id: 'tvSpots',     name: 'TV-Spots',               icon: '📺', desc: 'Stärkt Medien-Score, Rentner und Arbeiter.',                   costs: [200000, 500000, 800000] },
    { id: 'socialMedia', name: 'Social Media Kampagne',  icon: '📱', desc: 'Stärkt Jugend und Akademiker stark.',                          costs: [50000, 150000, 300000] },
    { id: 'kundgebungen',name: 'Großkundgebungen',       icon: '🎤', desc: 'Stärkt alle Wählergruppen und Parteieinheit.',                  costs: [100000, 250000, 400000] },
    { id: 'haustuer',    name: 'Haustür-Wahlkampf',     icon: '🚪', desc: 'Stärkt regionale Zustimmung und Rentner/Arbeiter.',             costs: [50000, 120000, 200000] },
    { id: 'wahlkampfbus',name: 'Wahlkampfbus-Tour',     icon: '🚌', desc: 'Stärkt Landbevölkerung und Arbeiter stark.',                   costs: [150000, 300000, 500000] },
  ];

  const toolsHTML = tools.map(tool => `
    <div class="panel" style="margin-bottom: var(--space-3);">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        <span style="font-size:var(--text-xl);">${tool.icon}</span>
        <div>
          <div class="personnel-card__title">${tool.name}</div>
          <div class="text-xs text-muted">${tool.desc}</div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
        ${tool.costs.map((cost, i) => `
          <button class="btn btn--secondary btn--sm" data-campaign-tool="${tool.id}" data-campaign-cost="${cost}"
            ${b.balance < cost ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            ${['Klein','Mittel','Groß'][i]}: ${fmtCurrency(cost)}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  const tvDuellBtn = state.phase === 'campaign' ? `
    <div class="panel panel--highlight">
      <h3 class="panel__title">📺 TV-Duell starten</h3>
      <p class="text-sm text-muted mb-4">Treten Sie in einem 3-Runden-TV-Duell gegen den stärksten Gegner an.</p>
      <button class="btn btn--primary" id="btn-start-tvduell">TV-Duell beginnen →</button>
    </div>` : '';

  return `
    <div>
      <div class="panel">
        <h3 class="panel__title">🗓️ Wahlkampfmittel</h3>
        <p class="text-sm text-muted mb-4">Budget: <strong>${fmtCurrency(b.balance)}</strong> verfügbar</p>
        ${toolsHTML}
      </div>
      ${tvDuellBtn}
      <button class="btn btn--primary btn--lg btn--block mt-4" id="btn-next-month">Nächster Wahlkampf-Monat →</button>
    </div>`;
}

// ============================================================
// ABSCHNITT 42: WAHLKAMPF-DASHBOARD (Kampagnenphase)
// ============================================================

function renderWahlkampfDashboard() {
  const monthName = MONTH_NAMES[(state.month - 1 + 12) % 12] || 'Januar';

  return `
    <div class="dashboard-header">
      <div class="dashboard-phase">
        <span class="game-header__badge game-header__badge--live">Wahlkampf</span>
        <span class="text-sm text-muted">Monat ${state.campaignMonth || 0} / ${state.campaignMonths}</span>
      </div>
    </div>
    <div class="tab-nav" id="tab-nav">
      <button class="tab-btn ${(state.activeTab||'campaign')==='campaign'?'tab-btn--active':''}" data-tab="campaign">🗓️ Wahlkampf</button>
      <button class="tab-btn ${state.activeTab==='polls'?'tab-btn--active':''}" data-tab="polls">📊 Umfragen</button>
      <button class="tab-btn ${state.activeTab==='budget'?'tab-btn--active':''}" data-tab="budget">💰 Budget</button>
      <button class="tab-btn ${state.activeTab==='map'?'tab-btn--active':''}" data-tab="map">🗺️ Wahlkreise</button>
    </div>
    <div class="tab-content">
      ${state.activeTab === 'polls' ? renderUmfragenTab() :
        state.activeTab === 'budget' ? renderBudgetTab() :
        state.activeTab === 'map' ? renderKarteTab() :
        renderWahlkampfTab()}
    </div>`;
}

// ============================================================
// ABSCHNITT 43: TV-DUELL-BILDSCHIRM
// ============================================================

function renderTvDuell() {
  const opponent = state.player.currentTvDuellOpponent;
  const round = state.player.tvDuellRound + 1;
  if (!opponent) { state.phase = 'campaign'; renderScreen(); return ''; }

  const lastResult = state.player.tvDuellResults[state.player.tvDuellResults.length - 1];

  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">📺 TV-Duell — Runde ${round} / 3</h2>
      <p class="text-sm text-muted mb-4">Ihr Kontrahent: <strong>${opponent.name}</strong> (${opponent.short})</p>

      ${lastResult ? `
      <div class="panel mb-4" style="background:${lastResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};">
        <p class="text-sm">Letzte Runde: <strong>${lastResult.success ? '✅ Gewonnen' : '❌ Verloren'}</strong></p>
        <p class="text-xs text-muted">Strategie: ${lastResult.strategy}</p>
      </div>` : ''}

      <div style="margin-bottom: var(--space-4);">
        <div class="text-xs text-muted mb-2">Bisherige Ergebnisse: ${state.player.tvDuellResults.filter(r=>r.success).length} von ${state.player.tvDuellResults.length} gewonnen</div>
      </div>

      <p class="text-sm font-bold mb-4">Wählen Sie Ihre Debattenstrategie:</p>
      <div class="debate-strategies">
        <button class="debate-strategy-btn" data-tvduell-strategy="angriff">
          <span class="debate-strategy-btn__icon">⚔️</span>
          <span class="debate-strategy-btn__name">Angriff</span>
          <span class="debate-strategy-btn__desc">Gegner direkt attackieren. Hohes Risiko, hohe Belohnung. Gut bei Jugend & Arbeitern.</span>
        </button>
        <button class="debate-strategy-btn" data-tvduell-strategy="sachlich">
          <span class="debate-strategy-btn__icon">📋</span>
          <span class="debate-strategy-btn__name">Sachlich</span>
          <span class="debate-strategy-btn__desc">Faktenbasierte Argumentation. Sicher, gut bei Akademikern und Selbstständigen.</span>
        </button>
        <button class="debate-strategy-btn" data-tvduell-strategy="emotional">
          <span class="debate-strategy-btn__icon">❤️</span>
          <span class="debate-strategy-btn__name">Emotional</span>
          <span class="debate-strategy-btn__desc">An Gefühle appellieren. Sehr gut bei Arbeitern, Rentnern und Landbevölkerung.</span>
        </button>
        <button class="debate-strategy-btn" data-tvduell-strategy="visionaer">
          <span class="debate-strategy-btn__icon">🔮</span>
          <span class="debate-strategy-btn__name">Visionär</span>
          <span class="debate-strategy-btn__desc">Zukunftsvision präsentieren. Stark bei Jugend und Akademikern.</span>
        </button>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 44: DEBATTENERGEBNIS-BILDSCHIRM
// ============================================================

function renderDebatten_Ergebnis() {
  const r = state.debateResult;
  state.debateResult = null;

  let title = '', msg = '';
  if (r.type === 'tvduell') {
    title = r.success ? '🎉 TV-Duell gewonnen!' : '😓 TV-Duell verloren';
    msg = r.success ?
      `Sie haben ${r.wins} von ${r.rounds} Runden gewonnen. Die Umfragewerte steigen!` :
      `Sie haben nur ${r.wins} von ${r.rounds} Runden gewonnen. Die Wähler sind enttäuscht.`;
  } else if (r.type === 'plenar') {
    title = r.success ? `🎉 Gesetz „${r.title}" verabschiedet!` : `😓 Im Bundestag gescheitert`;
    msg = r.success ?
      `Das Gesetz wurde erfolgreich durch den Bundestag gebracht.` :
      `Das Gesetz „${r.title}" wurde im Bundestag abgelehnt.`;
  } else if (r.type === 'vertrauensfrage') {
    title = '⚠️ Vertrauensfrage verloren';
    msg = 'Die Regierung hat die Vertrauensfrage im Bundestag verloren. Neue Optionen werden geprüft.';
  } else {
    title = r.success ? '✅ Erfolg!' : '❌ Niederlage';
    msg = r.success ? 'Ergebnis positiv.' : 'Ergebnis negativ.';
  }

  return `
    <div class="panel ${r.success ? 'panel--highlight' : ''}">
      <h2 class="panel__title">${title}</h2>
      <p class="text-sm text-muted mb-4">${msg}</p>
      <p class="text-sm">Aktuelle Zustimmung: <strong>${fmtPct(state.player.approval)}</strong></p>
      <button class="btn btn--primary btn--lg btn--block mt-4" id="btn-continue-after-debate">Weiter →</button>
    </div>`;
}

// ============================================================
// ABSCHNITT 45: SONDERBILDSCHIRME (Spende, Parteitag usw.)
// ============================================================

function renderSpendeEvent() {
  const d = state.pendingDonation;
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">💰 Großspende</h2>
      <p class="text-sm text-muted mb-2"><strong>${d.donor}</strong> bietet eine Spende von <strong>${fmtCurrency(d.amount)}</strong> an.</p>
      <p class="text-sm mb-4" style="color: var(--color-warning);">Bedingung: „${d.demand}"</p>
      <p class="text-xs text-muted mb-4">Annahme: Glaubwürdigkeit −3. Ablehnung: Glaubwürdigkeit +2.</p>
      <div style="display: flex; gap: var(--space-3);">
        <button class="btn btn--success" id="btn-accept-donation">Annehmen (+${fmtCurrency(d.amount)})</button>
        <button class="btn btn--danger" id="btn-reject-donation">Ablehnen (+Glaubwürdigkeit)</button>
      </div>
    </div>`;
}

function renderParteitagStart() {
  if (typeof PARTEITAG_TOPICS !== 'undefined' && PARTEITAG_TOPICS.length > 0) {
    state.currentParteitagTopic = pick(PARTEITAG_TOPICS);
  } else {
    state.currentParteitagTopic = null;
  }
  state.pendingParteitag = false;
  return renderParteitagDebatte();
}

function renderParteitagDebatte() {
  const topic = state.currentParteitagTopic;
  if (!topic) {
    state.pendingParteitag = false;
    advanceToNextAction();
    return '<div></div>';
  }

  if (state.parteitagResult) {
    const r = state.parteitagResult;
    state.parteitagResult = null;
    return `
      <div class="panel ${r.success ? 'panel--highlight' : ''}">
        <h2 class="panel__title">${r.success ? '🎉 Parteitag: Erfolg!' : '😓 Parteitag: Niederlage'}</h2>
        <p class="text-sm text-muted mb-4">${r.text}</p>
        <p class="text-sm">Parteieinheit: <strong>${Math.round(state.player.partyUnity)}/100</strong></p>
        <button class="btn btn--primary btn--lg btn--block mt-4" id="btn-continue-after-debate">Weiter →</button>
      </div>`;
  }

  const wingIcon = w => w === 'links' ? '⬅️' : w === 'rechts' ? '➡️' : w === 'mitte-links' ? '↖️' : w === 'mitte-rechts' ? '↗️' : '⚖️';
  const wingLabel = w => w === 'links' ? 'Links' : w === 'rechts' ? 'Rechts' : w === 'mitte-links' ? 'Mitte-Links' : w === 'mitte-rechts' ? 'Mitte-Rechts' : 'Mitte';
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🏛️ Parteitag: ${topic.title}</h2>
      <p class="text-sm text-muted mb-4">${topic.description || ''}</p>
      <p class="text-xs text-muted mb-4">Wählen Sie ein Argument für Ihre Rede vor den Delegierten.</p>
      <div class="decision-options">
        ${topic.arguments.map((arg, i) => `
          <button class="decision-option" data-parteitag-arg="${i}">
            <div class="decision-option__icon">${arg.icon || wingIcon(arg.wing)}</div>
            <div class="decision-option__content">
              <div class="decision-option__title">${arg.label || arg.text}</div>
              <div class="decision-option__desc">Flügel: ${wingLabel(arg.wing)}</div>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="text-xs text-muted mt-4">Parteieinheit: ${Math.round(state.player.partyUnity)}/100</div>
    </div>`;
}

function renderPlenarDebatten() {
  const debate = state.pendingPlenarDebatte;
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🏛️ Plenardebatte: ${debate.title}</h2>
      <p class="text-sm text-muted mb-4">${debate.description || 'Der Bundestag debattiert über dieses Gesetz.'}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);" class="mobile-stack">
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-success);">Pro-Argumente</h4>
          ${(debate.proArguments || debate.proArgs || []).map((arg, i) => `
            <button class="decision-option" data-plenar-arg="${i}" style="margin-bottom: var(--space-2);">
              <div class="decision-option__icon">✅</div>
              <div class="decision-option__content"><div class="decision-option__title">${arg}</div></div>
            </button>
          `).join('')}
        </div>
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-error);">Contra-Argumente</h4>
          ${(debate.contraArguments || debate.contraArgs || []).map((arg, i) => `
            <button class="decision-option" data-plenar-arg="${(debate.proArguments||debate.proArgs||[]).length + i}" style="margin-bottom: var(--space-2);">
              <div class="decision-option__icon">❌</div>
              <div class="decision-option__content"><div class="decision-option__title">${arg}</div></div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="text-xs text-muted">Fraktionsvorsitz-Skill bestimmt die Erfolgschance.</div>
    </div>`;
}

function renderLandtagswahlEvent() {
  const bl = state.pendingLandtagswahl;
  const r = state.player.regional[bl.id];
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🗳️ Landtagswahl in ${bl.name}</h2>
      <p class="text-sm text-muted mb-4">Aktuelle regionale Zustimmung: <strong>${fmtPct(r ? r.approval : 0)}</strong></p>
      <p class="text-sm mb-4">Das Ergebnis beeinflusst Ihre Bundespolitik.</p>
      <button class="btn btn--primary btn--lg btn--block" id="btn-landtagswahl">Ergebnis abwarten →</button>
    </div>`;
}

function renderVertrauensfrage() {
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">⚖️ Vertrauensfrage im Bundestag</h2>
      <p class="text-sm text-muted mb-4">Ihre Regierung steht unter Druck. Eine Oppositionsgruppe stellt die Vertrauensfrage.</p>
      <p class="text-sm mb-4">Aktuelle Zustimmung: <strong>${fmtPct(state.player.approval)}</strong> · Sitze: ${state.player.seats}</p>
      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn--primary" data-vertrauen="true">Vertrauen aussprechen</button>
        <button class="btn btn--danger" data-vertrauen="false">Rücktritt ankündigen</button>
      </div>
    </div>`;
}

function renderKoalitionskrise() {
  const partner = state.player.coalitionPartners.length > 0 ?
    state.player.coalitionPartners[0].name : 'Koalitionspartner';
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">⚠️ Koalitionskrise!</h2>
      <p class="text-sm text-muted mb-4">Die Koalitionszufriedenheit ist auf ${Math.round(state.player.coalitionSatisfaction)}% gesunken. 
      ${partner} droht mit dem Ausstieg aus der Koalition.</p>
      <div class="decision-options">
        <button class="decision-option" data-koal-option="concede">
          <div class="decision-option__icon">🤝</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Zugeständnisse machen</div>
            <div class="decision-option__desc">Koalition stabilisieren — kostet Glaubwürdigkeit. Zufriedenheit +20.</div>
          </div>
        </button>
        <button class="decision-option" data-koal-option="stand_firm">
          <div class="decision-option__icon">✊</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Standhaft bleiben</div>
            <div class="decision-option__desc">Riskant: 40% Chance auf Koalitionsbruch. Medien +2 bei Erfolg.</div>
          </div>
        </button>
        <button class="decision-option" data-koal-option="neuwahlen">
          <div class="decision-option__icon">🗳️</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Neuwahlen ausrufen</div>
            <div class="decision-option__desc">Koalition auflösen und neue Bundestagswahl ansetzen.</div>
          </div>
        </button>
      </div>
    </div>`;
}

// ============================================================
// ABSCHNITT 46: WAHLERGEBNIS-BILDSCHIRM
// ============================================================

function renderWahlergebnis() {
  const r = state.electionResults;
  if (!r) return '';

  const hemicycle = generateHemicycleSVG(r);
  const partyRows = r.allParties.sort((a, b) => b.seats - a.seats).map(p => `
    <tr${p.id === 'player' ? ' style="background: var(--color-primary-glow);"' : ''}>
      <td><span class="party-color-dot" style="background: ${p.color}"></span>${p.short || p.name}</td>
      <td style="font-weight: 700;">${fmtPct(p.percent)}</td>
      <td style="font-weight: 700;">${p.seats}</td>
    </tr>
  `).join('');

  const direktHTML = BUNDESLAENDER.map(bl => {
    const won = r.direktResults[bl.id] || 0;
    return `<span class="effect-badge ${won > 0 ? 'effect-badge--positive' : 'effect-badge--neutral'}">${bl.short}: ${won}/${bl.wahlkreise}</span>`;
  }).join(' ');

  state.coalitionOptions = findCoalitionOptions();
  const canForm = state.player.passedThreshold && state.player.seats > 0;

  return `
    <div class="panel panel--highlight text-center" style="padding: var(--space-8);">
      <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 800;">🗳️ Bundestagswahl — Ergebnis</h2>
      <p class="text-muted mt-2">${r.passedThreshold ? 'Ihre Partei zieht in den Bundestag ein!' : 'Ihre Partei hat die 5%-Hürde nicht geschafft.'}</p>
    </div>

    <div class="panel">
      <div class="hemicycle-container">${hemicycle}</div>
      <table class="polling-table">
        <thead><tr><th>Partei</th><th>Zweitstimme</th><th>Sitze</th></tr></thead>
        <tbody>${partyRows}</tbody>
      </table>
    </div>

    <div class="panel">
      <h3 class="panel__title">Direktmandate nach Bundesland</h3>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">${direktHTML}</div>
      <p class="text-sm text-muted mt-2">Direktmandate gesamt: ${r.totalDirekt} · Überhangmandate: ${r.ueberhang}</p>
    </div>

    ${canForm ? `
      <div class="panel">
        <h3 class="panel__title">Koalitionsoptionen</h3>
        <p class="text-sm text-muted mb-4">Wählen Sie eine Koalition, um Koalitionsverhandlungen zu starten, oder gehen Sie in die Opposition.</p>
        <div class="decision-options">
          ${state.coalitionOptions.map((opt, i) => `
            <button class="decision-option" data-coalition="${i}">
              <div class="decision-option__icon">${opt.partners.length === 0 ? '👑' : '🤝'}</div>
              <div class="decision-option__content">
                <div class="decision-option__title">${opt.name}</div>
                <div class="decision-option__desc">${opt.totalSeats} Sitze${opt.compatibility ? ` · Kompatibilität: ${Math.round(opt.compatibility)}%` : ''}</div>
                ${opt.partners.length === 0 ? '<div class="text-xs mt-1" style="color:var(--color-success);">✓ Absolute Mehrheit — Alleinregierung möglich</div>' : ''}
              </div>
            </button>
          `).join('')}
        </div>
        <button class="btn btn--secondary btn--block mt-4" id="btn-go-opposition">In die Opposition gehen</button>
      </div>
    ` : `
      <div class="panel text-center">
        <p class="text-muted">${r.passedThreshold ? 'Keine Koalitionsmehrheit möglich.' : 'Ihre Partei ist nicht im Bundestag vertreten.'}</p>
        <button class="btn btn--secondary btn--lg btn--block mt-4" id="btn-go-opposition">Weiter in die Opposition →</button>
      </div>
    `}`;
}

// ============================================================
// ABSCHNITT 47: KOALITIONSVERHANDLUNG (mehrstufig)
// ============================================================

function renderKoalitionsverhandlung() {
  const neg = state.coalitionNegotiation;
  if (!neg) {
    state.phase = 'election';
    renderScreen();
    return '';
  }

  const option = neg.option;
  const partnerNames = option.partners.map(p => p.name).join(', ');

  if (neg.phase === 'sondierung') {
    return renderSondierungsPhase(neg, partnerNames);
  } else if (neg.phase === 'verhandlung') {
    return renderVerhandlungsPhase(neg, partnerNames);
  } else if (neg.phase === 'vertrag') {
    return renderVertragsPhase(neg, partnerNames);
  }
  return '';
}

function renderSondierungsPhase(neg, partnerNames) {
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🤝 Phase 1: Sondierungsgespräche</h2>
      <p class="text-sm text-muted mb-4">Gespräch mit: <strong>${partnerNames}</strong></p>
      <p class="text-sm mb-4">Runde ${neg.sondierungRound + 1} von ${neg.maxSondierungsRounds}: 
      Erkunden Sie die Bereitschaft für eine gemeinsame Regierung.</p>
      
      <div class="panel mb-4">
        <h4 class="text-sm font-bold mb-2">Bisherige Einigungen</h4>
        ${Object.keys(neg.agreements).length > 0 ?
          Object.entries(neg.agreements).map(([area, status]) => `
            <div class="budget-line">
              <span>${COALITION_POLICY_AREAS.find(a=>a.id===area)?.name || area}</span>
              <span class="effect-badge ${status==='einigung'?'effect-badge--positive':status==='kompromiss'?'effect-badge--neutral':''}">
                ${status==='einigung'?'✓ Einigung':status==='kompromiss'?'≈ Kompromiss':'Offen'}
              </span>
            </div>
          `).join('') :
          '<p class="text-xs text-muted">Noch keine Einigungen</p>'
        }
      </div>

      <div class="decision-options">
        <button class="decision-option" data-coalition-step="agree">
          <div class="decision-option__icon">✅</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Grundsätzlich zustimmen</div>
            <div class="decision-option__desc">Bereitschaft zur Koalition signalisieren. Gute Ausgangslage für formale Verhandlungen.</div>
          </div>
        </button>
        <button class="decision-option" data-coalition-step="compromise">
          <div class="decision-option__icon">🤝</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Kompromiss anbieten</div>
            <div class="decision-option__desc">Mittlerer Weg — zeigt Flexibilität, kostet aber etwas Glaubwürdigkeit.</div>
          </div>
        </button>
        <button class="decision-option" data-coalition-step="reject">
          <div class="decision-option__icon">❌</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Sondierungen abbrechen</div>
            <div class="decision-option__desc">Diese Koalition scheint nicht möglich. Zurück zu anderen Optionen.</div>
          </div>
        </button>
      </div>
    </div>`;
}

function renderVerhandlungsPhase(neg, partnerNames) {
  const nextArea = COALITION_POLICY_AREAS.find(a => !neg.agreements[a.id] || neg.agreements[a.id] === 'offen');
  const area = nextArea || COALITION_POLICY_AREAS[0];

  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">📋 Phase 2: Koalitionsverhandlungen</h2>
      <p class="text-sm text-muted mb-4">Formale Verhandlung mit: <strong>${partnerNames}</strong></p>

      <div class="panel mb-4">
        <h4 class="text-sm font-bold mb-2">Verhandlungsstand</h4>
        ${COALITION_POLICY_AREAS.map(a => `
          <div class="budget-line">
            <span>${a.icon} ${a.name}</span>
            <span class="effect-badge ${
              neg.agreements[a.id]==='akzeptiert'?'effect-badge--positive':
              neg.agreements[a.id]==='gegenentwurf'?'effect-badge--neutral':
              neg.agreements[a.id]==='abgelehnt'?'effect-badge--negative':''
            }">${
              neg.agreements[a.id]==='akzeptiert'?'✓ Einigung':
              neg.agreements[a.id]==='gegenentwurf'?'≈ Gegenentwurf':
              neg.agreements[a.id]==='abgelehnt'?'✗ Abgelehnt':'Offen'
            }</span>
          </div>
        `).join('')}
      </div>

      ${nextArea ? `
      <div class="panel panel--highlight mb-4">
        <h4 class="text-sm font-bold mb-2">Aktueller Verhandlungspunkt: ${area.icon} ${area.name}</h4>
        <p class="text-sm text-muted">Partner fordert eine bestimmte Position in diesem Bereich.</p>
      </div>
      <div class="decision-options">
        <button class="decision-option" data-coalition-step="accept">
          <div class="decision-option__icon">✅</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Forderung akzeptieren</div>
            <div class="decision-option__desc">Kompromissbereitschaft. Koalitionszufriedenheit +5.</div>
          </div>
        </button>
        <button class="decision-option" data-coalition-step="counter">
          <div class="decision-option__icon">🔄</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Gegenentwurf präsentieren</div>
            <div class="decision-option__desc">Mittlerer Weg, mehr Verhandlungsrunden nötig.</div>
          </div>
        </button>
        <button class="decision-option" data-coalition-step="reject">
          <div class="decision-option__icon">❌</div>
          <div class="decision-option__content">
            <div class="decision-option__title">Forderung ablehnen</div>
            <div class="decision-option__desc">Riskant — zu viele Ablehnungen gefährden die Koalition.</div>
          </div>
        </button>
      </div>
      ` : `
      <p class="text-sm text-muted mt-4">Alle Bereiche verhandelt. Weiter zum Koalitionsvertrag.</p>
      <button class="btn btn--primary btn--lg mt-4" data-coalition-step="accept">Zum Koalitionsvertrag →</button>
      `}
    </div>`;
}

function renderVertragsPhase(neg, partnerNames) {
  const rejected = Object.values(neg.agreements).filter(v => v === 'abgelehnt').length;

  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">📜 Phase 3: Koalitionsvertrag</h2>
      <p class="text-sm text-muted mb-4">Unterzeichnung mit: <strong>${partnerNames}</strong></p>

      <div class="panel mb-4">
        <h4 class="text-sm font-bold mb-3">Zusammenfassung der Einigungen</h4>
        ${COALITION_POLICY_AREAS.map(a => `
          <div class="budget-line">
                        <span>${a.icon} ${a.name}</span>
            <span class="effect-badge ${neg.agreements[a.id] === 'akzeptiert' ? 'effect-badge--positive' : neg.agreements[a.id] === 'abgelehnt' ? 'effect-badge--negative' : 'effect-badge--neutral'}">${neg.agreements[a.id] || 'offen'}</span>
          </div>
        `).join('')}
      </div>

      <p class="text-sm mb-4" style="color: ${rejected <= 1 ? 'var(--color-success)' : rejected <= 2 ? 'var(--color-warning)' : 'var(--color-error)'};">
        ${rejected === 0 ? 'Alle Forderungen akzeptiert — starke Koalition!' : rejected === 1 ? 'Eine Ablehnung — überschaubar.' : rejected === 2 ? 'Zwei Ablehnungen — Koalition wird schwierig.' : 'Zu viele Ablehnungen — Koalitionszufriedenheit wird gering starten.'}
      </p>

      <div style="display:flex; gap: var(--space-3); flex-wrap: wrap;">
        <button class="btn btn--primary btn--lg" data-coalition-step="sign">Koalitionsvertrag unterzeichnen ✍️</button>
        <button class="btn btn--danger" data-coalition-step="cancel">Verhandlungen abbrechen</button>
      </div>
    </div>`;
}

// ============================================================
// MINISTERAUSWAHL-SCREEN
// ============================================================
function renderMinisterAuswahl() {
  const coalition = state.selectedCoalition;
  const availablePool = [...state.player.personnel];

  const keyPositions = MINISTER_POSITIONS.slice(0, 6);
  const positionsHTML = keyPositions.map(pos => {
    const assigned = state.player.ministers[pos.id];
    const opts = availablePool.filter(p => {
      const isAssigned = Object.values(state.player.ministers).some(m => m && m.id === p.id);
      return !isAssigned || (assigned && assigned.id === p.id);
    });
    return `
      <div class="personnel-card">
        <div class="personnel-card__header">
          <span class="personnel-card__icon">${pos.icon}</span>
          <div>
            <div class="personnel-card__title">${pos.name}</div>
          </div>
        </div>
        <select class="input-field minister-select" data-minister="${pos.id}" style="width:100%; margin-top: var(--space-2);">
          <option value="">— Nicht besetzt —</option>
          ${opts.map(p => `<option value="${p.id}" ${assigned && assigned.id === p.id ? 'selected' : ''}>${p.name} (${p.expertise}, Skill: ${p.skill})</option>`).join('')}
        </select>
      </div>`;
  }).join('');

  // Auto-fill remaining positions with generated people
  MINISTER_POSITIONS.slice(6).forEach(pos => {
    if (!state.player.ministers[pos.id]) {
      state.player.ministers[pos.id] = generatePerson('center');
    }
  });

  return `
    <div class="panel">
      <h2 class="panel__title">🏛️ Kabinettsbildung</h2>
      <p class="text-sm text-muted mb-4">Koalition: ${coalition ? coalition.name : 'Alleinregierung'} — Besetzen Sie die wichtigsten Ministerien.</p>
      ${state.coalitionPartner ? `<div class="effect-badge effect-badge--positive mb-4">Koalitionspartner: ${state.coalitionPartner.short} · Zufriedenheit: ${Math.round(state.coalitionSatisfaction)}/100</div>` : ''}
      <div class="personnel-grid">${positionsHTML}</div>
      <button class="btn btn--primary btn--lg btn--block mt-6" id="btn-start-governance">Regierung starten →</button>
    </div>`;
}

// ============================================================
// SPIELENDE-SCREEN
// ============================================================
function renderSpielende() {
  const won = state.player.isKanzler || (state.player.seats > 0);
  const lawCount = state.player.passedLaws ? state.player.passedLaws.length : (state.player.lawsPassed || 0);
  return `
    <div class="panel text-center" style="padding: var(--space-12);">
      <h2 style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 800; color: ${won ? 'var(--color-success)' : 'var(--color-error)'};">
        ${won ? '🎉 Legislaturperiode beendet!' : '😔 Spiel vorbei'}
      </h2>
      <p class="text-lg text-muted mt-4">
        ${won ? `Sie haben ${state.electionCount + 1} Wahlperiode(n) überlebt.` : 'Ihre politische Karriere endet hier.'}
      </p>
      <div class="result-comparison mt-6">
        <div class="result-comparison__item">
          <span class="result-comparison__value">${fmtPct(state.player.approval)}</span>
          <span class="result-comparison__label">Letzte Zustimmung</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${state.player.seats || 0}</span>
          <span class="result-comparison__label">Bundestagssitze</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${fmtCurrency(state.player.budget.balance)}</span>
          <span class="result-comparison__label">Parteikasse</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${lawCount}</span>
          <span class="result-comparison__label">Gesetze</span>
        </div>
        ${state.electionCount > 0 ? `
        <div class="result-comparison__item">
          <span class="result-comparison__value">${state.electionCount}</span>
          <span class="result-comparison__label">Wahlen</span>
        </div>` : ''}
      </div>
      <button class="btn btn--primary btn--lg mt-8" id="btn-restart">Neues Spiel starten</button>
    </div>`;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachListeners() {
  // Title screen
  const btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.onclick = () => {
    AudioEngine.init(); AudioEngine.resume(); AudioEngine.click();
    state = createInitialState();
    state.phase = 'creation';
    renderScreen();
  };

  // Load saved game
  const btnLoadGame = document.getElementById('btn-load-game');
  if (btnLoadGame) btnLoadGame.onclick = () => { AudioEngine.click(); showLoadModal(); };

  // Creation screen
  const topicsContainer = document.getElementById('topics-container');
  if (topicsContainer) {
    const selectedTopics = [];
    const nameInput = document.getElementById('party-name');
    const shortInput = document.getElementById('party-short');
    const createBtn = document.getElementById('btn-create');
    const topicCount = document.getElementById('topic-count');

    topicsContainer.querySelectorAll('.topic-tag').forEach(tag => {
      tag.onclick = () => {
        AudioEngine.click();
        const topicId = tag.dataset.topic;
        const idx = selectedTopics.indexOf(topicId);
        if (idx >= 0) {
          selectedTopics.splice(idx, 1);
          tag.classList.remove('topic-tag--selected');
        } else if (selectedTopics.length < 3) {
          selectedTopics.push(topicId);
          tag.classList.add('topic-tag--selected');
        }
        if (topicCount) topicCount.textContent = `(${selectedTopics.length}/3)`;
        updateCreateButton();
      };
    });

    function updateCreateButton() {
      const valid = nameInput && nameInput.value.trim().length >= 2 && selectedTopics.length === 3;
      if (createBtn) createBtn.disabled = !valid;
    }
    if (nameInput) nameInput.oninput = updateCreateButton;
    if (shortInput) shortInput.oninput = updateCreateButton;

    if (createBtn) createBtn.onclick = () => {
      const name = nameInput.value.trim();
      const short = shortInput ? shortInput.value.trim().toUpperCase() : name.substring(0, 3).toUpperCase();
      const economic = parseInt(document.getElementById('economic-axis').value) / 100;
      const social = parseInt(document.getElementById('social-axis').value) / 100;
      AudioEngine.success();
      finalizePartyCreation(name, short, economic, social, selectedTopics);
    };
  }

  // Personnel setup
  document.querySelectorAll('.position-select').forEach(sel => {
    sel.onchange = () => { assignPosition(sel.dataset.position, sel.value); };
  });
  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) btnStartGame.onclick = () => { AudioEngine.success(); startPreElection(); };

  // Tab navigation
  const tabNav = document.getElementById('tab-nav');
  if (tabNav) {
    tabNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        AudioEngine.click();
        state.activeTab = btn.dataset.tab;
        renderScreen();
      };
    });
  }

  // Decision buttons (events)
  document.querySelectorAll('[data-decision]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); applyDecision(parseInt(btn.dataset.decision)); };
  });

  // Next month
  const btnNextMonth = document.getElementById('btn-next-month');
  if (btnNextMonth) btnNextMonth.onclick = () => { AudioEngine.click(); nextMonth(); };

  // Monthly action buttons (Kanzler / Opposition)
  const btnMonthAction = document.getElementById('btn-monthly-action');
  if (btnMonthAction) btnMonthAction.onclick = () => { AudioEngine.click(); showMonthlyActionMenu(); };

  // Kanzler monthly actions
  document.querySelectorAll('[data-kanzler-action]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); performKanzlerAction(btn.dataset.kanzlerAction); };
  });

  // Opposition actions
  document.querySelectorAll('[data-opposition-action]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); performOppositionAction(btn.dataset.oppositionAction); };
  });

  // TV Duel strategy
  document.querySelectorAll('[data-strategy]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); applyTvDuellStrategie(btn.dataset.strategy); };
  });

  // Continue after debate/result
  const btnContinueDebate = document.getElementById('btn-continue-after-debate');
  if (btnContinueDebate) btnContinueDebate.onclick = () => { AudioEngine.click(); clearDebateResult(); };

  // Donation buttons
  const btnAcceptDon = document.getElementById('btn-accept-donation');
  if (btnAcceptDon) btnAcceptDon.onclick = () => { handleSpende(true); };
  const btnRejectDon = document.getElementById('btn-reject-donation');
  if (btnRejectDon) btnRejectDon.onclick = () => { handleSpende(false); };

  // Parteitag
  document.querySelectorAll('[data-parteitag-arg]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); runParteitag(parseInt(btn.dataset['parteitagArg'])); };
  });

  // Plenardebatte
  document.querySelectorAll('[data-plenar-arg]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); handlePlenarDebatte(parseInt(btn.dataset['plenarArg'])); };
  });

  // Landtagswahl
  const btnLandtag = document.getElementById('btn-landtagswahl');
  if (btnLandtag) btnLandtag.onclick = () => { handleLandtagswahl(); };

  // Vertrauensfrage
  const btnVertrauensfrage = document.getElementById('btn-vertrauensfrage');
  if (btnVertrauensfrage) btnVertrauensfrage.onclick = () => { handleVertrauensfrage(); };

  // Koalitionskrise
  const btnKoalitionAc = document.getElementById('btn-koalition-accept');
  if (btnKoalitionAc) btnKoalitionAc.onclick = () => { handleKoalitionskrise(true); };
  const btnKoalitionRej = document.getElementById('btn-koalition-reject');
  if (btnKoalitionRej) btnKoalitionRej.onclick = () => { handleKoalitionskrise(false); };

  // Election results → coalition
  document.querySelectorAll('[data-coalition]').forEach(btn => {
    btn.onclick = () => { AudioEngine.success(); startKoalitionsverhandlung(parseInt(btn.dataset.coalition)); };
  });
  const btnOpposition = document.getElementById('btn-go-opposition');
  if (btnOpposition) btnOpposition.onclick = () => { AudioEngine.click(); goToOpposition(); };

  // Coalition negotiation steps
  document.querySelectorAll('[data-coalition-step]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); processCoalitionStep(btn.dataset.coalitionStep); };
  });

  // Minister selection
  document.querySelectorAll('.minister-select').forEach(sel => {
    sel.onchange = () => { assignMinister(sel.dataset.minister, sel.value); };
  });
  const btnStartGov = document.getElementById('btn-start-governance');
  if (btnStartGov) btnStartGov.onclick = () => { AudioEngine.success(); startGovernance(); };

  // Law actions
  document.querySelectorAll('[data-propose-law]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); proposeLaw(btn.dataset.proposeLaw); };
  });
  document.querySelectorAll('[data-advance-law]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); advanceLawPipeline(btn.dataset.advanceLaw); };
  });
  // Law pipeline step buttons (Nächste Stufe, Ausschuss-Änderungen, etc.)
  document.querySelectorAll('[data-law-action]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); advanceLaw(btn.dataset.lawAction); };
  });

  // TV-Duell start button
  const btnStartTvDuell = document.getElementById('btn-start-tvduell');
  if (btnStartTvDuell) btnStartTvDuell.onclick = () => { AudioEngine.click(); startTvDuell(); };

  // TV-Duell strategy buttons (data-tvduell-strategy)
  document.querySelectorAll('[data-tvduell-strategy]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); applyTvDuellStrategie(btn.dataset.tvduellStrategy); };
  });

  // Campaign tools
  document.querySelectorAll('[data-campaign-tool]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); deployCampaignTool(btn.dataset.campaignTool); };
  });

  // Regional campaign
  const btnApplyRegional = document.getElementById('btn-apply-regional');
  if (btnApplyRegional) btnApplyRegional.onclick = () => {
    const allocations = {};
    document.querySelectorAll('.regional-workers').forEach(input => {
      const blId = input.dataset.bl;
      if (!allocations[blId]) allocations[blId] = {};
      allocations[blId].workers = parseInt(input.value) || 0;
    });
    document.querySelectorAll('.regional-invest').forEach(input => {
      const blId = input.dataset.bl;
      if (!allocations[blId]) allocations[blId] = {};
      allocations[blId].investment = parseInt(input.value) || 0;
    });
    allocateRegionalCampaign(allocations);
    showToast('Regionaler Einsatz aktualisiert!');
  };

  // Media spending slider
  const mediaSlider = document.getElementById('media-spending-slider');
  if (mediaSlider) {
    mediaSlider.oninput = () => {
      state.player.budget.mediaSpending = parseInt(mediaSlider.value);
      const pctEl = mediaSlider.parentElement.querySelector('.budget-slider__pct');
      if (pctEl) pctEl.textContent = fmtCurrency(parseInt(mediaSlider.value));
    };
  }

  // Game over / restart
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.onclick = () => { AudioEngine.click(); startNewGame(); };

  // Header buttons
  const btnNewGame = document.getElementById('btn-new-game');
  if (btnNewGame) btnNewGame.onclick = () => {
    AudioEngine.click();
    if (confirm('Neues Spiel starten? Fortschritt geht verloren.')) startNewGame();
  };
  const btnMute = document.getElementById('btn-mute');
  if (btnMute) btnMute.onclick = () => {
    AudioEngine.toggle();
    btnMute.textContent = AudioEngine.muted ? '🔇' : '🔊';
  };
  const btnSave = document.getElementById('btn-save');
  if (btnSave) btnSave.onclick = () => { AudioEngine.click(); showSaveLoadModal(); };
  const btnLoad = document.getElementById('btn-load');
  if (btnLoad) btnLoad.onclick = () => { AudioEngine.click(); showSaveLoadModal(); };
  const btnSaveHeader = document.getElementById('btn-save-header');
  if (btnSaveHeader) btnSaveHeader.onclick = () => { AudioEngine.click(); showSaveLoadModal(); };
  const btnLoadSaves = document.getElementById('btn-load-saves');
  if (btnLoadSaves) btnLoadSaves.onclick = () => { AudioEngine.click(); showSaveLoadModal(); };

  // Agenda buttons
  document.querySelectorAll('[data-agenda-topic]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); toggleAgendaTopic(btn.dataset.agendaTopic); };
  });

  // Cabinet reshuffle
  const btnReshuffle = document.getElementById('btn-reshuffle-cabinet');
  if (btnReshuffle) btnReshuffle.onclick = () => { AudioEngine.click(); reshuffleCabinet(); };

  // Vertrauensfrage button
  const btnVF = document.getElementById('btn-vertrauensfrage-init');
  if (btnVF) btnVF.onclick = () => { AudioEngine.click(); initiateVertrauensfrage(); };
}

// ============================================================
// MONTHLY ACTION SYSTEM
// ============================================================
function showMonthlyActionMenu() {
  // In governance, when no event: show action choice inline
  state.pendingMonthlyAction = true;
  renderScreen();
}

function performKanzlerAction(actionId) {
  state.pendingMonthlyAction = false;
  const b = state.player.budget;
  let headline = '';

  switch(actionId) {
    case 'law':
      // Show law proposal — handled via renderGesetzeTab
      state.activeTab = 'gesetze';
      renderScreen();
      return;
    case 'media':
      // Media campaign
      if (b.balance >= 200000) {
        b.balance -= 200000;
        state.player.media = clamp(state.player.media + 5, 0, 100);
        VOTER_GROUPS.forEach(g => { state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] + rand(0.5, 1.5), 0, 60); });
        headline = `Regierung startet Medienkampagne`;
        showToast('Medienkampagne gestartet! +5 Medienpunkte');
        AudioEngine.success();
      } else { showToast('Nicht genug Budget!'); return; }
      break;
    case 'cabinet':
      // Cabinet meeting — unity bonus
      state.player.partyUnity = clamp(state.player.partyUnity + randInt(2, 5), 0, 100);
      if (state.coalitionPartner) {
        state.coalitionSatisfaction = clamp(state.coalitionSatisfaction + 3, 0, 100);
      }
      headline = `Kabinettssitzung: Einheit gestärkt`;
      showToast('Kabinettssitzung erfolgreich! Einheit +' + randInt(2, 5));
      AudioEngine.click();
      break;
    case 'summit':
      // International summit
      state.player.media = clamp(state.player.media + 3, 0, 100);
      state.player.credibility = clamp(state.player.credibility + 2, 0, 100);
      VOTER_GROUPS.forEach(g => { state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] + rand(0.3, 1), 0, 60); });
      headline = `${state.player.short} vertritt Deutschland auf internationalem Gipfel`;
      showToast('Gipfeltreffen! Ansehen gestiegen.');
      AudioEngine.debate();
      break;
  }

  if (headline) {
    state.newsHistory.unshift({ headline, month: state.totalMonths });
    if (state.newsHistory.length > 30) state.newsHistory.pop();
  }
  recalculateApproval();
  advanceMonth();
}



function advanceLawPipeline(lawId) {
  const law = state.pendingLaw;
  if (!law || law.id !== lawId) return;

  const stages = ['erstlesung', 'ausschuss', 'zweitelesung', 'drittelesung', 'bundesrat', 'verkuendung'];
  const stageIdx = stages.indexOf(law.stage);

  // Simulate vote based on coalition strength + approval
  const coalitionStrength = state.player.isKanzler ? (state.player.seats || 0) / 598 : 0.3;
  const approvalBonus = state.player.approval / 100;
  const success = Math.random() < (0.4 + coalitionStrength * 0.4 + approvalBonus * 0.2);

  // Special: Bundesrat — check if zustimmungspflichtig
  if (law.stage === 'bundesrat') {
    const bundesratNeeded = law.zustimmungspflichtig !== false;
    if (!bundesratNeeded) {
      law.stage = 'verkuendung';
      law.progress = stages.indexOf('verkuendung') / (stages.length - 1);
      showToast('Bundesrat nicht erforderlich — direkt zur Verkündung');
      renderScreen();
      return;
    }
  }

  if (success) {
    if (stageIdx < stages.length - 1) {
      law.stage = stages[stageIdx + 1];
      law.progress = (stageIdx + 1) / (stages.length - 1);
      const stageNames = { erstlesung: 'Erste Lesung', ausschuss: 'Ausschuss', zweitelesung: 'Zweite Lesung', drittelesung: 'Dritte Lesung', bundesrat: 'Bundesrat', verkuendung: 'Verkündung' };
      showToast(`✅ ${stageNames[law.stage]} erfolgreich!`);
      AudioEngine.success();
    }
    if (law.stage === 'verkuendung') {
      // Law passed!
      finalizeLaw(law, true);
      return;
    }
  } else {
    if (law.stage === 'drittelesung') {
      finalizeLaw(law, false);
      return;
    }
    showToast(`❌ Rückschlag bei ${law.stage} — Überarbeitungen nötig`);
    AudioEngine.failure();
    // Allow retry
    law.progress = Math.max(0, law.progress - 0.1);
  }
  renderScreen();
}

function finalizeLaw(law, passed) {
  if (passed) {
    state.passedLaws.push({ ...law, passedMonth: state.totalMonths });
    state.player.lawsPassed = (state.player.lawsPassed || 0) + 1;

    // Apply effects
    if (law.voterEffects) {
      VOTER_GROUPS.forEach(g => {
        const eff = law.voterEffects[g.id] || 0;
        state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] + eff, 0, 60);
      });
    }
    if (law.budgetEffect) {
      state.player.budget.balance += law.budgetEffect;
    }
    state.newsHistory.unshift({ headline: `Gesetz "${law.name}" verabschiedet!`, month: state.totalMonths });
    showToast(`🎉 Gesetz "${law.name}" verabschiedet!`);
    AudioEngine.fanfare();
  } else {
    state.failedLaws.push({ ...law, failedMonth: state.totalMonths });
    state.player.credibility = clamp(state.player.credibility - 3, 0, 100);
    state.newsHistory.unshift({ headline: `Gesetzentwurf "${law.name}" gescheitert`, month: state.totalMonths });
    showToast(`😔 Gesetz "${law.name}" gescheitert`);
    AudioEngine.failure();
  }
  state.pendingLaw = null;
  recalculateApproval();
  renderScreen();
}

// ============================================================
// CAMPAIGN TOOLS
// ============================================================
function deployCampaignTool(toolId) {
  const tools = {
    plakate:      { cost: 200000, label: 'Plakataktionen', effects: { land: 2, media: 1 } },
    tvspots:      { cost: 500000, label: 'TV-Spots', effects: { media: 4, rentner: 2, arbeiter: 1 } },
    socialmedia:  { cost: 150000, label: 'Social-Media-Kampagne', effects: { jugend: 4, akademiker: 2 } },
    kundgebungen: { cost: 250000, label: 'Großkundgebungen', effects: { arbeiter: 2, jugend: 2, media: 2 } },
    haustuer:     { cost: 100000, label: 'Haustürwahlkampf', effects: { land: 3, arbeiter: 2 } },
    wahlkampfbus: { cost: 300000, label: 'Wahlkampfbus-Tour', effects: { land: 3, arbeiter: 3, media: 2 } },
  };

  const tool = tools[toolId];
  if (!tool) return;

  if (state.player.budget.balance < tool.cost) {
    showToast(`Nicht genug Budget! Benötigt: ${fmtCurrency(tool.cost)}`);
    AudioEngine.failure();
    return;
  }

  state.player.budget.balance -= tool.cost;
  if (!state.campaignTools) state.campaignTools = {};
  state.campaignTools[toolId] = (state.campaignTools[toolId] || 0) + 1;

  Object.entries(tool.effects).forEach(([key, val]) => {
    if (state.player.voterApproval[key] !== undefined) {
      state.player.voterApproval[key] = clamp(state.player.voterApproval[key] + val, 0, 60);
    }
    if (key === 'media') {
      state.player.media = clamp(state.player.media + val, 0, 100);
    }
  });

  recalculateApproval();
  showToast(`${tool.label} eingesetzt! -${fmtCurrency(tool.cost)}`);
  AudioEngine.budget();
  renderScreen();
}


// ============================================================
// AGENDA / GOVERNMENT PRIORITIES
// ============================================================
function toggleAgendaTopic(topicId) {
  if (!state.governmentAgenda) state.governmentAgenda = [];
  const idx = state.governmentAgenda.indexOf(topicId);
  if (idx >= 0) {
    state.governmentAgenda.splice(idx, 1);
  } else if (state.governmentAgenda.length < 3) {
    state.governmentAgenda.push(topicId);
  }
  renderScreen();
}

function reshuffleCabinet() {
  // Remove all ministers and prompt re-selection
  state.player.ministers = {};
  state.phase = 'ministerSelection';
  showToast('Kabinett umgebildet — Ministerien neu besetzen');
  renderScreen();
}

// ============================================================
// VERTRAUENSFRAGE
// ============================================================
function initiateVertrauensfrage() {
  state.pendingVertrauensfrage = true;
  renderScreen();
}



// ============================================================
// SAVE / LOAD — localStorage mit 3 Speicherslots + Autosave
// ============================================================
const SAVE_KEY_PREFIX = 'machtspiel_save_';
const AUTOSAVE_KEY = 'machtspiel_autosave';

function autoSave() {
  try {
    const data = JSON.parse(JSON.stringify(state));
    data._saveTime = Date.now();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch(e) { /* Speicher voll o.ä. — still ignorieren */ }
}

function saveToSlot(slot) {
  try {
    const data = JSON.parse(JSON.stringify(state));
    data._saveTime = Date.now();
    data._saveName = `${state.player.name || state.player.short} — ${state.phase === 'governance' ? (state.player.isKanzler ? 'Kanzler' : 'Opposition') : state.phase === 'campaign' ? 'Wahlkampf' : 'Vorwahl'}, Jahr ${state.year}`;
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(data));
    showToast(`✅ Slot ${slot} gespeichert!`);
    closeSaveLoadModal();
  } catch(e) {
    showToast('Fehler beim Speichern: ' + e.message);
  }
}

function loadFromSlot(slot) {
  try {
    const json = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (!json) { showToast('Kein Spielstand in diesem Slot.'); return; }
    state = JSON.parse(json);
    renderScreen();
    showToast('✅ Spielstand geladen!');
    closeSaveLoadModal();
  } catch(e) {
    showToast('Fehler beim Laden.');
  }
}

function loadAutosave() {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY);
    if (!json) { showToast('Kein Autosave vorhanden.'); return; }
    state = JSON.parse(json);
    renderScreen();
    showToast('✅ Autosave geladen!');
    closeSaveLoadModal();
  } catch(e) {
    showToast('Fehler beim Laden.');
  }
}

function deleteSlot(slot) {
  localStorage.removeItem(SAVE_KEY_PREFIX + slot);
  showSaveLoadModal();
  showToast('Slot ' + slot + ' gelöscht.');
}

function getSaveInfo(key) {
  try {
    const json = localStorage.getItem(key);
    if (!json) return null;
    const data = JSON.parse(json);
    const time = data._saveTime ? new Date(data._saveTime) : null;
    const timeStr = time ? time.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '?';
    return {
      name: data._saveName || (data.player?.short || '?'),
      time: timeStr,
      phase: data.phase || '?',
      party: data.player?.short || '?',
      approval: data.player?.approval ? Math.round(data.player.approval) + '%' : '?',
      year: data.year || '?'
    };
  } catch(e) { return null; }
}

function showSaveLoadModal() {
  const existing = document.getElementById('save-load-overlay');
  if (existing) existing.remove();

  // Slot-Infos sammeln
  const slots = [1, 2, 3].map(i => ({ slot: i, info: getSaveInfo(SAVE_KEY_PREFIX + i) }));
  const autosave = getSaveInfo(AUTOSAVE_KEY);

  const slotHTML = slots.map(s => {
    const info = s.info;
    if (info) {
      return `
        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
            <strong>Slot ${s.slot}: ${info.name}</strong>
            <span class="text-xs text-muted">${info.time}</span>
          </div>
          <div class="text-xs text-muted mb-3">${info.party} · ${info.approval} Zustimmung · Jahr ${info.year}</div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn--primary btn--sm" onclick="saveToSlot(${s.slot})">Hier speichern</button>
            <button class="btn btn--secondary btn--sm" onclick="loadFromSlot(${s.slot})">Laden</button>
            <button class="btn btn--danger btn--sm" onclick="deleteSlot(${s.slot})">Löschen</button>
          </div>
        </div>`;
    } else {
      return `
        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
            <strong>Slot ${s.slot}: Leer</strong>
          </div>
          <button class="btn btn--primary btn--sm" onclick="saveToSlot(${s.slot})">Hier speichern</button>
        </div>`;
    }
  }).join('');

  const autosaveHTML = autosave ? `
    <div style="background:var(--color-primary-glow);border:1px solid var(--color-primary);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <strong>🔄 Autosave</strong>
        <span class="text-xs text-muted">${autosave.time}</span>
      </div>
      <div class="text-xs text-muted mb-3">${autosave.party} · ${autosave.approval} Zustimmung · Jahr ${autosave.year}</div>
      <button class="btn btn--secondary btn--sm" onclick="loadAutosave()">Autosave laden</button>
    </div>` : '';

  const canSave = state && state.phase && state.phase !== 'title';

  const overlay = document.createElement('div');
  overlay.className = 'save-load-overlay';
  overlay.id = 'save-load-overlay';
  overlay.innerHTML = `
    <div class="save-load-modal">
      <div class="save-load-modal__header">
        <h3>💾 Spielstände</h3>
        <button class="save-load-modal__close" onclick="closeSaveLoadModal()">✕</button>
      </div>
      ${autosaveHTML}
      <h4 class="text-sm font-bold mb-3">Speicherplätze</h4>
      ${slotHTML}
      ${!canSave ? '<div class="text-xs text-muted mt-2">Starten Sie erst ein Spiel, um speichern zu können.</div>' : ''}
    </div>`;
  document.body.appendChild(overlay);
}

function closeSaveLoadModal() {
  const overlay = document.getElementById('save-load-overlay');
  if (overlay) overlay.remove();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// ============================================================
// MISC UTILITY FUNCTIONS
// ============================================================
window.render_game_to_text = function() {
  const content = document.getElementById('game-content');
  return content ? content.innerText : '';
};

window.advanceTime = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================
// INIT — EINMALIGER START
// ============================================================
// ============================================================
// FUNKTIONS-ALIASES (Kompatibilitätsschicht)
// ============================================================

// renderKabinettsbildung is renderMinisterAuswahl
function renderKabinettsbildung() { return renderMinisterAuswahl(); }

// renderSpielEnde is renderSpielende
function renderSpielEnde() { return renderSpielende(); }

// startKoalitionsverhandlung wraps startCoalitionNegotiation
function startKoalitionsverhandlung(idx) { return startCoalitionNegotiation(idx); }

// processCoalitionStep wraps advanceCoalitionNegotiation
function processCoalitionStep(step) { return advanceCoalitionNegotiation(step); }

// advanceMonth — proceed one month after an action
function advanceMonth() {
  state.debateResult = null;
  nextMonth();
}

// applyTvDuellStrategie — wrapper for applyTvDuellStrategy
function applyTvDuellStrategie(strategy) { return applyTvDuellStrategy(strategy); }

// clearDebateResult — clear debate result and continue
function clearDebateResult() {
  state.debateResult = null;
  renderScreen();
}

// handleSpende — wrapper for handleDonation
function handleSpende(accept) { return handleDonation(accept); }

// handleDonation (if not already defined in engine, reuse donation logic)



function initGame() {
  try { AudioEngine.init(); } catch(e) {}
  state = null;
  renderScreen();
}

document.addEventListener('DOMContentLoaded', initGame);
