====
   MACHTSPIEL v2 — Deep Political Simulation
   Complete game engine with expanded mechanics
   ============================================ */

// ===== AUDIO ENGINE =====
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
  fanfare()  { [523,659,784,1047].forEach((f,i) => setTimeout(()=>this.play('sine',f,0.2,0.12),i*120)); },
  tension()  { this.play('sawtooth', 120, 0.5, 0.06); },
  toggle()   { this.muted = !this.muted; }
};
// ===== CONSTANTS =====
const TOPICS = [
  { id: 'wirtschaft',      name: 'Wirtschaft',      icon: '📊' },
  { id: 'migration',       name: 'Migration',       icon: '🌍' },
  { id: 'klima',           name: 'Klima/Umwelt',    icon: '🌱' },
  { id: 'sicherheit',      name: 'Sicherheit',      icon: '🛡️' },
  { id: 'bildung',         name: 'Bildung',         icon: '🎓' },
  { id: 'digitalisierung', name: 'Digitalisierung', icon: '💻' },
  { id: 'gesundheit',      name: 'Gesundheit',      icon: '🏥' },
  { id: 'soziales',        name: 'Soziales',        icon: '🤝' },
  { id: 'wohnen',          name: 'Wohnen',          icon: '🏠' },
];

const VOTER_GROUPS = [
  { id: 'arbeiter',        name: 'Arbeiter',        icon: '🔧', weight: 0.22 },
  { id: 'akademiker',      name: 'Akademiker',      icon: '🎓', weight: 0.18 },
  { id: 'rentner',         name: 'Rentner',         icon: '👴', weight: 0.20 },
  { id: 'jugend',          name: 'Jugend',          icon: '🧑', weight: 0.15 },
  { id: 'selbststaendige', name: 'Selbstständige',  icon: '💼', weight: 0.12 },
  { id: 'land',            name: 'Landbevölkerung', icon: '🌾', weight: 0.13 },
];

// ===== BUNDESLÄNDER =====
const BUNDESLAENDER = [
  { id: 'nrw',   name: 'Nordrhein-Westfalen',     short: 'NRW', wahlkreise: 64, lean: 0.0,  population: 18 },
  { id: 'bay',   name: 'Bayern',                   short: 'BAY', wahlkreise: 46, lean: 0.4,  population: 13 },
  { id: 'bw',    name: 'Baden-Württemberg',        short: 'BW',  wahlkreise: 38, lean: 0.2,  population: 11 },
  { id: 'nds',   name: 'Niedersachsen',            short: 'NDS', wahlkreise: 30, lean: -0.1, population: 8  },
  { id: 'hes',   name: 'Hessen',                   short: 'HES', wahlkreise: 22, lean: 0.1,  population: 6  },
  { id: 'sac',   name: 'Sachsen',                  short: 'SAC', wahlkreise: 16, lean: 0.3,  population: 4  },
  { id: 'rlp',   name: 'Rheinland-Pfalz',          short: 'RLP', wahlkreise: 15, lean: 0.0,  population: 4  },
  { id: 'ber',   name: 'Berlin',                   short: 'BER', wahlkreise: 12, lean: -0.4, population: 4  },
  { id: 'sh',    name: 'Schleswig-Holstein',        short: 'SH',  wahlkreise: 11, lean: 0.1,  population: 3  },
  { id: 'bbg',   name: 'Brandenburg',              short: 'BBG', wahlkreise: 10, lean: 0.1,  population: 3  },
  { id: 'st',    name: 'Sachsen-Anhalt',            short: 'ST',  wahlkreise: 9,  lean: 0.2,  population: 2  },
  { id: 'thu',   name: 'Thüringen',                short: 'THU', wahlkreise: 8,  lean: 0.2,  population: 2  },
  { id: 'hh',    name: 'Hamburg',                   short: 'HH',  wahlkreise: 6,  lean: -0.3, population: 2  },
  { id: 'mv',    name: 'Mecklenburg-Vorpommern',   short: 'MV',  wahlkreise: 6,  lean: 0.1,  population: 2  },
  { id: 'saar',  name: 'Saarland',                 short: 'SAR', wahlkreise: 4,  lean: -0.1, population: 1  },
  { id: 'hb',    name: 'Bremen',                   short: 'HB',  wahlkreise: 2,  lean: -0.3, population: 1  },
];

const TOTAL_WAHLKREISE = BUNDESLAENDER.reduce((s, b) => s + b.wahlkreise, 0); // 299

// ===== PARTY POSITIONS =====
const PARTY_POSITIONS = [
  { id: 'generalsekretaer',   name: 'Generalsekretär/in',       icon: '📋', effect: 'campaign',  desc: 'Verbessert Kampagnenorganisation' },
  { id: 'fraktionsvorsitz',   name: 'Fraktionsvorsitzende/r',   icon: '🏛️', effect: 'bundestag', desc: 'Stärkt Bundestagspräsenz' },
  { id: 'schatzmeister',      name: 'Schatzmeister/in',         icon: '💰', effect: 'budget',    desc: 'Bessere Budgetverwaltung' },
  { id: 'pressesprecher',     name: 'Pressesprecher/in',        icon: '📺', effect: 'media',     desc: 'Bessere Medienberichterstattung' },
  { id: 'stellvertreter1',    name: 'Stellv. Vorsitzende/r I',  icon: '👥', effect: 'loyalty',   desc: 'Stärkt Parteieinheit' },
  { id: 'stellvertreter2',    name: 'Stellv. Vorsitzende/r II', icon: '👥', effect: 'loyalty',   desc: 'Stärkt Parteieinheit' },
];

const MINISTER_POSITIONS = [
  { id: 'finanzen',    name: 'Finanzen',            icon: '💶' },
  { id: 'inneres',     name: 'Inneres',             icon: '🏢' },
  { id: 'aeusseres',   name: 'Äußeres',             icon: '🌐' },
  { id: 'verteidigung',name: 'Verteidigung',        icon: '🎖️' },
  { id: 'wirtschaft',  name: 'Wirtschaft',          icon: '📈' },
  { id: 'arbeit',      name: 'Arbeit & Soziales',   icon: '🤝' },
  { id: 'justiz',      name: 'Justiz',              icon: '⚖️' },
  { id: 'gesundheit',  name: 'Gesundheit',          icon: '🏥' },
  { id: 'bildung',     name: 'Bildung',             icon: '🎓' },
  { id: 'umwelt',      name: 'Umwelt',              icon: '🌿' },
  { id: 'verkehr',     name: 'Verkehr & Digitales',  icon: '🚄' },
  { id: 'wohnen',      name: 'Wohnen & Bau',        icon: '🏗️' },
];

// ===== GERMAN NAMES =====
const FIRST_NAMES_M = ['Thomas','Stefan','Andreas','Michael','Jürgen','Markus','Christian','Wolfgang','Peter','Klaus','Hans','Dieter','Frank','Martin','Bernd','Rainer','Uwe','Gerhard','Friedrich','Karl','Olaf','Robert','Armin','Cem','Marco','Hubertus','Norbert','Volker','Heiko','Alexander','Tobias','Sebastian','Florian','Jonas','Maximilian','Lukas','Jan','Tim','Felix','Moritz'];
const FIRST_NAMES_F = ['Annalena','Christine','Ursula','Katarina','Brigitte','Andrea','Monika','Sabine','Petra','Claudia','Renate','Susanne','Karin','Heike','Bettina','Franziska','Dorothee','Svenja','Klara','Ricarda','Lisa','Marie','Julia','Sarah','Nadine','Eva','Anja','Nicole','Martina','Silke','Katharina','Hannah','Lena','Sophie','Laura','Anna','Johanna','Miriam','Carla','Vera'];
const LAST_NAMES = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Wolf','Schröder','Neumann','Schwarz','Braun','Zimmermann','Hartmann','Krüger','Lange','Werner','Lehmann','König','Baumann','Keller','Winkler','Lorenz','Albrecht','Berger','Vogt','Roth','Seidel','Franke','Vogel','Beck','Engel','Schuster','Friedrich','Haas'];

const EXPERTISE_AREAS = ['Wirtschaft','Innenpolitik','Außenpolitik','Sozialpolitik','Umweltpolitik','Bildung','Digitalisierung','Finanzen','Justiz','Gesundheit','Verteidigung','Verkehr'];

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// ===== AI PARTIES =====
const AI_PARTIES = [
  { id: 'volkspartei', name: 'Volkspartei Mitte', short: 'VPM', color: '#1e3a5f', baseApproval: 27,
    alignment: { economic: 0.3, social: 0.2 }, topics: ['wirtschaft','sicherheit','bildung'],
    voterBase: { arbeiter: 0.25, akademiker: 0.2, rentner: 0.35, jugend: 0.1, selbststaendige: 0.3, land: 0.35 } },
  { id: 'sozialdemokraten', name: 'Sozialdemokratische Allianz', short: 'SDA', color: '#c0392b', baseApproval: 22,
    alignment: { economic: -0.3, social: -0.1 }, topics: ['soziales','wirtschaft','gesundheit'],
    voterBase: { arbeiter: 0.35, akademiker: 0.25, rentner: 0.25, jugend: 0.15, selbststaendige: 0.1, land: 0.2 } },
  { id: 'gruene', name: 'Grüne Zukunft', short: 'GZ', color: '#27ae60', baseApproval: 14,
    alignment: { economic: -0.2, social: -0.5 }, topics: ['klima','bildung','digitalisierung'],
    voterBase: { arbeiter: 0.1, akademiker: 0.35, rentner: 0.05, jugend: 0.35, selbststaendige: 0.15, land: 0.05 } },
  { id: 'freie', name: 'Freie Demokraten', short: 'FD', color: '#f1c40f', baseApproval: 9,
    alignment: { economic: 0.5, social: -0.3 }, topics: ['wirtschaft','digitalisierung','bildung'],
    voterBase: { arbeiter: 0.05, akademiker: 0.25, rentner: 0.1, jugend: 0.15, selbststaendige: 0.4, land: 0.08 } },
  { id: 'linke', name: 'Linke Alternative', short: 'LA', color: '#8e44ad', baseApproval: 7,
    alignment: { economic: -0.7, social: -0.4 }, topics: ['soziales','wohnen','gesundheit'],
    voterBase: { arbeiter: 0.25, akademiker: 0.15, rentner: 0.15, jugend: 0.2, selbststaendige: 0.02, land: 0.1 } },
  { id: 'nationale', name: 'Nationale Bewegung', short: 'NB', color: '#5d4037', baseApproval: 12,
    alignment: { economic: 0.1, social: 0.7 }, topics: ['migration','sicherheit','wirtschaft'],
    voterBase: { arbeiter: 0.2, akademiker: 0.05, rentner: 0.15, jugend: 0.1, selbststaendige: 0.15, land: 0.35 } },
];

// ===== EVENTS POOL =====
const EVENTS_POOL = [
  { id: 'wirtschaftskrise', category: 'Wirtschaft', headline: 'Wirtschaftskrise droht: BIP sinkt um 2%',
    description: 'Die deutsche Wirtschaft rutscht in eine Rezession. Unternehmen kündigen Massenentlassungen an.',
    topic: 'wirtschaft', options: [
      { label: 'Konjunkturprogramm', desc: 'Massive staatliche Investitionen zur Ankurbelung', icon: '💸', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: -1, jugend: 3, selbststaendige: -3, land: 2, media: 2, budget: -800000 } },
      { label: 'Steuerentlastungen', desc: 'Gezielte Steuersenkungen für Mittelstand', icon: '📉', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 0, jugend: 0, selbststaendige: 6, land: 1, media: 1, budget: -400000 } },
      { label: 'Sparpolitik', desc: 'Staatsausgaben kürzen und Haushaltsdisziplin', icon: '✂️', stance: 'conservative',
        effects: { arbeiter: -4, akademiker: -1, rentner: -3, jugend: -2, selbststaendige: 3, land: -1, media: -1, budget: 200000 } },
    ] },
  { id: 'fluechtlingskrise', category: 'Migration', headline: 'Flüchtlingszahlen auf neuem Höchststand',
    description: 'Hunderttausende suchen Schutz in Deutschland. Kommunen melden Überlastung.',
    topic: 'migration', options: [
      { label: 'Offene Aufnahme', desc: 'Humanitäre Aufnahme und Integrationsprogramme', icon: '🤗', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 4, rentner: -4, jugend: 3, selbststaendige: -1, land: -5, media: 1, budget: -500000 } },
      { label: 'Geordnete Zuwanderung', desc: 'Kontingente und beschleunigte Verfahren', icon: '📋', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 1, jugend: 1, selbststaendige: 1, land: 0, media: 2, budget: -200000 } },
      { label: 'Strenge Grenzkontrolle', desc: 'Grenzkontrollen verschärfen', icon: '🚧', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -4, rentner: 3, jugend: -3, selbststaendige: 1, land: 4, media: -1, budget: -300000 } },
    ] },
  { id: 'klimakatastrophe', category: 'Klima', headline: 'Rekord-Hitzewelle: Waldbrände in Brandenburg',
    description: 'Extreme Temperaturen führen zu schweren Waldbränden. Experten fordern Handeln.',
    topic: 'klima', options: [
      { label: 'Klimanotstand', desc: 'Sofortiger Ausstieg aus fossilen Energien', icon: '🔥', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 5, rentner: -2, jugend: 6, selbststaendige: -4, land: -3, media: 3, budget: -600000 } },
      { label: 'Grüne Transformation', desc: 'Schrittweiser Umbau mit Förderung', icon: '🌿', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: 0, jugend: 3, selbststaendige: 0, land: 0, media: 2, budget: -300000 } },
      { label: 'Technologie-Fokus', desc: 'Innovation statt Verbote', icon: '🔬', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -1, rentner: 2, jugend: -2, selbststaendige: 4, land: 2, media: 0, budget: -100000 } },
    ] },
  { id: 'bildungsreform', category: 'Bildung', headline: 'PISA-Schock: Deutsche Schüler fallen zurück',
    description: 'Dramatischer Leistungsrückgang bei PISA. Lehrer und Eltern fordern Reformen.',
    topic: 'bildung', options: [
      { label: 'Gesamtschulreform', desc: 'Einheitsschule für mehr Chancengleichheit', icon: '🏫', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 1, rentner: -1, jugend: 4, selbststaendige: -2, land: 1, media: 2, budget: -400000 } },
      { label: 'Digitales Klassenzimmer', desc: 'Investitionen in digitale Infrastruktur', icon: '💻', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 3, rentner: 0, jugend: 5, selbststaendige: 2, land: 1, media: 3, budget: -500000 } },
      { label: 'Leistungsprinzip', desc: 'Begabtenförderung und Schulwettbewerb', icon: '🏆', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: 2, rentner: 2, jugend: -1, selbststaendige: 3, land: -1, media: 0, budget: -100000 } },
    ] },
  { id: 'gesundheitskrise', category: 'Gesundheit', headline: 'Krankenhäuser: Personalmangel eskaliert',
    description: 'Tausende Pflegekräfte verlassen den Beruf. Notaufnahmen weisen Patienten ab.',
    topic: 'gesundheit', options: [
      { label: 'Verstaatlichung', desc: 'Krankenhäuser in öffentliche Hand', icon: '🏥', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 2, rentner: 5, jugend: 1, selbststaendige: -4, land: 3, media: 2, budget: -700000 } },
      { label: 'Pflegeoffensive', desc: 'Bessere Bezahlung und Ausbildung', icon: '💉', stance: 'moderate',
        effects: { arbeiter: 3, akademiker: 2, rentner: 3, jugend: 2, selbststaendige: -1, land: 2, media: 2, budget: -400000 } },
      { label: 'Privatisierung', desc: 'Private Investoren ins Gesundheitswesen', icon: '🏦', stance: 'conservative',
        effects: { arbeiter: -3, akademiker: 0, rentner: -2, jugend: -1, selbststaendige: 5, land: -2, media: -1, budget: 100000 } },
    ] },
  { id: 'wohnungsnot', category: 'Wohnen', headline: 'Mietenexplosion: Proteste in Großstädten',
    description: 'In Berlin, München und Hamburg können sich Normalverdiener keine Wohnung mehr leisten.',
    topic: 'wohnen', options: [
      { label: 'Mietpreisbremse', desc: 'Strenge Mietregulierung und Enteignung', icon: '🔒', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: 2, jugend: 5, selbststaendige: -5, land: 0, media: 1, budget: -200000 } },
      { label: 'Wohnungsbau', desc: 'Sozialen Wohnungsbau massiv fördern', icon: '🏗️', stance: 'moderate',
        effects: { arbeiter: 3, akademiker: 2, rentner: 1, jugend: 3, selbststaendige: 2, land: 1, media: 2, budget: -600000 } },
      { label: 'Marktlösung', desc: 'Bauvorschriften lockern, Markt regeln lassen', icon: '📐', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: 0, rentner: -1, jugend: -2, selbststaendige: 5, land: 2, media: -1, budget: 0 } },
    ] },
  { id: 'cyberangriff', category: 'Sicherheit', headline: 'Großer Cyberangriff auf Bundesbehörden',
    description: 'Hacker haben sensible Daten aus Ministerien erbeutet. Die digitale Infrastruktur ist verwundbar.',
    topic: 'sicherheit', options: [
      { label: 'Cyber-Agentur', desc: 'Neue Behörde für Cybersicherheit gründen', icon: '🛡️', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: 1, jugend: 4, selbststaendige: 2, land: 0, media: 3, budget: -500000 } },
      { label: 'Überwachung ausbauen', desc: 'Stärkere Kontrolle des Datenverkehrs', icon: '👁️', stance: 'conservative',
        effects: { arbeiter: 0, akademiker: -3, rentner: 2, jugend: -4, selbststaendige: -1, land: 1, media: -2, budget: -400000 } },
      { label: 'Open Source', desc: 'Staatliche IT auf Open Source umstellen', icon: '🔓', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 4, rentner: -1, jugend: 5, selbststaendige: 1, land: 0, media: 2, budget: -300000 } },
    ] },
  { id: 'rentendebatte', category: 'Soziales', headline: 'Rentenversicherung vor dem Kollaps',
    description: 'Das Rentensystem ist nicht mehr finanzierbar. Millionen Rentner fürchten Kürzungen.',
    topic: 'soziales', options: [
      { label: 'Bürgerversicherung', desc: 'Alle zahlen ein — solidarisches System', icon: '🤝', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 1, rentner: 5, jugend: 2, selbststaendige: -5, land: 2, media: 1, budget: -300000 } },
      { label: 'Aktienrente', desc: 'Kapitalgedeckte Zusatzrente einführen', icon: '📈', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 3, rentner: -1, jugend: 3, selbststaendige: 4, land: -1, media: 2, budget: -200000 } },
      { label: 'Rentenalter anheben', desc: 'Rente mit 70 für langfristige Stabilität', icon: '📅', stance: 'conservative',
        effects: { arbeiter: -5, akademiker: -1, rentner: -6, jugend: 1, selbststaendige: 2, land: -3, media: -2, budget: 300000 } },
    ] },
  { id: 'digitalisierung_verwaltung', category: 'Digitalisierung', headline: 'Deutschland im Digitalisierungs-Ranking abgestürzt',
    description: 'Im E-Government-Ranking liegt Deutschland auf Platz 25. Bürger warten monatelang auf Behördentermine.',
    topic: 'digitalisierung', options: [
      { label: 'Digitalministerium', desc: 'Neues Ministerium mit umfassender Kompetenz', icon: '🏛️', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 4, rentner: -1, jugend: 5, selbststaendige: 3, land: 1, media: 3, budget: -500000 } },
      { label: 'Schrittweise Reform', desc: 'Bestehende Strukturen digitalisieren', icon: '📱', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 1, jugend: 2, selbststaendige: 2, land: 1, media: 1, budget: -300000 } },
      { label: 'Outsourcing', desc: 'Private IT-Firmen mit Umsetzung beauftragen', icon: '🏢', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: 1, rentner: 0, jugend: 1, selbststaendige: 4, land: 0, media: 0, budget: -400000 } },
    ] },
  { id: 'energiekrise', category: 'Wirtschaft', headline: 'Energiepreise explodieren — Industrie warnt',
    description: 'Gas- und Strompreise haben sich verdoppelt. Energieintensive Industrie droht mit Abwanderung.',
    topic: 'wirtschaft', options: [
      { label: 'Preisdeckel', desc: 'Staatlicher Energiepreisdeckel für Verbraucher', icon: '🔌', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: 4, jugend: 2, selbststaendige: -2, land: 3, media: 2, budget: -800000 } },
      { label: 'Energiemix diversifizieren', desc: 'Neue Quellen erschließen, LNG-Terminals', icon: '⚡', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 2, rentner: 1, jugend: 0, selbststaendige: 3, land: 1, media: 2, budget: -500000 } },
      { label: 'Kernkraft-Renaissance', desc: 'Laufzeitverlängerung und neue AKW prüfen', icon: '☢️', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 2, jugend: -4, selbststaendige: 3, land: 1, media: -1, budget: -600000 } },
    ] },
  { id: 'terrorwarnung', category: 'Sicherheit', headline: 'Terrorwarnung: Anschlagsgefahr in Berlin',
    description: 'Sicherheitsbehörden haben einen geplanten Anschlag vereitelt. Die Bedrohungslage bleibt hoch.',
    topic: 'sicherheit', options: [
      { label: 'Sicherheitspaket', desc: 'Mehr Polizei, Videoüberwachung, Befugnisse', icon: '🚔', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 4, jugend: -3, selbststaendige: 1, land: 3, media: 1, budget: -400000 } },
      { label: 'Prävention', desc: 'Deradikalisierung und Sozialarbeit stärken', icon: '🕊️', stance: 'progressive',
        effects: { arbeiter: 0, akademiker: 4, rentner: -2, jugend: 3, selbststaendige: 0, land: -2, media: 2, budget: -300000 } },
      { label: 'Besonnenheit', desc: 'Keine Überreaktion, bestehende Maßnahmen nutzen', icon: '⚖️', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 0, jugend: 1, selbststaendige: 1, land: 0, media: 0, budget: 0 } },
    ] },
  { id: 'klimaprotest', category: 'Klima', headline: 'Klimaaktivisten blockieren Autobahnen',
    description: 'Bundesweite Straßenblockaden sorgen für Chaos. Die Gesellschaft ist gespalten.',
    topic: 'klima', options: [
      { label: 'Dialog suchen', desc: 'Klimarat einrichten und Forderungen prüfen', icon: '🗣️', stance: 'progressive',
        effects: { arbeiter: -2, akademiker: 3, rentner: -3, jugend: 5, selbststaendige: -2, land: -3, media: 1, budget: -100000 } },
      { label: 'Harte Strafen', desc: 'Straßenblockaden als Straftat verfolgen', icon: '⚖️', stance: 'conservative',
        effects: { arbeiter: 3, akademiker: -3, rentner: 4, jugend: -5, selbststaendige: 3, land: 4, media: -1, budget: -50000 } },
      { label: 'Vermitteln', desc: 'Demonstrationsrecht wahren, aber Räumung durchsetzen', icon: '🤝', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 1, jugend: 0, selbststaendige: 1, land: 1, media: 2, budget: 0 } },
    ] },
  { id: 'fachkraeftemangel', category: 'Wirtschaft', headline: 'Fachkräftemangel bedroht Wirtschaftsstandort',
    description: 'Über 2 Millionen offene Stellen. Handwerk, Pflege und IT suchen verzweifelt Personal.',
    topic: 'wirtschaft', options: [
      { label: 'Zuwanderung erleichtern', desc: 'Fachkräfteeinwanderungsgesetz ausweiten', icon: '✈️', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: 3, rentner: -2, jugend: 1, selbststaendige: 4, land: -2, media: 2, budget: -200000 } },
      { label: 'Ausbildungsoffensive', desc: 'Duale Ausbildung stärken und fördern', icon: '🎓', stance: 'moderate',
        effects: { arbeiter: 4, akademiker: 1, rentner: 1, jugend: 4, selbststaendige: 2, land: 3, media: 2, budget: -400000 } },
      { label: 'Automatisierung', desc: 'KI und Robotik-Förderung für die Wirtschaft', icon: '🤖', stance: 'conservative',
        effects: { arbeiter: -3, akademiker: 3, rentner: 0, jugend: 2, selbststaendige: 3, land: -1, media: 1, budget: -350000 } },
    ] },
  { id: 'bauernproteste', category: 'Wirtschaft', headline: 'Bauernproteste: Traktoren blockieren Berlin',
    description: 'Landwirte protestieren gegen Subventionskürzungen und EU-Auflagen.',
    topic: 'wirtschaft', options: [
      { label: 'Subventionen zurück', desc: 'Agrardiesel-Subventionen wieder einführen', icon: '🚜', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 1, jugend: -2, selbststaendige: 1, land: 6, media: -1, budget: -400000 } },
      { label: 'Grüne Landwirtschaft', desc: 'Umweltfreundliche Förderung statt Pauschalen', icon: '🌾', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: 3, rentner: 0, jugend: 3, selbststaendige: -1, land: -3, media: 2, budget: -300000 } },
      { label: 'Kompromiss', desc: 'Schrittweise Anpassung mit Übergangsfristen', icon: '🤝', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 1, jugend: 0, selbststaendige: 1, land: 2, media: 1, budget: -200000 } },
    ] },
  { id: 'infrastruktur', category: 'Verkehr', headline: 'Brücken marode: Infrastruktur-Notstand',
    description: 'Tausende Brücken und Straßen sind baufällig. Ein Viadukt musste gesperrt werden.',
    topic: 'wirtschaft', options: [
      { label: 'Investitionspaket', desc: '100 Mrd. Euro für Infrastruktur-Sanierung', icon: '🌉', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: 2, jugend: 1, selbststaendige: 3, land: 4, media: 3, budget: -900000 } },
      { label: 'ÖPP-Modelle', desc: 'Public-Private-Partnerships für Sanierung', icon: '🏗️', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: 0, jugend: 0, selbststaendige: 4, land: 2, media: 1, budget: -400000 } },
      { label: 'Priorisieren', desc: 'Nur die wichtigsten Projekte sofort sanieren', icon: '📊', stance: 'conservative',
        effects: { arbeiter: 0, akademiker: 0, rentner: 1, jugend: -1, selbststaendige: 1, land: -1, media: -1, budget: -200000 } },
    ] },
  { id: 'skandal_korruption', category: 'Politik', headline: 'Korruptionsskandal erschüttert den Bundestag',
    description: 'Mehrere Abgeordnete sollen Bestechungsgelder angenommen haben.',
    topic: 'sicherheit', options: [
      { label: 'Transparenzgesetz', desc: 'Strenge Lobbyregeln und Offenlegungspflichten', icon: '🔍', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 4, rentner: 2, jugend: 4, selbststaendige: -1, land: 2, media: 4, budget: -100000 } },
      { label: 'Untersuchungsausschuss', desc: 'Parlamentarische Aufklärung einleiten', icon: '🏛️', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 2, jugend: 1, selbststaendige: 0, land: 1, media: 2, budget: -50000 } },
      { label: 'Ablenken', desc: 'Auf andere Themen setzen, schnell weitermachen', icon: '🙈', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: -3, rentner: -1, jugend: -3, selbststaendige: 1, land: -1, media: -3, budget: 0 } },
    ] },
  { id: 'pandemie_vorbereitung', category: 'Gesundheit', headline: 'WHO warnt vor neuer Pandemie-Gefahr',
    description: 'Ein neues Virus breitet sich in Asien aus. Deutschland muss sich vorbereiten.',
    topic: 'gesundheit', options: [
      { label: 'Vorsorge-Paket', desc: 'Impfstoff-Reserven, Schutzausrüstung, Krisenstäbe', icon: '🦠', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 3, rentner: 4, jugend: 1, selbststaendige: -1, land: 2, media: 3, budget: -600000 } },
      { label: 'Abwarten', desc: 'Situation beobachten, nicht überreagieren', icon: '⏳', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: -1, rentner: -1, jugend: 0, selbststaendige: 2, land: 0, media: -1, budget: 0 } },
      { label: 'Grenzschließung', desc: 'Sofortige Einreisebeschränkungen', icon: '🚫', stance: 'conservative',
        effects: { arbeiter: 1, akademiker: -2, rentner: 3, jugend: -2, selbststaendige: -2, land: 2, media: 0, budget: -200000 } },
    ] },
  { id: 'buergergeld_debatte', category: 'Soziales', headline: 'Bürgergeld-Debatte spaltet die Nation',
    description: 'Die Höhe des Bürgergelds wird kontrovers diskutiert. Arbeitgeberverbände kritisieren fehlende Anreize.',
    topic: 'soziales', options: [
      { label: 'Erhöhung', desc: 'Bürgergeld deutlich anheben für soziale Gerechtigkeit', icon: '📈', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 1, rentner: 1, jugend: 3, selbststaendige: -4, land: 1, media: 0, budget: -500000 } },
      { label: 'Reform mit Anreizen', desc: 'Mehr Zuverdienstmöglichkeiten, Qualifizierung', icon: '🎯', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 3, rentner: 1, jugend: 2, selbststaendige: 1, land: 1, media: 2, budget: -300000 } },
      { label: 'Kürzung', desc: 'Leistungen kürzen und Sanktionen verschärfen', icon: '✂️', stance: 'conservative',
        effects: { arbeiter: -4, akademiker: -1, rentner: 0, jugend: -3, selbststaendige: 4, land: 0, media: -2, budget: 200000 } },
    ] },
  { id: 'eu_reform', category: 'Außenpolitik', headline: 'EU-Reformgipfel: Deutschlands Rolle',
    description: 'Die EU debattiert über grundlegende Reformen. Deutschland muss Position beziehen.',
    topic: 'wirtschaft', options: [
      { label: 'Mehr Europa', desc: 'Stärkere Integration und gemeinsame Fiskalpolitik', icon: '🇪🇺', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: 3, rentner: -2, jugend: 2, selbststaendige: 1, land: -3, media: 2, budget: -200000 } },
      { label: 'Status Quo', desc: 'Bestehende Strukturen optimieren', icon: '⚖️', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 1, rentner: 1, jugend: 0, selbststaendige: 1, land: 0, media: 0, budget: 0 } },
      { label: 'Souveränität stärken', desc: 'Nationale Kompetenzen zurückfordern', icon: '🏳️', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 2, jugend: -1, selbststaendige: 0, land: 4, media: -1, budget: 0 } },
    ] },
  // New additional events
  { id: 'bahn_chaos', category: 'Verkehr', headline: 'Deutsche Bahn: Monatelange Streckensperrungen',
    description: 'Marode Gleise und überfällige Sanierungen legen den Fernverkehr lahm.',
    topic: 'wirtschaft', options: [
      { label: 'Sonder-Investition', desc: '50 Mrd. Euro Sondervermögen für Schieneninfrastruktur', icon: '🚅', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 3, rentner: 1, jugend: 3, selbststaendige: 1, land: 3, media: 3, budget: -700000 } },
      { label: 'Teilprivatisierung', desc: 'Private Betreiber für einzelne Strecken zulassen', icon: '🏗️', stance: 'moderate',
        effects: { arbeiter: -1, akademiker: 1, rentner: 0, jugend: 1, selbststaendige: 4, land: 0, media: 1, budget: -200000 } },
      { label: 'Autoverkehr stärken', desc: 'Straßen ausbauen statt Schienen zu sanieren', icon: '🛣️', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -3, rentner: 1, jugend: -2, selbststaendige: 2, land: 3, media: -2, budget: -400000 } },
    ] },
  { id: 'ki_revolution', category: 'Digitalisierung', headline: 'KI-Revolution: Millionen Jobs bedroht',
    description: 'Künstliche Intelligenz automatisiert zunehmend Büroarbeit. Experten warnen vor Massenarbeitslosigkeit.',
    topic: 'digitalisierung', options: [
      { label: 'KI-Steuer', desc: 'Unternehmen, die Jobs durch KI ersetzen, besteuern', icon: '🤖', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 0, rentner: 2, jugend: 1, selbststaendige: -5, land: 2, media: 1, budget: 200000 } },
      { label: 'Weiterbildungs-Offensive', desc: 'Massenhafte Umschulung und KI-Kompetenz', icon: '🎓', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 3, rentner: 0, jugend: 4, selbststaendige: 1, land: 1, media: 2, budget: -500000 } },
      { label: 'Innovationsfreiheit', desc: 'Keine Regulierung, Deutschland als KI-Standort', icon: '🚀', stance: 'conservative',
        effects: { arbeiter: -3, akademiker: 2, rentner: -1, jugend: 2, selbststaendige: 5, land: -2, media: 0, budget: -100000 } },
    ] },
  { id: 'hochwasser', category: 'Klima', headline: 'Jahrhunderthochwasser an Rhein und Elbe',
    description: 'Schwere Überschwemmungen haben tausende Häuser zerstört. Die Bevölkerung braucht Hilfe.',
    topic: 'klima', options: [
      { label: 'Soforthilfe-Fonds', desc: '10 Mrd. Euro Soforthilfe für betroffene Regionen', icon: '🌊', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 2, rentner: 4, jugend: 2, selbststaendige: 1, land: 5, media: 3, budget: -800000 } },
      { label: 'Versicherungspflicht', desc: 'Pflichtversicherung gegen Elementarschäden', icon: '📋', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 1, jugend: 1, selbststaendige: -1, land: 2, media: 1, budget: -100000 } },
      { label: 'Eigenverantwortung', desc: 'Hilfe nur für Bedürftige, keine Pauschal-Zahlungen', icon: '🏠', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: -1, rentner: -2, jugend: -1, selbststaendige: 2, land: -3, media: -2, budget: 100000 } },
    ] },
  { id: 'abtreibungsrecht', category: 'Gesellschaft', headline: 'Debatte um §218: Abtreibungsrecht reformieren?',
    description: 'Eine überparteiliche Kommission fordert die Entkriminalisierung. Die Gesellschaft ist tief gespalten.',
    topic: 'soziales', options: [
      { label: 'Entkriminalisierung', desc: 'Abtreibung bis zur 12. Woche vollständig legalisieren', icon: '⚖️', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 4, rentner: -4, jugend: 5, selbststaendige: 0, land: -4, media: 2, budget: 0 } },
      { label: 'Beratungspflicht beibehalten', desc: 'Status quo reformieren, aber nicht grundlegend ändern', icon: '🏥', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 1, jugend: 1, selbststaendige: 1, land: 1, media: 1, budget: 0 } },
      { label: 'Verschärfung', desc: 'Strengere Regeln und Bedenkzeiten einführen', icon: '✋', stance: 'conservative',
        effects: { arbeiter: 0, akademiker: -4, rentner: 3, jugend: -5, selbststaendige: 0, land: 3, media: -2, budget: 0 } },
    ] },
];

// ===== GOVERNANCE EVENTS =====
const GOVERNANCE_EVENTS = [
  { id: 'koalitionsstreit', category: 'Regierung', headline: 'Koalitionsstreit über Haushaltspolitik',
    description: 'Die Koalitionspartner streiten öffentlich über den Bundeshaushalt.', topic: 'wirtschaft',
    options: [
      { label: 'Kompromiss suchen', desc: 'Nachgeben für Koalitionsfrieden', icon: '🤝', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 1, rentner: 1, jugend: 0, selbststaendige: 0, land: 0, media: 1, budget: 0 } },
      { label: 'Machtworte sprechen', desc: 'Eigene Position durchsetzen', icon: '💪', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 0, rentner: -1, jugend: 1, selbststaendige: 1, land: 1, media: -1, budget: 0 } },
      { label: 'Vertrauensfrage', desc: 'Koalitionspartner unter Druck setzen', icon: '⚡', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: -1, rentner: -2, jugend: 0, selbststaendige: 0, land: -1, media: -3, budget: 0 } },
    ] },
  { id: 'minister_skandal', category: 'Regierung', headline: 'Minister/in unter Plagiatsvorwurf',
    description: 'Ein/e Minister/in Ihres Kabinetts soll die Doktorarbeit gefälscht haben.', topic: 'bildung',
    options: [
      { label: 'Rücktritt fordern', desc: 'Schnell handeln, Glaubwürdigkeit wahren', icon: '🚪', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 4, rentner: 1, jugend: 2, selbststaendige: 1, land: 0, media: 3, budget: 0 } },
      { label: 'Stützen', desc: 'Minister/in im Amt halten', icon: '🛡️', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: -4, rentner: -1, jugend: -3, selbststaendige: 0, land: 0, media: -4, budget: 0 } },
    ] },
  { id: 'wirtschaftsboom', category: 'Wirtschaft', headline: 'Konjunktur zieht an — Steuereinnahmen steigen',
    description: 'Die Wirtschaft wächst überraschend stark. Es gibt Spielraum im Haushalt.', topic: 'wirtschaft',
    options: [
      { label: 'Investieren', desc: 'Zusätzliche Mittel in Infrastruktur und Bildung', icon: '📈', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 3, rentner: 1, jugend: 3, selbststaendige: 1, land: 2, media: 2, budget: 500000 } },
      { label: 'Schulden tilgen', desc: 'Haushalt konsolidieren und Schulden abbauen', icon: '📊', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: 1, rentner: 2, jugend: -1, selbststaendige: 3, land: 1, media: 1, budget: 800000 } },
      { label: 'Steuern senken', desc: 'Bürger und Unternehmen entlasten', icon: '💰', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: 1, jugend: 1, selbststaendige: 5, land: 2, media: 1, budget: -300000 } },
    ] },
  { id: 'aussenpolitik_krise', category: 'Außenpolitik', headline: 'Internationale Krise: Bundeswehr-Einsatz gefordert',
    description: 'NATO-Partner fordern deutschen Beitrag zu einer Stabilisierungsmission.', topic: 'sicherheit',
    options: [
      { label: 'Soldaten entsenden', desc: 'Bündnispflicht erfüllen', icon: '🎖️', stance: 'moderate',
        effects: { arbeiter: -1, akademiker: 0, rentner: -2, jugend: -3, selbststaendige: 0, land: -1, media: 0, budget: -500000 } },
      { label: 'Diplomatische Lösung', desc: 'Verhandlungen statt Militär', icon: '🕊️', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 3, rentner: 1, jugend: 4, selbststaendige: 0, land: 0, media: 2, budget: -100000 } },
      { label: 'Ablehnen', desc: 'Deutschen Sonderweg gehen', icon: '✋', stance: 'conservative',
        effects: { arbeiter: 1, akademiker: -2, rentner: 2, jugend: 0, selbststaendige: 1, land: 2, media: -2, budget: 0 } },
    ] },
  { id: 'minister_versagen', category: 'Regierung', headline: 'Reformstau: Minister/in überfordert',
    description: 'Ein Ministerium kommt mit der Umsetzung wichtiger Reformen nicht voran. Kritik wird lauter.',
    topic: 'wirtschaft', options: [
      { label: 'Kabinettsumbildung', desc: 'Minister/in ersetzen und Signal der Erneuerung senden', icon: '🔄', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 2, rentner: 1, jugend: 2, selbststaendige: 1, land: 1, media: 3, budget: 0 } },
      { label: 'Mehr Zeit geben', desc: 'Geduld zeigen und Unterstützung zusichern', icon: '⏳', stance: 'moderate',
        effects: { arbeiter: -1, akademiker: 0, rentner: 0, jugend: -1, selbststaendige: -1, land: 0, media: -2, budget: 0 } },
    ] },
  { id: 'verfassungsklage', category: 'Justiz', headline: 'Verfassungsklage gegen Regierungsgesetz',
    description: 'Das Bundesverfassungsgericht prüft ein zentrales Reformprojekt auf Verfassungsmäßigkeit.',
    topic: 'sicherheit', options: [
      { label: 'Gesetz verteidigen', desc: 'Rechtsgutachten vorlegen und um die Reform kämpfen', icon: '⚖️', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 2, rentner: 0, jugend: 1, selbststaendige: 0, land: 0, media: 1, budget: -100000 } },
      { label: 'Neufassung', desc: 'Gesetz überarbeiten und verfassungskonform machen', icon: '📝', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 1, rentner: 1, jugend: 0, selbststaendige: 1, land: 1, media: 0, budget: -50000 } },
      { label: 'Zurückziehen', desc: 'Gesetz zurückziehen um Verfassungskrise zu vermeiden', icon: '🏳️', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: -1, rentner: 0, jugend: -2, selbststaendige: 0, land: 0, media: -2, budget: 0 } },
    ] },
];

// ===== DONATION EVENTS =====
const DONATION_EVENTS = [
  { donor: 'Industrieverband Stahl', amount: 500000, topic: 'wirtschaft', demand: 'Keine strengeren Umweltauflagen für Schwerindustrie',
    effectAccept: { selbststaendige: 3, arbeiter: 1, akademiker: -2, jugend: -3 },
    effectReject: { selbststaendige: -2, akademiker: 2, jugend: 2 } },
  { donor: 'Verband der Digitalwirtschaft', amount: 350000, topic: 'digitalisierung', demand: 'Lockerung der Datenschutzregeln',
    effectAccept: { selbststaendige: 3, jugend: 2, akademiker: -2, rentner: -1 },
    effectReject: { selbststaendige: -1, akademiker: 3, jugend: -1 } },
  { donor: 'Gewerkschaftsbund', amount: 250000, topic: 'soziales', demand: 'Mindestlohn auf 15€ anheben',
    effectAccept: { arbeiter: 4, selbststaendige: -4, jugend: 2 },
    effectReject: { arbeiter: -3, selbststaendige: 2 } },
  { donor: 'Immobilienverband', amount: 600000, topic: 'wohnen', demand: 'Keine Mietpreisbremse in Neubauten',
    effectAccept: { selbststaendige: 3, arbeiter: -2, jugend: -3, akademiker: -1 },
    effectReject: { arbeiter: 2, jugend: 2, selbststaendige: -2 } },
  { donor: 'Pharmakonzern MedTech AG', amount: 450000, topic: 'gesundheit', demand: 'Patentschutz für Medikamente nicht antasten',
    effectAccept: { selbststaendige: 2, rentner: -2, arbeiter: -1 },
    effectReject: { rentner: 2, arbeiter: 1, selbststaendige: -2 } },
  { donor: 'Automobilindustrie e.V.', amount: 700000, topic: 'wirtschaft', demand: 'Verbrenner-Aus verschieben',
    effectAccept: { selbststaendige: 3, arbeiter: 2, akademiker: -3, jugend: -4 },
    effectReject: { akademiker: 2, jugend: 3, arbeiter: -1, selbststaendige: -2 } },
  { donor: 'Sozialverband Deutschland', amount: 150000, topic: 'soziales', demand: 'Grundsicherung um 20% erhöhen',
    effectAccept: { arbeiter: 3, rentner: 3, selbststaendige: -3, jugend: 1 },
    effectReject: { arbeiter: -2, rentner: -2, selbststaendige: 1 } },
];

// ===== PARTEITAG DEBATES =====
const PARTEITAG_TOPICS = [
  { id: 'wirtschaftskurs', title: 'Wirtschaftskurs der Partei', question: 'Soll die Partei für mehr staatliche Intervention oder freie Marktwirtschaft stehen?',
    arguments: [
      { text: 'Der Staat muss die Schwachen schützen und Ungleichheit bekämpfen', wing: 'left', strength: 0.7 },
      { text: 'Ein starker Mittelstand ist das Rückgrat unserer Wirtschaft', wing: 'center', strength: 0.8 },
      { text: 'Nur freie Märkte schaffen Wohlstand für alle', wing: 'right', strength: 0.6 },
    ] },
  { id: 'migrationspolitik', title: 'Migrationspolitik', question: 'Welchen Kurs soll die Partei in der Migrationspolitik einschlagen?',
    arguments: [
      { text: 'Deutschland hat eine humanitäre Verantwortung — Menschenwürde ist unteilbar', wing: 'left', strength: 0.7 },
      { text: 'Wir brauchen gesteuerte Zuwanderung mit klaren Regeln', wing: 'center', strength: 0.85 },
      { text: 'Die Belastungsgrenze ist erreicht — wir müssen unsere Grenzen schützen', wing: 'right', strength: 0.65 },
    ] },
  { id: 'klimapolitik', title: 'Klimapolitik', question: 'Wie ambitioniert soll der Klimaschutz sein?',
    arguments: [
      { text: 'Klimaneutralität bis 2035 — die Wissenschaft lässt keinen Spielraum', wing: 'left', strength: 0.7 },
      { text: 'Technologieoffenheit und Anreize statt Verbote', wing: 'center', strength: 0.8 },
      { text: 'Wirtschaftliche Vernunft geht vor — keine Deindustrialisierung', wing: 'right', strength: 0.6 },
    ] },
  { id: 'sozialpolitik', title: 'Sozialpolitik', question: 'Wie soll die soziale Sicherung reformiert werden?',
    arguments: [
      { text: 'Der Sozialstaat muss ausgebaut werden — Bürgerversicherung für alle', wing: 'left', strength: 0.7 },
      { text: 'Eigenverantwortung fördern, aber Grundsicherung garantieren', wing: 'center', strength: 0.8 },
      { text: 'Leistung muss sich wieder lohnen — weniger Umverteilung', wing: 'right', strength: 0.65 },
    ] },
  { id: 'europapolitik', title: 'Europapolitik', question: 'Wie viel Europa braucht Deutschland?',
    arguments: [
      { text: 'Vereinigte Staaten von Europa — nur gemeinsam sind wir stark', wing: 'left', strength: 0.65 },
      { text: 'Europa der unterschiedlichen Geschwindigkeiten — pragmatisch vorangehen', wing: 'center', strength: 0.8 },
      { text: 'Nationale Souveränität wahren — Brüssel hat zu viel Macht', wing: 'right', strength: 0.7 },
    ] },
  { id: 'sicherheitspolitik', title: 'Sicherheitspolitik', question: 'Wie soll Deutschland seine Sicherheit gewährleisten?',
    arguments: [
      { text: 'Abrüstung und Diplomatie — Frieden schaffen ohne Waffen', wing: 'left', strength: 0.6 },
      { text: 'Bundeswehr modernisieren — handlungsfähig in der NATO', wing: 'center', strength: 0.85 },
      { text: 'Starke Verteidigung — 3% des BIP für die Bundeswehr', wing: 'right', strength: 0.7 },
    ] },
];

// ===== PLENARDEBATTEN (Bundestag debates during governance) =====
const PLENARDEBATTE_TOPICS = [
  { title: 'Bundeshaushalt 2028', topic: 'wirtschaft',
    proArgs: ['Investitionen sichern die Zukunft','Schuldengrenze ist überholt','Infrastruktur wartet nicht'],
    contraArgs: ['Generationengerechtigkeit','Schuldenbremse einhalten','Erst sparen, dann investieren'] },
  { title: 'Klimaschutzgesetz-Novelle', topic: 'klima',
    proArgs: ['Klimanotstand erfordert Handeln','Kosten des Nichthandelns sind höher','Erneuerbare schaffen Jobs'],
    contraArgs: ['Industrie nicht überfordern','Technologieoffenheit bewahren','Verbraucher entlasten'] },
  { title: 'Fachkräfte-Einwanderungsgesetz', topic: 'migration',
    proArgs: ['Fachkräftemangel bedroht Wohlstand','Integration als Chance','Demografischer Wandel erfordert Zuwanderung'],
    contraArgs: ['Erst Inländer qualifizieren','Wohnungsmarkt überfordert','Lohndumping verhindern'] },
  { title: 'Digitalisierungsgesetz', topic: 'digitalisierung',
    proArgs: ['Deutschland fällt zurück','Bürger warten zu lange','Effizienz spart Steuergelder'],
    contraArgs: ['Datenschutz nicht aufweichen','Nicht alle sind digital affin','Kosten sind zu hoch'] },
];

// ===== UTILITY FUNCTIONS =====
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(a, b) { return Math.random() * (b - a) + a; }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) { return new Intl.NumberFormat('de-DE').format(Math.round(n)); }
function fmtCurrency(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
function fmtPct(n) { return n.toFixed(1) + '%'; }

// ===== PERSONNEL GENERATOR =====
function generatePerson(wing) {
  const isFemale = Math.random() < 0.5;
  const firstName = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastName = pick(LAST_NAMES);
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: firstName + ' ' + lastName,
    age: randInt(30, 68),
    gender: isFemale ? 'f' : 'm',
    expertise: pick(EXPERTISE_AREAS),
    loyalty: randInt(40, 90),
    skill: randInt(30, 95),
    wing: wing || pick(['left', 'center', 'right']),
    scandals: 0,
    months: 0,
  };
}

function generatePersonnelPool(count, partyWing) {
  const pool = [];
  const wings = partyWing < -0.2 ? ['left','left','center','left','center','right'] :
                partyWing > 0.2  ? ['right','right','center','right','center','left'] :
                                   ['center','center','left','center','right','center'];
  for (let i = 0; i < count; i++) pool.push(generatePerson(pick(wings)));
  return pool;
}

// ===== GAME STATE =====
let state = null;

function createInitialState() {
  return {
    phase: 'title',
    month: 0,
    year: 1,
    totalMonths: 0,
    maxPreElectionMonths: 12,
    campaignMonths: 3,
    governanceMonths: 48,
    currentEvent: null,
    usedEvents: [],
    newsHistory: [],
    electionResults: null,
    coalitionOptions: [],
    selectedCoalition: null,
    electionCount: 0,
    activeTab: 'event',
    pendingDonation: null,
    pendingParteitag: false,
    currentParteitagTopic: null,
    parteitagResult: null,
    pendingLandtagswahl: null,
    pendingPlenarDebatte: null,
    debateResult: null,
    campaignMonth: 0,
    governanceMonth: 0,
    bundespraesident: null,
    bpElectionHeld: false,

    player: {
      name: '',
      short: '',
      color: '#3b82f6',
      alignment: { economic: 0, social: 0 },
      topics: [],
      approval: 8,
      voterApproval: { arbeiter: 8, akademiker: 8, rentner: 8, jugend: 8, selbststaendige: 8, land: 8 },
      media: 50,
      credibility: 50,
      seats: 0,
      passedThreshold: false,
      inGovernment: false,
      isKanzler: false,

      budget: {
        balance: 2000000,
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

      personnel: [],
      positions: {},
      ministers: {},

      regional: {},
      regionalResults: {},

      lastParteitag: -1,
      partyUnity: 70,
      lawsPassed: 0,
      approvalHistory: [],
    },

    parties: [],
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

// ===== CORE GAME LOGIC =====

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

  const baseApproval = rand(6, 10);
  state.player.approval = baseApproval;
  const va = state.player.voterApproval;
  VOTER_GROUPS.forEach(g => {
    let bonus = 0;
    if (g.id === 'arbeiter' && economic < 0) bonus = Math.abs(economic) * 3;
    if (g.id === 'selbststaendige' && economic > 0) bonus = economic * 4;
    if (g.id === 'akademiker' && social < 0) bonus = Math.abs(social) * 3;
    if (g.id === 'jugend' && social < 0) bonus = Math.abs(social) * 2;
    if (g.id === 'rentner' && economic > 0) bonus = economic * 2;
    if (g.id === 'land' && social > 0) bonus = social * 3;
    va[g.id] = clamp(baseApproval + bonus + rand(-1, 1), 2, 15);
  });

  state.parties = AI_PARTIES.map(p => ({
    ...p,
    approval: p.baseApproval + rand(-2, 2),
    seats: 0,
    passedThreshold: false,
  }));

  const avgAlignment = (economic + social) / 2;
  state.player.personnel = generatePersonnelPool(18, avgAlignment);

  initPlayerRegional();

  state.phase = 'personnelSetup';
  renderScreen();
}

function assignPosition(positionId, personId) {
  const person = state.player.personnel.find(p => p.id === personId);
  if (!person) return;
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
  nextMonth();
}

function nextMonth() {
  state.month++;
  state.totalMonths++;
  if (state.month > 12) { state.month = 1; state.year++; }

  // Age personnel
  state.player.personnel.forEach(p => p.months++);

  updateBudget();
  fluctuateAIParties();
  recalculateApproval();
  updateRegionalApprovals();

  // Record approval history
  state.player.approvalHistory.push({ month: state.totalMonths, approval: state.player.approval });
  if (state.player.approvalHistory.length > 60) state.player.approvalHistory.shift();

  // Random minister scandals during governance
  if (state.phase === 'governance' && state.player.isKanzler && Math.random() < 0.04) {
    const ministerIds = Object.keys(state.player.ministers).filter(k => state.player.ministers[k]);
    if (ministerIds.length > 0) {
      const scandalMinId = pick(ministerIds);
      const scandalMin = state.player.ministers[scandalMinId];
      if (scandalMin && scandalMin.skill < 50 && Math.random() < 0.3) {
        scandalMin.scandals++;
        state.player.media = clamp(state.player.media - 3, 0, 100);
        state.newsHistory.unshift({ headline: `Skandal: ${scandalMin.name} (${MINISTER_POSITIONS.find(m=>m.id===scandalMinId)?.name || 'Minister'}) unter Druck`, month: state.totalMonths });
      }
    }
  }

  // Check for donation event (10% chance)
  if (Math.random() < 0.1 && state.phase !== 'campaign') {
    state.pendingDonation = pick(DONATION_EVENTS);
  }

  // Check for Parteitag (every 6 months)
  if (state.totalMonths - state.player.lastParteitag >= 6 && state.phase !== 'campaign') {
    state.pendingParteitag = true;
  }

  // Plenardebatten during governance (20% chance per month)
  if (state.phase === 'governance' && state.player.isKanzler && Math.random() < 0.2 && !state.pendingDonation && !state.pendingParteitag) {
    state.pendingPlenarDebatte = pick(PLENARDEBATTE_TOPICS);
  }

  // Seasonal effects
  if (state.month >= 6 && state.month <= 8) {
    state.player.media = clamp(state.player.media - 1, 20, 100);
  }

  // Landtagswahl (random, during governance)
  if (state.phase === 'governance' && Math.random() < 0.06 && !state.pendingDonation && !state.pendingParteitag && !state.pendingPlenarDebatte) {
    state.pendingLandtagswahl = pick(BUNDESLAENDER);
  }

  // Bundespräsident election (once during first governance, month 12-18)
  if (state.phase === 'governance' && state.player.isKanzler && !state.bpElectionHeld && state.governanceMonth >= 12 && state.governanceMonth <= 18 && !state.bundespraesident) {
    if (Math.random() < 0.3) {
      holdBundespraesidentElection();
    }
  }

  // Generate event
  nextEvent();
  renderScreen();
}

function nextEvent() {
  const pool = state.phase === 'governance' ? [...EVENTS_POOL, ...GOVERNANCE_EVENTS] : EVENTS_POOL;
  const available = pool.filter(e => !state.usedEvents.includes(e.id));
  if (available.length === 0) state.usedEvents = [];
  const refreshed = available.length > 0 ? available : pool;
  const preferred = refreshed.filter(e => state.player.topics.includes(e.topic));
  const source = preferred.length > 0 && Math.random() < 0.5 ? preferred : refreshed;
  const event = pick(source);
  state.currentEvent = event;
  state.usedEvents.push(event.id);

  state.newsHistory.unshift({ headline: event.headline, month: state.totalMonths });
  if (state.newsHistory.length > 30) state.newsHistory.pop();
}

function applyDecision(optionIndex) {
  const option = state.currentEvent.options[optionIndex];
  const eff = option.effects;
  const va = state.player.voterApproval;
  const topicBonus = state.player.topics.includes(state.currentEvent.topic) ? 1.3 : 1.0;

  let pressBonus = 1.0;
  const press = state.player.positions['pressesprecher'];
  if (press) pressBonus = 1 + (press.skill - 50) / 200;

  VOTER_GROUPS.forEach(g => {
    const base = eff[g.id] || 0;
    const effect = base * topicBonus * pressBonus;
    va[g.id] = clamp(va[g.id] + effect, 0, 60);
  });

  if (eff.media) {
    state.player.media = clamp(state.player.media + eff.media * pressBonus, 0, 100);
  }

  if (eff.budget) {
    const treasurerBonus = state.player.positions['schatzmeister'] ? 1 + (state.player.positions['schatzmeister'].skill - 50) / 200 : 1;
    state.player.budget.balance += eff.budget * (eff.budget > 0 ? treasurerBonus : (2 - treasurerBonus));
  }

  recalculateApproval();
  state.currentEvent = null;

  const preElecTotal = state.maxPreElectionMonths;
  const campTotal = state.campaignMonths;

  if (state.phase === 'preElection') {
    if (state.totalMonths >= preElecTotal) {
      state.phase = 'campaign';
      state.campaignMonth = 0;
    }
    advanceToNextAction();
  } else if (state.phase === 'campaign') {
    state.campaignMonth = (state.campaignMonth || 0) + 1;
    if (state.campaignMonth >= campTotal) {
      runElection();
      return;
    }
    advanceToNextAction();
  } else if (state.phase === 'governance') {
    state.governanceMonth = (state.governanceMonth || 0) + 1;
    if (state.governanceMonth >= state.governanceMonths) {
      triggerReElection();
      return;
    }
    advanceToNextAction();
  }
}

function triggerReElection() {
  state.phase = 'preElection';
  state.totalMonths = 0;
  state.month = 0;
  state.year = 1;
  state.electionCount++;
  state.player.inGovernment = false;
  state.player.isKanzler = false;
  state.player.ministers = {};
  state.selectedCoalition = null;
  state.bpElectionHeld = false;
  startPreElection();
}

function advanceToNextAction() {
  if (state.pendingDonation) { renderScreen(); return; }
  if (state.pendingParteitag) { renderScreen(); return; }
  if (state.pendingPlenarDebatte) { renderScreen(); return; }
  if (state.pendingLandtagswahl) { renderScreen(); return; }
  renderScreen();
}

function updateBudget() {
  const b = state.player.budget;
  const treasurerSkill = state.player.positions['schatzmeister'] ? state.player.positions['schatzmeister'].skill / 100 : 0.5;

  b.memberDues = Math.round(100000 + state.player.approval * 5000 * treasurerSkill);
  b.donations = Math.round(30000 + state.player.approval * 2000 + Math.random() * 20000);
  b.stateFunding = Math.round(state.player.approval * 8000);
  b.monthlyIncome = b.memberDues + b.donations + b.stateFunding;

  const personnelCount = Object.values(state.player.positions).filter(Boolean).length;
  const ministerCount = Object.values(state.player.ministers).filter(Boolean).length;
  b.staffCosts = Math.round(80000 + personnelCount * 15000 + ministerCount * 10000);
  b.officeCosts = 30000;
  const totalCampaign = Object.values(b.campaignSpending).reduce((s, v) => s + v, 0);
  b.monthlyExpenses = b.staffCosts + b.officeCosts + totalCampaign + b.mediaSpending;

  b.balance += b.monthlyIncome - b.monthlyExpenses;

  if (b.balance < 0) {
    b.debt = Math.abs(b.balance);
    state.player.credibility = clamp(state.player.credibility - 2, 0, 100);
  } else {
    b.debt = 0;
  }
}

function recalculateApproval() {
  const va = state.player.voterApproval;
  let sum = 0;
  VOTER_GROUPS.forEach(g => { sum += va[g.id] * g.weight; });
  const mediaMod = (state.player.media - 50) * 0.05;
  const credMod = (state.player.credibility - 50) * 0.03;
  const unityMod = (state.player.partyUnity - 50) * 0.02;
  state.player.approval = clamp(sum + mediaMod + credMod + unityMod, 1, 55);
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
    const leanEffect = -bl.lean * state.player.alignment.economic * 2;
    const workerEffect = r.workers * 0.3;
    const investEffect = r.investment * 0.0001;
    const genSkill = state.player.positions['generalsekretaer'] ? state.player.positions['generalsekretaer'].skill / 200 : 0;
    r.approval = clamp(state.player.approval + leanEffect + workerEffect + investEffect + genSkill + rand(-0.5, 0.5), 1, 55);
  });
}

// ===== CAMPAIGN =====
function allocateRegionalCampaign(allocations) {
  const b = state.player.budget;
  Object.entries(allocations).forEach(([blId, alloc]) => {
    state.player.regional[blId].workers = alloc.workers || 0;
    state.player.regional[blId].investment = alloc.investment || 0;
    b.campaignSpending[blId] = alloc.investment || 0;
  });
  updateRegionalApprovals();
  AudioEngine.budget();
  renderScreen();
}

function applyDebateStrategy(strategy) {
  const va = state.player.voterApproval;
  const pressSkill = state.player.positions['pressesprecher'] ? state.player.positions['pressesprecher'].skill / 100 : 0.5;
  const fraktionSkill = state.player.positions['fraktionsvorsitz'] ? state.player.positions['fraktionsvorsitz'].skill / 100 : 0.5;
  const debateSkill = (pressSkill + fraktionSkill) / 2;

  const strategies = {
    angriff:   { arbeiter: 2, akademiker: -1, rentner: 1, jugend: 3, selbststaendige: 0, land: 1, media: 3, risk: 0.3 },
    sachlich:  { arbeiter: 1, akademiker: 3, rentner: 2, jugend: 0, selbststaendige: 2, land: 1, media: 1, risk: 0.1 },
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

  recalculateApproval();
  state.debateResult = { strategy, success, multiplier };
  AudioEngine.debate();
  renderScreen();
}

// ===== PARTEITAG =====
function runParteitag(argumentIndex) {
  const topic = state.currentParteitagTopic;
  const arg = topic.arguments[argumentIndex];
  const playerWing = state.player.alignment.economic < -0.2 ? 'left' : state.player.alignment.economic > 0.2 ? 'right' : 'center';

  const wingMatch = arg.wing === playerWing ? 1.3 : arg.wing === 'center' ? 1.0 : 0.7;
  const stellvBonus = (state.player.positions['stellvertreter1']?.loyalty || 50) / 200 + (state.player.positions['stellvertreter2']?.loyalty || 50) / 200;
  const success = arg.strength * wingMatch * (0.8 + stellvBonus) + rand(-0.1, 0.1);

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

// ===== PLENARDEBATTE =====
function handlePlenarDebatte(argIndex) {
  const debate = state.pendingPlenarDebatte;
  const isProArg = argIndex < debate.proArgs.length;
  const fraktionSkill = state.player.positions['fraktionsvorsitz'] ? state.player.positions['fraktionsvorsitz'].skill / 100 : 0.5;
  const success = Math.random() < (0.4 + fraktionSkill * 0.4);

  if (success) {
    state.player.media = clamp(state.player.media + 3, 0, 100);
    state.player.lawsPassed = (state.player.lawsPassed || 0) + 1;
    VOTER_GROUPS.forEach(g => {
      state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] + rand(0.5, 2), 0, 60);
    });
    state.newsHistory.unshift({ headline: `Gesetz "${debate.title}" im Bundestag verabschiedet`, month: state.totalMonths });
    state.debateResult = { strategy: 'plenardebatte', success: true, title: debate.title };
    AudioEngine.success();
  } else {
    state.player.media = clamp(state.player.media - 2, 0, 100);
    VOTER_GROUPS.forEach(g => {
      state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] - rand(0.3, 1), 0, 60);
    });
    state.newsHistory.unshift({ headline: `Regierung scheitert mit "${debate.title}" im Bundestag`, month: state.totalMonths });
    state.debateResult = { strategy: 'plenardebatte', success: false, title: debate.title };
    AudioEngine.failure();
  }

  state.pendingPlenarDebatte = null;
  recalculateApproval();
  renderScreen();
}

// ===== DONATION =====
function handleDonation(accept) {
  const d = state.pendingDonation;
  if (accept) {
    state.player.budget.balance += d.amount;
    Object.entries(d.effectAccept).forEach(([group, val]) => {
      if (state.player.voterApproval[group] !== undefined) {
        state.player.voterApproval[group] = clamp(state.player.voterApproval[group] + val, 0, 60);
      }
    });
    state.player.credibility = clamp(state.player.credibility - 3, 0, 100);
    state.newsHistory.unshift({ headline: `${state.player.short} nimmt Großspende von ${d.donor} an`, month: state.totalMonths });
  } else {
    Object.entries(d.effectReject).forEach(([group, val]) => {
      if (state.player.voterApproval[group] !== undefined) {
        state.player.voterApproval[group] = clamp(state.player.voterApproval[group] + val, 0, 60);
      }
    });
    state.player.credibility = clamp(state.player.credibility + 2, 0, 100);
  }
  state.pendingDonation = null;
  recalculateApproval();
  AudioEngine.click();
  renderScreen();
}

// ===== LANDTAGSWAHL =====
function handleLandtagswahl() {
  const bl = state.pendingLandtagswahl;
  const r = state.player.regional[bl.id];
  const result = r ? r.approval : state.player.approval;
  const diff = (result - state.player.approval) * 0.1;
  state.player.approval = clamp(state.player.approval + diff, 1, 55);
  state.newsHistory.unshift({ headline: `Landtagswahl in ${bl.name}: ${state.player.short} erreicht ${fmtPct(result)}`, month: state.totalMonths });
  state.pendingLandtagswahl = null;
  AudioEngine.election();
  renderScreen();
}

// ===== BUNDESPRÄSIDENT =====
function holdBundespraesidentElection() {
  const candidates = [
    generatePerson('center'),
    generatePerson(state.player.alignment.economic < 0 ? 'left' : 'right'),
    generatePerson('center'),
  ];
  // Strongest party's candidate usually wins
  const winner = candidates[0];
  state.bundespraesident = {
    name: winner.name,
    age: winner.age,
    party: state.player.isKanzler ? state.player.short : state.parties[0].short,
  };
  state.bpElectionHeld = true;
  state.newsHistory.unshift({ headline: `${winner.name} zum Bundespräsidenten gewählt`, month: state.totalMonths });
}

// ===== ELECTION =====
function runElection() {
  state.phase = 'election';
  const totalSeats = 598;
  const playerPercent = state.player.approval;
  const passedThreshold = playerPercent >= 5;
  state.player.passedThreshold = passedThreshold;

  const allParties = [
    { id: 'player', name: state.player.name, short: state.player.short, color: state.player.color, percent: playerPercent, passedThreshold },
    ...state.parties.map(p => ({ ...p, percent: p.approval, passedThreshold: p.approval >= 5 }))
  ];

  const validParties = allParties.filter(p => p.passedThreshold);
  const totalValid = validParties.reduce((s, p) => s + p.percent, 0);

  validParties.forEach(p => {
    p.seats = Math.round((p.percent / totalValid) * totalSeats);
  });

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

  // Direktmandate per Bundesland
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

function findCoalitionOptions() {
  const majority = 300;
  const options = [];
  const eligible = state.parties.filter(p => p.passedThreshold && p.seats > 0);

  if (state.player.seats >= majority) {
    options.push({ partners: [], totalSeats: state.player.seats, name: 'Alleinregierung' });
  }

  for (let i = 0; i < eligible.length; i++) {
    const total = state.player.seats + eligible[i].seats;
    if (total >= majority) {
      const compat = calculateCoalitionCompat(eligible[i]);
      options.push({ partners: [eligible[i]], totalSeats: total, name: `${state.player.short}-${eligible[i].short}`, compatibility: compat });
    }
  }

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const total = state.player.seats + eligible[i].seats + eligible[j].seats;
      if (total >= majority) {
        const compat = (calculateCoalitionCompat(eligible[i]) + calculateCoalitionCompat(eligible[j])) / 2;
        options.push({ partners: [eligible[i], eligible[j]], totalSeats: total, name: `${state.player.short}-${eligible[i].short}-${eligible[j].short}`, compatibility: compat });
      }
    }
  }

  options.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));
  return options.slice(0, 5);
}

function calculateCoalitionCompat(party) {
  const pe = state.player.alignment.economic;
  const ps = state.player.alignment.social;
  const ae = party.alignment.economic;
  const as = party.alignment.social;
  const dist = Math.sqrt((pe - ae) ** 2 + (ps - as) ** 2);
  return clamp(100 - dist * 50, 10, 100);
}

function selectCoalition(index) {
  const coalition = state.coalitionOptions[index];
  state.selectedCoalition = coalition;
  state.player.inGovernment = true;
  state.player.isKanzler = true;
  state.phase = 'ministerSelection';
  renderScreen();
}

function goToOpposition() {
  state.player.inGovernment = false;
  state.player.isKanzler = false;
  state.phase = 'governance';
  state.governanceMonth = 0;
  nextMonth();
}

function assignMinister(positionId, personId) {
  const person = state.player.personnel.find(p => p.id === personId);
  if (!person) return;
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
  nextMonth();
}

// ===== SVG GERMANY MAP =====
function generateGermanyMap() {
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

// ===== HEMICYCLE SVG =====
function generateHemicycleSVG(results) {
  const parties = results.allParties.filter(p => p.seats > 0).sort((a, b) => {
    const orderMap = { player: 3 };
    AI_PARTIES.forEach((ap, i) => { orderMap[ap.id] = i; });
    return (orderMap[a.id] ?? 3) - (orderMap[b.id] ?? 3);
  });

  const cx = 250, cy = 220, outerR = 200, innerR = 80;
  const totalSeats = parties.reduce((s, p) => s + p.seats, 0);
  let angle = Math.PI;
  let dots = '';

  const rows = 8;
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

// ===== APPROVAL SPARKLINE =====
function renderSparklineSVG() {
  const history = state.player.approvalHistory;
  if (history.length < 2) return '';
  const w = 200, h = 40;
  const maxV = Math.max(...history.map(h => h.approval), 30);
  const minV = Math.min(...history.map(h => h.approval), 0);
  const range = maxV - minV || 1;
  const pts = history.map((h, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((h.approval - minV) / range) * (h - 4);
    return `${x},${h - ((h.approval - minV) / range) * (h - 4)}`;
  });
  // Simpler approach
  const points = history.map((d, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((d.approval - minV) / range) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width: 100%; height: 40px; overflow: visible;">
    <polyline points="${points}" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ===== RENDERING =====
function renderScreen() {
  const content = document.getElementById('game-content');
  const headerStatus = document.getElementById('header-status');
  const tickerContent = document.getElementById('news-ticker-content');

  if (state && state.newsHistory.length > 0) {
    tickerContent.textContent = state.newsHistory.map(n => n.headline).join('  +++  ');
  }

  if (state && state.phase !== 'title') {
    const monthName = MONTH_NAMES[(state.month - 1 + 12) % 12] || 'Januar';
    headerStatus.innerHTML = `
      <span class="game-header__badge">${state.player.short || '???'}</span>
      <span class="game-header__badge">${fmtPct(state.player.approval)}</span>
      <span class="game-header__badge">Jahr ${state.year}, ${monthName}</span>
      <span class="game-header__badge">💰 ${fmtCurrency(state.player.budget.balance)}</span>
    `;
  } else {
    headerStatus.innerHTML = '';
  }

  if (!state) { content.innerHTML = renderTitleScreen(); attachListeners(); return; }

  switch (state.phase) {
    case 'title':            content.innerHTML = renderTitleScreen(); break;
    case 'creation':         content.innerHTML = renderCreationScreen(); break;
    case 'personnelSetup':   content.innerHTML = renderPersonnelSetup(); break;
    case 'preElection':
    case 'campaign':         content.innerHTML = renderMainDashboard(); break;
    case 'election':         content.innerHTML = renderElectionScreen(); break;
    case 'coalition':        content.innerHTML = renderCoalitionScreen(); break;
    case 'ministerSelection': content.innerHTML = renderMinisterSelection(); break;
    case 'governance':       content.innerHTML = renderMainDashboard(); break;
    case 'gameOver':         content.innerHTML = renderGameOverScreen(); break;
    default:                 content.innerHTML = renderTitleScreen(); break;
  }
  attachListeners();
}

// ===== TITLE SCREEN =====
function renderTitleScreen() {
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
        Politische Simulation — Version 2
      </p>
      <p style="font-size: var(--text-sm); color: var(--color-text-faint); max-width: 500px; margin: 0 auto var(--space-8);">
        Gründe deine Partei, stelle dein Team zusammen, manage dein Budget,
        führe Wahlkampf in 16 Bundesländern und regiere Deutschland.
      </p>
      <div style="display: flex; flex-direction: column; gap: var(--space-3); max-width: 320px; margin: 0 auto;">
        <button class="btn btn--primary btn--lg btn--block" id="btn-start">Neues Spiel starten</button>
      </div>
      <div style="margin-top: var(--space-8); display: flex; gap: var(--space-6); justify-content: center; flex-wrap: wrap;">
        <div class="text-xs text-muted">🏛️ 16 Bundesländer</div>
        <div class="text-xs text-muted">👥 Personalmanagement</div>
        <div class="text-xs text-muted">💰 Parteibudget</div>
        <div class="text-xs text-muted">🗳️ 48-Monats-Zyklus</div>
        <div class="text-xs text-muted">📺 TV-Debatten</div>
        <div class="text-xs text-muted">🏛️ Kabinettsbildung</div>
      </div>
    </div>`;
}

// ===== CREATION SCREEN =====
function renderCreationScreen() {
  const topicsHTML = TOPICS.map(t =>
    `<button class="topic-tag" data-topic="${t.id}">${t.icon} ${t.name}</button>`
  ).join('');

  return `
    <div class="panel">
      <div class="panel__header">
        <h2 class="panel__title">🏛️ Parteigründung</h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6);" class="mobile-stack">
        <div class="input-group">
          <label class="input-label">Parteiname</label>
          <input type="text" class="input-field" id="party-name" placeholder="z.B. Zukunftspartei" maxlength="30">
        </div>
        <div class="input-group">
          <label class="input-label">Kürzel (2-5 Zeichen)</label>
          <input type="text" class="input-field" id="party-short" placeholder="z.B. ZP" maxlength="5">
        </div>
      </div>

      <div class="spectrum-container" style="margin-bottom: var(--space-6);">
        <div class="spectrum-axis">
          <div class="spectrum-axis__label"><span>Links (Staat)</span><span>Rechts (Markt)</span></div>
          <input type="range" id="economic-axis" min="-100" max="100" value="0">
          <div class="text-xs text-center text-muted">Wirtschaftliche Ausrichtung</div>
        </div>
        <div class="spectrum-axis">
          <div class="spectrum-axis__label"><span>Progressiv</span><span>Konservativ</span></div>
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

// ===== PERSONNEL SETUP SCREEN =====
function renderPersonnelSetup() {
  const positions = PARTY_POSITIONS.map(pos => {
    const assigned = state.player.positions[pos.id];
    const availablePersonnel = state.player.personnel.filter(p => {
      const isAssigned = Object.values(state.player.positions).some(ap => ap && ap.id === p.id);
      return !isAssigned || (assigned && assigned.id === p.id);
    });

    const optionsHTML = availablePersonnel.map(p =>
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
      <div class="personnel-grid">
        ${positions}
      </div>
      <button class="btn btn--primary btn--lg btn--block mt-6" id="btn-start-game">
        ${allAssigned ? 'Spiel starten' : 'Spiel starten (Positionen können auch später besetzt werden)'}
      </button>
    </div>`;
}

// ===== MAIN DASHBOARD =====
function renderMainDashboard() {
  const ev = state.currentEvent;
  const phaseLabel = state.phase === 'preElection' ? 'Vorwahlphase' : state.phase === 'campaign' ? 'Wahlkampf' : (state.player.isKanzler ? 'Regierung' : 'Opposition');
  const monthName = MONTH_NAMES[(state.month - 1 + 12) % 12] || 'Januar';

  let progress = 0, progressMax = 1, progressLabel = '';
  if (state.phase === 'preElection') {
    progress = state.totalMonths;
    progressMax = state.maxPreElectionMonths;
    progressLabel = `Monat ${state.totalMonths} / ${state.maxPreElectionMonths} bis zur Wahl`;
  } else if (state.phase === 'campaign') {
    progress = state.campaignMonth || 0;
    progressMax = state.campaignMonths;
    progressLabel = `Wahlkampf: Monat ${progress} / ${progressMax}`;
  } else if (state.phase === 'governance') {
    progress = state.governanceMonth || 0;
    progressMax = state.governanceMonths;
    progressLabel = `Legislatur: Monat ${progress} / ${progressMax}`;
  }

  // Pending special events
  if (state.pendingDonation) return renderDonationEvent();
  if (state.pendingParteitag && !state.currentParteitagTopic) return renderParteitagStart();
  if (state.currentParteitagTopic) return renderParteitagDebate();
  if (state.pendingPlenarDebatte) return renderPlenarDebatteScreen();
  if (state.pendingLandtagswahl) return renderLandtagswahlEvent();
  if (state.debateResult) return renderDebateResult();

  // Campaign phase: debate
  if (state.phase === 'campaign' && !ev) return renderCampaignDashboard();

  const tabs = [
    { id: 'event', label: '📰 Aktuell' },
    { id: 'polls', label: '📊 Umfragen' },
    { id: 'budget', label: '💰 Budget' },
    { id: 'map', label: '🗺️ Wahlkreise' },
    { id: 'team', label: '👥 Team' },
  ];
  const activeTab = state.activeTab || 'event';

  let tabContent = '';
  switch (activeTab) {
    case 'event': tabContent = renderEventTab(ev); break;
    case 'polls': tabContent = renderPollsTab(); break;
    case 'budget': tabContent = renderBudgetTab(); break;
    case 'map': tabContent = renderMapTab(); break;
    case 'team': tabContent = renderTeamTab(); break;
    default: tabContent = renderEventTab(ev);
  }

  return `
    <div class="dashboard-header">
      <div class="dashboard-phase">
        <span class="game-header__badge game-header__badge--live">${phaseLabel}</span>
        <span class="text-sm text-muted">Jahr ${state.year}, ${monthName}</span>
        ${state.bundespraesident ? `<span class="text-xs text-muted">BP: ${state.bundespraesident.name}</span>` : ''}
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

function renderEventTab(ev) {
  if (!ev) return `<div class="panel text-center text-muted" style="padding: var(--space-8);">Kein aktuelles Ereignis. Weiter zum nächsten Monat.</div><button class="btn btn--primary btn--lg btn--block mt-4" id="btn-next-month">Nächster Monat →</button>`;

  const optionsHTML = ev.options.map((opt, i) => `
    <button class="decision-option" data-decision="${i}">
      <div class="decision-option__icon">${opt.icon || '📌'}</div>
      <div class="decision-option__content">
        <div class="decision-option__title">${opt.label}</div>
        <div class="decision-option__desc">${opt.desc}</div>
        ${opt.effects.budget ? `<div class="text-xs mt-2" style="color: ${opt.effects.budget < 0 ? 'var(--color-error)' : 'var(--color-success)'}">Budget: ${opt.effects.budget > 0 ? '+' : ''}${fmtCurrency(opt.effects.budget)}</div>` : ''}
      </div>
    </button>`).join('');

  const statsHTML = `
    <div class="quick-stats">
      <div class="quick-stat">
        <div class="quick-stat__label">Zustimmung</div>
        <div class="quick-stat__value" style="color: ${state.player.approval > 20 ? 'var(--color-success)' : state.player.approval > 10 ? 'var(--color-warning)' : 'var(--color-error)'}">${fmtPct(state.player.approval)}</div>
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
        <div class="quick-stat__value" style="color: ${state.player.budget.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">${fmtCurrency(state.player.budget.balance)}</div>
      </div>
    </div>
    ${state.player.approvalHistory.length > 2 ? `<div style="margin-bottom: var(--space-3);">
      <div class="text-xs text-muted mb-2">Zustimmungsverlauf</div>
      ${renderSparklineSVG()}
    </div>` : ''}`;

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
        ${statsHTML}
        ${renderMiniPolls()}
      </div>
    </div>`;
}

function renderMiniPolls() {
  const allParties = [
    { name: state.player.short, approval: state.player.approval, color: state.player.color },
    ...state.parties.map(p => ({ name: p.short, approval: p.approval, color: p.color }))
  ].sort((a, b) => b.approval - a.approval);

  return `
    <div class="mini-polls">
      <div class="mini-polls__title">Sonntagsfrage</div>
      ${allParties.map(p => `
        <div class="mini-poll-row">
          <span class="party-color-dot" style="background: ${p.color}"></span>
          <span class="mini-poll-name">${p.name}</span>
          <div class="mini-poll-bar"><div class="mini-poll-fill" style="width: ${p.approval}%; background: ${p.color}"></div></div>
          <span class="mini-poll-value">${fmtPct(p.approval)}</span>
        </div>
      `).join('')}
    </div>`;
}

function renderPollsTab() {
  const allParties = [
    { name: state.player.name, short: state.player.short, approval: state.player.approval, color: state.player.color, isPlayer: true },
    ...state.parties.map(p => ({ ...p, isPlayer: false }))
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
            <thead><tr><th>Partei</th><th>Prognose</th><th>Tendenz</th></tr></thead>
            <tbody>
              ${allParties.map(p => `
                <tr${p.isPlayer ? ' style="background: var(--color-primary-glow);"' : ''}>
                  <td><span class="party-color-dot" style="background: ${p.color}"></span>${p.short || p.name}</td>
                  <td style="font-weight: 700;">${fmtPct(p.approval)}</td>
                  <td>${p.approval >= 5 ? '<span style="color: var(--color-success);">Im Bundestag</span>' : '<span style="color: var(--color-error);">Unter 5%</span>'}</td>
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
          ${state.player.lawsPassed ? `<div class="budget-line"><span>Gesetze verabschiedet</span><span>${state.player.lawsPassed}</span></div>` : ''}
        </div>
      </div>
    </div>`;
}

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
          <div class="budget-line"><span>Regionalwahlkampf</span><span>-${fmtCurrency(Object.values(b.campaignSpending).reduce((s, v) => s + v, 0))}</span></div>
        </div>
      </div>

      <div style="margin-top: var(--space-6);">
        <h4 class="text-sm font-bold mb-2">Medienkampagnen-Budget (monatlich)</h4>
        <div class="budget-slider">
          <div class="budget-slider__header">
            <span class="budget-slider__name">Medienausgaben</span>
            <span class="budget-slider__pct">${fmtCurrency(b.mediaSpending)}</span>
          </div>
          <input type="range" id="media-spending-slider" min="0" max="200000" step="10000" value="${b.mediaSpending}">
        </div>
      </div>
    </div>`;
}

function renderMapTab() {
  const paths = generateGermanyMap();
  const maxApproval = 40;

  const mapPaths = BUNDESLAENDER.map(bl => {
    const r = state.player.regional[bl.id];
    const approval = r ? r.approval : 0;
    const intensity = clamp(approval / maxApproval, 0, 1);
    const fill = `rgba(59, 130, 246, ${0.15 + intensity * 0.7})`;
    return `<path d="${paths[bl.id]}" fill="${fill}" stroke="var(--color-border)" stroke-width="1.5"
              data-bl="${bl.id}" class="map-region">
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
        <div style="display: flex; gap: var(--space-2); align-items: center;">
          <input type="number" class="input-field regional-workers" data-bl="${bl.id}" value="${r ? r.workers : 0}" min="0" max="20" style="width: 60px; padding: var(--space-1) var(--space-2); font-size: var(--text-xs);">
          <input type="number" class="input-field regional-invest" data-bl="${bl.id}" value="${r ? r.investment : 0}" min="0" max="100000" step="5000" style="width: 90px; padding: var(--space-1) var(--space-2); font-size: var(--text-xs);">
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
    ministersHTML = `
      <div class="panel mt-4">
        <h3 class="panel__title" style="font-size: var(--text-base);">🏛️ Kabinett</h3>
        <div class="personnel-grid">
          ${MINISTER_POSITIONS.map(pos => {
            const person = state.player.ministers[pos.id];
            const scandalBadge = person && person.scandals > 0 ? `<span class="effect-badge effect-badge--negative">⚠ ${person.scandals} Skandal${person.scandals > 1 ? 'e' : ''}</span>` : '';
            return `<div class="personnel-card personnel-card--compact">
              <div class="personnel-card__header">
                <span class="personnel-card__icon">${pos.icon}</span>
                <div>
                  <div class="personnel-card__title">${pos.name}</div>
                  ${person ? `<div class="text-xs text-muted">${person.name} (Skill: ${person.skill})</div>` : '<div class="text-xs" style="color: var(--color-warning);">Nicht besetzt</div>'}
                </div>
              </div>
              ${scandalBadge}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="panel">
      <h3 class="panel__title">👥 Parteiämter</h3>
      <div class="personnel-grid">${positionsHTML}</div>
      <div class="text-xs text-muted mt-4">Parteieinheit: ${Math.round(state.player.partyUnity)}/100 · Glaubwürdigkeit: ${Math.round(state.player.credibility)}/100</div>
    </div>
    ${ministersHTML}
    ${state.bundespraesident ? `
    <div class="panel mt-4">
      <h3 class="panel__title" style="font-size: var(--text-base);">🏛️ Bundespräsident</h3>
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

// ===== CAMPAIGN DASHBOARD =====
function renderCampaignDashboard() {
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">📺 Wahlkampf — TV-Debatte</h2>
      <p class="text-sm text-muted mb-4">Wählen Sie Ihre Strategie für die Fernsehdebatte.</p>
      <div class="debate-strategies">
        <button class="debate-strategy-btn" data-strategy="angriff">
          <span class="debate-strategy-btn__icon">⚔️</span>
          <span class="debate-strategy-btn__name">Angriff</span>
          <span class="debate-strategy-btn__desc">Gegner direkt attackieren. Hohes Risiko, hohe Belohnung.</span>
        </button>
        <button class="debate-strategy-btn" data-strategy="sachlich">
          <span class="debate-strategy-btn__icon">📋</span>
          <span class="debate-strategy-btn__name">Sachlich</span>
          <span class="debate-strategy-btn__desc">Faktenbasierte Argumentation. Sicher, aber weniger spektakulär.</span>
        </button>
        <button class="debate-strategy-btn" data-strategy="emotional">
          <span class="debate-strategy-btn__icon">❤️</span>
          <span class="debate-strategy-btn__name">Emotional</span>
          <span class="debate-strategy-btn__desc">An Gefühle appellieren. Gut bei Arbeitern und Rentnern.</span>
        </button>
        <button class="debate-strategy-btn" data-strategy="visionaer">
          <span class="debate-strategy-btn__icon">🔮</span>
          <span class="debate-strategy-btn__name">Visionär</span>
          <span class="debate-strategy-btn__desc">Zukunftsvision präsentieren. Stark bei Jugend und Akademikern.</span>
        </button>
      </div>
    </div>`;
}

function renderDebateResult() {
  const r = state.debateResult;
  const isPlenar = r.strategy === 'plenardebatte';
  state.debateResult = null;
  return `
    <div class="panel ${r.success ? 'panel--highlight' : ''}">
      <h2 class="panel__title">${r.success ? '🎉' : '😓'} ${isPlenar ? (r.success ? 'Gesetz verabschiedet!' : 'Im Bundestag gescheitert') : (r.success ? 'Debatte gewonnen!' : 'Debatte verloren')}</h2>
      <p class="text-sm text-muted mb-4">
        ${r.success
          ? (isPlenar ? `Das Gesetz "${r.title}" wurde erfolgreich verabschiedet.` : 'Ihre Strategie hat überzeugt! Die Umfragewerte steigen.')
          : (isPlenar ? `Das Gesetz "${r.title}" wurde im Bundestag abgelehnt.` : 'Ihr Auftritt war nicht überzeugend. Die Wähler sind enttäuscht.')}
      </p>
      <p class="text-sm">Aktuelle Zustimmung: <strong>${fmtPct(state.player.approval)}</strong></p>
      <button class="btn btn--primary btn--lg btn--block mt-4" id="btn-continue-after-debate">Weiter →</button>
    </div>`;
}

// ===== PLENARDEBATTE SCREEN =====
function renderPlenarDebatteScreen() {
  const debate = state.pendingPlenarDebatte;
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🏛️ Plenardebatte: ${debate.title}</h2>
      <p class="text-sm text-muted mb-4">Der Bundestag debattiert über dieses Gesetz. Wählen Sie Ihr Argument.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);" class="mobile-stack">
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-success);">Dafür</h4>
          ${debate.proArgs.map((arg, i) => `
            <button class="decision-option" data-plenar-arg="${i}" style="margin-bottom: var(--space-2);">
              <div class="decision-option__icon">✅</div>
              <div class="decision-option__content">
                <div class="decision-option__title">${arg}</div>
              </div>
            </button>
          `).join('')}
        </div>
        <div>
          <h4 class="text-sm font-bold mb-2" style="color: var(--color-error);">Dagegen</h4>
          ${debate.contraArgs.map((arg, i) => `
            <button class="decision-option" data-plenar-arg="${debate.proArgs.length + i}" style="margin-bottom: var(--space-2);">
              <div class="decision-option__icon">❌</div>
              <div class="decision-option__content">
                <div class="decision-option__title">${arg}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="text-xs text-muted">Fraktionsvorsitz-Skill bestimmt die Erfolgschance.</div>
    </div>`;
}

// ===== DONATION EVENT =====
function renderDonationEvent() {
  const d = state.pendingDonation;
  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">💰 Großspende</h2>
      <p class="text-sm text-muted mb-2">${d.donor} bietet eine Spende von <strong>${fmtCurrency(d.amount)}</strong> an.</p>
      <p class="text-sm mb-4" style="color: var(--color-warning);">Bedingung: „${d.demand}"</p>
      <div style="display: flex; gap: var(--space-3);">
        <button class="btn btn--success" id="btn-accept-donation">Annehmen (+${fmtCurrency(d.amount)})</button>
        <button class="btn btn--danger" id="btn-reject-donation">Ablehnen (Glaubwürdigkeit +2)</button>
      </div>
    </div>`;
}

// ===== PARTEITAG =====
function renderParteitagStart() {
  state.currentParteitagTopic = pick(PARTEITAG_TOPICS);
  state.pendingParteitag = false;
  return renderParteitagDebate();
}

function renderParteitagDebate() {
  const topic = state.currentParteitagTopic;
  if (!topic) return '';

  // Show Parteitag result if available
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

  return `
    <div class="panel panel--highlight">
      <h2 class="panel__title">🏛️ Parteitag: ${topic.title}</h2>
      <p class="text-sm text-muted mb-4">${topic.question}</p>
      <p class="text-xs text-muted mb-4">Wählen Sie ein Argument für Ihre Rede vor den Delegierten.</p>
      <div class="decision-options">
        ${topic.arguments.map((arg, i) => `
          <button class="decision-option" data-parteitag-arg="${i}">
            <div class="decision-option__icon">${arg.wing === 'left' ? '⬅️' : arg.wing === 'right' ? '➡️' : '⚖️'}</div>
            <div class="decision-option__content">
              <div class="decision-option__title">${arg.text}</div>
              <div class="decision-option__desc">Flügel: ${arg.wing === 'left' ? 'Links' : arg.wing === 'right' ? 'Rechts' : 'Mitte'} · Stärke: ${Math.round(arg.strength * 100)}%</div>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="text-xs text-muted mt-4">Parteieinheit: ${Math.round(state.player.partyUnity)}/100</div>
    </div>`;
}

// ===== LANDTAGSWAHL EVENT =====
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

// ===== ELECTION SCREEN =====
function renderElectionScreen() {
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
  const canCoalition = state.player.passedThreshold && state.player.seats > 0;

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

    ${canCoalition ? `
      <div class="panel">
        <h3 class="panel__title">Koalitionsoptionen</h3>
        <div class="decision-options">
          ${state.coalitionOptions.map((opt, i) => `
            <button class="decision-option" data-coalition="${i}">
              <div class="decision-option__icon">🤝</div>
              <div class="decision-option__content">
                <div class="decision-option__title">${opt.name}</div>
                <div class="decision-option__desc">${opt.totalSeats} Sitze${opt.compatibility ? ` · Kompatibilität: ${Math.round(opt.compatibility)}%` : ''}</div>
              </div>
            </button>
          `).join('')}
        </div>
        <button class="btn btn--secondary btn--block mt-4" id="btn-go-opposition">In die Opposition gehen</button>
      </div>
    ` : `
      <div class="panel text-center">
        <p class="text-muted">${r.passedThreshold ? 'Keine Koalitionsmehrheit möglich.' : 'Ihre Partei ist nicht im Bundestag vertreten.'}</p>
        <button class="btn btn--secondary btn--lg btn--block mt-4" id="btn-go-opposition">${r.passedThreshold ? 'In die Opposition →' : 'Weiter als Opposition →'}</button>
      </div>
    `}`;
}

function renderCoalitionScreen() { return ''; }

// ===== MINISTER SELECTION =====
function renderMinisterSelection() {
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
        <select class="input-field minister-select" data-minister="${pos.id}" style="width: 100%; margin-top: var(--space-2);">
          <option value="">— Nicht besetzt —</option>
          ${opts.map(p => `<option value="${p.id}" ${assigned && assigned.id === p.id ? 'selected' : ''}>${p.name} (${p.expertise}, Skill: ${p.skill})</option>`).join('')}
        </select>
      </div>`;
  }).join('');

  // Auto-fill remaining positions
  MINISTER_POSITIONS.slice(6).forEach(pos => {
    if (!state.player.ministers[pos.id]) {
      state.player.ministers[pos.id] = generatePerson('center');
    }
  });

  return `
    <div class="panel">
      <h2 class="panel__title">🏛️ Kabinettsbildung</h2>
      <p class="text-sm text-muted mb-4">Koalition: ${coalition ? coalition.name : 'Alleinregierung'} — Besetzen Sie die wichtigsten Ministerien.</p>
      <div class="personnel-grid">${positionsHTML}</div>
      <button class="btn btn--primary btn--lg btn--block mt-6" id="btn-start-governance">Regierung starten →</button>
    </div>`;
}

// ===== GAME OVER SCREEN =====
function renderGameOverScreen() {
  const won = state.player.isKanzler;
  return `
    <div class="panel text-center" style="padding: var(--space-12);">
      <h2 style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 800; color: ${won ? 'var(--color-success)' : 'var(--color-error)'};">
        ${won ? '🎉 Legislaturperiode beendet!' : '😔 Spiel vorbei'}
      </h2>
      <p class="text-lg text-muted mt-4">
        ${won ? `Sie haben ${state.electionCount + 1} Legislaturperiode(n) regiert.` : 'Ihre politische Karriere endet hier.'}
      </p>
      <div class="result-comparison mt-6">
        <div class="result-comparison__item">
          <span class="result-comparison__value">${fmtPct(state.player.approval)}</span>
          <span class="result-comparison__label">Letzte Zustimmung</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${state.player.seats}</span>
          <span class="result-comparison__label">Bundestagssitze</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${fmtCurrency(state.player.budget.balance)}</span>
          <span class="result-comparison__label">Parteikasse</span>
        </div>
        <div class="result-comparison__item">
          <span class="result-comparison__value">${state.player.lawsPassed || 0}</span>
          <span class="result-comparison__label">Gesetze verabschiedet</span>
        </div>
      </div>
      <button class="btn btn--primary btn--lg mt-8" id="btn-restart">Neues Spiel</button>
    </div>`;
}

// ===== EVENT LISTENERS =====
function attachListeners() {
  const btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.onclick = () => { AudioEngine.init(); AudioEngine.resume(); AudioEngine.click(); state = createInitialState(); state.phase = 'creation'; renderScreen(); };

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
        topicCount.textContent = `(${selectedTopics.length}/3)`;
        updateCreateButton();
      };
    });

    function updateCreateButton() {
      const valid = nameInput.value.trim().length >= 2 && selectedTopics.length === 3;
      createBtn.disabled = !valid;
    }

    if (nameInput) nameInput.oninput = updateCreateButton;
    if (shortInput) shortInput.oninput = updateCreateButton;

    if (createBtn) createBtn.onclick = () => {
      const name = nameInput.value.trim();
      const short = shortInput ? shortInput.value.trim().toUpperCase() : '';
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

  // Decision buttons
  document.querySelectorAll('[data-decision]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); applyDecision(parseInt(btn.dataset.decision)); };
  });

  // Next month button
  const btnNextMonth = document.getElementById('btn-next-month');
  if (btnNextMonth) btnNextMonth.onclick = () => { AudioEngine.click(); nextMonth(); };

  // Debate strategy buttons
  document.querySelectorAll('[data-strategy]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); applyDebateStrategy(btn.dataset.strategy); };
  });

  // Continue after debate
  const btnContinueDebate = document.getElementById('btn-continue-after-debate');
  if (btnContinueDebate) btnContinueDebate.onclick = () => { AudioEngine.click(); nextMonth(); };

  // Donation buttons
  const btnAcceptDon = document.getElementById('btn-accept-donation');
  if (btnAcceptDon) btnAcceptDon.onclick = () => { handleDonation(true); };
  const btnRejectDon = document.getElementById('btn-reject-donation');
  if (btnRejectDon) btnRejectDon.onclick = () => { handleDonation(false); };

  // Parteitag arguments
  document.querySelectorAll('[data-parteitag-arg]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); runParteitag(parseInt(btn.dataset['parteitagArg'])); };
  });

  // Plenardebatte arguments
  document.querySelectorAll('[data-plenar-arg]').forEach(btn => {
    btn.onclick = () => { AudioEngine.click(); handlePlenarDebatte(parseInt(btn.dataset['plenarArg'])); };
  });

  // Landtagswahl
  const btnLandtag = document.getElementById('btn-landtagswahl');
  if (btnLandtag) btnLandtag.onclick = () => { handleLandtagswahl(); };

  // Coalition selection
  document.querySelectorAll('[data-coalition]').forEach(btn => {
    btn.onclick = () => { AudioEngine.success(); selectCoalition(parseInt(btn.dataset.coalition)); };
  });

  // Opposition
  const btnOpposition = document.getElementById('btn-go-opposition');
  if (btnOpposition) btnOpposition.onclick = () => { AudioEngine.click(); goToOpposition(); };

  // Minister selection
  document.querySelectorAll('.minister-select').forEach(sel => {
    sel.onchange = () => { assignMinister(sel.dataset.minister, sel.value); };
  });

  // Start governance
  const btnStartGov = document.getElementById('btn-start-governance');
  if (btnStartGov) btnStartGov.onclick = () => { AudioEngine.success(); startGovernance(); };

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
    if (confirm('Neues Spiel starten? Ungespeicherter Fortschritt geht verloren.')) startNewGame();
  };

  const btnMute = document.getElementById('btn-mute');
  if (btnMute) btnMute.onclick = () => {
    AudioEngine.toggle();
    btnMute.textContent = AudioEngine.muted ? '🔇' : '🔊';
  };

  const btnSave = document.getElementById('btn-save');
  if (btnSave) btnSave.onclick = () => { AudioEngine.click(); exportSaveState(); };

  const btnLoad = document.getElementById('btn-load');
  if (btnLoad) btnLoad.onclick = () => { AudioEngine.click(); showLoadModal(); };
}

// ===== TOAST =====
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== SAVE / LOAD =====
function exportSaveState() {
  try {
    const saveData = JSON.parse(JSON.stringify(state));
    const json = JSON.stringify(saveData);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    showSaveModal(encoded);
  } catch(e) {
    showToast('Fehler beim Speichern: ' + e.message);
  }
}

function importSaveState() {
  showLoadModal();
}

function applySaveCode(code) {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const saveData = JSON.parse(json);
    state = saveData;
    renderScreen();
    showToast('Spielstand geladen!');
    closeSaveLoadModal();
  } catch(e) {
    const errorEl = document.getElementById('load-error');
    if (errorEl) errorEl.textContent = 'Ungültiger Spielstand-Code.';
  }
}

function showSaveModal(code) {
  const overlay = document.createElement('div');
  overlay.className = 'save-load-overlay';
  overlay.id = 'save-load-overlay';
  overlay.innerHTML = `
    <div class="save-load-modal">
      <div class="save-load-modal__header">
        <h3>💾 Spielstand speichern</h3>
        <button class="save-load-modal__close" onclick="closeSaveLoadModal()">✕</button>
      </div>
      <div class="save-load-modal__desc">Kopieren Sie den Code unten und speichern Sie ihn an einem sicheren Ort.</div>
      <textarea class="save-load-modal__textarea" id="save-code" readonly>${code}</textarea>
      <div class="save-load-modal__actions">
        <button class="btn btn--primary" onclick="document.getElementById('save-code').select(); document.execCommand('copy'); document.getElementById('save-feedback').textContent='✓ Kopiert!';">Code kopieren</button>
        <button class="btn btn--secondary" onclick="closeSaveLoadModal()">Schließen</button>
      </div>
      <div class="save-load-modal__feedback" id="save-feedback"></div>
    </div>`;
  document.body.appendChild(overlay);
}

function showLoadModal() {
  const overlay = document.createElement('div');
  overlay.className = 'save-load-overlay';
  overlay.id = 'save-load-overlay';
  overlay.innerHTML = `
    <div class="save-load-modal">
      <div class="save-load-modal__header">
        <h3>📂 Spielstand laden</h3>
        <button class="save-load-modal__close" onclick="closeSaveLoadModal()">✕</button>
      </div>
      <div class="save-load-modal__desc">Fügen Sie Ihren gespeicherten Code hier ein.</div>
      <textarea class="save-load-modal__textarea" id="load-code" placeholder="Code hier einfügen..."></textarea>
      <div class="save-load-modal__error" id="load-error"></div>
      <div class="save-load-modal__actions">
        <button class="btn btn--primary" onclick="applySaveCode(document.getElementById('load-code').value)">Laden</button>
        <button class="btn btn--secondary" onclick="closeSaveLoadModal()">Abbrechen</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function closeSaveLoadModal() {
  const overlay = document.getElementById('save-load-overlay');
  if (overlay) overlay.remove();
}

// ===== INIT =====
function initGame() {
  state = null;
  renderScreen();
}

window.render_game_to_text = function() {
  const content = document.getElementById('game-content');
  return content ? content.innerText : '';
};

window.advanceTime = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

document.addEventListener('DOMContentLoaded', initGame);

// Spiel automatisch starten, wenn Seite geladen
window.addEventListener('load', () => {
  AudioEngine.init?.();
  state = createInitialState();
  renderScreen();
});

// --- MACHTSPIEL Startpunkt ---
// Seite ist geladen → Anfangszustand erzeugen und ersten Screen rendern
window.addEventListener('load', () => {
  try { AudioEngine.init?.(); } catch (e) {}
  state = createInitialState();
  renderScreen();
});
