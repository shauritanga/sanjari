import { calculateAge, isAdult } from '@sanjari/shared-utils';
import { describe, expect, it } from 'vitest';

describe('adult age validation', () => {
  it('rejects users before their eighteenth birthday', () => {
    expect(isAdult(new Date('2008-08-02T00:00:00.000Z'), new Date('2026-08-01T12:00:00.000Z'))).toBe(false);
  });

  it('accepts users on their eighteenth birthday', () => {
    expect(calculateAge(new Date('2008-08-01T00:00:00.000Z'), new Date('2026-08-01T12:00:00.000Z'))).toBe(18);
  });
});
