import { beforeEach,expect,it,vi } from 'vitest';
import { failure,success } from '../../src/domain/result';
import { joinRoom,newRoom } from '../../src/domain/rooms';
const mocks=vi.hoisted(()=>({session:vi.fn(),room:vi.fn(),view:vi.fn(),act:vi.fn(),labels:vi.fn(),advance:vi.fn(),deliver:vi.fn()}));
vi.mock('../../src/infrastructure/runtime',()=>({getIdentityService:()=>({session:mocks.session}),getRoomServices:()=>({repository:{get:mocks.room,labels:mocks.labels}}),getMatchServices:()=>({service:{view:mocks.view,act:mocks.act}}),advanceLobbyDeadlines:mocks.advance,deliverOutbox:mocks.deliver}));
import { GET,POST } from '../../src/app/api/rooms/[reference]/match/route';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const context={params:Promise.resolve({reference:id})};const base={action:'answer',roundId:'round1',stage:0,answer:'PRIVATE-GUESS',expectedProfileId:'p1',expectedVersion:3,commandId:'c1'};
const request=(input:unknown,origin='https://wordpairs.test')=>new Request(`https://wordpairs.test/api/rooms/${id}/match`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`wp_session=${'s'.repeat(43)}`},body:JSON.stringify(input)});
beforeEach(()=>{vi.stubEnv('WORDPAIRS_ORIGIN','https://wordpairs.test');mocks.session.mockResolvedValue(success({actor:{profileId:'p1',roles:['player']}}));const first=newRoom(id,'p1',2,'ABCDEFGH',0);if(!first.ok)throw new Error('Fixture');const room=joinRoom(first.value,'p2','player',null,0);if(!room.ok)throw new Error('Fixture');mocks.room.mockResolvedValue(success({...room.value,status:'playing',startedRoster:['p1','p2'],startedAt:1000}));mocks.act.mockResolvedValue(success({matchId:id,version:4,correct:false,points:0}));mocks.view.mockResolvedValue(success({matchId:id,version:3,scorecard:[{profileId:'p1'}]}));mocks.labels.mockResolvedValue(success([{id:'p1',alias:'Guest Oak',icon:'owl',providerSubject:'PRIVATE-SUBJECT'}]));mocks.advance.mockResolvedValue(success(0));mocks.deliver.mockResolvedValue(undefined);});
it('hashes the answer intent, derives server actor and keeps guess text out of response',async()=>{
  const result=await POST(request(base),context);expect(result.status).toBe(200);expect(JSON.stringify(await result.json())).not.toContain('PRIVATE-GUESS');expect(mocks.act).toHaveBeenCalledWith(expect.objectContaining({actorId:'p1',aggregateId:id,requestDigest:expect.stringMatching(/^[a-f0-9]{64}$/)}),{type:'answer',roundId:'round1',stage:0,answer:'PRIVATE-GUESS'});expect(result.headers.get('cache-control')).toContain('no-store');
});
it('rejects wrong displayed identity, malformed stages, extra authority and CSRF before domain action',async()=>{
  expect((await POST(request({...base,expectedProfileId:'p2'}),context)).status).toBe(409);expect((await POST(request({...base,stage:4}),context)).status).toBe(400);expect((await POST(request({...base,actorId:'admin'}),context)).status).toBe(400);expect((await POST(request(base,'https://attacker.test'),context)).status).toBe(403);expect(mocks.act).not.toHaveBeenCalled();
});
it('denies observer/outsider writes and filters profile labels in the private view',async()=>{
  mocks.session.mockResolvedValue(success({actor:{profileId:'outsider',roles:['player']}}));mocks.act.mockResolvedValue(failure('NOT_AUTHORIZED'));expect((await POST(request({...base,expectedProfileId:'outsider'}),context)).status).toBe(403);expect(mocks.act).toHaveBeenCalledWith(expect.objectContaining({actorId:'outsider'}),expect.anything());
  mocks.session.mockResolvedValue(success({actor:{profileId:'p1',roles:['player']}}));const result=await GET(new Request(`https://wordpairs.test/api/rooms/${id}/match`),context);expect(result.status).toBe(200);expect(JSON.stringify(await result.json())).not.toContain('PRIVATE-SUBJECT');
});
it('allows an authenticated former player to request only the transaction-controlled canonical replay, while denying private reads',async()=>{
  const room=(await mocks.room()).value;mocks.room.mockResolvedValue(success({...room,players:room.players.filter((p:{profileId:string})=>p.profileId!=='p1')}));
  mocks.act.mockResolvedValue(success({matchId:id,version:4,correct:true,points:5}));expect((await POST(request(base),context)).status).toBe(200);expect((await GET(new Request(`https://wordpairs.test/api/rooms/${id}/match`),context)).status).toBe(403);
});
it('delivers committed catch-up even when an expired-stage answer is rejected',async()=>{
  mocks.act.mockResolvedValue(failure('CONFLICT'));expect((await POST(request(base),context)).status).toBe(409);expect(mocks.deliver).toHaveBeenCalledOnce();
});
