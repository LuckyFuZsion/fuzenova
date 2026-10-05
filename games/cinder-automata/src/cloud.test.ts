import { describe, expect, it } from 'vitest';
import { checkEmail, checkUsername, friendlyError, mergeProfile } from './cloud';

describe('accounts', () => {
  it('checks usernames', () => {
    expect(checkUsername('  Ash   Walker ')).toEqual({ name: 'Ash Walker' });
    expect('error' in checkUsername('ab')).toBe(true);
    expect('error' in checkUsername('x'.repeat(21))).toBe(true);
    expect('error' in checkUsername('Bad<name>')).toBe(true);
    expect('error' in checkUsername('12345')).toBe(true);
    expect('error' in checkUsername('Admin')).toBe(true);
    expect('error' in checkUsername('site-admin-1')).toBe(true);
  });

  it('turns account-service errors into plain words', () => {
    expect(friendlyError({ code: 'auth/wrong-password' })).toMatch(/wrong email or password/i);
    expect(friendlyError({ code: 'auth/email-already-in-use' })).toMatch(/already exists/i);
    expect(friendlyError({ code: 'auth/weak-password' })).toMatch(/6 characters/);
    expect(friendlyError(new Error('boom'))).toBe('boom');
  });

  it('merges progress: unlocks are joined and each commander keeps its best level', () => {
    const a = { unlocks: JSON.stringify(['brakka']), progress: JSON.stringify({ wren: { best: 12 }, brakka: { best: 3 } }), commander: 'brakka', difficulty: 'hard' };
    const b = { unlocks: JSON.stringify(['ilka', 'brakka']), progress: JSON.stringify({ wren: { best: 20 } }), commander: 'wren', difficulty: 'easy' };
    const m = mergeProfile(a, b);
    expect(JSON.parse(m.unlocks!).sort()).toEqual(['brakka', 'ilka']);
    expect(JSON.parse(m.progress!)).toEqual({ wren: { best: 20 }, brakka: { best: 3 } });
    expect(m.commander).toBe('brakka'); // the account's own choice wins
  });

  it('checks email addresses and refuses throwaway-mail domains', () => {
    expect(checkEmail('  Steve@Example.com ')).toEqual({ email: 'steve@example.com' });
    for (const bad of ['abc', 'a@b', 'no at.com', '@x.com', 'x@.com', '']) expect('error' in checkEmail(bad)).toBe(true);
    expect('error' in checkEmail('x@mailinator.com')).toBe(true);
    expect('error' in checkEmail('x@sub.yopmail.com')).toBe(true);
    expect('error' in checkEmail('x@gmail.com')).toBe(false);
  });
});
