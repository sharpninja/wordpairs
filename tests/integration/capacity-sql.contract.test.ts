import { expect, it } from "vitest";
import { assertCapacityBoundary, assertCapacityPlaying, assertCapacityWaiting } from "./capacity-sql.contract";
import { capacityBoundaryFixture, capacityPlayingFixture, capacityWaitingFixture } from "./capacity-sql.fixture";

it("CAP10 SQL boundary assertions accept independent correct responses",()=>assertCapacityBoundary(capacityBoundaryFixture()));
it("CAP10 waiting assertions preserve all three independent legacy capacities",()=>assertCapacityWaiting(capacityWaitingFixture()));
it("CAP10 scoring/replay assertions preserve all three independent legacy capacities",()=>assertCapacityPlaying(capacityPlayingFixture()));

const wrongBoundary={new10:false,new11:true,new15:true,sql11Rejected:false,sql15Rejected:false,
  raise11Rejected:false,newMatch10:false,newMatch11Rejected:false,finalSeatWinners:2,players:11,
  observers:10,observer26Rejected:false,publicRows:[{id:"cap15-upgrade-full",capacity:25,playerCount:10}],
  discover:["cap15-upgrade-full"],quickJoined:"cap15-upgrade-full"};
for(const key of Object.keys(wrongBoundary) as (keyof typeof wrongBoundary)[]){
  it(`CAP10 SQL oracle rejects wrong ${key}`,()=>{
    const response=capacityBoundaryFixture();Object.assign(response,{[key]:wrongBoundary[key]});
    expect(()=>assertCapacityBoundary(response)).toThrow();
  });
}
for(const capacity of [11,15,25]){
  for(const key of ["before","after","storedCapacity","unchangedCapacityUpdate","growRejected","canJoin","blocked"] as const){
    it(`CAP10 SQL oracle rejects legacy${capacity} waiting ${key} drift`,()=>{
      const response=capacityWaitingFixture();const row=response.find(item=>item.capacity===capacity)!;
      Object.assign(row,{[key]:typeof row[key]==="boolean" ? !row[key] : 10});
      // after=10 is correct for legacy11; use a distinct wrong value.
      if(key==="after" && capacity===11)row.after=9;
      expect(()=>assertCapacityWaiting(response)).toThrow();
    });
  }
  for(const key of ["initialScorecard","roster","rounds","solves","status","roomStatus","awards","replayIdentical"] as const){
    it(`CAP10 SQL oracle rejects legacy${capacity} playing ${key} drift`,()=>{
      const response=capacityPlayingFixture();const row=response.find(item=>item.capacity===capacity)!;
      Object.assign(row,{[key]:typeof row[key]==="boolean" ? false : typeof row[key]==="number" ? 0 : "playing"});
      expect(()=>assertCapacityPlaying(response)).toThrow();
    });
  }
}
it("CAP10 SQL oracle rejects missing legacy waiting coverage",()=>expect(()=>assertCapacityWaiting(capacityWaitingFixture().slice(1))).toThrow());
it("CAP10 SQL oracle rejects missing legacy scoring coverage",()=>expect(()=>assertCapacityPlaying(capacityPlayingFixture().slice(1))).toThrow());
