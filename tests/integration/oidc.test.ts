import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { CustomFetch } from 'openid-client';
import { OpenAiOidcProvider } from '../../src/infrastructure/oidc';
import { failure } from '../../src/domain/result';

const issuer = 'https://issuer.example.test';
const redirectUri = 'https://wordpairs.example.test/api/auth/callback';
const clientId = 'fixture-client';
const keys = generateKeyPairSync('rsa',{modulusLength:2048});
const wrongKeys = generateKeyPairSync('rsa',{modulusLength:2048});
const challenge = {state:'s'.repeat(43),nonce:'n'.repeat(43),pkceVerifier:'p'.repeat(43)};
function provider(options: {claims?:Record<string,unknown>; wrongSignature?:boolean; discoveryIssuer?:string; tokenStatus?:number} = {}) {
  const requests:{url:string;body:string}[]=[];
  const fetcher:CustomFetch = vi.fn(async (input, init) => {
    const url = String(input);
    requests.push({url,body:String(init?.body ?? '')});
    if (url === `${issuer}/.well-known/openid-configuration`) return Response.json({issuer:options.discoveryIssuer ?? issuer,authorization_endpoint:`${issuer}/authorize`,token_endpoint:`${issuer}/token`,jwks_uri:`${issuer}/jwks`,response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],code_challenge_methods_supported:['S256']});
    if (url === `${issuer}/jwks`) return Response.json({keys:[{...keys.publicKey.export({format:'jwk'}),kid:'fixture-key',use:'sig',alg:'RS256'}]});
    if (url === `${issuer}/token`) {
      const now=Math.floor(Date.now()/1000);
      const claims={iss:issuer,sub:'PRIVATE-PROVIDER-SUBJECT',aud:clientId,nonce:challenge.nonce,iat:now,exp:now+300,...options.claims};
      const body=[{alg:'RS256',kid:'fixture-key'},claims].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
      const signature=sign('RSA-SHA256',Buffer.from(body),(options.wrongSignature?wrongKeys:keys).privateKey).toString('base64url');
      return Response.json({access_token:'PRIVATE-ACCESS-TOKEN',token_type:'Bearer',expires_in:300,id_token:`${body}.${signature}`},{status:options.tokenStatus ?? 200});
    }
    throw new Error(`Unexpected fixture endpoint: ${url}`);
  });
  return {instance:new OpenAiOidcProvider({issuer,redirectUri,clientId},fetcher),requests};
}
const callback = {code:'one-time-code',state:challenge.state,expectedState:challenge.state,nonce:challenge.nonce,pkceVerifier:challenge.pkceVerifier};
describe('AC-20/46 actual OIDC protocol validation against fake discovery, JWKS and token endpoints',()=>{
  it('uses authorization code + S256 PKCE, state and nonce; verifies signed claims and returns only issuer/subject',async()=>{
    const {instance,requests}=provider();
    const result=await instance.authorization(challenge);
    if (!result.ok) throw new Error('Authorization failed');
    const url=new URL(result.value);
    expect(url.origin).toBe(issuer);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid');
    expect(url.searchParams.get('state')).toBe(challenge.state);
    expect(url.searchParams.get('nonce')).toBe(challenge.nonce);
    expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(challenge.pkceVerifier).digest('base64url'));
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(await instance.verify(callback)).toEqual({ok:true,value:{issuer,subject:'PRIVATE-PROVIDER-SUBJECT'}});
    const token=new URLSearchParams(requests.find(entry=>entry.url.endsWith('/token'))?.body);
    expect(token.get('code_verifier')).toBe(challenge.pkceVerifier);
    expect(token.get('redirect_uri')).toBe(redirectUri);
    expect(requests.some(entry=>entry.url.endsWith('/jwks'))).toBe(true);
  });
  it.each([
    {wrongSignature:true},{claims:{iss:'https://wrong.example.test'}},{claims:{aud:'wrong-audience'}},{claims:{nonce:'wrong-nonce'}},{claims:{exp:1}},{claims:{sub:''}},{claims:{nbf:Math.floor(Date.now()/1000)+3600}},{tokenStatus:400},
  ])('rejects a malformed or untrusted token without returning provider details: %j',async options=>{
    expect(await provider(options).instance.verify(callback)).toEqual(failure('NOT_AUTHENTICATED'));
  });
  it('rejects a bad state before exchanging a code and rejects issuer mismatch during discovery',async()=>{
    const {instance,requests}=provider();
    expect(await instance.verify({...callback,state:'attacker-state'})).toEqual(failure('NOT_AUTHENTICATED'));
    expect(requests).toHaveLength(0);
    expect(await provider({discoveryIssuer:'https://wrong.example.test'}).instance.verify(callback)).toEqual(failure('NOT_AUTHENTICATED'));
  });
  it('rejects insecure or credential-bearing configured issuers',()=>{
    for (const value of ['http://issuer.example.test','https://user:secret@issuer.example.test','https://issuer.example.test/?query']) expect(()=>new OpenAiOidcProvider({issuer:value,redirectUri,clientId})).toThrow('Invalid OIDC configuration');
  });
});
