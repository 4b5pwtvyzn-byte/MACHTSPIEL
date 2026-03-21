// ============================================
// MACHTSPIEL – Kompakte Basisversion
// ============================================

// ===== STATE =====
let state = null;

function createInitialState() {
  return {
    phase: 'title',        // title, creation, event, gameover
    round: 0,
    player: {
      name: '',
      alignment: { economic: 0, social: 0 },
      approval: 5,
      voters: {
        arbeiter: 5,
        akademiker: 5,
        rentner: 5,
        jugend: 5,
        selbststaendige: 5,
        land: 5,
      }
    },
    currentEvent: null,
    lastChoice: null,
  };
}

function recalcApprovalFromVoters() {
  const v = state.player.voters;
  // Gewichtung grob an reale Wählerstruktur angelehnt
  const weights = {
    arbeiter: 0.22,
    akademiker: 0.18,
    rentner: 0.20,
    jugend: 0.15,
    selbststaendige: 0.10,
    land: 0.15,
  };
  let total =
    v.arbeiter * weights.arbeiter +
    v.akademiker * weights.akademiker +
    v.rentner * weights.rentner +
    v.jugend * weights.jugend +
    v.selbststaendige * weights.selbststaendige +
    v.land * weights.land;

  // Norm grob auf 0–10
  state.player.approval = Math.max(0, Math.min(10, total / 2));
}

// ===== EVENTS (3 Beispiel-Events) =====
const SIMPLE_EVENTS = [
  {
    id: 'wirtschaft',
    headline: 'Wirtschaftskrise droht',
    description: 'Die Wirtschaft schrumpft, viele Menschen fürchten um ihren Job.',
    options: [
      {
        label: 'Staatliche Investitionen',
        effect: +2,
        summary: 'Du kündigst ein großes Konjunkturprogramm an. Viele sind erleichtert.'
      },
      {
        label: 'Sparpolitik',
        effect: -1,
        summary: 'Du setzt auf Sparen. Die Märkte sind zufrieden, die Bürger weniger.'
      }
    ]
  },
  {
    id: 'klima',
    headline: 'Hitzewelle und Waldbrände',
    description: 'Wochenlange Hitze führt zu schweren Waldbränden.',
    options: [
      {
        label: 'Klimanotstand ausrufen',
        effect: +2,
        summary: 'Du setzt ein starkes Zeichen für Klimaschutz.'
      },
      {
        label: 'Ruhe bewahren',
        effect: -2,
        summary: 'Du spielst die Lage herunter. Viele sind enttäuscht.'
      }
    ]
  },
  {
    id: 'migration',
    headline: 'Steigende Flüchtlingszahlen',
    description: 'Kommunen melden Überlastung, die Stimmung ist aufgeheizt.',
    options: [
      {
        label: 'Aufnahme & Integration',
        effect: +1,
        summary: 'Du setzt auf Humanität und Integration, aber nicht alle sind überzeugt.'
      },
      {
        label: 'Grenzen stärker kontrollieren',
        effect: 0,
        summary: 'Du versprichst mehr Kontrolle, ohne viel zu konkret zu werden.'
      }
    ]
  }
];

// ===== SPIELSTEUERUNG =====
function startNewGame() {
  state = createInitialState();
  state.phase = 'creation';
  renderScreen();
}

function finalizePartyCreation() {
  const nameInput = document.getElementById('party-name');
  const econInput = document.getElementById('align-economic');
  const socInput = document.getElementById('align-social');

  const name = nameInput.value.trim();
  const econ = parseFloat(econInput.value);
  const soc = parseFloat(socInput.value);

  if (!name) {
    alert('Bitte gib einen Parteinamen ein.');
    return;
  }

  state.player.name = name;
  state.player.alignment = { economic: econ, social: soc };
  state.player.approval = 5;

  state.phase = 'event';
  state.round = 1;
  nextEvent();
  renderScreen();
}

function nextEvent() {
  const idx = Math.floor(Math.random() * SIMPLE_EVENTS.length);
  state.currentEvent = SIMPLE_EVENTS[idx];
  state.lastChoice = null;
}

// ===== ENTSCHEIDUNGEN =====
function applyDecision(optionIndex) {
  const ev = state.currentEvent;
  const opt = ev.options[optionIndex];

  // Einfaches Modell: Effekt wirkt auf alle Wählergruppen
  const v = state.player.voters;
  v.arbeiter += opt.effect;
  v.akademiker += opt.effect * 0.8;
  v.rentner += opt.effect * 0.7;
  v.jugend += opt.effect * 1.2;
  v.selbststaendige += opt.effect * 0.9;
  v.land += opt.effect * 0.6;

  // Grenzen setzen
  for (const key of Object.keys(v)) {
    if (v[key] < 0) v[key] = 0;
    if (v[key] > 10) v[key] = 10;
  }

  // Gesamtzustimmung aus Gruppen neu berechnen
  recalcApprovalFromVoters();

  state.lastChoice = {
    headline: ev.headline,
    option: opt.label,
    summary: opt.summary,
    effect: opt.effect
  };

  state.round++;

  if (state.round > 5) {
    state.phase = 'gameover';
  } else {
    nextEvent();
  }

  renderScreen();
}

// ===== RENDERING =====
function renderScreen() {
  const app = document.getElementById('app');
  if (!app) return;

  if (!state || state.phase === 'title') {
    app.innerHTML = `
      <div class="screen">
        <h1>MACHTSPIEL</h1>
        <p>Politik-Simulation (Basisversion)</p>
        <button class="btn primary" onclick="startNewGame()">
          Neues Spiel starten
        </button>
      </div>
    `;
    return;
  }

  if (state.phase === 'creation') {
    app.innerHTML = `
      <div class="screen">
        <h1>Eigene Partei gründen</h1>
        <p>Wähle einen Namen und deine grobe Ausrichtung.</p>

        <label>Parteiname</label>
        <input type="text" id="party-name" placeholder="Meine Partei">

        <div class="range-container">
          <label>Wirtschaft (links = sozial, rechts = marktliberal)</label>
          <input type="range" id="align-economic" min="-1" max="1" step="0.1" value="0">
        </div>

        <div class="range-container">
          <label>Gesellschaft (links = liberal, rechts = konservativ)</label>
          <input type="range" id="align-social" min="-1" max="1" step="0.1" value="0">
        </div>

        <button class="btn primary" onclick="finalizePartyCreation()">
          Partei übernehmen
        </button>
      </div>
    `;
    return;
  }

  if (state.phase === 'event') {
    const ev = state.currentEvent;
    const approval = state.player.approval;

    app.innerHTML = `
      <div class="screen">
        <h1>${state.player.name}</h1>
        <p>Runde ${state.round} – Zustimmung: ${approval} / 10</p>

        <div class="event-card">
          <h2>${ev.headline}</h2>
          <p>${ev.description}</p>
        </div>

        <div class="options-grid">
          ${ev.options.map((opt, i) => `
            <button class="btn secondary" onclick="applyDecision(${i})">
              ${opt.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }

  if (state.phase === 'gameover') {
    const approval = state.player.approval;
    let verdict = 'Solide Leistung, aber noch Luft nach oben.';
    if (approval <= 3) verdict = 'Die Wähler sind unzufrieden. Du verlierst die nächste Wahl.';
    if (approval >= 8) verdict = 'Großer Erfolg! Deine Partei ist sehr beliebt.';

    app.innerHTML = `
      <div class="screen">
        <h1>Spielende</h1>
        <p>Zustimmung: ${approval} / 10</p>
        <p>${verdict}</p>
        <button class="btn primary" onclick="startNewGame()">
          Noch einmal spielen
        </button>
      </div>
    `;
    return;
  }
}

// ===== AUTO-START =====
document.addEventListener('DOMContentLoaded', () => {
  renderScreen();
});
