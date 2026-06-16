const {
  listPlayersSchema,
  createPlayerSchema,
  updatePlayerSchema,
} = require('../src/validators/player.validator');

describe('player validators', () => {
  it('accepts valid create payload', () => {
    const result = createPlayerSchema.safeParse({
      body: {
        name: 'John Doe',
        nickname: 'JD',
        rankingPoints: 100,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects create payload with short name', () => {
    const result = createPlayerSchema.safeParse({
      body: {
        name: 'J',
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts list query defaults', () => {
    const result = listPlayersSchema.safeParse({ query: {} });

    expect(result.success).toBe(true);
    expect(result.data.query.page).toBe(1);
    expect(result.data.query.limit).toBe(20);
    expect(result.data.query.active).toBe('all');
  });

  it('rejects empty update payload', () => {
    const result = updatePlayerSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {},
    });

    expect(result.success).toBe(false);
  });
});
