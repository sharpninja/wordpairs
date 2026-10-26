import {createHmac} from 'node:crypto';
import {createServer,request as upstreamRequest,type IncomingMessage} from 'node:http';
import type {AddressInfo} from 'node:net';
import type {Duplex} from 'node:stream';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {Pool} from 'pg';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {RoomService} from '../../src/application/rooms';
import {OutboxRelay} from '../../src/application/outbox';
import {PostgresOutbox} from '../../src/infrastructure/outbox';
import {realtimeAccess,SupabaseRealtimePublisher} from '../../src/infrastructure/realtime';
import {PostgresRoomRepository} from '../../src/infrastructure/room-repository';
const target=process.env.WORDPAIRS_TEST_REALTIME_URL;const databaseUrl=process.env.WORDPAIRS_TEST_DATABASE_URL;const secret=process.env.WORDPAIRS_TEST_REALTIME_JWT_SECRET;
if(!target||new URL(target).hostname!=='127.0.0.1'||!databaseUrl||new URL(databaseUrl).hostname!=='127.0.0.1'||!secret)throw new Error('Disposable local Realtime and database required');
const targetUrl=new URL(target);const admin=new Pool({connectionString:databaseUrl,ssl:false});const pool=new Pool({connectionString:databaseUrl,ssl:false,options:'-c role=service_role'});
const sockets=new Set<Duplex>();const clients:SupabaseClient[]=[];
const gateway=createServer((request,response)=>{
  const upstream=upstreamRequest(options(request),reply=>{response.writeHead(reply.statusCode??502,reply.headers);reply.pipe(response);});
  upstream.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstream);
});
function options(request:IncomingMessage){return {hostname:'127.0.0.1',port:targetUrl.port,method:request.method,path:request.url?.replace(/^\/realtime\/v1/,request.headers.upgrade?.toLowerCase()==='websocket'?'/socket':''),headers:{...request.headers,host:'realtime-dev.localhost'}};}
gateway.on('upgrade',(request,socket,head)=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
  const upstream=upstreamRequest(options(request));
  upstream.on('upgrade',(reply,transport,transportHead)=>{
    sockets.add(transport);transport.on('close',()=>sockets.delete(transport));
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${reply.rawHeaders.reduce((lines,value,index,values)=>index%2===0?`${lines}${value}: ${values[index+1]}\r\n`:lines,'')}\r\n`);
    if(head.length)transport.write(head);if(transportHead.length)socket.write(transportHead);
    socket.pipe(transport).pipe(socket);socket.on('error',()=>transport.destroy());transport.on('error',()=>socket.destroy());
  });
  upstream.on('response',reply=>{socket.end(`HTTP/1.1 ${reply.statusCode} Error\r\nConnection: close\r\n\r\n`);reply.resume();});
  upstream.on('error',()=>socket.destroy());upstream.end();
});
function key(role:string){const body=[{alg:'HS256',typ:'JWT'},{role,exp:Math.floor(Date.now()/1000)+3600}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');return `${body}.${createHmac('sha256',secret as string).update(body).digest('base64url')}`;}
const profiles=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
let settings:{url:string;anonKey:string;serviceKey:string;jwtSecret:string};
beforeAll(async()=>{
  await new Promise<void>(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  settings={url:`http://127.0.0.1:${(gateway.address() as AddressInfo).port}`,anonKey:key('anon'),serviceKey:key('service_role'),jwtSecret:secret as string};
  for(const [index,id] of profiles.entries())await admin.query("insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) values($1,'guest',$2,'owl',false)",[id,`Guest Transport ${index}`]);
});
afterAll(async()=>{await Promise.all(clients.map(client=>client.removeAllChannels()));for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>gateway.close(()=>resolve()));await pool.end();await admin.end();});
async function listen(profileId:string,topicProfileId=profileId,receive:(value:unknown)=>void=()=>{}) {
  const client=createClient(settings.url,settings.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(client);
  await client.realtime.setAuth(realtimeAccess(settings,profileId,Date.now()).token);
  const channel=client.channel(`wordpairs-profile:${topicProfileId}`,{config:{private:true,broadcast:{ack:true}}}).on('broadcast',{event:'changed'},message=>receive(message.payload));
  const status=await new Promise<string>(resolve=>{channel.subscribe(value=>{if(['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(value))resolve(value);},10000);});
  return {channel,status};
}
it('TR Realtime rejects a private subscription to another profile’s channel',async()=>{
  const own=await listen(profiles[0]);expect(own.status).toBe('SUBSCRIBED');
  const denied=await listen(profiles[1],profiles[0]);expect(denied.status).toBe('CHANNEL_ERROR');
});
it('TR committed room/observer transitions reach their actual private recipients through durable outbox delivery, without payload leakage',async()=>{
  const observations:Record<string,unknown[]>={};
  for(const id of profiles){observations[id]=[];expect((await listen(id,id,value=>observations[id].push(value))).status).toBe('SUBSCRIBED');}
  const repository=new PostgresRoomRepository(pool);let id=0;
  const service=new RoomService(repository,{now:()=>Date.now()},{next:()=>`transport-event-${++id}`},{integer:()=>31});
  const command=(actorId:string,version:number)=>({aggregateId:'transport-room',actorId,commandId:`transport-${actorId}`,requestDigest:'transport-digest',expectedVersion:version});
  expect((await service.create(command(profiles[0],0),2)).ok).toBe(true);
  expect((await service.join(command(profiles[1],0),'player',null)).ok).toBe(true);
  expect((await service.join(command(profiles[2],1),'observer',profiles[1])).ok).toBe(true);
  await admin.query("update wordpairs.outbox_events set payload=payload||'{\"code\":\"PRIVATE-CODE\",\"target\":\"PRIVATE-TARGET\"}'::jsonb where aggregate_id='transport-room'");
  const relay=new OutboxRelay(new PostgresOutbox(pool),new SupabaseRealtimePublisher(settings),()=>Date.now());
  const drained=await relay.drain(25);expect(drained.ok).toBe(true);
  for(const profile of profiles)await expect.poll(()=>observations[profile].some(event=>Boolean(event&&typeof event==='object'&&'aggregateId' in event&&event.aggregateId==='transport-room'&&'version' in event&&event.version===2))).toBe(true);
  expect(JSON.stringify(observations)).not.toContain('PRIVATE');
  const room=await repository.get('transport-room');if(!room.ok)throw new Error('Missing room');
  const view=await service.view(room.value,profiles[2]);expect(view.ok&&view.value.followedPlayerId).toBe(profiles[1]);
  expect((await admin.query("select count(*)::int as count from wordpairs.outbox_events where aggregate_id='transport-room' and published_at is null")).rows[0].count).toBe(0);
});
