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

function getKnockoutAlMejorDe(settings = {}) {
  return settings.knockoutAlMejorDe ?? 1;
}

function getAlMejorDeForMatch(settings = {}, match = {}, format) {
  const isKnockoutPhaseMatch = format === 'groups_knockout' && match.groupNumber == null;

  if (isKnockoutPhaseMatch) {
    return getKnockoutAlMejorDe(settings);
  }

  return getAlMejorDe(settings);
}

function partidasParaGanar(alMejorDe) {
  return Math.floor(alMejorDe / 2) + 1;
}

function formatAlMejorDeValue(value) {
  if (value === 1) {
    return 'A una partida';
  }

  return `Al mejor de ${value} partidas`;
}

function formatAlMejorDe(settings = {}) {
  return formatAlMejorDeValue(getAlMejorDe(settings));
}

function formatAlMejorDeDetalleValue(value) {
  const paraGanar = partidasParaGanar(value);

  if (value === 1) {
    return 'Partido a una sola partida';
  }

  return `Al mejor de ${value} partidas (gana quien consiga ${paraGanar} partidas primero)`;
}

function formatAlMejorDeDetalle(settings = {}) {
  return formatAlMejorDeDetalleValue(getAlMejorDe(settings));
}

function formatAlMejorDeDetalleForMatch(settings = {}, match = {}, format) {
  return formatAlMejorDeDetalleValue(getAlMejorDeForMatch(settings, match, format));
}

function formatTournamentMatchFormats(settings = {}, format) {
  if (format !== 'groups_knockout') {
    return formatAlMejorDeDetalle(settings);
  }

  const groups = formatAlMejorDeDetalleValue(getAlMejorDe(settings));
  const knockout = formatAlMejorDeDetalleValue(getKnockoutAlMejorDe(settings));

  return `Grupos: ${groups} · Eliminatoria: ${knockout}`;
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
  getKnockoutAlMejorDe,
  getAlMejorDeForMatch,
  partidasParaGanar,
  formatAlMejorDe,
  formatAlMejorDeDetalle,
  formatAlMejorDeDetalleForMatch,
  formatTournamentMatchFormats,
  formatAlMejorDeAyuda,
};
