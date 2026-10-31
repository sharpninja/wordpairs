import { expect } from "vitest";

// FR-ROOMACCESS-001#AC-24/#CAP15-LEGACY;
// TR-ROOM-CODES-010#TR-10-C01/#CAP15-LEGACY;
// TEST-CONFIGUREDCAPACITY-024#AC-24/#CAP15-LEGACY.
// Expectations are requirement-derived, never imported from product limits.
export interface CapacityBoundaryObservation {
  new10:boolean; new11:boolean; new15:boolean;
  sql11Rejected:boolean; sql15Rejected:boolean; raise11Rejected:boolean;
  newMatch10:boolean; newMatch11Rejected:boolean;
  finalSeatWinners:number; players:number; observers:number; observer26Rejected:boolean;
  publicRows:{id:string;capacity:number;playerCount:number}[];
  discover:string[]; quickJoined:string|null;
}
export interface CapacityLegacyObservation {
  capacity:number; before:number; after:number; storedCapacity:number;
  unchangedCapacityUpdate:boolean; growRejected:boolean; canJoin:boolean; blocked:boolean;
}
export interface CapacityPlayingObservation {
  capacity:number; initialScorecard:number; roster:number; rounds:number; solves:number;
  status:string; roomStatus:string; awards:number; replayIdentical:boolean;
}
export function assertCapacityBoundary(actual:CapacityBoundaryObservation){
  expect(actual).toEqual({new10:true,new11:false,new15:false,sql11Rejected:true,sql15Rejected:true,
    raise11Rejected:true,newMatch10:true,newMatch11Rejected:true,finalSeatWinners:1,players:10,
    observers:25,observer26Rejected:true,publicRows:[{id:"cap15-upgrade-partial",capacity:10,playerCount:9}],
    discover:["cap15-upgrade-partial"],quickJoined:"cap15-upgrade-partial"});
}
export function assertCapacityWaiting(actual:CapacityLegacyObservation[]){
  expect(actual).toEqual([11,15,25].map(capacity=>({capacity,before:capacity,after:capacity-1,
    storedCapacity:capacity,unchangedCapacityUpdate:true,growRejected:true,canJoin:false,blocked:capacity>11})));
}
export function assertCapacityPlaying(actual:CapacityPlayingObservation[]){
  expect(actual).toEqual([11,15,25].map(capacity=>({capacity,initialScorecard:capacity,roster:capacity,
    rounds:8,solves:capacity*8,status:"finished",roomStatus:"closed",awards:capacity,replayIdentical:true})));
}
