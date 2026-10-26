import {createHmac} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {realtimeAccess,realtimeSettings,SupabaseRealtimePublisher} from '../../src/infrastructure/realtime';
import {OutboxRelay} from '../../src/application/outbox';
import type {DomainEvent} from '../../src/domain/model';
import {failure,success} from '../../src/domain/result';
const key=(role:string)=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
const settings={url:'https://project.example.test',anonKey:key('anon'),serviceKey:key('service_role'),jwtSecret:'fixture-secret-that-is-at-least-32-characters'};
const event:DomainEvent={id:'e1',aggregateType:'room',aggregateId:'r1',version:3,schemaVersion:1,type:'RoomMembershipChanged',audience:['p1','p2','p1'],payload:{code:'PRIVATE-CODE',target:'PRIVATE-TARGET',credential:'PRIVATE-SECRET'}};
describe('Realtime privacy and durable delivery contracts',()=>{
  it('publishes one private notification per audience member and never forwards domain payloads',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:202}));
    expect((await new SupabaseRealtimePublisher(settings,fetcher).publish(event)).ok).toBe(true);
    const [url,init]=fetcher.mock.calls[0];expect(url).toBe('https://project.example.test/realtime/v1/api/broadcast');
    const messages=JSON.parse(init?.body as string).messages;
    expect(messages).toEqual(['p1','p2'].map(id=>({topic:`wordpairs-profile:${id}`,event:'changed',private:true,payload:{eventId:'e1',aggregateType:'room',aggregateId:'r1',version:3}})));
    expect(init?.body).not.toMatch(/PRIVATE|RoomMembershipChanged/);
  });
  it('mints a short-lived basic transport identity without exposing any server secret',()=>{
    const access=realtimeAccess(realtimeSettings(settings),'p1',100000);
    const [header,body,signature]=access.token.split('.');
    expect(signature).toBe(createHmac('sha256',settings.jwtSecret).update(`${header}.${body}`).digest('base64url'));
    expect(JSON.parse(Buffer.from(body,'base64url').toString())).toEqual({iss:'wordpairs',aud:'authenticated',sub:'p1',role:'authenticated',iat:100,exp:220});
    expect(access.expiresAt).toBe(220000);
    expect(JSON.stringify(access)).not.toContain(settings.serviceKey);expect(JSON.stringify(access)).not.toContain(settings.jwtSecret);
    expect(()=>realtimeSettings({...settings,anonKey:settings.serviceKey})).toThrow('Invalid Realtime configuration');
    expect(()=>realtimeSettings({...settings,url:'http://remote.example.test'})).toThrow('Invalid Realtime configuration');
  });
  it('keeps failed publications pending and acknowledges only successful delivery; duplicate delivery keeps a stable event ID',async()=>{
    const outbox={pending:vi.fn(async()=>success([event])),markPublished:vi.fn(async()=>success(undefined))};
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null,{status:429})).mockResolvedValue(new Response(null,{status:202}));
    const relay=new OutboxRelay(outbox,new SupabaseRealtimePublisher(settings,fetcher),()=>5000);
    expect(await relay.drain(1)).toEqual(failure('SERVICE_LIMIT'));expect(outbox.markPublished).not.toHaveBeenCalled();
    expect(await relay.drain(1)).toEqual(success(1));expect(outbox.markPublished).toHaveBeenCalledWith('e1',5000);
    const bodies=fetcher.mock.calls.map(call=>JSON.parse(call[1]?.body as string));expect(bodies[0]).toEqual(bodies[1]);
  });
});
