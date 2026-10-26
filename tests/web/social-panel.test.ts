// @vitest-environment jsdom
import * as React from 'react';
import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SocialPanel} from '../../src/web/social-panel';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('accepts healthy responses slower than polling and still enables eligible nomination after serialized reads',async()=>{
 vi.useFakeTimers();let active=0;let maximum=0;const fetcher=vi.fn((url:string)=>{active++;maximum=Math.max(maximum,active);return new Promise<Response>(resolve=>setTimeout(()=>{active--;resolve(Response.json(url==='/api/content'?{actorId:'p1',version:4,nominatedRoundIds:[]}:{actorId:'p1',version:1,serverNow:1000,reactions:[{id:'r1',actorId:'p1',emoji:'👍',sentAt:1000,expiresAt:6000}]}));},1200));});vi.stubGlobal('fetch',fetcher);
 render(React.createElement(SocialPanel,{roomId:'r',profileId:'p1',canReact:true,roundId:'round',canNominate:true,now:1000,refreshKey:1,labels:[{id:'p1',alias:'Oak'}]}));await act(async()=>{await vi.advanceTimersByTimeAsync(3700);});
 expect(screen.getByLabelText('👍')).toBeTruthy();expect(fetcher.mock.calls.some(([url])=>url==='/api/content')).toBe(true);expect((screen.getByLabelText('Candidate word').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false);expect(maximum).toBe(1);
});
