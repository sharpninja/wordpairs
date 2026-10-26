import { expect,it } from 'vitest';
import { emptyReactions,sendReaction,visibleReactions,REACTIONS } from '../../src/domain/reactions';
import { newRoom,joinRoom } from '../../src/domain/rooms';
import { createMatch } from '../../src/domain/match';
import type { Result } from '../../src/domain/result';
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
let room=val(joinRoom(val(joinRoom(val(newRoom('r','p1',2,'ABCDEFGH',0)),'p2','player',null,0)),'o1','observer','p1',0));room={...room,status:'playing'};const match={...val(createMatch('r','r',['p1','p2'],{integer:a=>a},0)),status:'playing' as const,rounds:[{id:'round',pairId:'pair',pairVersion:0,categoryId:'c',startedAt:0,stage:0,stageDueAt:20000,submittedPlayerIds:[],solves:[],revealed:false}]};
it('AC-29/TR-19 permits exactly five emoji and all player/observer recipients without game mutation',()=>{
 for(const emoji of REACTIONS){const before=structuredClone({room,match});const state=val(sendReaction(emptyReactions('r'),room,match,'p1',emoji,1000,'event'));expect(state.reactions[0]).toMatchObject({emoji,actorId:'p1',sentAt:1000,expiresAt:6000});expect(state.reactions[0].audience).toEqual(['p1','p2','o1']);expect({room,match}).toEqual(before);}
 for(const emoji of ['💣','<script>','❤️text','❤'])expect(sendReaction(emptyReactions('r'),room,match,'p1',emoji,1000,'event').ok).toBe(false);
 expect(sendReaction(emptyReactions('r'),room,match,'o1','👍',1000,'event').ok).toBe(false);expect(sendReaction(emptyReactions('r'),room,{...match,status:'summary'},'p1','👍',1000,'event').ok).toBe(false);
});
it('TR-19 enforces durable exact 2s rate boundary and hides at exactly 5s including late delivery',()=>{
 const first=val(sendReaction(emptyReactions('r'),room,match,'p1','👍',1000,'one'));expect(sendReaction(first,room,match,'p1','😂',2999,'two').ok).toBe(false);const second=val(sendReaction(first,room,match,'p1','😂',3000,'two'));expect(visibleReactions(second,5999).map(r=>r.id)).toEqual(['one','two']);expect(visibleReactions(second,6000).map(r=>r.id)).toEqual(['two']);expect(visibleReactions(second,8000)).toEqual([]);expect(sendReaction(second,room,match,'p1','👍',2999,'late').ok).toBe(false);
});
