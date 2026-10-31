import { describe, expect, it } from "vitest";
import { roomProjection } from "../../src/application/rooms";
import { leaveRoom, lobbyDeadlines, reconcileLobby, setReady } from "../../src/domain/lobby";
import { createMatch } from "../../src/domain/match";
import type { Room } from "../../src/domain/model";
import { joinRoom, newRoom, roomCapacity } from "../../src/domain/rooms";
import { fixtureProvider } from "./capacity-contract-fixture";

const real = { roomProjection, leaveRoom, lobbyDeadlines, reconcileLobby, setReady, createMatch, joinRoom, newRoom, roomCapacity };
const kind = process.env.WORDPAIRS_CAPACITY_FIXTURE;
const policy = kind ? fixtureProvider(kind) : real;
type CapacityPolicy = typeof policy;
const oversized = [11,15,20,25];
const roster = (count: number) => Array.from({length: count}, (_, index) => `p${index + 1}`);
function legacy(count: number, status: Room["status"] = "waiting"): Room {
  return {
    id:"legacy",version:0,code:"ABCDEFGH",creatorId:"p1",capacity:25,discoverable:false,
    status,createdAt:0,changedAt:0,closedAt:null,
    players:roster(count).map(profileId => ({profileId,ready:true,joinedAt:0,disconnectedAt:null,lastSeenAt:0})),
    observers:[],lockedRoster:status === "countdown" ? roster(count) : [],nextObserverSequence:0,
    idlePromptedVersion:null,holdoutId:"p1",holdoutDueAt:5000,countdownDueAt:status === "countdown" ? 10000 : null,
  };
}
const cases: {id:string;name:string;verify:(policy:CapacityPolicy)=>void}[] = [
  {id:"allowed",name:"admits each integer capacity 2 through 10 and preserves the private default",verify:(policy) => {
    for (let count = 2; count <= 10; count++) {
      expect(policy.roomCapacity(count), `capacity ${count}`).toBe(true);
      expect(policy.newRoom("r","p1",count,"ABCDEFGH",0)).toMatchObject({ok:true,value:{capacity:count,discoverable:false,players:[{profileId:"p1"}]}});
    }
  }},
  {id:"invalid",name:"rejects 1,11,15,16,20,25,26 and malformed capacity inputs",verify:(policy) => {
    for (const count of [1,11,15,16,20,25,26,2.5,"10","15",null,undefined,NaN,Infinity])
      expect(policy.roomCapacity(count), `invalid capacity ${String(count)}`).toBe(false);
    for (const count of [1,11,15,16,25]) expect(policy.newRoom("r","p1",count,"ABCDEFGH",0)).toEqual({ok:false,error:{code:"VALIDATION_ERROR"}});
  }},
  {id:"anchor",name:"draws the anchor from both inclusive endpoints of a frozen ten-player roster",verify:(policy) => {
    for (const last of [false,true]) {
      const players = roster(10); const calls: number[][] = [];
      const result = policy.createMatch("m","r",players,{integer:(a,b)=>{calls.push([a,b]); return last ? b : a;}},0);
      expect(calls).toEqual([[1,10]]);
      expect(result).toMatchObject({ok:true,value:{anchorId:last ? "p10" : "p1",roster:roster(10)}});
      players.reverse(); if (result.ok) expect(result.value.roster).toEqual(roster(10));
    }
  }},
  {id:"new-match",name:"rejects every new match above ten before drawing an anchor",verify:(policy) => {
    for (const count of [11,15,16,20,25]) {
      let draws = 0;
      expect(policy.createMatch("m","r",roster(count),{integer:a=>{draws++;return a;}},0)).toEqual({ok:false,error:{code:"VALIDATION_ERROR"}});
      expect(draws).toBe(0);
    }
  }},
  {id:"final-seat",name:"admits the tenth player but rejects an eleventh in a legacy capacity25 room without mutation",verify:(policy) => {
    const before = legacy(9); const result = policy.joinRoom(before,"p10","player",null,1);
    expect(result).toMatchObject({ok:true,value:{players:expect.arrayContaining([{profileId:"p10",ready:false,joinedAt:1,disconnectedAt:null,lastSeenAt:1}])}});
    expect(before.players).toHaveLength(9);
    if (!result.ok) throw new Error("Tenth seat was not admitted");
    const full = structuredClone(result.value);
    expect(policy.joinRoom(full,"p11","player",null,2)).toEqual({ok:false,error:{code:"ROOM_FULL"}});
    expect(full).toEqual(result.value);
  }},
  {id:"observers",name:"preserves the separate twenty-five-observer capacity",verify:(policy) => {
    const state = {...legacy(10),capacity:10,holdoutId:null,holdoutDueAt:null};
    state.observers = roster(24).map((id,index)=>({profileId:`o-${id}`,followedPlayerId:"p1",arrivalSequence:index,joinedAt:0}));
    const observed = policy.joinRoom(state,"o25","observer","p1",1);
    expect(observed.ok && observed.value.observers.length).toBe(25);
    if (!observed.ok) throw new Error("Twenty-fifth observer was not admitted");
    expect(policy.joinRoom(observed.value,"o26","observer","p1",2)).toEqual({ok:false,error:{code:"ROOM_FULL"}});
  }},
  {id:"projection",name:"projects the effective ten-seat waiting limit without negative slots",verify:(policy) => {
    expect(policy.roomProjection(legacy(9),"outside",[])).toMatchObject({capacity:10,availableSlots:1,canJoinPlayer:true});
    expect(policy.roomProjection(legacy(10),"outside",[])).toMatchObject({capacity:10,availableSlots:0,canJoinPlayer:false});
    for (const count of oversized) expect(policy.roomProjection(legacy(count),"p1",[])).toMatchObject({capacityBlocked:true,availableSlots:0,canJoinPlayer:false});
  }},
  {id:"waiting",name:"preserves legacy11,15,20,25 waiting members while denying admission, readiness and automatic holdout or start",verify:(policy) => {
    for (const count of oversized) {
      const state = legacy(count); const before = structuredClone(state);
      expect(policy.joinRoom(state,"extra","player",null,1)).toEqual({ok:false,error:{code:"ROOM_FULL"}});
      expect(policy.setReady(state,"p1",false,1)).toEqual({ok:false,error:{code:"VALIDATION_ERROR"}});
      for (const now of [1,10001]) {
        const next = policy.reconcileLobby(state,now);
        expect(next.status).toBe("waiting"); expect(next.players).toEqual(before.players);
        expect(policy.lobbyDeadlines(next,()=>"deadline").some(job=>["holdout","countdown"].includes(job.kind))).toBe(false);
      }
      expect(state).toEqual(before);
    }
  }},
  {id:"countdown",name:"blocks legacy11,15,20,25 countdowns without removing members",verify:(policy) => {
    for (const count of oversized) {
      const state = legacy(count,"countdown"); const before = structuredClone(state);
      expect(policy.roomProjection(state,"p1",[])).toMatchObject({capacityBlocked:true,availableSlots:0});
      expect(policy.lobbyDeadlines(state,()=>"deadline").some(job=>job.kind === "countdown")).toBe(false);
      expect(state.players).toHaveLength(count); expect(state).toEqual(before);
    }
  }},
  {id:"leave",name:"keeps Leave functional in legacy11,15,20,25 waiting/countdown rooms without promoting above ten",verify:(policy) => {
    for (const count of oversized) for (const status of ["waiting","countdown"] as const) {
      const state = legacy(count,status);
      state.observers=[{profileId:"observer",followedPlayerId:"p2",arrivalSequence:0,joinedAt:0}];
      const result = policy.leaveRoom(state,"p1",1);
      expect(result.ok && result.value.players.length).toBe(count-1);
      expect(result.ok && result.value.observers.map(o=>o.profileId)).toEqual(["observer"]);
    }
  }},
  {id:"shrink-to-limit",name:"unblocks legacy11 after voluntary Leave to ten while legacy15/25 remain blocked after one departure",verify:(policy) => {
    for (const count of [11,15,25]) for (const status of ["waiting","countdown"] as const) {
      const state = legacy(count,status);
      state.observers=[{profileId:"observer",followedPlayerId:"p2",arrivalSequence:0,joinedAt:0}];
      const before = structuredClone(state);
      const result = policy.leaveRoom(state,"p1",1);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Voluntary departure was rejected");
      const survivors = roster(count).slice(1);
      expect(result.value.players.map(player=>player.profileId)).toEqual(survivors);
      expect(result.value.observers).toEqual(before.observers);
      expect(state).toEqual(before);
      const next = policy.reconcileLobby(result.value,2);
      expect(next.players.map(player=>player.profileId)).toEqual(survivors);
      const view = policy.roomProjection(next,"p2",[]);
      const startJobs = policy.lobbyDeadlines(next,()=>"deadline").filter(job=>["holdout","countdown"].includes(job.kind));
      if (count === 11) {
        expect(next.players).toHaveLength(10);
        expect(view).not.toHaveProperty("capacityBlocked",true);
        expect(view.capacity).toBe(10);
        expect(next.status).toBe("countdown");
        expect(startJobs.some(job=>job.kind === "countdown")).toBe(true);
        const draws: number[][] = [];
        const match = policy.createMatch("shrunken","legacy",survivors,{integer:(first,last)=>{draws.push([first,last]);return first;}},3);
        expect(draws).toEqual([[1,10]]);
        expect(match).toMatchObject({ok:true,value:{roster:survivors,anchorId:"p2"}});
      } else {
        expect(next.players).toHaveLength(count-1);
        expect(view).toHaveProperty("capacityBlocked",true);
        expect(startJobs).toEqual([]);
      }
    }
  }},
  {id:"running",name:"preserves legacy11,15,20,25 running room capacity and Leave without marking it blocked",verify:(policy) => {
    for (const count of oversized) {
      const state = legacy(count,"playing");
      expect(policy.roomProjection(state,"p1",[])).toMatchObject({capacity:25,availableSlots:0});
      expect(policy.roomProjection(state,"p1",[])).not.toHaveProperty("capacityBlocked",true);
      const result = policy.leaveRoom(state,`p${count}`,1);
      expect(result.ok && result.value.players.length).toBe(count-1);
    }
  }},
];
describe("CAP10 requirements: FR-ROOMACCESS-001 AC-01/02/24 and stable CAP15-LEGACY; TR-ROOM-CODES-010", () => {
  it.each(cases)("$name",({verify})=>verify(policy));
  it.each([
    {id:"invalid",defect:"wrong-player-limit"},
    {id:"observers",defect:"wrong-observer-limit"},
    {id:"waiting",defect:"wrong-legacy"},
    {id:"countdown",defect:"wrong-legacy"},
    {id:"shrink-to-limit",defect:"wrong-block-after-shrink"},
  ])("rejects wrong $defect against the same $id assertions",({id,defect})=>{
    const testCase=cases.find(test=>test.id === id);
    if (!testCase) throw new Error("Missing required capacity assertion");
    expect(()=>testCase.verify(fixtureProvider(defect))).toThrow();
  });
});
