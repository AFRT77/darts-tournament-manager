const {
  getAlMejorDe,
  getKnockoutAlMejorDe,
  getAlMejorDeForMatch,
  legsToWin,
} = require('../src/utils/tournamentSettings');

describe('tournamentSettings', () => {
  it('uses alMejorDe for group matches in groups_knockout', () => {
    const settings = { alMejorDe: 3, knockoutAlMejorDe: 1 };
    const match = { groupNumber: 1 };

    expect(getAlMejorDeForMatch(settings, match, 'groups_knockout')).toBe(3);
  });

  it('uses knockoutAlMejorDe for knockout phase matches', () => {
    const settings = { alMejorDe: 3, knockoutAlMejorDe: 1 };
    const match = { groupNumber: null };

    expect(getAlMejorDeForMatch(settings, match, 'groups_knockout')).toBe(1);
  });

  it('defaults knockoutAlMejorDe to 1', () => {
    expect(getKnockoutAlMejorDe({})).toBe(1);
  });

  it('uses alMejorDe for pure knockout tournaments', () => {
    const settings = { alMejorDe: 5 };
    const match = { groupNumber: null };

    expect(getAlMejorDeForMatch(settings, match, 'knockout')).toBe(5);
  });

  it('calculates legs to win', () => {
    expect(legsToWin(getAlMejorDe({ alMejorDe: 3 }))).toBe(2);
    expect(legsToWin(getKnockoutAlMejorDe({ knockoutAlMejorDe: 1 }))).toBe(1);
  });
});
