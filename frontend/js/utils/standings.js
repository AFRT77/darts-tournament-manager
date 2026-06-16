export function renderStandingsTable(standings) {
  if (!standings?.length) {
    return '<p class="text-muted mb-0">Todavía no hay resultados para calcular la clasificación.</p>';
  }

  return `
    <div class="table-responsive">
      <table class="table table-sm table-hover mb-0 align-middle">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PP</th>
            <th>Pts</th>
            <th>Dif.</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((entry) => `
            <tr>
              <td>${entry.position}</td>
              <td>
                <div class="fw-semibold">${escapeHtml(entry.player?.name || 'Jugador')}</div>
                ${entry.player?.nickname ? `<div class="small text-muted">${escapeHtml(entry.player.nickname)}</div>` : ''}
              </td>
              <td>${entry.played}</td>
              <td>${entry.won}</td>
              <td>${entry.lost}</td>
              <td><strong>${entry.points}</strong></td>
              <td>${entry.diferenciaPartidas >= 0 ? '+' : ''}${entry.diferenciaPartidas}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p class="small text-muted mt-2 mb-0">PJ = partidos jugados · PG/PP = partidos ganados/perdidos · Pts = puntos · Dif. = diferencia de partidas</p>
  `;
}

export function renderStandingsBlock(data) {
  if (data.groups) {
    return data.groups.map((group) => `
      <div class="mb-4">
        <h3 class="h6 mb-3">Grupo ${group.groupNumber}</h3>
        ${renderStandingsTable(group.standings)}
      </div>
    `).join('');
  }

  if (data.format === 'knockout') {
    return `
      ${renderStandingsTable(data.standings)}
      <p class="small text-muted mt-2 mb-0">En eliminación directa, esta tabla muestra victorias acumuladas. El cuadro principal está en los enfrentamientos.</p>
    `;
  }

  return renderStandingsTable(data.standings);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
