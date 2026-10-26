import {describe,expect,it} from 'vitest';
import {newRoom,joinRoom,normalizeRoomCode,playerAuthority,roomCapacity} from '../../src/domain/rooms';
import {roomProjection} from '../../src/application/rooms';
const initial=()=>{const value=newRoom('r1','p1',2,'01234567',1000);if(!value.ok)throw new Error('Fixture failed');return value.value;};
describe('AC-01/02/24–28/50/51 room policy and private projections',()=>{
  it('enforces the 2–25 capacity range, private default and fixed Crockford code format',()=>{
    expect([1,2,25,26,2.5,'2',NaN].map(roomCapacity)).toEqual([false,true,true,false,false,false,false]);
    expect(initial().discoverable).toBe(false);
    expect(normalizeRoomCode(' abcdefgh ')).toBe('ABCDEFGH');
    for(const code of ['ABCD','IIIIIIII','OOOOOOOO','UUUUUUUU','123456789'])expect(normalizeRoomCode(code)).toBeNull();
  });
  it('rejects a full player join without mutating the state and binds a separately admitted observer to an active inviter',()=>{
    const first=initial();const joined=joinRoom(first,'p2','player',null,2000);if(!joined.ok)throw new Error('Join failed');
    const before=structuredClone(joined.value);
    expect(joinRoom(joined.value,'p3','player',null,3000)).toEqual({ok:false,error:{code:'ROOM_FULL'}});
    expect(joined.value).toEqual(before);
    expect(joinRoom(joined.value,'o1','observer','not-a-player',3000)).toEqual({ok:false,error:{code:'NOT_AUTHORIZED'}});
    const observed=joinRoom(joined.value,'o1','observer','p2',3000);if(!observed.ok)throw new Error('Observer failed');
    expect(observed.value.players).toHaveLength(2);expect(observed.value.observers[0]).toMatchObject({profileId:'o1',followedPlayerId:'p2',arrivalSequence:0});
    expect(playerAuthority(observed.value,'o1')).toEqual({ok:false,error:{code:'NOT_AUTHORIZED'}});
    expect(playerAuthority(observed.value,'p2').ok).toBe(true);
    expect(joinRoom(first,'o1','observer','p1',3000)).toEqual({ok:false,error:{code:'VALIDATION_ERROR'}});
  });
  it('limits observers to 25, blocks player substitution after lock, and rejects duplicate membership',()=>{
    const room={...initial(),status:'countdown' as const,lockedRoster:['p1','p2']};
    expect(joinRoom(room,'p2','player',null,3000)).toEqual({ok:false,error:{code:'ROOM_CLOSED'}});
    expect(joinRoom(room,'p1','observer','p1',3000)).toEqual({ok:false,error:{code:'CONFLICT'}});
    const full={...room,observers:Array.from({length:25},(_,index)=>({profileId:`o${index}`,followedPlayerId:'p1',arrivalSequence:index,joinedAt:1000}))};
    expect(joinRoom(full,'o26','observer','p1',3000)).toEqual({ok:false,error:{code:'ROOM_FULL'}});
  });
  it('allowlists room labels, keeps codes player-only and exposes only the observer’s bound perspective',()=>{
    const room={...initial(),observers:[{profileId:'o1',followedPlayerId:'p1',arrivalSequence:0,joinedAt:2000}]};
    const labels=[{id:'p1',alias:'Player Cedar',icon:'fox',providerSubject:'PRIVATE-SUBJECT',email:'PRIVATE-EMAIL'}];
    const view=roomProjection(room,'o1',labels);
    expect(view.role).toBe('observer');expect(view.followedPlayerId).toBe('p1');
    expect(view.players[0]).toMatchObject({id:'p1',alias:'Player Cedar',icon:'fox'});
    expect(JSON.stringify(view)).not.toMatch(/PRIVATE|01234567|providerSubject|email/);
    expect(roomProjection(room,'p1',labels).code).toBe('01234567');
  });
});
