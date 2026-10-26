import {beforeEach,expect,it,vi} from 'vitest';
import {InvitationSigner} from '../../src/infrastructure/invitations';
import {secrets} from '../../src/infrastructure/secrets';
import {newRoom,joinRoom} from '../../src/domain/rooms';
import {success} from '../../src/domain/result';
const mocks=vi.hoisted(()=>({session:vi.fn(),create:vi.fn(),quickMatch:vi.fn(),resolve:vi.fn(),view:vi.fn(),join:vi.fn(),invite:vi.fn(),signer:{mint:vi.fn(),verify:vi.fn()}}));
vi.mock('../../src/infrastructure/runtime',()=>({getIdentityService:()=>({session:mocks.session}),getRoomServices:()=>({service:{create:mocks.create,quickMatch:mocks.quickMatch,resolve:mocks.resolve,view:mocks.view,join:mocks.join},repository:{invite:mocks.invite}}),getInvitationSigner:()=>mocks.signer,deliverOutbox:async()=>undefined}));
import {POST as create} from '../../src/app/api/rooms/route';
import {GET,POST} from '../../src/app/api/rooms/[reference]/route';
const roomId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const signer=new InvitationSigner('fixture-route-invitation-signing-secret-at-least-32-characters');
beforeEach(()=>{
  vi.stubEnv('WORDPAIRS_ORIGIN','https://wordpairs.example.test');
  for(const item of [mocks.session,mocks.create,mocks.quickMatch,mocks.resolve,mocks.view,mocks.join,mocks.invite,mocks.signer.mint,mocks.signer.verify])item.mockReset();
  mocks.signer.mint.mockImplementation(()=>signer.mint());mocks.signer.verify.mockImplementation(token=>signer.verify(token));
  mocks.session.mockResolvedValue(success({actor:{profileId:'p1',roles:['player']},profile:{id:'p1'}}));
  const initial=newRoom(roomId,'p1',2,'ABCDEFGH',0);if(!initial.ok)throw new Error('Fixture failed');
  const full=joinRoom(initial.value,'p2','player',null,1);if(!full.ok)throw new Error('Fixture failed');
  mocks.resolve.mockResolvedValue(success({room:full.value,inviterId:'p2'}));
  mocks.view.mockResolvedValue(success({roomId,players:[],observers:[]}));mocks.invite.mockResolvedValue(success(undefined));
  mocks.join.mockResolvedValue(success({roomId,membership:'observer',version:2}));
});
const context={params:Promise.resolve({reference:'ABCDEFGH'})};
const request=(url:string,body:Record<string,unknown>)=>new Request(url,{method:'POST',headers:{Origin:'https://wordpairs.example.test','Content-Type':'application/json',Cookie:`wp_session=${'s'.repeat(43)}`},body:JSON.stringify(body)});
it('creates an actually signed invitation, persisting only its digest and the server-derived inviter',async()=>{
  const result=await POST(request('https://wordpairs.example.test/api/rooms/ABCDEFGH',{action:'invite',expectedProfileId:'p1'}),context);
  expect(result.status).toBe(200);const link=new URL((await result.json()).url);const token=link.searchParams.get('invite') as string;
  expect(signer.verify(token)).toBe(true);expect(link.pathname).toBe('/rooms/ABCDEFGH');
  expect(mocks.invite).toHaveBeenCalledWith(roomId,'p1',secrets.hash(token));
});
it('rejects altered signatures before lookup and keeps signed inviter binding despite a forged client selection',async()=>{
  mocks.session.mockResolvedValue(success({actor:{profileId:'o1',roles:['player']},profile:{id:'o1'}}));
  const token=signer.mint();
  expect((await GET(new Request(`https://wordpairs.example.test/api/rooms/ABCDEFGH?invite=${token.slice(0,-1)}`),context)).status).toBe(404);
  expect(mocks.resolve).not.toHaveBeenCalled();
  const result=await POST(request(`https://wordpairs.example.test/api/rooms/ABCDEFGH?invite=${token}`,{action:'join',mode:'observer',inviterId:'p1',expectedProfileId:'o1',expectedVersion:1,commandId:'c1'}),context);
  expect(result.status).toBe(200);expect(mocks.resolve).toHaveBeenCalledWith('ABCDEFGH','o1',expect.any(String),secrets.hash(token));
  expect(mocks.join).toHaveBeenCalledWith(expect.objectContaining({actorId:'o1',aggregateId:roomId}),'observer','p2');
});
it('rejects malformed room IDs and stale displayed-profile preconditions before creation',async()=>{
  const base={action:'create',expectedProfileId:'p1',commandId:'c1',capacity:4,discoverable:false};
  expect((await create(request('https://wordpairs.example.test/api/rooms',{...base,roomId:'a'.repeat(36)}))).status).toBe(400);
  expect((await create(request('https://wordpairs.example.test/api/rooms',{...base,roomId,expectedProfileId:'other-account'}))).status).toBe(409);
  expect(mocks.create).not.toHaveBeenCalled();
});
