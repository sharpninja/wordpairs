import {beforeEach,expect,it,vi} from 'vitest';
import {failure,success} from '../../src/domain/result';
const mocks=vi.hoisted(()=>({session:vi.fn(),guest:vi.fn(),logout:vi.fn(),preferences:vi.fn(),completeLogin:vi.fn()}));
vi.mock('../../src/infrastructure/runtime',()=>({getIdentityService:()=>mocks,getProfileStore:()=>({}),oidcAvailable:()=>true,deliverOutbox:async()=>undefined}));
import {GET,POST,DELETE} from '../../src/app/api/session/route';
import {PATCH} from '../../src/app/api/profile/route';
import {GET as callback} from '../../src/app/api/auth/callback/route';
beforeEach(()=>{vi.stubEnv('WORDPAIRS_ORIGIN','https://wordpairs.example.test');Object.values(mocks).forEach(mock=>mock.mockReset());});
const profile={id:'p1',kind:'guest',version:0,icon:'owl',alias:'Guest Cedar',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null};
const request=(path:string,method:string,input:unknown,origin='https://wordpairs.example.test')=>new Request(`https://wordpairs.example.test${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:`wp_session=${'s'.repeat(43)}`},body:JSON.stringify(input)});
it('issues an HttpOnly secure session cookie without exposing the session token in JSON',async()=>{
  mocks.guest.mockResolvedValue(success({profile,sessionToken:'s'.repeat(43),guestCredential:'g'.repeat(43)}));
  const response=await POST(request('/api/session','POST',{guestCredential:null}));
  expect(response.status).toBe(200);
  expect(response.headers.get('Set-Cookie')).toMatch(/HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({profile,guestCredential:'g'.repeat(43)});
});
it('denies cross-origin writes and client identity/role injection before changing anything',async()=>{
  expect((await POST(request('/api/session','POST',{},'https://attacker.example.test'))).status).toBe(403);
  expect((await DELETE(request('/api/session','DELETE',{},'https://attacker.example.test'))).status).toBe(403);
  expect((await POST(request('/api/session','POST',{guestCredential:null,roles:['moderator'],actorId:'p2'}))).status).toBe(400);
  expect(mocks.guest).not.toHaveBeenCalled();expect(mocks.logout).not.toHaveBeenCalled();
  mocks.session.mockResolvedValue(success({profile,actor:{profileId:'p1',roles:['player']}}));
  expect((await PATCH(request('/api/profile','PATCH',{commandId:'c1',expectedVersion:0,alias:'Real identity',actorId:'p2'}))).status).toBe(400);
  expect(mocks.preferences).not.toHaveBeenCalled();
});
it('derives command identity from the verified session and omits server actor roles from session JSON',async()=>{
  mocks.session.mockResolvedValue(success({profile,actor:{profileId:'p1',roles:['player']}}));
  mocks.preferences.mockResolvedValue(success({...profile,icon:'fox',version:1}));
  const response=await PATCH(request('/api/profile','PATCH',{commandId:'c1',expectedVersion:0,expectedProfileId:'p1',icon:'fox'}));
  expect(response.status).toBe(200);
  expect(mocks.preferences.mock.calls[0][0]).toMatchObject({aggregateId:'p1',actorId:'p1',commandId:'c1'});
  const session=await GET(new Request('https://wordpairs.example.test/api/session'));
  expect(await session.json()).toEqual({profile,oidcAvailable:true});
});
it('rejects a profile mutation from a tab whose displayed identity differs from the current shared session',async()=>{
  mocks.session.mockResolvedValue(success({profile:{...profile,id:'member-B',kind:'member'},actor:{profileId:'member-B',roles:['player']}}));
  const response=await PATCH(request('/api/profile','PATCH',{commandId:'c1',expectedVersion:0,expectedProfileId:'guest-A',publicLeaderboard:true}));
  expect(response.status).toBe(409);
  expect(mocks.preferences).not.toHaveBeenCalled();
});
it('bounds untrusted JSON and clears only a confirmed revoked session',async()=>{
  expect((await POST(request('/api/session','POST',{guestCredential:'x'.repeat(17000)}))).status).toBe(400);
  mocks.logout.mockResolvedValue(failure('TEMPORARY_UNAVAILABLE'));
  expect((await DELETE(request('/api/session','DELETE',{}))).headers.has('Set-Cookie')).toBe(false);
  mocks.logout.mockResolvedValue(success(undefined));
  expect((await DELETE(request('/api/session','DELETE',{}))).headers.get('Set-Cookie')).toContain('Max-Age=0');
});
it('uses the browser-bound challenge once and redirects failed callbacks without provider details',async()=>{
  mocks.completeLogin.mockResolvedValue(failure('NOT_AUTHENTICATED'));
  const result=await callback(new Request('https://wordpairs.example.test/api/auth/callback?code=c&state=s',{headers:{Cookie:`wp_login=${'b'.repeat(43)}`}}));
  expect(mocks.completeLogin).toHaveBeenCalledWith('b'.repeat(43),'c','s');
  expect(result.headers.get('Location')).toBe('https://wordpairs.example.test/play?auth=failed');
  expect(result.headers.get('Set-Cookie')).toContain('wp_login=;');
  expect(result.headers.get('Set-Cookie')).not.toContain('wp_session');
});
