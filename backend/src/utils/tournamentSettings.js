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

function normalizeSettings(settings = {}) {
  const alMejorDe = getAlMejorDe(settings);
  const knockoutAlMejorDe = settings.knockoutAlMejorDe != null
    ? getKnockoutAlMejorDe(settings)
    : undefined;

  return {
    ...settings,
    alMejorDe,
    ...(knockoutAlMejorDe != null ? { knockoutAlMejorDe } : {}),
    groupCount: settings.groupCount ?? null,
    qualifiersPerGroup: settings.qualifiersPerGroup ?? 2,
  };
}

function legsToWin(alMejorDe) {
  return Math.floor(alMejorDe / 2) + 1;
}

module.exports = {
  getAlMejorDe,
  getKnockoutAlMejorDe,
  getAlMejorDeForMatch,
  normalizeSettings,
  legsToWin,
};
