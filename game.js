function renderScreen() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="screen">
      <h1>MACHTSPIEL – Testmodus</h1>
      <p>Wenn du das hier siehst, funktionieren index.html und game.js zusammen.</p>
      <button class="btn primary" onclick="alert('Alles läuft – jetzt können wir den echten Spielcode einbauen!')">
        Test-Button
      </button>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', renderScreen);
