import { describe,expect,it } from 'vitest';
import type { Category,Match,Pair } from '../../src/domain/model';
import { buildCatalog,normalizeAnswer } from '../../src/domain/catalog';
import { chooseCategory,createMatch,expireStage,matchProjection,standings,submitAnswer } from '../../src/domain/match';
import type { Result } from '../../src/domain/result';
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
const categories:Category[]=Array.from({length:6},(_,i)=>({id:`c${i}`,version:0,name:`Category ${i}`,backgroundId:`art-${i}`,approved:true}));
const pairs:Pair[]=categories.flatMap(c=>Array.from({length:10},(_,i)=>({id:`${c.id}-p${i}`,version:0,categoryId:c.id,prompt:`Prompt ${i}`,target:'sea lion',acceptedAnswers:['seal'],hints:['First clue','Second clue','Third clue'] as [string,string,string],backgroundId:c.backgroundId,approved:true})));
const catalog=()=>val(buildCatalog(categories,pairs));
const random={integer:(min:number)=>min};
const initial=()=>val(createMatch('m','r',['p1','p2'],random,100));
const start=()=>val(chooseCategory(initial(),'p1','c0',catalog(),random,100,()=> 'round1'));
describe('Phase4A real catalog/match setup',()=>{
  it('requires complete approved records and matching category background',()=>{
    expect(buildCatalog(categories,pairs).ok).toBe(true);
    for(const broken of [{...pairs[0],hints:['x','','z']},{...pairs[0],target:''},{...pairs[0],acceptedAnswers:['']},{...pairs[0],backgroundId:'other'}])expect(buildCatalog(categories,[broken as Pair]).ok).toBe(false);
    const filtered=val(buildCatalog(categories,[...pairs,{...pairs[0],id:'unapproved',approved:false}]));expect(filtered.pairs).toHaveLength(60);
  });
  it('draws anchors over inclusive roster indices and freezes their order',()=>{
    const calls:number[][]=[];const roster=['p2','p1','p3'];const match=val(createMatch('m','r',roster,{integer:(a,b)=>{calls.push([a,b]);return b;}},0));
    expect(calls).toEqual([[1,3]]);expect(match.anchorId).toBe('p3');expect(match.roster).toEqual(roster);roster.reverse();expect(match.roster).toEqual(['p2','p1','p3']);
    expect(createMatch('m','r',['p1'],random,0).ok).toBe(false);expect(createMatch('m','r',['p1','p1'],random,0).ok).toBe(false);
  });
  it('rejects non-anchor choices, binds category art, and consumes only unused eligible pairs',()=>{
    const first=initial();expect(chooseCategory(first,'p2','c0',catalog(),random,100,()=> 'round').ok).toBe(false);
    const used={...first,usedPairIds:['c0-p0','c0-p1']};const chosen=val(chooseCategory(used,'p1','c0',catalog(),random,100,()=> 'round'));
    expect(chosen.rounds[0].pairId).toBe('c0-p2');expect(chosen.rounds[0].stageDueAt).toBe(20100);
    const exhausted={...first,usedPairIds:pairs.filter(p=>p.categoryId==='c0').map(p=>p.id)};expect(val(chooseCategory(exhausted,'p1','c0',catalog(),random,100,()=> 'round')).rounds[0].pairId).toBe('c0-p0');
  });
});
describe('Phase4B authoritative rounds, scoring and private views',()=>{
  it('normalizes NFKC, case and whitespace while preserving punctuation and exact alternatives',()=>{
    expect(normalizeAnswer('  ＳＥＡ   LION  ')).toBe('sea lion');expect(normalizeAnswer('Spider-Man')).toBe('spider-man');expect(normalizeAnswer('spider man')).not.toBe(normalizeAnswer('spider-man'));
    expect(val(submitAnswer(start(),'p1','round1',0,' ＳＥＡ   LION ',catalog(),random,1100)).rounds[0].solves[0]).toMatchObject({points:5,elapsedMs:1000,stage:0,order:0});
    expect(val(submitAnswer(start(),'p1','round1',0,'seal',catalog(),random,1100)).rounds[0].solves).toHaveLength(1);
    expect(val(submitAnswer(start(),'p1','round1',0,'sea-lion',catalog(),random,1100)).rounds[0].solves).toHaveLength(0);
  });
  it('accepts once per stage, locks a solve, rejects observers and never stores incorrect input',()=>{
    let match=start();match=val(submitAnswer(match,'p1','round1',0,'PRIVATE WRONG TEXT',catalog(),random,101));
    expect(JSON.stringify(match)).not.toContain('PRIVATE WRONG TEXT');expect(submitAnswer(match,'p1','round1',0,'sea lion',catalog(),random,102).ok).toBe(false);
    expect(submitAnswer(match,'observer','round1',0,'sea lion',catalog(),random,102).ok).toBe(false);
    match=val(submitAnswer(match,'p2','round1',0,'sea lion',catalog(),random,103));expect(match.rounds[0].stage).toBe(1);
    expect(submitAnswer(match,'p2','round1',1,'sea lion',catalog(),random,104).ok).toBe(false);
  });
  it('scores 3/2/1 after hints and reveals after final timeout with zero for unsolved',()=>{
    for(const stage of [1,2,3]){let match=start();for(let i=0;i<stage;i++)match=val(expireStage(match,match.rounds[0].stageDueAt,catalog(),random));
      match=val(submitAnswer(match,'p1','round1',stage,'sea lion',catalog(),random,match.rounds[0].stageDueAt-1));expect(match.rounds[0].solves[0].points).toBe([5,3,2,1][stage]);}
    let match=start();match=val(expireStage(match,80100,catalog(),random));expect(match.status).toBe('summary');expect(match.rounds[0].revealed).toBe(true);expect(standings(match).map(p=>p.totalTimeMs)).toEqual([80000,80000]);
  });
  it('does not accept a late answer into an expired stage, and stale rounds/stages cannot mutate',()=>{
    const match=start();expect(submitAnswer(match,'p1','round1',0,'sea lion',catalog(),random,20100).ok).toBe(false);expect(submitAnswer(match,'p1','wrong',0,'sea lion',catalog(),random,101).ok).toBe(false);
    expect(expireStage(match,20099,catalog(),random).ok).toBe(false);
  });
  it('selects earliest accepted solver even for equal timestamps and advances early only when all unsolved submitted',()=>{
    let match=start();match=val(submitAnswer(match,'p2','round1',0,'sea lion',catalog(),random,500));expect(match.rounds[0].stage).toBe(0);
    match=val(submitAnswer(match,'p1','round1',0,'sea lion',catalog(),random,500));expect(match.status).toBe('summary');expect(match.chooserId).toBe('p2');expect(match.rounds[0].solves.map(s=>s.order)).toEqual([0,1]);
  });
  it('keeps target and future hints private and gives an observer exactly the followed player perspective',()=>{
    let match=start();match=val(submitAnswer(match,'p1','round1',0,'sea lion',catalog(),random,500));match=val(expireStage(match,20100,catalog(),random));
    const solved=val(matchProjection(match,'p1',catalog()));const unsolved=val(matchProjection(match,'p2',catalog()));
    expect(solved.round?.hints).toEqual([]);expect(unsolved.round?.hints).toEqual(['First clue']);expect(JSON.stringify(solved)).not.toContain('sea lion');expect(JSON.stringify(unsolved)).not.toContain('Second clue');expect(matchProjection(match,'outsider',catalog()).ok).toBe(false);
  });
  it('draws no-solver next category uniformly from six categories and preserves exact final ties',()=>{
    let match=start();const calls:number[][]=[];match=val(expireStage(match,80100,catalog(),{integer:(a,b)=>{calls.push([a,b]);return b;}}));expect(calls).toEqual([[0,5]]);expect(match.autoCategoryId).toBe('c5');expect(match.chooserId).toBeNull();
    const rows=standings(match);expect(rows.map(p=>p.rank)).toEqual([1,1]);
    const tied:Match={...match,rounds:[{...match.rounds[0],solves:[{profileId:'p1',points:5,elapsedMs:2000,acceptedAt:2100,order:0,stage:0},{profileId:'p2',points:5,elapsedMs:1000,acceptedAt:1100,order:1,stage:0}]}]};expect(standings(tied).map(p=>p.profileId)).toEqual(['p2','p1']);expect(standings(tied).map(p=>p.rank)).toEqual([1,2]);
  });
  it('finishes after exactly eight rounds with cumulative points and stable roster indexes',()=>{
    let match=initial();for(let round=0;round<8;round++){match=val(chooseCategory(match,match.chooserId as string,'c0',catalog(),random,round*1000+100,()=>`r${round}`));match=val(submitAnswer(match,'p1',`r${round}`,0,'sea lion',catalog(),random,round*1000+200));match=val(submitAnswer(match,'p2',`r${round}`,0,'sea lion',catalog(),random,round*1000+300));}
    expect(match.status).toBe('finished');expect(match.rounds).toHaveLength(8);expect(standings(match).map(p=>p.points)).toEqual([40,40]);expect(standings(match)[0].profileId).toBe('p1');expect(chooseCategory(match,'p1','c0',catalog(),random,9000,()=> 'r9').ok).toBe(false);
  });
});
