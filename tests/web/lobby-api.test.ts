import { beforeEach, expect, it, vi } from 'vitest';
import { failure, success } from '../../src/domain/result';
const mocks=vi.hoisted(()=>({session:vi.fn(),act:vi.fn(),advance:vi.fn(),deliver:vi.fn()}));
vi.mock('../../src/infrastructure/runtime',()=>({getIdentityService:()=>({session:mocks.session}),getRoomServices:()=>({lobby:{act:mocks.act}}),advanceLobbyDeadlines:mocks.advance,deliverOutbox:mocks.deliver}));
import { POST } from '../../src/app/api/rooms/[reference]/lobby/route';
import { POST as tick } from '../../src/app/api/internal/deadlines/route';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const context={params:Promise.resolve({reference:id})};
const input={action:'ready',ready:true,commandId:'cmd',expectedVersion:3,expectedProfileId:'p1'};
const request=(body:unknown,origin='https://wordpairs.test')=>new Request(`https://wordpairs.test/api/rooms/${id}/lobby`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`wp_session=${'s'.repeat(43)}`},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv('WORDPAIRS_ORIGIN','https://wordpairs.test');mocks.session.mockResolvedValue(success({actor:{profileId:'p1',roles:['player']}}));mocks.act.mockResolvedValue(success({roomId:id,version:4,status:'waiting'}));mocks.advance.mockResolvedValue(success(1));mocks.deliver.mockResolvedValue(undefined);});
it('derives the actor from the verified session and validates displayed identity before dispatch',async()=>{
  const result=await POST(request(input),context);expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toContain('no-store');
  expect(mocks.act).toHaveBeenCalledWith(expect.objectContaining({actorId:'p1',aggregateId:id,commandId:'cmd',expectedVersion:3}),{type:'ready',ready:true});
  mocks.act.mockClear();expect((await POST(request({...input,expectedProfileId:'p2'}),context)).status).toBe(409);expect(mocks.act).not.toHaveBeenCalled();
});
it('rejects CSRF, forged authority, malformed booleans and unsupported actions',async()=>{
  expect((await POST(request(input,'https://attacker.test'),context)).status).toBe(403);
  for(const body of [{...input,actorId:'admin'},{...input,ready:'true'},{...input,action:'start'},{...input,action:'leave'},{...input,connected:true}])expect((await POST(request(body),context)).status).toBe(400);
  expect(mocks.act).not.toHaveBeenCalled();
});
it('returns canonical observer denial and delivers catch-up notifications even when late action is rejected',async()=>{
  mocks.act.mockResolvedValue(failure('NOT_AUTHORIZED'));expect((await POST(request(input),context)).status).toBe(403);expect(mocks.deliver).toHaveBeenCalledOnce();
});
it('exposes a fail-closed server scheduler credential without leaking it',async()=>{
  vi.stubEnv('WORDPAIRS_SCHEDULER_SECRET','a'.repeat(32));
  const call=(authorization:string)=>tick(new Request('https://wordpairs.test/api/internal/deadlines',{method:'POST',headers:{authorization}}));
  for(const key of ['',`Bearer ${'é'.repeat(32)}`,`Bearer ${'b'.repeat(32)}`])expect((await call(key)).status).toBe(403);
  expect(mocks.advance).not.toHaveBeenCalled();const accepted=await call(`Bearer ${'a'.repeat(32)}`);expect(accepted.status).toBe(200);expect(await accepted.json()).toEqual({applied:1});
});
