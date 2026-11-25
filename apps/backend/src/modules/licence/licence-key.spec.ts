import {
  formatLicenceKey,
  generateLicenceKey,
  hashLicenceKey,
  LICENCE_KEY_ALPHABET,
  normalizeLicenceKey,
  validateLicenceKey,
} from './licence-key';

describe('licence keys', () => {
  it('generates keys in the grouped RS-XXXX-XXXX-XXXX-CCCC form', () => {
    const key = generateLicenceKey();
    expect(key).toMatch(/^RS-[A-HJKMNP-TV-Z2-9]{4}-[A-HJKMNP-TV-Z2-9]{4}-[A-HJKMNP-TV-Z2-9]{4}-[A-HJKMNP-TV-Z2-9]{4}$/);
    expect(validateLicenceKey(key)).toBeNull();
  });

  it('generates distinct keys', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateLicenceKey()));
    expect(keys.size).toBe(50);
  });

  it('accepts ungrouped and lower-case input', () => {
    const key = generateLicenceKey();
    expect(validateLicenceKey(key.replace(/-/g, ''))).toBeNull();
    expect(validateLicenceKey(key.toLowerCase())).toBeNull();
    expect(validateLicenceKey(`  ${key}  `)).toBeNull();
  });

  it('rejects a single mistyped character', () => {
    const key = generateLicenceKey();
    const alphabet = LICENCE_KEY_ALPHABET;
    // Change one payload character to a different alphabet character.
    const pos = 4; // inside the first payload group
    const replacement = alphabet[(alphabet.indexOf(key[pos]) + 1) % alphabet.length];
    const mistyped = key.slice(0, pos) + replacement + key.slice(pos + 1);
    expect(validateLicenceKey(mistyped)).toMatch(/typo/i);
  });

  it('rejects the wrong shape', () => {
    expect(validateLicenceKey('RS-SHORT')).not.toBeNull();
    expect(validateLicenceKey('XX-AAAA-BBBB-CCCC-DDDD')).not.toBeNull();
    // Ambiguous characters (0, 1, I, L, O) are not in the alphabet.
    expect(validateLicenceKey('RS-0000-1111-IIII-OOOO')).not.toBeNull();
  });

  it('normalizes and formats round-trip', () => {
    const key = generateLicenceKey();
    expect(formatLicenceKey(normalizeLicenceKey(key))).toBe(key);
  });

  it('hashes deterministically and never returns the key itself', () => {
    const key = generateLicenceKey();
    const normalized = normalizeLicenceKey(key);
    expect(hashLicenceKey(normalized)).toBe(hashLicenceKey(normalized));
    expect(hashLicenceKey(normalized)).not.toContain(normalized);
    expect(hashLicenceKey(normalized)).toHaveLength(64);
  });
});
