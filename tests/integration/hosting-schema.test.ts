import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hosting schema planner reruns, isolated history fixtures", () => {
  it.each(["matching", "changed-source", "missing-earlier", "unknown"])("handles %s history without a live connection", (kind) => {
    const directory = mkdtempSync(join(tmpdir(), "wordpairs-history-"));
    try {
      const history = join(directory, "history.json");
      const source = readFileSync("src/infrastructure/migrations/001_foundation.sql", "utf8");
      const record = { version: "20261028000000", name: "wordpairs_001_foundation", statements: [source] };
      if (kind === "changed-source") record.statements = ["select 1;"];
      if (kind === "missing-earlier") record.name = "wordpairs_002_public_reads";
      if (kind === "unknown") record.name = "unexpected_schema_change";
      writeFileSync(history, JSON.stringify([record]));
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", resolve("scripts/hosting-schema.ps1"), "-Environment", "staging", "-Mode", "plan", "-History", history], { encoding: "utf8" });
      if (kind === "matching") {
        expect(result.status).toBe(0);
        const plan = JSON.parse(result.stdout);
        expect(plan.ref).toBe("jshjkaigwbxsbnnogfxs");
        expect(plan.migrations[0].name).toBe("wordpairs_002_public_reads");
        expect(plan.migrations).toHaveLength(15);
        expect(plan.migrations.at(-1).name).toBe("wordpairs_014_capacity10");
      } else expect(result.status).not.toBe(0);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it("preserves the deployed thirteen-migration prefix before guest privacy and player capacity",()=>{
    const directory=mkdtempSync(join(tmpdir(),"wordpairs-history-"));
    try{
      const names=["001_foundation","002_public_reads","003_identity","004_rooms","005_outbox","006_lobby_deadlines","007_matches","008_content","009_reactions","010_access_control","011_content_review_states"];
      const history=names.map((name,index)=>({version:String(index+1).padStart(14,"0"),name:"wordpairs_"+name,statements:[readFileSync("src/infrastructure/migrations/"+name+".sql","utf8")]}));
      for(const [index,name,file] of [[12,"wordpairs_hosted_scheduler","001_scheduler"],[13,"wordpairs_private_realtime","002_realtime_policy"]] as const)
        history.push({version:String(index).padStart(14,"0"),name,statements:[readFileSync("src/infrastructure/hosting/"+file+".sql","utf8")]});
      const path=join(directory,"history.json");writeFileSync(path,JSON.stringify(history));
      const result=spawnSync("pwsh",["-NoProfile","-NonInteractive","-File",resolve("scripts/hosting-schema.ps1"),"-Environment","staging","-Mode","plan","-History",path],{encoding:"utf8"});
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).migrations.map((record:{name:string})=>record.name)).toEqual(["wordpairs_012_guest_public_profiles","wordpairs_013_player_capacity","wordpairs_014_capacity10"]);
    }finally{rmSync(directory,{recursive:true,force:true});}
  });
  it("rejects an unknown target before any connection", () => {
    expect(spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", resolve("scripts/hosting-schema.ps1"), "-Environment", "unknown", "-Mode", "apply"]).status).not.toBe(0);
  });
});
