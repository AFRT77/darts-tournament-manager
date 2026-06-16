const { createTournamentSchema } = require('../src/validators/tournament.validator');

describe('tournament validators', () => {
  it('accepts valid create payload', () => {
    const result = createTournamentSchema.safeParse({
      body: {
        name: 'Torneo Primavera',
        format: 'knockout',
        gameType: '501',
        settings: { alMejorDe: 3 },
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts knockoutAlMejorDe for groups_knockout', () => {
    const result = createTournamentSchema.safeParse({
      body: {
        name: 'Torneo Grupos',
        format: 'groups_knockout',
        gameType: '501',
        settings: { alMejorDe: 3, knockoutAlMejorDe: 1, groupCount: 2 },
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.body.settings.knockoutAlMejorDe).toBe(1);
  });

  it('rejects invalid format', () => {
    const result = createTournamentSchema.safeParse({
      body: {
        name: 'Torneo Primavera',
        format: 'invalid',
        gameType: '501',
      },
    });

    expect(result.success).toBe(false);
  });
});
