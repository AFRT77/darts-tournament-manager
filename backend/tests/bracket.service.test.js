const { generateMatches, getNextMatchSlot } = require('../src/services/bracket.service');
const { legsToWin } = require('../src/utils/tournamentSettings');

describe('bracket service', () => {
  const players = [
    { playerId: 'p1', seed: 1 },
    { playerId: 'p2', seed: 2 },
    { playerId: 'p3', seed: 3 },
    { playerId: 'p4', seed: 4 },
  ];

  it('generates round robin matches', () => {
    const matches = generateMatches('round_robin', players);
    expect(matches).toHaveLength(6);
  });

  it('generates knockout structure', () => {
    const matches = generateMatches('knockout', players);
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('calculates legs to win', () => {
    expect(legsToWin(3)).toBe(2);
    expect(legsToWin(5)).toBe(3);
  });

  it('returns next match slot', () => {
    const next = getNextMatchSlot(1, 1);
    expect(next.round).toBe(2);
    expect(next.bracketPosition).toBe(1);
    expect(next.slot).toBe('player1_id');
  });
});
