const FORMAT_LABELS = {
  knockout: 'Eliminación directa',
  round_robin: 'Todos contra todos',
  groups_knockout: 'Grupos + eliminatoria',
};

const GAME_TYPE_LABELS = {
  501: '501',
  301: '301',
  cricket: 'Cricket',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activo',
  finished: 'Finalizado',
};

const MATCH_STATUS_LABELS = {
  scheduled: 'Programado',
  in_progress: 'En juego',
  finished: 'Finalizado',
  walkover: 'Pase directo',
};

const STATUS_BADGES = {
  draft: 'text-bg-secondary',
  active: 'text-bg-success',
  finished: 'text-bg-dark',
};

const MATCH_STATUS_BADGES = {
  scheduled: 'text-bg-secondary',
  in_progress: 'text-bg-warning',
  finished: 'text-bg-success',
  walkover: 'text-bg-info',
};

function formatLabel(map, value) {
  return map[value] || value;
}

function getAlMejorDe(settings = {}) {
  return settings.alMejorDe ?? settings.bestOf ?? 3;
}

function partidasParaGanar(alMejorDe) {
  return Math.floor(alMejorDe / 2) + 1;
}

function formatAlMejorDe(settings = {}) {
  const value = getAlMejorDe(settings);

  if (value === 1) {
    return 'A una partida';
  }

  return `Al mejor de ${value} partidas`;
}

function formatAlMejorDeDetalle(settings = {}) {
  const total = getAlMejorDe(settings);
  const paraGanar = partidasParaGanar(total);

  if (total === 1) {
    return 'Partido a una sola partida';
  }

  return `Al mejor de ${total} partidas (gana quien consiga ${paraGanar} partidas primero)`;
}

function formatAlMejorDeAyuda(alMejorDe = 3) {
  const total = Number(alMejorDe);
  const paraGanar = partidasParaGanar(total);

  if (total === 1) {
    return 'Una sola partida decide el enfrentamiento.';
  }

  return `Se jugarán como máximo ${total} partidas. Gana quien consiga ${paraGanar} partidas antes que su rival.`;
}

export {
  FORMAT_LABELS,
  GAME_TYPE_LABELS,
  STATUS_LABELS,
  MATCH_STATUS_LABELS,
  STATUS_BADGES,
  MATCH_STATUS_BADGES,
  formatLabel,
  getAlMejorDe,
  partidasParaGanar,
  formatAlMejorDe,
  formatAlMejorDeDetalle,
  formatAlMejorDeAyuda,
};
