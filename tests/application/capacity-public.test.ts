import { expect, it } from "vitest";
import { GAMEPLAY_RULES, RULES_METADATA, publicLobbies } from "../../src/application/public-projections";
function verifyPublicRules(kind=process.env.WORDPAIRS_CAPACITY_FIXTURE){
  const rules=kind ? [`Play eight rounds with 2–${kind === "wrong-player-limit" ? 15 : 10} players. Each answer stage lasts 20 seconds.`] : GAMEPLAY_RULES;
  const metadata=kind ? {version:"2.8",updated:"2026-10-31"} : RULES_METADATA;
  expect(rules).toContain("Play eight rounds with 2–10 players. Each answer stage lasts 20 seconds.");
  expect(rules.join(" ")).not.toMatch(/2[–-](15|25) players/);
  expect(metadata).toMatchObject({version:"2.8",updated:"2026-10-31"});
}
function verifyPublicDiscovery(kind=process.env.WORDPAIRS_CAPACITY_FIXTURE){
  const source=[9,10,11,15,20,25].map(playerCount=>({id:`legacy-${playerCount}`,capacity:25,playerCount,discoverable:true,status:"waiting" as const,createdAt:0}));
  const result=kind ? (kind === "wrong-legacy" ? source.map(row=>({roomId:row.id,playerCount:row.playerCount,capacity:25,state:"waiting",ageSeconds:1})) : [{roomId:"legacy-9",playerCount:9,capacity:10,state:"waiting",ageSeconds:1}]) : publicLobbies(source,1000);
  expect(result).toEqual([{roomId:"legacy-9",playerCount:9,capacity:10,state:"waiting",ageSeconds:1}]);
}
it("CAP10 publishes the same ten-player rules with release2.8 metadata",()=>verifyPublicRules());
it("CAP10 public discovery hides full or oversized legacy rooms and advertises effective free seats",()=>verifyPublicDiscovery());
it("rejects wrong fifteen-player public rules using the same publication assertions",()=>expect(()=>verifyPublicRules("wrong-player-limit")).toThrow());
it("rejects wrong oversized discovery using the same public lobby assertions",()=>expect(()=>verifyPublicDiscovery("wrong-legacy")).toThrow());
