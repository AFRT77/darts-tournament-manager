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
