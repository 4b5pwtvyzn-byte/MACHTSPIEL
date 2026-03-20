/* ============================================
   MACHTSPIEL — Political Strategy Game Engine
   All game logic, state, events, and rendering
   ============================================ */

// ===== AUDIO ENGINE =====
const AudioEngine = {
  ctx: null,
  muted: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* silent fail */ }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  play(type, freq = 440, dur = 0.1, vol = 0.15) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) { /* silent fail */ }
  },

  click()    { this.play('sine', 800, 0.06, 0.1); },
  hover()    { this.play('sine', 600, 0.03, 0.05); },
  success()  { this.play('sine', 523, 0.15, 0.12); setTimeout(() => this.play('sine', 659, 0.15, 0.12), 100); setTimeout(() => this.play('sine', 784, 0.2, 0.12), 200); },
  failure()  { this.play('sawtooth', 200, 0.3, 0.1); setTimeout(() => this.play('sawtooth', 150, 0.4, 0.1), 150); },
  election() { this.play('sine', 440, 0.1, 0.1); setTimeout(() => this.play('sine', 554, 0.1, 0.1), 100); setTimeout(() => this.play('sine', 659, 0.1, 0.1), 200); setTimeout(() => this.play('sine', 880, 0.3, 0.15), 300); },
  alert()    { this.play('square', 880, 0.08, 0.08); setTimeout(() => this.play('square', 880, 0.08, 0.08), 150); },
  toggle()   { this.muted = !this.muted; }
};

// ===== TOPICS =====
const TOPICS = [
  { id: 'wirtschaft',       name: 'Wirtschaft',       icon: '📊' },
  { id: 'migration',        name: 'Migration',        icon: '🌍' },
  { id: 'klima',            name: 'Klima/Umwelt',     icon: '🌱' },
  { id: 'sicherheit',       name: 'Sicherheit',       icon: '🛡️' },
  { id: 'bildung',          name: 'Bildung',          icon: '🎓' },
  { id: 'digitalisierung',  name: 'Digitalisierung',  icon: '💻' },
  { id: 'gesundheit',       name: 'Gesundheit',       icon: '🏥' },
  { id: 'soziales',         name: 'Soziales',         icon: '🤝' },
  { id: 'wohnen',           name: 'Wohnen',           icon: '🏠' },
];

// ===== VOTER GROUPS =====
const VOTER_GROUPS = [
  { id: 'arbeiter',       name: 'Arbeiter',        icon: '🔧' },
  { id: 'akademiker',     name: 'Akademiker',      icon: '🎓' },
  { id: 'rentner',        name: 'Rentner',         icon: '👴' },
  { id: 'jugend',         name: 'Jugend',          icon: '🧑' },
  { id: 'selbststaendige',name: 'Selbstständige',  icon: '💼' },
  { id: 'land',           name: 'Landbevölkerung', icon: '🌾' },
];

// ===== AI PARTIES =====
const AI_PARTIES = [
  {
    id: 'volkspartei',
    name: 'Volkspartei Mitte',
    short: 'VPM',
    color: '#1e3a5f',
    baseApproval: 27,
    alignment: { economic: 0.3, social: 0.2 },
    topics: ['wirtschaft', 'sicherheit', 'bildung'],
    voterBase: { arbeiter: 0.25, akademiker: 0.2, rentner: 0.35, jugend: 0.1, selbststaendige: 0.3, land: 0.35 },
  },
  {
    id: 'sozialdemokraten',
    name: 'Sozialdemokratische Allianz',
    short: 'SDA',
    color: '#c0392b',
    baseApproval: 22,
    alignment: { economic: -0.3, social: -0.1 },
    topics: ['soziales', 'wirtschaft', 'gesundheit'],
    voterBase: { arbeiter: 0.35, akademiker: 0.25, rentner: 0.25, jugend: 0.15, selbststaendige: 0.1, land: 0.2 },
  },
  {
    id: 'gruene',
    name: 'Grüne Zukunft',
    short: 'GZ',
    color: '#27ae60',
    baseApproval: 14,
    alignment: { economic: -0.2, social: -0.5 },
    topics: ['klima', 'bildung', 'digitalisierung'],
    voterBase: { arbeiter: 0.1, akademiker: 0.35, rentner: 0.05, jugend: 0.35, selbststaendige: 0.15, land: 0.05 },
  },
  {
    id: 'freie',
    name: 'Freie Demokraten',
    short: 'FD',
    color: '#f1c40f',
    baseApproval: 9,
    alignment: { economic: 0.5, social: -0.3 },
    topics: ['wirtschaft', 'digitalisierung', 'bildung'],
    voterBase: { arbeiter: 0.05, akademiker: 0.25, rentner: 0.1, jugend: 0.15, selbststaendige: 0.4, land: 0.08 },
  },
  {
    id: 'linke',
    name: 'Linke Alternative',
    short: 'LA',
    color: '#8e44ad',
    baseApproval: 7,
    alignment: { economic: -0.7, social: -0.4 },
    topics: ['soziales', 'wohnen', 'gesundheit'],
    voterBase: { arbeiter: 0.25, akademiker: 0.15, rentner: 0.15, jugend: 0.2, selbststaendige: 0.02, land: 0.1 },
  },
  {
    id: 'nationale',
    name: 'Nationale Bewegung',
    short: 'NB',
    color: '#5d4037',
    baseApproval: 12,
    alignment: { economic: 0.1, social: 0.7 },
    topics: ['migration', 'sicherheit', 'wirtschaft'],
    voterBase: { arbeiter: 0.2, akademiker: 0.05, rentner: 0.15, jugend: 0.1, selbststaendige: 0.15, land: 0.35 },
  },
];

// ===== EVENTS POOL (25 events) =====
const EVENTS_POOL = [
  {
    id: 'wirtschaftskrise',
    category: 'Wirtschaft',
    headline: 'Wirtschaftskrise droht: BIP sinkt um 2%',
    description: 'Die deutsche Wirtschaft rutscht in eine Rezession. Unternehmen kündigen Massenentlassungen an, und die Arbeitslosigkeit steigt spürbar.',
    topic: 'wirtschaft',
    options: [
      { label: 'Konjunkturprogramm', desc: 'Massive staatliche Investitionen zur Ankurbelung der Wirtschaft', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: -1, jugend: 3, selbststaendige: -3, land: 2, media: 2, credibility: { economic: -0.3 } } },
      { label: 'Steuerentlastungen', desc: 'Gezielte Steuersenkungen für Unternehmen und Mittelstand', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 0, jugend: 0, selbststaendige: 6, land: 1, media: 1, credibility: { economic: 0.3 } } },
      { label: 'Sparpolitik', desc: 'Staatsausgaben kürzen und Haushaltsdisziplin einfordern', stance: 'conservative',
        effects: { arbeiter: -4, akademiker: -1, rentner: -3, jugend: -2, selbststaendige: 3, land: -1, media: -1, credibility: { economic: 0.5 } } },
    ]
  },
  {
    id: 'fluechtlingskrise',
    category: 'Migration',
    headline: 'Flüchtlingszahlen auf neuem Höchststand',
    description: 'Hunderttausende Menschen suchen Schutz in Deutschland. Kommunen melden Überlastung bei Unterkünften und Integrationskursen.',
    topic: 'migration',
    options: [
      { label: 'Offene Aufnahme', desc: 'Humanitäre Aufnahme verstärken und Integrationsprogramme ausbauen', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 4, rentner: -4, jugend: 3, selbststaendige: -1, land: -5, media: 1, credibility: { social: -0.4 } } },
      { label: 'Geordnete Zuwanderung', desc: 'Kontingente festlegen und Verfahren beschleunigen', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 1, jugend: 1, selbststaendige: 1, land: 0, media: 2, credibility: { social: 0 } } },
      { label: 'Strenge Grenzkontrolle', desc: 'Grenzkontrollen verschärfen und Abschiebungen beschleunigen', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -4, rentner: 3, jugend: -3, selbststaendige: 1, land: 4, media: -1, credibility: { social: 0.5 } } },
    ]
  },
  {
    id: 'klimakatastrophe',
    category: 'Klima/Umwelt',
    headline: 'Rekord-Hitzewelle: Waldbrände in Brandenburg',
    description: 'Extreme Temperaturen von über 42°C führen zu schweren Waldbränden. Experten fordern sofortiges Handeln beim Klimaschutz.',
    topic: 'klima',
    options: [
      { label: 'Klimanotstand', desc: 'Sofortiger Ausstieg aus fossilen Energien und Klimaneutralität bis 2035', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 5, rentner: -2, jugend: 6, selbststaendige: -4, land: -3, media: 3, credibility: { social: -0.5 } } },
      { label: 'Grüne Transformation', desc: 'Schrittweiser Umbau mit Förderung erneuerbarer Energien', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: 0, jugend: 3, selbststaendige: 0, land: 0, media: 2, credibility: { social: -0.2 } } },
      { label: 'Technologie-Fokus', desc: 'Auf Innovation setzen, keine Verbote oder harten Vorgaben', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -1, rentner: 2, jugend: -2, selbststaendige: 4, land: 2, media: 0, credibility: { economic: 0.3 } } },
    ]
  },
  {
    id: 'bildungsreform',
    category: 'Bildung',
    headline: 'PISA-Schock: Deutsche Schüler fallen zurück',
    description: 'Die neuesten PISA-Ergebnisse zeigen einen dramatischen Leistungsrückgang. Lehrer und Eltern fordern grundlegende Reformen.',
    topic: 'bildung',
    options: [
      { label: 'Gesamtschulreform', desc: 'Einheitsschule einführen und mehr Chancengleichheit schaffen', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 1, rentner: -1, jugend: 4, selbststaendige: -2, land: 1, media: 2, credibility: { social: -0.3 } } },
      { label: 'Digitales Klassenzimmer', desc: 'Massive Investitionen in digitale Infrastruktur und Lehrerfortbildung', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 3, rentner: 0, jugend: 5, selbststaendige: 2, land: 1, media: 3, credibility: { social: -0.1 } } },
      { label: 'Leistungsprinzip', desc: 'Begabtenförderung stärken und mehr Wettbewerb zwischen Schulen', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: 2, rentner: 2, jugend: -1, selbststaendige: 3, land: -1, media: 0, credibility: { social: 0.2 } } },
    ]
  },
  {
    id: 'gesundheitskrise',
    category: 'Gesundheit',
    headline: 'Krankenhäuser in der Krise: Personalmangel eskaliert',
    description: 'Tausende Pflegekräfte verlassen den Beruf. Notaufnahmen müssen Patienten abweisen. Das Gesundheitssystem steht vor dem Kollaps.',
    topic: 'gesundheit',
    options: [
      { label: 'Bürgerversicherung', desc: 'Einheitliches Gesundheitssystem für alle, finanziert durch höhere Beiträge', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 1, rentner: 4, jugend: 2, selbststaendige: -5, land: 3, media: 1, credibility: { economic: -0.4 } } },
      { label: 'Pflegeoffensive', desc: 'Bessere Bezahlung und Arbeitsbedingungen für Pflegekräfte', stance: 'moderate',
        effects: { arbeiter: 4, akademiker: 3, rentner: 3, jugend: 2, selbststaendige: -1, land: 3, media: 3, credibility: { social: -0.1 } } },
      { label: 'Privatisierung', desc: 'Mehr Wettbewerb durch private Anbieter und Effizienzsteigerung', stance: 'conservative',
        effects: { arbeiter: -3, akademiker: 0, rentner: -2, jugend: -1, selbststaendige: 4, land: -2, media: -1, credibility: { economic: 0.4 } } },
    ]
  },
  {
    id: 'wohnungskrise',
    category: 'Wohnen',
    headline: 'Mietexplosion: Bezahlbares Wohnen wird Luxus',
    description: 'In Großstädten steigen die Mieten um bis zu 15% jährlich. Zehntausende Menschen finden keine bezahlbare Wohnung mehr.',
    topic: 'wohnen',
    options: [
      { label: 'Mietendeckel', desc: 'Strikte Mietpreisbremse und Vergesellschaftung großer Wohnungskonzerne', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: 3, jugend: 6, selbststaendige: -5, land: 0, media: 1, credibility: { economic: -0.5 } } },
      { label: 'Bauprogramm', desc: '400.000 neue Wohnungen jährlich durch staatliche Förderung', stance: 'moderate',
        effects: { arbeiter: 3, akademiker: 2, rentner: 1, jugend: 3, selbststaendige: 2, land: 1, media: 2, credibility: { economic: 0 } } },
      { label: 'Marktlösung', desc: 'Bauvorschriften vereinfachen und Investitionsanreize schaffen', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: 0, rentner: -1, jugend: -2, selbststaendige: 5, land: 1, media: 0, credibility: { economic: 0.4 } } },
    ]
  },
  {
    id: 'digitalisierung_verwaltung',
    category: 'Digitalisierung',
    headline: 'Behörden-Chaos: Digitalisierung katastrophal gescheitert',
    description: 'Das Online-Portal für Bürgerservices ist wieder ausgefallen. Deutschland landet im EU-Ranking der Digitalisierung auf dem letzten Platz.',
    topic: 'digitalisierung',
    options: [
      { label: 'Digitalministerium', desc: 'Neues Superministerium mit milliardenschweren Investitionen', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 4, rentner: -1, jugend: 5, selbststaendige: 3, land: 0, media: 2, credibility: { economic: -0.2 } } },
      { label: 'E-Government schrittweise', desc: 'Pragmatischer Ausbau mit Fokus auf die wichtigsten Bürgerservices', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 2, rentner: 1, jugend: 3, selbststaendige: 2, land: 1, media: 2, credibility: { social: 0 } } },
      { label: 'Privatwirtschaft einbinden', desc: 'Tech-Konzerne beauftragen und auf bewährte Lösungen setzen', stance: 'conservative',
        effects: { arbeiter: 0, akademiker: 1, rentner: 0, jugend: 2, selbststaendige: 4, land: -1, media: 1, credibility: { economic: 0.3 } } },
    ]
  },
  {
    id: 'sicherheitsbedrohung',
    category: 'Sicherheit',
    headline: 'Terrorwarnung: Sicherheitsbehörden in Alarmbereitschaft',
    description: 'Nach konkreten Hinweisen auf einen geplanten Anschlag werden die Sicherheitsstufen erhöht. Die Bevölkerung ist verunsichert.',
    topic: 'sicherheit',
    options: [
      { label: 'Deeskalation', desc: 'Prävention stärken, Deradikalisierungsprogramme ausbauen', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: 3, rentner: -3, jugend: 2, selbststaendige: 0, land: -2, media: -1, credibility: { social: -0.3 } } },
      { label: 'Gezielte Maßnahmen', desc: 'Mehr Polizeipräsenz und verbesserte Geheimdienstkoordination', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: 3, jugend: 0, selbststaendige: 1, land: 2, media: 2, credibility: { social: 0.1 } } },
      { label: 'Null Toleranz', desc: 'Überwachung ausweiten, härtere Gesetze und mehr Befugnisse für Sicherheitsbehörden', stance: 'conservative',
        effects: { arbeiter: 3, akademiker: -3, rentner: 4, jugend: -3, selbststaendige: 1, land: 4, media: 0, credibility: { social: 0.5 } } },
    ]
  },
  {
    id: 'rentenreform',
    category: 'Soziales',
    headline: 'Rentenalarm: System vor dem finanziellen Kollaps',
    description: 'Experten warnen: Ohne Reform wird die Rente in 15 Jahren unbezahlbar. Die Generationenfrage wird zum politischen Sprengstoff.',
    topic: 'soziales',
    options: [
      { label: 'Grundrente Plus', desc: 'Höhere Grundrente und Vermögenssteuer zur Finanzierung', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 1, rentner: 6, jugend: -2, selbststaendige: -4, land: 3, media: 1, credibility: { economic: -0.4 } } },
      { label: 'Generationenvertrag', desc: 'Renteneintritt flexibel gestalten und Zusatzvorsorge fördern', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 2, jugend: 1, selbststaendige: 2, land: 1, media: 2, credibility: { economic: 0 } } },
      { label: 'Rentenalter anheben', desc: 'Rentenalter auf 69 erhöhen und Eigenverantwortung stärken', stance: 'conservative',
        effects: { arbeiter: -5, akademiker: 0, rentner: -6, jugend: 2, selbststaendige: 3, land: -3, media: -2, credibility: { economic: 0.5 } } },
    ]
  },
  {
    id: 'energiepolitik',
    category: 'Klima/Umwelt',
    headline: 'Energiepreise explodieren: Haushalte unter Druck',
    description: 'Gas- und Strompreise erreichen Rekordniveaus. Industriebetriebe drohen mit Abwanderung, Familien können Heizkosten nicht mehr bezahlen.',
    topic: 'klima',
    options: [
      { label: 'Energiewende beschleunigen', desc: '100% Erneuerbare bis 2030 und Energiegeld für Geringverdiener', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 4, rentner: -1, jugend: 4, selbststaendige: -3, land: -1, media: 2, credibility: { social: -0.3 } } },
      { label: 'Preisdeckel', desc: 'Sofortiger Energiepreisdeckel und Diversifizierung der Quellen', stance: 'moderate',
        effects: { arbeiter: 4, akademiker: 2, rentner: 4, jugend: 2, selbststaendige: 1, land: 3, media: 2, credibility: { economic: -0.1 } } },
      { label: 'Kernkraft zurück', desc: 'Bestehende Kernkraftwerke wieder ans Netz und neue planen', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 2, jugend: -3, selbststaendige: 3, land: 1, media: 0, credibility: { economic: 0.3 } } },
    ]
  },
  {
    id: 'steuerdebatte',
    category: 'Wirtschaft',
    headline: 'Steuerdebatte: Ungleichheit auf Rekordniveau',
    description: 'Die reichsten 10% besitzen 60% des Vermögens. Gewerkschaften fordern Umverteilung, Wirtschaftsverbände warnen vor Standortnachteilen.',
    topic: 'wirtschaft',
    options: [
      { label: 'Vermögenssteuer', desc: 'Wiedereinführung der Vermögenssteuer und höherer Spitzensteuersatz', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 1, rentner: 2, jugend: 3, selbststaendige: -6, land: 2, media: 1, credibility: { economic: -0.5 } } },
      { label: 'Mittelstandsentlastung', desc: 'Steuervereinfachung und gezielte Entlastung der mittleren Einkommen', stance: 'moderate',
        effects: { arbeiter: 3, akademiker: 3, rentner: 1, jugend: 1, selbststaendige: 2, land: 2, media: 2, credibility: { economic: 0 } } },
      { label: 'Steuerwettbewerb', desc: 'Unternehmenssteuern senken, um international wettbewerbsfähig zu bleiben', stance: 'conservative',
        effects: { arbeiter: -3, akademiker: 0, rentner: -2, jugend: -1, selbststaendige: 5, land: 0, media: -1, credibility: { economic: 0.5 } } },
    ]
  },
  {
    id: 'eu_krise',
    category: 'EU/Außenpolitik',
    headline: 'EU-Krise: Mitgliedsstaat droht mit Austritt',
    description: 'Ein wichtiges EU-Mitglied stellt die Mitgliedschaft in Frage. Die Europäische Union steht vor einer Zerreißprobe.',
    topic: 'wirtschaft',
    options: [
      { label: 'Mehr Europa', desc: 'Vertiefte Integration und gemeinsame Fiskalpolitik vorantreiben', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: 4, rentner: -1, jugend: 2, selbststaendige: 1, land: -2, media: 2, credibility: { social: -0.2 } } },
      { label: 'Pragmatische Reform', desc: 'EU reformieren, aber Zusammenhalt bewahren', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: 1, jugend: 1, selbststaendige: 2, land: 0, media: 3, credibility: { social: 0 } } },
      { label: 'Nationale Souveränität', desc: 'Mehr Kompetenzen zurück an die Nationalstaaten', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 3, jugend: -1, selbststaendige: 0, land: 4, media: -1, credibility: { social: 0.4 } } },
    ]
  },
  {
    id: 'aussenpolitik_krise',
    category: 'Außenpolitik',
    headline: 'Internationaler Konflikt: Bundeswehr-Einsatz gefordert',
    description: 'Ein bewaffneter Konflikt in einer strategisch wichtigen Region eskaliert. NATO-Partner fordern stärkeres deutsches Engagement.',
    topic: 'sicherheit',
    options: [
      { label: 'Friedensdiplomatie', desc: 'Diplomatische Lösung suchen, keine Waffenlieferungen', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 2, rentner: 2, jugend: 3, selbststaendige: 0, land: 1, media: 0, credibility: { social: -0.2 } } },
      { label: 'Bündnistreue', desc: 'NATO-Verpflichtungen erfüllen mit begrenztem militärischem Beitrag', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 2, rentner: 1, jugend: -1, selbststaendige: 1, land: 0, media: 3, credibility: { social: 0.1 } } },
      { label: 'Militärische Stärke', desc: 'Massiver Bundeswehr-Einsatz und Verteidigungsausgaben verdoppeln', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: -2, rentner: 0, jugend: -3, selbststaendige: 2, land: 2, media: 1, credibility: { social: 0.4 } } },
    ]
  },
  {
    id: 'infrastruktur',
    category: 'Wirtschaft',
    headline: 'Infrastruktur marode: Brücken gesperrt, Züge verspätet',
    description: 'Jahrzehnte vernachlässigter Investitionen zeigen Folgen. Tausende Brücken sind sanierungsbedürftig, die Deutsche Bahn ist chronisch unpünktlich.',
    topic: 'wirtschaft',
    options: [
      { label: 'Investitionsoffensive', desc: '100-Milliarden-Programm für Infrastruktur, finanziert durch neue Schulden', stance: 'progressive',
        effects: { arbeiter: 5, akademiker: 2, rentner: 1, jugend: 3, selbststaendige: 1, land: 4, media: 2, credibility: { economic: -0.3 } } },
      { label: 'ÖPP-Modelle', desc: 'Öffentlich-Private Partnerschaften für schnellere Umsetzung', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 2, rentner: 1, jugend: 1, selbststaendige: 3, land: 2, media: 1, credibility: { economic: 0.1 } } },
      { label: 'Priorisierung', desc: 'Nur die wichtigsten Projekte umsetzen, strenge Kostenkontrolle', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: 0, rentner: 2, jugend: -1, selbststaendige: 2, land: -1, media: 0, credibility: { economic: 0.4 } } },
    ]
  },
  {
    id: 'arbeitsmarkt',
    category: 'Wirtschaft',
    headline: 'Fachkräftemangel: 2 Millionen Stellen unbesetzt',
    description: 'Der akute Fachkräftemangel bedroht den Wirtschaftsstandort. Handwerk, IT und Pflege suchen verzweifelt nach Personal.',
    topic: 'wirtschaft',
    options: [
      { label: 'Einwanderungsgesetz', desc: 'Modernes Einwanderungsgesetz für qualifizierte Fachkräfte aus aller Welt', stance: 'progressive',
        effects: { arbeiter: -2, akademiker: 4, rentner: -1, jugend: 2, selbststaendige: 4, land: -2, media: 2, credibility: { social: -0.2 } } },
      { label: 'Ausbildungsoffensive', desc: 'Duale Ausbildung stärken und Umschulungsprogramme ausbauen', stance: 'moderate',
        effects: { arbeiter: 4, akademiker: 2, rentner: 1, jugend: 4, selbststaendige: 2, land: 3, media: 2, credibility: { economic: 0 } } },
      { label: 'Anreize für Ältere', desc: 'Arbeit im Alter attraktiver machen und Hinzuverdienstgrenzen abschaffen', stance: 'conservative',
        effects: { arbeiter: 1, akademiker: 1, rentner: 4, jugend: -1, selbststaendige: 2, land: 1, media: 1, credibility: { economic: 0.2 } } },
    ]
  },
  {
    id: 'pandemie',
    category: 'Gesundheit',
    headline: 'Neue Virusvariante: Pandemie-Warnstufe erhöht',
    description: 'Eine neue, hochansteckende Virusvariante breitet sich aus. Intensivstationen füllen sich wieder. Die Bevölkerung ist gespalten.',
    topic: 'gesundheit',
    options: [
      { label: 'Strenge Maßnahmen', desc: 'Lockdown, Maskenpflicht und Impfkampagne sofort', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 2, rentner: 3, jugend: -4, selbststaendige: -5, land: -2, media: 1, credibility: { social: -0.2 } } },
      { label: 'Eigenverantwortung', desc: 'Empfehlungen aussprechen, aber keine Zwangsmaßnahmen', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: -1, jugend: 3, selbststaendige: 3, land: 2, media: 1, credibility: { social: 0.1 } } },
      { label: 'Keine Einschränkungen', desc: 'Wirtschaft und Freiheit haben Vorrang vor Gesundheitsschutz', stance: 'conservative',
        effects: { arbeiter: 3, akademiker: -3, rentner: -4, jugend: 2, selbststaendige: 4, land: 3, media: -2, credibility: { social: 0.3 } } },
    ]
  },
  {
    id: 'kulturdebatte',
    category: 'Gesellschaft',
    headline: 'Kulturkampf: Gendern spaltet die Gesellschaft',
    description: 'Die Debatte um gendergerechte Sprache erreicht einen neuen Höhepunkt. Universitäten führen verpflichtende Leitlinien ein.',
    topic: 'bildung',
    options: [
      { label: 'Inklusive Sprache', desc: 'Gendergerechte Sprache in öffentlichen Einrichtungen fördern', stance: 'progressive',
        effects: { arbeiter: -3, akademiker: 3, rentner: -4, jugend: 2, selbststaendige: -1, land: -4, media: 1, credibility: { social: -0.5 } } },
      { label: 'Freie Wahl', desc: 'Keine Vorschriften, aber Sensibilisierung fördern', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 1, rentner: 1, jugend: 1, selbststaendige: 1, land: 1, media: 1, credibility: { social: 0 } } },
      { label: 'Sprachschutz', desc: 'Gendern in offiziellen Dokumenten verbieten', stance: 'conservative',
        effects: { arbeiter: 3, akademiker: -3, rentner: 4, jugend: -2, selbststaendige: 1, land: 4, media: -1, credibility: { social: 0.5 } } },
    ]
  },
  {
    id: 'medienregulierung',
    category: 'Digitalisierung',
    headline: 'Fake News Krise: Desinformation bedroht Demokratie',
    description: 'Soziale Medien verbreiten massiv Falschinformationen. Mehrere Wahlkampagnen werden durch gezielte Desinformation manipuliert.',
    topic: 'digitalisierung',
    options: [
      { label: 'Plattform-Regulierung', desc: 'Strenge Auflagen für soziale Medien und Transparenzpflicht', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 4, rentner: 2, jugend: -1, selbststaendige: -2, land: 1, media: 3, credibility: { social: -0.2 } } },
      { label: 'Medienkompetenz', desc: 'Bildungsprogramme zur Medienkompetenz und Fact-Checking fördern', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: 1, jugend: 3, selbststaendige: 1, land: 1, media: 2, credibility: { social: 0 } } },
      { label: 'Meinungsfreiheit', desc: 'Keine Zensur, auch nicht bei Falschinformationen', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -2, rentner: 1, jugend: 1, selbststaendige: 2, land: 3, media: -2, credibility: { social: 0.3 } } },
    ]
  },
  {
    id: 'agrarpolitik',
    category: 'Landwirtschaft',
    headline: 'Bauernproteste: Landwirte blockieren Autobahnen',
    description: 'Tausende Traktoren blockieren Innenstädte und Autobahnen. Landwirte protestieren gegen steigende Auflagen und sinkende Einkommen.',
    topic: 'klima',
    options: [
      { label: 'Ökologischer Umbau', desc: 'Subventionen an ökologische Standards koppeln', stance: 'progressive',
        effects: { arbeiter: 0, akademiker: 3, rentner: -1, jugend: 3, selbststaendige: -2, land: -5, media: 1, credibility: { social: -0.3 } } },
      { label: 'Kompromiss', desc: 'Übergangshilfen für Landwirte und schrittweise Anpassung', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: 1, jugend: 1, selbststaendige: 1, land: 3, media: 2, credibility: { social: 0 } } },
      { label: 'Bauernstärkung', desc: 'Auflagen zurücknehmen und Subventionen erhöhen', stance: 'conservative',
        effects: { arbeiter: 1, akademiker: -2, rentner: 2, jugend: -2, selbststaendige: 1, land: 6, media: -1, credibility: { economic: 0.2 } } },
    ]
  },
  {
    id: 'demografie',
    category: 'Gesellschaft',
    headline: 'Demografischer Wandel: Deutschland altert rapide',
    description: 'Die Geburtenrate sinkt auf ein historisches Tief. Experten warnen vor gravierenden Folgen für Sozialsysteme und Wirtschaft.',
    topic: 'soziales',
    options: [
      { label: 'Familienpolitik', desc: 'Massive Investitionen in Kinderbetreuung und Familienförderung', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 3, rentner: 0, jugend: 4, selbststaendige: -1, land: 2, media: 2, credibility: { social: -0.2 } } },
      { label: 'Zuwanderung & Familie', desc: 'Kombination aus Einwanderung und Familienförderung', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 3, rentner: -1, jugend: 2, selbststaendige: 2, land: 0, media: 2, credibility: { social: 0 } } },
      { label: 'Eigenverantwortung', desc: 'Steuerliche Anreize statt staatlicher Programme', stance: 'conservative',
        effects: { arbeiter: -1, akademiker: 0, rentner: 1, jugend: -1, selbststaendige: 3, land: 1, media: 0, credibility: { economic: 0.3 } } },
    ]
  },
  {
    id: 'techregulierung',
    category: 'Digitalisierung',
    headline: 'KI-Revolution: Millionen Jobs in Gefahr',
    description: 'Künstliche Intelligenz automatisiert immer mehr Berufe. Experten warnen vor massivem Arbeitsplatzabbau in den nächsten Jahren.',
    topic: 'digitalisierung',
    options: [
      { label: 'KI-Steuer & BGE', desc: 'Robotersteuer einführen und bedingungsloses Grundeinkommen testen', stance: 'progressive',
        effects: { arbeiter: 4, akademiker: 2, rentner: 2, jugend: 5, selbststaendige: -5, land: 1, media: 2, credibility: { economic: -0.5 } } },
      { label: 'Weiterbildungspflicht', desc: 'Recht auf Weiterbildung und staatlich geförderte Umschulung', stance: 'moderate',
        effects: { arbeiter: 3, akademiker: 3, rentner: 1, jugend: 3, selbststaendige: 1, land: 2, media: 2, credibility: { economic: 0 } } },
      { label: 'Innovation fördern', desc: 'KI als Chance begreifen, Deutschland zum KI-Standort machen', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: 2, rentner: -1, jugend: 1, selbststaendige: 5, land: -1, media: 1, credibility: { economic: 0.4 } } },
    ]
  },
  {
    id: 'sozialleistungen',
    category: 'Soziales',
    headline: 'Bürgergeld-Debatte: Sozialstaat am Scheideweg',
    description: 'Die Kosten für Sozialleistungen explodieren. Während einige mehr Unterstützung fordern, beklagen andere mangelnde Arbeitsanreize.',
    topic: 'soziales',
    options: [
      { label: 'Bürgergeld erhöhen', desc: 'Höheres Bürgergeld und bessere Eingliederungshilfen', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 1, rentner: 1, jugend: 3, selbststaendige: -4, land: 0, media: 0, credibility: { economic: -0.4 } } },
      { label: 'Fördern & Fordern', desc: 'Moderate Leistungen mit klaren Mitwirkungspflichten', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 2, rentner: 2, jugend: 0, selbststaendige: 1, land: 2, media: 2, credibility: { economic: 0 } } },
      { label: 'Sanktionen verschärfen', desc: 'Leistungskürzungen bei Verweigerung von Arbeitsangeboten', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: -1, rentner: 3, jugend: -2, selbststaendige: 3, land: 2, media: -1, credibility: { economic: 0.4 } } },
    ]
  },
  {
    id: 'innere_sicherheit',
    category: 'Sicherheit',
    headline: 'Clankriminalität: Großrazzia in Berlin und Essen',
    description: 'Die Polizei schlägt gegen organisierte Kriminalität zu. Die Debatte über innere Sicherheit und Integration entflammt neu.',
    topic: 'sicherheit',
    options: [
      { label: 'Sozialpolitik', desc: 'Ursachen bekämpfen: Bildung, Integration und Perspektiven in Brennpunkten', stance: 'progressive',
        effects: { arbeiter: 0, akademiker: 3, rentner: -2, jugend: 2, selbststaendige: -1, land: -2, media: 0, credibility: { social: -0.3 } } },
      { label: 'Konsequente Strafverfolgung', desc: 'Mehr Polizei, bessere Ausrüstung und schnellere Verfahren', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 1, rentner: 3, jugend: 0, selbststaendige: 2, land: 2, media: 2, credibility: { social: 0.1 } } },
      { label: 'Harte Hand', desc: 'Abschiebungen, Vermögenseinzug und verstärkte Überwachung', stance: 'conservative',
        effects: { arbeiter: 2, akademiker: -3, rentner: 4, jugend: -2, selbststaendige: 1, land: 4, media: 0, credibility: { social: 0.5 } } },
    ]
  },
  {
    id: 'cannabis',
    category: 'Gesellschaft',
    headline: 'Cannabis-Legalisierung: Erste Erfahrungen nach einem Jahr',
    description: 'Ein Jahr nach der Cannabis-Legalisierung zeigen sich gemischte Ergebnisse. Steuereinnahmen steigen, aber Jugendschutz-Bedenken wachsen.',
    topic: 'gesundheit',
    options: [
      { label: 'Ausbau', desc: 'Legalisierung ausweiten und Cannabis-Cafés erlauben', stance: 'progressive',
        effects: { arbeiter: 1, akademiker: 2, rentner: -4, jugend: 5, selbststaendige: 2, land: -3, media: 0, credibility: { social: -0.4 } } },
      { label: 'Evaluieren', desc: 'Bisherige Regelung beibehalten und wissenschaftlich auswerten', stance: 'moderate',
        effects: { arbeiter: 1, akademiker: 2, rentner: 0, jugend: 1, selbststaendige: 1, land: 0, media: 1, credibility: { social: 0 } } },
      { label: 'Rücknahme', desc: 'Legalisierung rückgängig machen und strengere Kontrollen einführen', stance: 'conservative',
        effects: { arbeiter: 0, akademiker: -2, rentner: 4, jugend: -4, selbststaendige: -1, land: 3, media: -1, credibility: { social: 0.4 } } },
    ]
  },
  {
    id: 'autobranche',
    category: 'Wirtschaft',
    headline: 'Automobilkrise: VW schließt Werke in Deutschland',
    description: 'Die Transformation zur Elektromobilität fordert ihren Tribut. Zehntausende Arbeitsplätze in der Autoindustrie sind bedroht.',
    topic: 'wirtschaft',
    options: [
      { label: 'Grüne Industriepolitik', desc: 'Staatliche Unterstützung für E-Mobilität und neue Arbeitsplätze', stance: 'progressive',
        effects: { arbeiter: 3, akademiker: 3, rentner: 0, jugend: 3, selbststaendige: -1, land: 1, media: 2, credibility: { economic: -0.2 } } },
      { label: 'Technologieneutral', desc: 'Alle Antriebstechnologien fördern, auch Wasserstoff und E-Fuels', stance: 'moderate',
        effects: { arbeiter: 2, akademiker: 2, rentner: 1, jugend: 1, selbststaendige: 3, land: 2, media: 1, credibility: { economic: 0.1 } } },
      { label: 'Verbrenner retten', desc: 'EU-Verbrennerverbot aufheben und deutsche Autoindustrie schützen', stance: 'conservative',
        effects: { arbeiter: 4, akademiker: -2, rentner: 3, jugend: -3, selbststaendige: 2, land: 4, media: -1, credibility: { economic: 0.3 } } },
    ]
  },
];

// ===== GOVERNANCE EVENTS (post-election) =====
const GOVERNANCE_EVENTS = [
  {
    id: 'gov_haushalt',
    category: 'Regierung',
    headline: 'Haushaltskrise: Koalition vor Zerreißprobe',
    description: 'Die Koalitionspartner streiten über den Bundeshaushalt. Ein Kompromiss scheint unmöglich.',
    topic: 'wirtschaft',
    options: [
      { label: 'Koalitionspartner entgegenkommen', desc: 'Eigene Positionen zurückstellen für den Koalitionsfrieden', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 1, rentner: 0, jugend: 0, selbststaendige: 0, land: 0, media: 2, credibility: { economic: 0 } } },
      { label: 'Hart verhandeln', desc: 'Eigene Position durchsetzen, auch auf Kosten der Koalition', stance: 'conservative',
        effects: { arbeiter: 1, akademiker: 0, rentner: 1, jugend: 1, selbststaendige: 1, land: 1, media: -1, credibility: { economic: 0.2 } } },
      { label: 'Neuwahlen androhen', desc: 'Mit dem Bruch der Koalition drohen, um Zugeständnisse zu erzwingen', stance: 'progressive',
        effects: { arbeiter: -1, akademiker: -1, rentner: -2, jugend: 0, selbststaendige: -1, land: -1, media: -2, credibility: { economic: -0.1 } } },
    ]
  },
  {
    id: 'gov_skandal',
    category: 'Regierung',
    headline: 'Korruptionsskandal erschüttert Regierungspartei',
    description: 'Ein hochrangiges Parteimitglied wird der Bestechlichkeit beschuldigt. Die Medien fordern Konsequenzen.',
    topic: 'sicherheit',
    options: [
      { label: 'Sofortiger Rücktritt', desc: 'Betroffenen sofort zum Rücktritt auffordern und Transparenz zeigen', stance: 'progressive',
        effects: { arbeiter: 2, akademiker: 3, rentner: 2, jugend: 2, selbststaendige: 1, land: 2, media: 4, credibility: { social: 0 } } },
      { label: 'Untersuchung abwarten', desc: 'Rechtsstaatliche Unschuldsvermutung betonen', stance: 'moderate',
        effects: { arbeiter: 0, akademiker: 1, rentner: 0, jugend: -1, selbststaendige: 1, land: 0, media: -1, credibility: { social: 0 } } },
      { label: 'Verteidigen', desc: 'Parteimitglied öffentlich verteidigen und Medien kritisieren', stance: 'conservative',
        effects: { arbeiter: -2, akademiker: -3, rentner: -1, jugend: -3, selbststaendige: -1, land: -1, media: -4, credibility: { social: -0.2 } } },
    ]
  },
];

// ===== GAME STATE =====
let state = null;

function createInitialState() {
  return {
    phase: 'title',        // title, creation, game_loop, campaign, debate, election, coalition, governance, gameover
    round: 0,
    maxRoundsBeforeElection: 12,
    campaignRounds: 3,
    electionCycle: 0,

    player: {
      name: '',
      color: '#3b82f6',
      alignment: { economic: 0, social: 0 },
      topics: [],
      approval: 6,
      seats: 0,
      media: 50,
      credibility: 80,
      voterApproval: {
        arbeiter: 5, akademiker: 5, rentner: 5, jugend: 5, selbststaendige: 5, land: 5,
      },
      campaignBudget: { tv: 25, social: 25, rally: 25, door: 25 },
      inGovernment: false,
      coalitionPartner: null,
      totalVotePercent: 0,
    },

    parties: AI_PARTIES.map(p => ({
      ...p,
      approval: p.baseApproval + (Math.random() * 4 - 2),
      seats: 0,
    })),

    usedEvents: [],
    currentEvent: null,
    lastEffects: null,
    newsHistory: [],
    electionResults: null,
    coalitionOptions: [],
    debateResult: null,
    governanceRound: 0,
    governanceMaxRounds: 8,
  };
}

// ===== UTILITY FUNCTIONS =====
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== GAME LOGIC =====

function startNewGame() {
  state = createInitialState();
  state.phase = 'creation';
  renderScreen();
}

function finalizePartyCreation(name, economic, social, topics) {
  state.player.name = name;
  state.player.alignment = { economic, social };
  state.player.topics = topics;

  // Starting approval based on alignment uniqueness
  const baseApproval = rand(5, 8);
  state.player.approval = baseApproval;

  // Adjust voter approval based on alignment
  const va = state.player.voterApproval;
  va.arbeiter = clamp(baseApproval + (economic < -0.1 ? 3 : economic > 0.1 ? -1 : 1), 2, 15);
  va.akademiker = clamp(baseApproval + (social < -0.1 ? 2 : social > 0.1 ? -1 : 1), 2, 15);
  va.rentner = clamp(baseApproval + (social > 0.1 ? 2 : social < -0.1 ? -1 : 1), 2, 15);
  va.jugend = clamp(baseApproval + (social < -0.1 ? 3 : social > 0.1 ? -1 : 1), 2, 15);
  va.selbststaendige = clamp(baseApproval + (economic > 0.1 ? 3 : economic < -0.1 ? -1 : 1), 2, 15);
  va.land = clamp(baseApproval + (social > 0.1 ? 2 : social < -0.1 ? -1 : 1), 2, 15);

  state.phase = 'game_loop';
  state.round = 1;
  nextEvent();
  renderScreen();
}

function nextEvent() {
  const pool = state.player.inGovernment ? [...EVENTS_POOL, ...GOVERNANCE_EVENTS] : EVENTS_POOL;
  const available = pool.filter(e => !state.usedEvents.includes(e.id));
  if (available.length === 0) {
    state.usedEvents = [];
    return nextEvent();
  }

  // Prefer events matching player topics
  const preferred = available.filter(e => state.player.topics.includes(e.topic));
  const source = preferred.length > 0 && Math.random() < 0.6 ? preferred : available;
  const event = source[Math.floor(Math.random() * source.length)];

  state.currentEvent = event;
  state.usedEvents.push(event.id);
}

function applyDecision(optionIndex) {
  const option = state.currentEvent.options[optionIndex];
  const eff = option.effects;
  const va = state.player.voterApproval;

  // Topic bonus: if the event topic matches player's core topics
  const topicBonus = state.player.topics.includes(state.currentEvent.topic) ? 1.3 : 1.0;

  // Apply voter group effects
  VOTER_GROUPS.forEach(g => {
    const baseEffect = eff[g.id] || 0;
    const effect = baseEffect * topicBonus;
    va[g.id] = clamp(va[g.id] + effect, 0, 40);
  });

  // Media
  state.player.media = clamp(state.player.media + (eff.media || 0) * 3, 0, 100);

  // Credibility (alignment consistency)
  if (eff.credibility) {
    const cred = eff.credibility;
    let credChange = 0;
    if (cred.economic !== undefined) {
      const alignment = state.player.alignment.economic;
      const sameDirection = (alignment >= 0 && cred.economic >= 0) || (alignment < 0 && cred.economic < 0);
      credChange += sameDirection ? 3 : -4;
    }
    if (cred.social !== undefined) {
      const alignment = state.player.alignment.social;
      const sameDirection = (alignment >= 0 && cred.social >= 0) || (alignment < 0 && cred.social < 0);
      credChange += sameDirection ? 3 : -4;
    }
    state.player.credibility = clamp(state.player.credibility + credChange, 0, 100);
  }

  // Calculate overall approval
  recalculateApproval();

  // Fluctuate AI party approvals
  fluctuateAIParties();

  // Store news
  state.newsHistory.push({
    headline: state.currentEvent.headline,
    choice: option.label,
    round: state.round,
  });

  // Store effects for display
  state.lastEffects = { option, effects: eff, topicBonus };

  // Advance round
  state.round++;

  // Check phase transitions
  const totalRounds = state.maxRoundsBeforeElection + state.campaignRounds;
  if (state.round > state.maxRoundsBeforeElection && state.round <= totalRounds) {
    state.phase = 'campaign';
  } else if (state.round > totalRounds) {
    state.phase = 'election';
    runElection();
  } else {
    nextEvent();
  }

  renderScreen();
}

function recalculateApproval() {
  const va = state.player.voterApproval;
  const weights = { arbeiter: 0.22, akademiker: 0.18, rentner: 0.2, jugend: 0.15, selbststaendige: 0.12, land: 0.13 };
  let total = 0;
  VOTER_GROUPS.forEach(g => { total += va[g.id] * weights[g.id]; });

  // Media and credibility modifiers
  const mediaModifier = (state.player.media - 50) * 0.05;
  const credModifier = (state.player.credibility - 50) * 0.03;

  state.player.approval = clamp(total + mediaModifier + credModifier, 0, 50);
}

function fluctuateAIParties() {
  state.parties.forEach(p => {
    const fluct = rand(-1.5, 1.5);
    p.approval = clamp(p.approval + fluct, 3, 35);
  });

  // Normalize: total should be roughly (100 - player approval)
  const playerApp = state.player.approval;
  const totalAI = state.parties.reduce((s, p) => s + p.approval, 0);
  const target = 100 - playerApp;
  if (totalAI > 0) {
    const scale = target / totalAI;
    state.parties.forEach(p => {
      p.approval = clamp(p.approval * scale, 2, 38);
    });
  }
}

// ===== CAMPAIGN =====
function applyCampaignBudget(budget) {
  state.player.campaignBudget = budget;

  // Apply campaign effects
  const va = state.player.voterApproval;
  const b = budget;

  // TV: boosts rentner, arbeiter
  va.rentner += b.tv * 0.08;
  va.arbeiter += b.tv * 0.05;

  // Social media: boosts jugend, akademiker
  va.jugend += b.social * 0.1;
  va.akademiker += b.social * 0.06;

  // Rallies: boosts arbeiter, land
  va.arbeiter += b.rally * 0.08;
  va.land += b.rally * 0.08;

  // Door-to-door: boosts all slightly
  VOTER_GROUPS.forEach(g => { va[g.id] += b.door * 0.04; });

  // Media boost from campaign
  state.player.media = clamp(state.player.media + (b.tv + b.social) * 0.1, 0, 100);

  // Clamp voter approvals
  VOTER_GROUPS.forEach(g => { va[g.id] = clamp(va[g.id], 0, 45); });

  recalculateApproval();

  // Move to next campaign round or debate
  const campaignRound = state.round - state.maxRoundsBeforeElection;
  if (campaignRound >= state.campaignRounds - 1) {
    state.phase = 'debate';
  } else {
    state.round++;
    nextEvent();
    state.phase = 'campaign';
  }
  renderScreen();
}

function applyDebateStrategy(strategy) {
  const va = state.player.voterApproval;
  let debateBonus = 0;

  switch (strategy) {
    case 'aggressive':
      debateBonus = rand(-2, 5);
      va.arbeiter += 2; va.jugend += 3; va.rentner -= 1; va.akademiker -= 1;
      state.player.media += 5;
      break;
    case 'factual':
      debateBonus = rand(1, 4);
      va.akademiker += 3; va.selbststaendige += 2; va.rentner += 1; va.jugend -= 1;
      state.player.credibility += 5;
      break;
    case 'emotional':
      debateBonus = rand(0, 4);
      va.arbeiter += 2; va.rentner += 3; va.land += 2; va.akademiker -= 1;
      state.player.media += 3;
      break;
  }

  VOTER_GROUPS.forEach(g => { va[g.id] = clamp(va[g.id], 0, 45); });
  state.player.media = clamp(state.player.media, 0, 100);
  state.player.credibility = clamp(state.player.credibility, 0, 100);

  state.debateResult = { strategy, bonus: debateBonus };
  recalculateApproval();

  // Move to election
  state.round++;
  state.phase = 'election';
  runElection();
  renderScreen();
}

// ===== ELECTION =====
function runElection() {
  const totalSeats = 598;

  // Final approval adjustments
  let playerPercent = state.player.approval;

  // Small random factor
  playerPercent += rand(-2, 2);
  playerPercent = clamp(playerPercent, 0, 50);
  state.player.totalVotePercent = playerPercent;

  // Check 5% threshold
  const passedThreshold = playerPercent >= 5;

  // Calculate AI party results
  let partyResults = state.parties.map(p => ({
    ...p,
    votePercent: clamp(p.approval + rand(-1.5, 1.5), 0, 40),
    passedThreshold: true,
  }));

  // Check threshold for small parties
  partyResults.forEach(p => {
    if (p.votePercent < 5) {
      p.passedThreshold = false;
    }
  });

  // Normalize among those who passed threshold
  const validParties = partyResults.filter(p => p.passedThreshold);
  let validTotal = validParties.reduce((s, p) => s + p.votePercent, 0) + (passedThreshold ? playerPercent : 0);

  // Allocate seats (Sainte-Laguë method simplified)
  if (passedThreshold) {
    state.player.seats = Math.round((playerPercent / validTotal) * totalSeats);
  } else {
    state.player.seats = 0;
  }

  partyResults.forEach(p => {
    if (p.passedThreshold) {
      p.seats = Math.round((p.votePercent / validTotal) * totalSeats);
    } else {
      p.seats = 0;
    }
  });

  // Adjust to exactly totalSeats
  let seatSum = state.player.seats + partyResults.reduce((s, p) => s + p.seats, 0);
  if (seatSum !== totalSeats && passedThreshold) {
    state.player.seats += totalSeats - seatSum;
  } else if (seatSum !== totalSeats) {
    const biggest = partyResults.reduce((a, b) => a.seats > b.seats ? a : b);
    biggest.seats += totalSeats - seatSum;
  }

  state.parties = partyResults;

  state.electionResults = {
    playerPercent,
    passedThreshold,
    playerSeats: state.player.seats,
    totalSeats,
    parties: partyResults,
  };

  // Determine coalition options if player passed threshold
  if (passedThreshold && state.player.seats > 0) {
    state.coalitionOptions = findCoalitionOptions();
  }

  AudioEngine.election();
}

function findCoalitionOptions() {
  const majority = 300;
  const options = [];
  const eligible = state.parties.filter(p => p.passedThreshold && p.seats > 0);

  // Try single partner
  eligible.forEach(p => {
    if (state.player.seats + p.seats >= majority) {
      options.push({
        partners: [p],
        totalSeats: state.player.seats + p.seats,
        type: 'Zweierkoalition',
      });
    }
  });

  // Try two partners
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const total = state.player.seats + eligible[i].seats + eligible[j].seats;
      if (total >= majority) {
        options.push({
          partners: [eligible[i], eligible[j]],
          totalSeats: total,
          type: 'Dreierkoalition',
        });
      }
    }
  }

  // Sort by fewest partners, then most seats
  options.sort((a, b) => a.partners.length - b.partners.length || b.totalSeats - a.totalSeats);

  return options.slice(0, 4);
}

function selectCoalition(index) {
  const coalition = state.coalitionOptions[index];
  state.player.inGovernment = true;
  state.player.coalitionPartner = coalition;
  state.phase = 'governance';
  state.governanceRound = 0;
  state.electionCycle++;
  AudioEngine.success();
  renderScreen();
}

function goToOpposition() {
  state.player.inGovernment = false;
  state.player.coalitionPartner = null;
  state.phase = 'governance';
  state.governanceRound = 0;
  state.electionCycle++;
  renderScreen();
}

// ===== GOVERNANCE =====
function advanceGovernance() {
  state.governanceRound++;

  // Random events during governance
  if (state.governanceRound >= state.governanceMaxRounds) {
    // New election cycle
    state.round = 1;
    state.usedEvents = [];
    state.electionResults = null;
    state.coalitionOptions = [];
    state.debateResult = null;
    state.player.seats = 0;
    state.phase = 'game_loop';

    // Approval adjustments for being in government
    if (state.player.inGovernment) {
      // Governing parties tend to lose some support
      state.player.approval = clamp(state.player.approval - rand(2, 5), 3, 40);
      VOTER_GROUPS.forEach(g => {
        state.player.voterApproval[g.id] = clamp(state.player.voterApproval[g.id] - rand(1, 3), 1, 35);
      });
    } else {
      // Opposition can gain
      state.player.approval = clamp(state.player.approval + rand(0, 3), 3, 40);
    }

    state.player.inGovernment = false;
    state.player.coalitionPartner = null;

    // Reset AI parties somewhat toward base
    state.parties.forEach(p => {
      const base = AI_PARTIES.find(a => a.id === p.id);
      if (base) {
        p.approval = clamp(base.baseApproval + rand(-3, 3), 3, 35);
      }
    });

    nextEvent();
  } else {
    nextEvent();
    state.phase = state.player.inGovernment ? 'governance' : 'governance';
  }

  renderScreen();
}

function applyGovernanceDecision(optionIndex) {
  applyDecision(optionIndex);
  state.phase = 'governance';
  state.governanceRound++;

  if (state.governanceRound >= state.governanceMaxRounds) {
    advanceGovernance();
  } else {
    nextEvent();
    renderScreen();
  }
}

// ===== HEMICYCLE SVG GENERATION =====
function generateHemicycleSVG(results) {
  const totalSeats = results.totalSeats;
  const allParties = [];

  if (results.passedThreshold && results.playerSeats > 0) {
    allParties.push({ name: state.player.name, color: state.player.color, seats: results.playerSeats });
  }

  results.parties.filter(p => p.passedThreshold && p.seats > 0)
    .sort((a, b) => {
      const aAlign = a.alignment.economic + a.alignment.social;
      const bAlign = b.alignment.economic + b.alignment.social;
      return aAlign - bAlign;
    })
    .forEach(p => {
      allParties.push({ name: p.short, color: p.color, seats: p.seats });
    });

  // Sort left to right politically
  // Generate hemicycle dots
  const rows = 8;
  const centerX = 250;
  const centerY = 220;
  const minRadius = 70;
  const maxRadius = 200;
  const dots = [];

  // Calculate seats per row
  const totalDots = allParties.reduce((s, p) => s + p.seats, 0);
  let seatsPerRow = [];
  for (let r = 0; r < rows; r++) {
    const radius = minRadius + (maxRadius - minRadius) * (r / (rows - 1));
    const circumference = Math.PI * radius;
    const maxDots = Math.floor(circumference / 8);
    seatsPerRow.push(maxDots);
  }

  const totalCapacity = seatsPerRow.reduce((s, n) => s + n, 0);
  const scale = totalDots / totalCapacity;
  seatsPerRow = seatsPerRow.map(n => Math.max(1, Math.round(n * scale)));

  // Adjust total
  let allocated = seatsPerRow.reduce((s, n) => s + n, 0);
  while (allocated < totalDots) { seatsPerRow[seatsPerRow.length - 1]++; allocated++; }
  while (allocated > totalDots) { seatsPerRow[seatsPerRow.length - 1]--; allocated--; }

  // Assign party colors to dot positions
  let dotColors = [];
  allParties.forEach(p => {
    for (let i = 0; i < p.seats; i++) dotColors.push(p.color);
  });

  let dotIndex = 0;
  for (let r = 0; r < rows; r++) {
    const radius = minRadius + (maxRadius - minRadius) * (r / (rows - 1));
    const numDots = seatsPerRow[r];
    if (!numDots) continue;

    for (let d = 0; d < numDots && dotIndex < dotColors.length; d++) {
      const angle = Math.PI * (d + 0.5) / numDots;
      const x = centerX - radius * Math.cos(angle);
      const y = centerY - radius * Math.sin(angle);
      dots.push({ x, y, color: dotColors[dotIndex], r: 3.2 });
      dotIndex++;
    }
  }

  let svg = `<svg viewBox="0 0 500 250" class="hemicycle-svg" xmlns="http://www.w3.org/2000/svg">`;
  dots.forEach(d => {
    svg += `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r}" fill="${d.color}" opacity="0.9"/>`;
  });
  svg += `<text x="250" y="230" text-anchor="middle" fill="#94a3b8" font-family="var(--font-body)" font-size="14" font-weight="600">${totalSeats} Sitze</text>`;
  svg += `</svg>`;

  return { svg, parties: allParties };
}

// ===== RENDERING =====

function renderScreen() {
  const container = document.getElementById('game-content');
  const headerStatus = document.getElementById('header-status');

  // Update header
  if (state.phase !== 'title') {
    headerStatus.innerHTML = renderHeaderStatus();
  } else {
    headerStatus.innerHTML = '';
  }

  // Update news ticker
  updateNewsTicker();

  // Render current screen
  switch (state.phase) {
    case 'title': container.innerHTML = renderTitleScreen(); break;
    case 'creation': container.innerHTML = renderCreationScreen(); break;
    case 'game_loop': container.innerHTML = renderGameLoop(); break;
    case 'campaign': container.innerHTML = renderCampaignScreen(); break;
    case 'debate': container.innerHTML = renderDebateScreen(); break;
    case 'election': container.innerHTML = renderElectionScreen(); break;
    case 'coalition': container.innerHTML = renderCoalitionScreen(); break;
    case 'governance': container.innerHTML = renderGovernanceScreen(); break;
    case 'gameover': container.innerHTML = renderGameOverScreen(); break;
  }

  // Re-attach event listeners
  attachListeners();
}

function renderHeaderStatus() {
  if (!state || state.phase === 'title') return '';
  const totalRounds = state.maxRoundsBeforeElection + state.campaignRounds;
  const isCampaign = state.round > state.maxRoundsBeforeElection;
  const isGovernance = state.phase === 'governance';

  let phaseLabel = 'Vorbereitung';
  if (isCampaign) phaseLabel = 'Wahlkampf';
  if (isGovernance) phaseLabel = 'Legislaturperiode ' + (state.electionCycle);
  if (state.phase === 'election') phaseLabel = 'Bundestagswahl';

  return `
    <span class="game-header__badge">${state.player.name || 'Neue Partei'}</span>
    <span class="game-header__badge">${phaseLabel}</span>
    ${!isGovernance && state.phase !== 'election' ? `<span class="game-header__badge">Monat ${state.round}/${totalRounds}</span>` : ''}
    <span class="game-header__badge" style="color: var(--color-primary)">📊 ${state.player.approval.toFixed(1)}%</span>
  `;
}

function updateNewsTicker() {
  const ticker = document.getElementById('news-ticker-content');
  if (!ticker) return;

  if (state.newsHistory.length === 0) {
    ticker.textContent = 'Willkommen bei Machtspiel — Gründen Sie Ihre Partei und erobern Sie den Bundestag!';
  } else {
    const recent = state.newsHistory.slice(-5).reverse();
    ticker.textContent = recent.map(n => `${n.headline} — ${n.choice}`).join('  +++  ');
  }
}

function renderTitleScreen() {
  return `
    <div class="screen screen--active" style="min-height: calc(100dvh - 150px); display: flex; align-items: center; justify-content: center;">
      <div style="text-align: center; max-width: 600px;">
        <div style="margin-bottom: var(--space-8);">
          <svg viewBox="0 0 80 80" width="80" height="80" style="margin: 0 auto var(--space-4);" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="20" width="70" height="50" rx="4" stroke="#3b82f6" stroke-width="2.5" fill="none"/>
            <path d="M40 10L50 20H30L40 10Z" fill="#3b82f6"/>
            <rect x="15" y="30" width="50" height="3" rx="1.5" fill="#1e293b"/>
            <rect x="15" y="38" width="35" height="3" rx="1.5" fill="#1e293b"/>
            <circle cx="55" cy="52" r="10" fill="none" stroke="#3b82f6" stroke-width="2"/>
            <path d="M51 52L54 55L59 49" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h1 style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); margin-bottom: var(--space-2);">
            MACHT<span style="color: var(--color-primary);">SPIEL</span>
          </h1>
          <div class="flag-strip" style="max-width: 200px; margin: var(--space-3) auto;"></div>
          <p style="color: var(--color-text-muted); font-size: var(--text-base); margin-top: var(--space-4);">
            Gründe deine Partei. Gewinne die Wahl. Regiere Deutschland.
          </p>
        </div>
        <button class="btn btn--primary btn--lg" id="btn-start" style="margin-bottom: var(--space-4);">
          Spiel starten
        </button>
        <div style="margin-top: var(--space-6);">
          <p style="color: var(--color-text-faint); font-size: var(--text-xs); line-height: 1.8;">
            Navigiere durch politische Krisen • Gewinne Wählergruppen • Führe Wahlkampf<br>
            Bilde Koalitionen • Regiere und verteidige deine Macht
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderCreationScreen() {
  return `
    <div class="screen screen--active">
      <div style="max-width: 700px; margin: 0 auto;">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-6); text-align: center;">
          Parteigründung
        </h2>

        <!-- Party Name -->
        <div class="panel" style="margin-bottom: var(--space-6);">
          <div class="panel__header">
            <span class="panel__title">📝 Parteiname</span>
          </div>
          <div class="input-group">
            <input type="text" class="input-field" id="party-name" placeholder="z.B. Neue Mitte, Bürgerbewegung..." maxlength="30">
          </div>
        </div>

        <!-- Political Alignment -->
        <div class="panel" style="margin-bottom: var(--space-6);">
          <div class="panel__header">
            <span class="panel__title">🧭 Politische Ausrichtung</span>
          </div>
          <p class="panel__subtitle" style="margin-bottom: var(--space-4);">Positioniere deine Partei auf dem politischen Spektrum</p>
          <div class="spectrum-container">
            <div class="spectrum-axis">
              <div class="spectrum-axis__label"><span>← Links (Wirtschaft)</span><span>Rechts (Wirtschaft) →</span></div>
              <input type="range" id="economic-axis" min="-100" max="100" value="0">
            </div>
            <div class="spectrum-axis" style="margin-top: var(--space-4);">
              <div class="spectrum-axis__label"><span>← Progressiv (Gesellschaft)</span><span>Konservativ (Gesellschaft) →</span></div>
              <input type="range" id="social-axis" min="-100" max="100" value="0">
            </div>
          </div>
        </div>

        <!-- Core Topics -->
        <div class="panel" style="margin-bottom: var(--space-6);">
          <div class="panel__header">
            <span class="panel__title">🎯 Kernthemen (3 auswählen)</span>
            <span id="topic-count" class="panel__subtitle">0/3 ausgewählt</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);" id="topics-container">
            ${TOPICS.map(t => `
              <button class="topic-tag" data-topic="${t.id}">
                ${t.icon} ${t.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Create Button -->
        <div style="text-align: center;">
          <button class="btn btn--primary btn--lg" id="btn-create" disabled>
            Partei gründen
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderGameLoop() {
  if (!state.currentEvent) return '<p>Laden...</p>';

  const ev = state.currentEvent;
  const totalRounds = state.maxRoundsBeforeElection + state.campaignRounds;
  const roundsLeft = totalRounds - state.round + 1;
  const isCampaignSoon = roundsLeft <= state.campaignRounds + 2;

  return `
    <div class="screen screen--active">
      <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 340px; gap: var(--space-6); align-items: start;">

        <!-- Left: Event & Decision -->
        <div>
          <!-- Effects from last round -->
          ${state.lastEffects ? renderLastEffects() : ''}

          <!-- Current Event -->
          <div class="event-card">
            <div class="event-card__breaking">
              <span>EILMELDUNG</span>
            </div>
            <div class="event-card__body">
              <div class="event-card__category">${ev.category}</div>
              <h2 class="event-card__headline">${ev.headline}</h2>
              <p class="event-card__description">${ev.description}</p>

              <div class="decision-options">
                ${ev.options.map((opt, i) => `
                  <button class="decision-option" data-option="${i}">
                    <div class="decision-option__icon">${opt.stance === 'progressive' ? '🔵' : opt.stance === 'moderate' ? '⚖️' : '🔴'}</div>
                    <div class="decision-option__content">
                      <div class="decision-option__title">${opt.label}</div>
                      <div class="decision-option__desc">${opt.desc}</div>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Dashboard Sidebar -->
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          ${isCampaignSoon ? `<div class="panel" style="border-color: var(--color-warning); background: var(--color-warning-bg);"><span style="font-size: var(--text-xs); font-weight: 600; color: var(--color-warning);">⚠️ Noch ${roundsLeft} Monate bis zur Wahl!</span></div>` : ''}

          <!-- Polling -->
          <div class="panel">
            <div class="panel__header"><span class="panel__title">📊 Sonntagsfrage</span></div>
            ${renderPollingBars()}
          </div>

          <!-- Voter Groups -->
          <div class="panel">
            <div class="panel__header"><span class="panel__title">👥 Wählergruppen</span></div>
            ${renderVoterBars()}
          </div>

          <!-- Stats -->
          <div class="panel">
            <div class="panel__header"><span class="panel__title">📈 Partei-Status</span></div>
            <div class="stat-bar" style="margin-bottom: var(--space-3);">
              <div class="stat-bar__label"><span>Medienpräsenz</span><span class="stat-bar__value">${Math.round(state.player.media)}%</span></div>
              <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${state.player.media}%; background: var(--color-primary);"></div></div>
            </div>
            <div class="stat-bar">
              <div class="stat-bar__label"><span>Glaubwürdigkeit</span><span class="stat-bar__value">${Math.round(state.player.credibility)}%</span></div>
              <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${state.player.credibility}%; background: ${state.player.credibility > 60 ? 'var(--color-success)' : state.player.credibility > 30 ? 'var(--color-warning)' : 'var(--color-error)'}"></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLastEffects() {
  if (!state.lastEffects) return '';
  const { option, effects } = state.lastEffects;

  const effectItems = VOTER_GROUPS.map(g => {
    const val = effects[g.id] || 0;
    if (val === 0) return '';
    const cls = val > 0 ? 'effect-badge--positive' : 'effect-badge--negative';
    return `<span class="effect-badge ${cls}">${g.name} ${val > 0 ? '+' : ''}${val}</span>`;
  }).filter(Boolean).join(' ');

  return `
    <div class="panel" style="margin-bottom: var(--space-4); animation: slideIn 0.3s ease-out; border-left: 3px solid var(--color-primary);">
      <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-2);">Letzte Entscheidung: <strong style="color: var(--color-text);">${option.label}</strong></div>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">${effectItems}</div>
    </div>
  `;
}

function renderPollingBars() {
  const allParties = [
    { name: state.player.name, short: state.player.name.substring(0, 3).toUpperCase(), approval: state.player.approval, color: state.player.color },
    ...state.parties.map(p => ({ name: p.name, short: p.short, approval: p.approval, color: p.color })),
  ].sort((a, b) => b.approval - a.approval);

  return `<div style="display: flex; flex-direction: column; gap: var(--space-3);">
    ${allParties.map(p => `
      <div class="stat-bar">
        <div class="stat-bar__label">
          <span style="display: flex; align-items: center; gap: var(--space-1);">
            <span class="party-color-dot" style="background: ${p.color};"></span>
            <span style="font-size: var(--text-xs);">${p.short}</span>
          </span>
          <span class="stat-bar__value" style="font-size: var(--text-xs);">${p.approval.toFixed(1)}%</span>
        </div>
        <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${Math.min(p.approval * 2.5, 100)}%; background: ${p.color};"></div></div>
      </div>
    `).join('')}
  </div>`;
}

function renderVoterBars() {
  const va = state.player.voterApproval;
  return `<div style="display: flex; flex-direction: column; gap: var(--space-3);">
    ${VOTER_GROUPS.map(g => {
      const val = va[g.id];
      const barColor = val > 15 ? 'var(--color-success)' : val > 8 ? 'var(--color-primary)' : val > 4 ? 'var(--color-warning)' : 'var(--color-error)';
      return `
        <div class="stat-bar">
          <div class="stat-bar__label">
            <span style="font-size: var(--text-xs);">${g.icon} ${g.name}</span>
            <span class="stat-bar__value" style="font-size: var(--text-xs);">${val.toFixed(1)}%</span>
          </div>
          <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${Math.min(val * 2.5, 100)}%; background: ${barColor};"></div></div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderCampaignScreen() {
  const ev = state.currentEvent;

  return `
    <div class="screen screen--active">
      <div style="text-align: center; margin-bottom: var(--space-6);">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700;">
          🗳️ Wahlkampfphase
        </h2>
        <p class="text-muted text-sm">Verteile dein Wahlkampfbudget und reagiere auf aktuelle Ereignisse</p>
      </div>

      <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
        <!-- Budget Allocation -->
        <div class="panel">
          <div class="panel__header"><span class="panel__title">💰 Budget-Verteilung</span></div>
          <p class="text-xs text-muted mb-4">Verteile 100% auf die Kanäle (automatische Anpassung)</p>

          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="budget-slider">
              <div class="budget-slider__header"><span class="budget-slider__name">📺 TV/Medien</span><span class="budget-slider__pct" id="budget-tv-val">25%</span></div>
              <input type="range" id="budget-tv" min="0" max="100" value="25" class="budget-range">
            </div>
            <div class="budget-slider">
              <div class="budget-slider__header"><span class="budget-slider__name">📱 Social Media</span><span class="budget-slider__pct" id="budget-social-val">25%</span></div>
              <input type="range" id="budget-social" min="0" max="100" value="25" class="budget-range">
            </div>
            <div class="budget-slider">
              <div class="budget-slider__header"><span class="budget-slider__name">🎤 Wahlkampfveranstaltungen</span><span class="budget-slider__pct" id="budget-rally-val">25%</span></div>
              <input type="range" id="budget-rally" min="0" max="100" value="25" class="budget-range">
            </div>
            <div class="budget-slider">
              <div class="budget-slider__header"><span class="budget-slider__name">🚪 Haustürwahlkampf</span><span class="budget-slider__pct" id="budget-door-val">25%</span></div>
              <input type="range" id="budget-door" min="0" max="100" value="25" class="budget-range">
            </div>
          </div>

          <button class="btn btn--primary btn--block mt-6" id="btn-campaign-apply">
            Budget einsetzen
          </button>
        </div>

        <!-- Event during campaign -->
        <div>
          ${ev ? `
            <div class="event-card">
              <div class="event-card__breaking"><span>WAHLKAMPF-NEWS</span></div>
              <div class="event-card__body">
                <div class="event-card__category">${ev.category}</div>
                <h2 class="event-card__headline" style="font-size: var(--text-lg);">${ev.headline}</h2>
                <p class="event-card__description">${ev.description}</p>
              </div>
            </div>
          ` : ''}

          <!-- Current Polling -->
          <div class="panel" style="margin-top: var(--space-4);">
            <div class="panel__header"><span class="panel__title">📊 Aktuelle Umfragen</span></div>
            ${renderPollingBars()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDebateScreen() {
  return `
    <div class="screen screen--active">
      <div style="text-align: center; max-width: 700px; margin: 0 auto;">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-2);">
          🎙️ TV-Debatte
        </h2>
        <p class="text-muted text-sm mb-4">Die letzte Debatte vor der Wahl! Wähle deine Strategie für die Fernsehdebatte.</p>

        <div class="panel" style="margin-bottom: var(--space-6);">
          <div class="panel__header"><span class="panel__title">Aktuelle Umfrage: ${state.player.approval.toFixed(1)}%</span></div>
          <p class="text-xs text-muted">Eine gute Debatte kann den entscheidenden Unterschied machen!</p>
        </div>

        <div class="debate-strategies">
          <button class="debate-strategy-btn" data-strategy="aggressive">
            <div class="debate-strategy-btn__icon">⚔️</div>
            <div class="debate-strategy-btn__name">Aggressiv</div>
            <div class="debate-strategy-btn__desc">Gegner direkt angreifen. Hohes Risiko, hohe Belohnung. Stärkt Arbeiter und Jugend.</div>
          </button>
          <button class="debate-strategy-btn" data-strategy="factual">
            <div class="debate-strategy-btn__icon">📊</div>
            <div class="debate-strategy-btn__name">Sachlich</div>
            <div class="debate-strategy-btn__desc">Mit Fakten und Expertise überzeugen. Stärkt Akademiker und Glaubwürdigkeit.</div>
          </button>
          <button class="debate-strategy-btn" data-strategy="emotional">
            <div class="debate-strategy-btn__icon">❤️</div>
            <div class="debate-strategy-btn__name">Emotional</div>
            <div class="debate-strategy-btn__desc">Persönliche Geschichten und Empathie. Stärkt Rentner und Landbevölkerung.</div>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderElectionScreen() {
  const r = state.electionResults;
  if (!r) return '<p>Berechne Ergebnisse...</p>';

  const { svg, parties } = generateHemicycleSVG(r);

  return `
    <div class="screen screen--active">
      <div style="text-align: center; margin-bottom: var(--space-6);">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700;">
          🗳️ Bundestagswahl — Ergebnisse
        </h2>
        <div class="flag-strip" style="max-width: 300px; margin: var(--space-3) auto;"></div>
      </div>

      <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
        <!-- Hemicycle -->
        <div class="panel">
          <div class="panel__header"><span class="panel__title">Bundestag — Sitzverteilung</span></div>
          <div class="hemicycle-container">
            ${svg}
            <div class="hemicycle-legend">
              ${parties.map(p => `
                <span class="hemicycle-legend__item">
                  <span class="party-color-dot" style="background: ${p.color};"></span>
                  ${p.name}: ${p.seats}
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Results Table -->
        <div class="panel">
          <div class="panel__header"><span class="panel__title">Wahlergebnis</span></div>

          <div style="text-align: center; margin-bottom: var(--space-4); padding: var(--space-4); background: ${r.passedThreshold ? 'var(--color-success-bg)' : 'var(--color-error-bg)'}; border-radius: var(--radius-md);">
            <div class="result-big-number" style="color: ${r.passedThreshold ? 'var(--color-success)' : 'var(--color-error)'};">
              ${r.playerPercent.toFixed(1)}%
            </div>
            <div style="font-size: var(--text-sm); color: ${r.passedThreshold ? 'var(--color-success)' : 'var(--color-error)'}; font-weight: 600;">
              ${state.player.name} — ${r.passedThreshold ? `${r.playerSeats} Sitze` : 'Sperrklausel nicht erreicht!'}
            </div>
          </div>

          <table class="polling-table">
            <thead>
              <tr><th>Partei</th><th>Stimmen</th><th>Sitze</th></tr>
            </thead>
            <tbody>
              <tr style="font-weight: 600; background: var(--color-primary-glow);">
                <td><span class="party-color-dot" style="background: ${state.player.color};"></span>${state.player.name}</td>
                <td>${r.playerPercent.toFixed(1)}%</td>
                <td>${r.playerSeats}</td>
              </tr>
              ${r.parties.sort((a, b) => b.votePercent - a.votePercent).map(p => `
                <tr style="${!p.passedThreshold ? 'opacity: 0.5;' : ''}">
                  <td><span class="party-color-dot" style="background: ${p.color};"></span>${p.short}</td>
                  <td>${p.votePercent.toFixed(1)}%</td>
                  <td>${p.seats}${!p.passedThreshold ? ' (< 5%)' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: var(--space-6); text-align: center;">
            ${r.passedThreshold && state.coalitionOptions.length > 0 ? `
              <button class="btn btn--primary btn--lg" id="btn-coalition">
                Koalitionsverhandlungen →
              </button>
            ` : r.passedThreshold ? `
              <button class="btn btn--secondary btn--lg" id="btn-opposition">
                In die Opposition →
              </button>
            ` : `
              <div style="margin-bottom: var(--space-4);">
                <p style="color: var(--color-error); font-weight: 600;">Deine Partei hat die 5%-Hürde nicht geschafft!</p>
              </div>
              <button class="btn btn--danger btn--lg" id="btn-gameover">
                Spiel beendet
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCoalitionScreen() {
  return `
    <div class="screen screen--active">
      <div style="max-width: 700px; margin: 0 auto;">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; text-align: center; margin-bottom: var(--space-2);">
          🤝 Koalitionsverhandlungen
        </h2>
        <p class="text-muted text-sm text-center mb-4">Wähle einen Koalitionspartner, um eine Regierungsmehrheit zu bilden (≥ 300 Sitze).</p>

        <div class="panel" style="margin-bottom: var(--space-4); text-align: center;">
          <span style="font-size: var(--text-sm); font-weight: 600;">${state.player.name}: ${state.player.seats} Sitze</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${state.coalitionOptions.map((opt, i) => `
            <button class="coalition-option" data-coalition="${i}">
              <div class="coalition-option__parties">
                <span class="party-color-dot" style="background: ${state.player.color}; width: 14px; height: 14px;"></span>
                ${opt.partners.map(p => `<span class="party-color-dot" style="background: ${p.color}; width: 14px; height: 14px;"></span>`).join('')}
              </div>
              <div class="coalition-option__info">
                <div style="font-weight: 600; font-size: var(--text-sm);">
                  ${state.player.name} + ${opt.partners.map(p => p.short).join(' + ')}
                </div>
                <div style="font-size: var(--text-xs); color: var(--color-text-muted);">${opt.type}</div>
              </div>
              <div class="coalition-option__seats">${opt.totalSeats} Sitze</div>
            </button>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: var(--space-6);">
          <button class="btn btn--ghost" id="btn-go-opposition">Freiwillig in die Opposition</button>
        </div>
      </div>
    </div>
  `;
}

function renderGovernanceScreen() {
  const isGov = state.player.inGovernment;
  const ev = state.currentEvent;
  const progress = (state.governanceRound / state.governanceMaxRounds) * 100;

  return `
    <div class="screen screen--active">
      <div style="text-align: center; margin-bottom: var(--space-6);">
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700;">
          ${isGov ? '🏛️ Regierungsperiode' : '📢 Opposition'}
        </h2>
        <p class="text-muted text-sm">
          ${isGov ? `Koalition: ${state.player.name} + ${state.player.coalitionPartner.partners.map(p => p.short).join(' + ')}` : 'Profiliere dich für die nächste Wahl'}
        </p>
        <div class="stat-bar" style="max-width: 400px; margin: var(--space-3) auto 0;">
          <div class="stat-bar__label"><span>Legislaturperiode</span><span class="stat-bar__value">${state.governanceRound}/${state.governanceMaxRounds}</span></div>
          <div class="stat-bar__track"><div class="stat-bar__fill" style="width: ${progress}%;"></div></div>
        </div>
      </div>

      ${state.governanceRound < state.governanceMaxRounds && ev ? `
        <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 340px; gap: var(--space-6); align-items: start;">
          <div class="event-card">
            <div class="event-card__breaking" style="background: ${isGov ? 'var(--color-primary)' : 'var(--color-warning)'};">
              <span>${isGov ? 'REGIERUNGSENTSCHEIDUNG' : 'OPPOSITION REAGIERT'}</span>
            </div>
            <div class="event-card__body">
              <div class="event-card__category">${ev.category}</div>
              <h2 class="event-card__headline">${ev.headline}</h2>
              <p class="event-card__description">${ev.description}</p>
              <div class="decision-options">
                ${ev.options.map((opt, i) => `
                  <button class="decision-option" data-gov-option="${i}">
                    <div class="decision-option__icon">${opt.stance === 'progressive' ? '🔵' : opt.stance === 'moderate' ? '⚖️' : '🔴'}</div>
                    <div class="decision-option__content">
                      <div class="decision-option__title">${opt.label}</div>
                      <div class="decision-option__desc">${opt.desc}</div>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="panel">
              <div class="panel__header"><span class="panel__title">📊 Umfragen</span></div>
              ${renderPollingBars()}
            </div>
            <div class="panel">
              <div class="panel__header"><span class="panel__title">👥 Wählergruppen</span></div>
              ${renderVoterBars()}
            </div>
          </div>
        </div>
      ` : `
        <div class="panel" style="text-align: center; max-width: 500px; margin: var(--space-8) auto;">
          <h3 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4);">
            Nächste Bundestagswahl steht bevor!
          </h3>
          <p class="text-muted text-sm mb-4">Die Legislaturperiode endet. Es wird ein neuer Bundestag gewählt.</p>
          <div style="font-size: var(--text-lg); font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-4);">
            Aktuelle Umfrage: ${state.player.approval.toFixed(1)}%
          </div>
          <button class="btn btn--primary btn--lg" id="btn-new-election">
            Zur Wahl antreten →
          </button>
        </div>
      `}
    </div>
  `;
}

function renderGameOverScreen() {
  return `
    <div class="screen screen--active" style="min-height: calc(100dvh - 150px); display: flex; align-items: center; justify-content: center;">
      <div style="text-align: center; max-width: 500px;">
        <div style="font-size: 64px; margin-bottom: var(--space-4);">❌</div>
        <h2 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-4);">
          Spiel beendet
        </h2>
        <p class="text-muted mb-4">
          ${state.player.name} hat es nicht in den Bundestag geschafft.
          ${state.electionCycle > 0 ? `Du hast ${state.electionCycle} Legislaturperiode(n) überlebt.` : 'Die 5%-Hürde war zu hoch.'}
        </p>
        <div class="result-comparison mb-4">
          <div class="result-comparison__item">
            <div class="result-comparison__value" style="color: var(--color-error);">${state.player.totalVotePercent.toFixed(1)}%</div>
            <div class="result-comparison__label">Letztes Ergebnis</div>
          </div>
          <div class="result-comparison__item">
            <div class="result-comparison__value">${state.electionCycle}</div>
            <div class="result-comparison__label">Wahlperioden</div>
          </div>
          <div class="result-comparison__item">
            <div class="result-comparison__value">${state.newsHistory.length}</div>
            <div class="result-comparison__label">Entscheidungen</div>
          </div>
        </div>
        <button class="btn btn--primary btn--lg" id="btn-restart">
          Neues Spiel
        </button>
      </div>
    </div>
  `;
}

// ===== EVENT LISTENERS =====

function attachListeners() {
  // Title screen
  const btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.addEventListener('click', () => { AudioEngine.click(); startNewGame(); });

  // Creation screen
  const topicsContainer = document.getElementById('topics-container');
  if (topicsContainer) {
    const selectedTopics = [];
    const nameInput = document.getElementById('party-name');
    const createBtn = document.getElementById('btn-create');
    const topicCount = document.getElementById('topic-count');

    topicsContainer.querySelectorAll('.topic-tag').forEach(tag => {
      tag.addEventListener('click', () => {
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

        topicCount.textContent = `${selectedTopics.length}/3 ausgewählt`;

        // Enable/disable other tags
        topicsContainer.querySelectorAll('.topic-tag').forEach(t => {
          if (!selectedTopics.includes(t.dataset.topic) && selectedTopics.length >= 3) {
            t.classList.add('topic-tag--disabled');
          } else {
            t.classList.remove('topic-tag--disabled');
          }
        });

        updateCreateButton();
      });
    });

    if (nameInput) {
      nameInput.addEventListener('input', updateCreateButton);
    }

    function updateCreateButton() {
      if (createBtn) {
        createBtn.disabled = !(nameInput.value.trim().length >= 2 && selectedTopics.length === 3);
      }
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        AudioEngine.success();
        const name = nameInput.value.trim();
        const economic = parseInt(document.getElementById('economic-axis').value) / 100;
        const social = parseInt(document.getElementById('social-axis').value) / 100;
        finalizePartyCreation(name, economic, social, [...selectedTopics]);
      });
    }
  }

  // Game loop decisions
  document.querySelectorAll('.decision-option[data-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.click();
      applyDecision(parseInt(btn.dataset.option));
    });
  });

  // Campaign
  const campaignApply = document.getElementById('btn-campaign-apply');
  if (campaignApply) {
    // Budget sliders
    const sliders = ['tv', 'social', 'rally', 'door'];
    sliders.forEach(id => {
      const slider = document.getElementById(`budget-${id}`);
      if (slider) {
        slider.addEventListener('input', () => {
          document.getElementById(`budget-${id}-val`).textContent = `${slider.value}%`;
        });
      }
    });

    campaignApply.addEventListener('click', () => {
      AudioEngine.click();
      const budget = {
        tv: parseInt(document.getElementById('budget-tv').value),
        social: parseInt(document.getElementById('budget-social').value),
        rally: parseInt(document.getElementById('budget-rally').value),
        door: parseInt(document.getElementById('budget-door').value),
      };
      applyCampaignBudget(budget);
    });
  }

  // Debate
  document.querySelectorAll('.debate-strategy-btn[data-strategy]').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.click();
      applyDebateStrategy(btn.dataset.strategy);
    });
  });

  // Election -> Coalition
  const btnCoalition = document.getElementById('btn-coalition');
  if (btnCoalition) btnCoalition.addEventListener('click', () => { AudioEngine.click(); state.phase = 'coalition'; renderScreen(); });

  const btnOpposition = document.getElementById('btn-opposition');
  if (btnOpposition) btnOpposition.addEventListener('click', () => { AudioEngine.click(); goToOpposition(); });

  const btnGameover = document.getElementById('btn-gameover');
  if (btnGameover) btnGameover.addEventListener('click', () => { AudioEngine.failure(); state.phase = 'gameover'; renderScreen(); });

  // Coalition selection
  document.querySelectorAll('.coalition-option[data-coalition]').forEach(btn => {
    btn.addEventListener('click', () => { AudioEngine.click(); selectCoalition(parseInt(btn.dataset.coalition)); });
  });

  const btnGoOpposition = document.getElementById('btn-go-opposition');
  if (btnGoOpposition) btnGoOpposition.addEventListener('click', () => { AudioEngine.click(); goToOpposition(); });

  // Governance decisions
  document.querySelectorAll('.decision-option[data-gov-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.click();
      applyGovernanceDecision(parseInt(btn.dataset.govOption));
    });
  });

  // New election from governance
  const btnNewElection = document.getElementById('btn-new-election');
  if (btnNewElection) btnNewElection.addEventListener('click', () => { AudioEngine.election(); advanceGovernance(); });

  // Restart
  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', () => { AudioEngine.click(); state = createInitialState(); state.phase = 'title'; renderScreen(); });

  // Neues Spiel button in header
  const btnNewGame = document.getElementById('btn-new-game');
  if (btnNewGame) btnNewGame.addEventListener('click', () => { AudioEngine.click(); state = createInitialState(); state.phase = 'title'; renderScreen(); });

  // Mute button
  const btnMute = document.getElementById('btn-mute');
  if (btnMute) btnMute.addEventListener('click', () => { AudioEngine.toggle(); btnMute.textContent = AudioEngine.muted ? '🔇' : '🔊'; });
}

// ===== RESPONSIVE: handled via CSS .mobile-stack class =====

// ===== INIT =====
function initGame() {
  AudioEngine.init();
  state = createInitialState();
  renderScreen();

  // Audio context resume on first interaction
  document.addEventListener('click', () => AudioEngine.resume(), { once: true });

  // Responsive handled by CSS
}

// Expose for testing
window.render_game_to_text = function() {
  if (!state) return JSON.stringify({ phase: 'uninitialized' });
  return JSON.stringify({
    phase: state.phase,
    round: state.round,
    electionCycle: state.electionCycle,
    playerApproval: state.player.approval,
    playerName: state.player.name,
    voterApproval: state.player.voterApproval,
    media: state.player.media,
    credibility: state.player.credibility,
    seats: state.player.seats,
    inGovernment: state.player.inGovernment,
    currentEvent: state.currentEvent ? state.currentEvent.id : null,
  });
};

window.advanceTime = function(ms) {
  // No-op for this turn-based game — state advances on decisions
};

document.addEventListener('DOMContentLoaded', initGame);
