function getAlMejorDe(settings = {}) {
  return settings.alMejorDe ?? settings.bestOf ?? 3;
}

function normalizeSettings(settings = {}) {
  const alMejorDe = getAlMejorDe(settings);

  return {
    ...settings,
    alMejorDe,
    groupCount: settings.groupCount ?? null,
  };
}

function legsToWin(alMejorDe) {
  return Math.floor(alMejorDe / 2) + 1;
}

module.exports = {
  getAlMejorDe,
  normalizeSettings,
  legsToWin,
};
