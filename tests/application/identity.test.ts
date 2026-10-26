import {describe,expect,it,vi} from 'vitest';
import {IdentityService,type IdentityRepository} from '../../src/application/identity';
import {failure,success} from '../../src/domain/result';
const setup=()=>{
  const repository:IdentityRepository={guest:vi.fn(async(_hash,profile)=>success(profile)),member:vi.fn(async(_identity,profile)=>success(profile)),session:vi.fn(async()=>failure('NOT_AUTHENTICATED')),revoke:vi.fn(async()=>success(undefined)),saveChallenge:vi.fn(async()=>success(undefined)),takeChallenge:vi.fn(async()=>success({state:'expected',nonce:'nonce',pkceVerifier:'v'.repeat(43)}))};
  const oidc={authorization:vi.fn(async()=>success('https://issuer.test/auth')),verify:vi.fn(async()=>failure('NOT_AUTHENTICATED'))};
  let sequence=0;
  const service=new IdentityService(repository,{token:()=>`${++sequence}`.padStart(43,'x'),hash:value=>`HASH:${value}`},{next:()=>`profile-${++sequence}`},{integer:min=>min},{now:()=>1000},oidc);
  return {service,repository,oidc};
};
describe('AC-20/21/46 identity application boundaries',()=>{
  it('passes only verified identities to profile association and refuses invalid browser credentials',async()=>{
    const {service,repository,oidc}=setup();
    expect(await service.guest('untrusted')).toEqual(failure('VALIDATION_ERROR'));
    expect(repository.guest).not.toHaveBeenCalled();
    expect(await service.completeLogin('b'.repeat(43),'code','state')).toEqual(failure('NOT_AUTHENTICATED'));
    expect(oidc.verify).toHaveBeenCalledWith({code:'code',state:'state',expectedState:'expected',nonce:'nonce',pkceVerifier:'v'.repeat(43)});
    expect(repository.member).not.toHaveBeenCalled();
  });
  it('creates a generated opt-out guest and never returns provider claims in the profile',async()=>{
    const {service,repository}=setup();const entry=await service.guest(null);
    if(!entry.ok)throw new Error('Guest failed');
    expect(entry.value.profile).toMatchObject({kind:'guest',icon:'owl',publicLeaderboard:false,wins:0,points:0});
    expect(entry.value.profile.alias).toMatch(/^Guest Cedar /);
    expect(entry.value.profile).not.toHaveProperty('providerSubject');
    expect(repository.guest).toHaveBeenCalledWith(`HASH:${entry.value.guestCredential}`,expect.objectContaining({kind:'guest'}),expect.stringMatching(/^HASH:/),1000);
  });
  it('rejects forged profile authority and arbitrary icons before persistence',async()=>{
    const {service}=setup();const store={transact:vi.fn()};
    const actor={profileId:'p1',roles:['player'] as const};
    const command={aggregateId:'p2',actorId:'p2',commandId:'c1',expectedVersion:0,requestDigest:'d'};
    expect(await service.preferences(command,actor,{icon:'owl'},store)).toEqual(failure('NOT_AUTHORIZED'));
    expect(await service.preferences({...command,aggregateId:'p1',actorId:'p1'},actor,{icon:'<img src=x>'},store)).toEqual(failure('VALIDATION_ERROR'));
    expect(store.transact).not.toHaveBeenCalled();
  });
});
