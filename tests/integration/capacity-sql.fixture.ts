import type { CapacityBoundaryObservation, CapacityLegacyObservation, CapacityPlayingObservation } from "./capacity-sql.contract";

// Independent scripted responses, not product functions or oracle exports.
export function capacityBoundaryFixture(kind="correct"):CapacityBoundaryObservation {
  const result:CapacityBoundaryObservation={new10:true,new11:false,new15:false,sql11Rejected:true,
    sql15Rejected:true,raise11Rejected:true,newMatch10:true,newMatch11Rejected:true,finalSeatWinners:1,
    players:10,observers:25,observer26Rejected:true,
    publicRows:[{id:"cap15-upgrade-partial",capacity:10,playerCount:9}],
    discover:["cap15-upgrade-partial"],quickJoined:"cap15-upgrade-partial"};
  if(kind==="wrong-player-limit"){result.new11=true;result.sql11Rejected=false;result.players=11;}
  if(kind==="wrong-legacy"){result.publicRows=[{id:"cap15-upgrade-full",capacity:25,playerCount:10}];result.discover.unshift("cap15-upgrade-full");result.quickJoined=null;}
  if(kind==="wrong-observer-limit")result.observers=10;
  return result;
}
export function capacityWaitingFixture(kind="correct"):CapacityLegacyObservation[]{
  return [11,15,25].map(capacity=>({capacity,before:capacity,after:kind==="wrong-legacy" ? 9 : capacity-1,
    storedCapacity:capacity,unchangedCapacityUpdate:true,growRejected:true,canJoin:false,blocked:capacity!==11}));
}
export function capacityPlayingFixture(kind="correct"):CapacityPlayingObservation[]{
  return [11,15,25].map(capacity=>({capacity,initialScorecard:capacity,
    roster:kind==="wrong-legacy" ? 10 : capacity,rounds:8,solves:capacity*8,status:"finished",
    roomStatus:"closed",awards:capacity,replayIdentical:true}));
}
