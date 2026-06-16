const standingsService = require('../src/services/standings.service');

describe('standings service helpers', () => {
  it('creates empty standing entry', () => {
    const entry = standingsService.createStandingEntry({
      playerId: 'p1',
      player: { name: 'Ana' },
    });

    expect(entry.played).toBe(0);
    expect(entry.points).toBe(0);
    expect(entry.player.name).toBe('Ana');
  });
});
