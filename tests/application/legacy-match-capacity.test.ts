import { expect, it } from "vitest";
import { chooseCategory, matchProjection, submitAnswer } from "../../src/domain/match";
import type { Match, Round } from "../../src/domain/model";
import { fixtureCatalog, value } from "../acceptance/fixtures";

function verifyLegacyMatch(count:number,kind=process.env.WORDPAIRS_CAPACITY_FIXTURE){
  const players=Array.from({length:count},(_,index)=>`p${index+1}`);
  const catalog=fixtureCatalog();
  const saved:Match={id:"old-match",roomId:"old-room",version:0,roster:players,anchorId:"p1",chooserId:"p1",status:"choosing",rounds:[],usedPairIds:[],startedAt:0};
  let finished:Match;
  if(kind){
    const roster=kind === "wrong-legacy" ? players.slice(0,10) : players;
    const rounds:Round[]=Array.from({length:8},(_,index)=>({id:`round${index}`,pairId:`animals-${index}`,pairVersion:0,categoryId:"animals",startedAt:index*1000,stage:0,stageDueAt:index*1000+20000,submittedPlayerIds:[...roster],solves:roster.map((profileId,order)=>({profileId,points:5,elapsedMs:100,acceptedAt:index*1000+100,order,stage:0})),revealed:true,endedAt:index*1000+100}));
    finished={...saved,status:"finished",roster,rounds,chooserId:null,finishedAt:7100};
  }else{
    finished=structuredClone(saved);
    for(let index=0;index<8;index++){
      finished=value(chooseCategory(finished,finished.chooserId as string,"animals",catalog,{integer:a=>a},index*1000,()=>`round${index}`));
      for(const player of players)finished=value(submitAnswer(finished,player,`round${index}`,0,"cat",catalog,{integer:a=>a},index*1000+100));
    }
  }
  expect(saved.roster).toHaveLength(count);expect(saved.rounds).toHaveLength(0);
  expect(finished.status).toBe("finished");expect(finished.roster).toEqual(players);
  expect(finished.rounds).toHaveLength(8);
  expect(finished.rounds.reduce((solves,round)=>solves+round.solves.length,0)).toBe(count*8);
  for(const player of players){
    const view=value(matchProjection(finished,player,catalog));
    expect(view.status).toBe("finished");expect(view.history).toHaveLength(8);
    expect(view.standings).toHaveLength(count);expect(view.standings.every(row=>row.points === 40)).toBe(true);
  }
}
it.each([11,15,20,25])("CAP10 stable CAP15-LEGACY preserves all %i historical players and completes eight rounds",count=>verifyLegacyMatch(count));
it.each([11,15,20,25])("rejects wrong legacy truncation of %i historical players using the same completion assertions",count=>{
  expect(()=>verifyLegacyMatch(count,"wrong-legacy")).toThrow();
});
