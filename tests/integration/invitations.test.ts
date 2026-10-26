import {expect,it} from 'vitest';
import {InvitationSigner} from '../../src/infrastructure/invitations';
it('signs invitation nonces, rejects modifications and wrong keys, and never encodes the room/inviter or signing secret',()=>{
  const signer=new InvitationSigner('fixture-invitation-secret-at-least-32-characters');
  const token=signer.mint();expect(signer.verify(token)).toBe(true);expect(token).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
  expect(signer.mint()).not.toBe(token);
  expect(signer.verify(`${token[0]==='A'?'B':'A'}${token.slice(1)}`)).toBe(false);
  expect(signer.verify(token.slice(0,-1))).toBe(false);
  expect(new InvitationSigner('different-fixture-key-that-is-at-least-32-characters').verify(token)).toBe(false);
  expect(signer.verify('x'.repeat(10000))).toBe(false);
  expect(()=>new InvitationSigner('short')).toThrow('Invalid invitation configuration');
  expect(token).not.toContain('fixture-invitation-secret-at-least-32-characters');
});
