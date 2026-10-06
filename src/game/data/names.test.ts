import { describe, expect, it } from 'vitest';
import { familyNames, firstNames, flavourLines } from './names';

describe('original generated name data', () => {
  it('has enough original variety for the full roster', () => {
    expect(firstNames.length).toBeGreaterThanOrEqual(30);
    expect(familyNames.length).toBeGreaterThanOrEqual(20);
    expect(flavourLines.length).toBeGreaterThanOrEqual(20);
    expect(new Set(firstNames).size).toBe(firstNames.length);
    expect(new Set(familyNames).size).toBe(familyNames.length);
    expect(new Set(flavourLines).size).toBe(flavourLines.length);
  });
});
