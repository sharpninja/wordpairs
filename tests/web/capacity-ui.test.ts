// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PlayHub as RealHub } from "../../src/web/play-hub";
import { RoomScreen as RealRoom } from "../../src/web/room-screen";
import { CapacityHubFixture, CapacityRoomFixture } from "./capacity-ui-fixture";
const mocked = !!process.env.WORDPAIRS_CAPACITY_FIXTURE;
type HubView=React.ComponentType<React.ComponentProps<typeof RealHub>>;
type RoomView=React.ComponentType<React.ComponentProps<typeof RealRoom>>;
const Hub:HubView = mocked ? CapacityHubFixture : RealHub;
const Room:RoomView = mocked ? CapacityRoomFixture : RealRoom;
vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),push:vi.fn()})}));
vi.mock("../../src/web/use-room-updates",()=>({useRoomUpdates:()=>true}));
vi.mock("../../src/web/game-panel",()=>({GamePanel:()=>React.createElement("div",null,"Existing game")}));
vi.mock("../../src/web/identity-panel",()=>({ProfileIcon:()=>null,IdentityPanel:({onProfile}:{onProfile:(profile:unknown)=>void})=>{React.useEffect(()=>{onProfile({id:"p1",alias:"Player One"});},[onProfile]);return null;}}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function verifyCreationInput(Component:HubView){
  vi.stubGlobal("React",React);
  const view=render(React.createElement(Component,{oidcEnabled:false}));
  const input=await view.findByLabelText(/Maximum players/) as HTMLInputElement;
  expect(view.getByLabelText("Maximum players (2–10)")).toBe(input);
  expect(input.min).toBe("2");expect(input.max).toBe("10");expect(input.value).toBe("4");
  for(const count of [11,15,16,25]){fireEvent.change(input,{target:{value:String(count)}});expect(input.checkValidity()).toBe(false);}
  fireEvent.change(input,{target:{value:"10"}});expect(input.checkValidity()).toBe(true);
}
it("CAP10 exposes a 2 through 10 creation input, preserves default4 and browser validation blocks11/15/16/25",()=>verifyCreationInput(Hub));
it("CAP10 creation sends ten and leaves the observer setting separate",async()=>{
  vi.stubGlobal("React",React);
  const requests:Record<string,unknown>[]=[];
  vi.stubGlobal("fetch",vi.fn(async(_url:unknown,init?:RequestInit)=>{if(init?.method === "POST") requests.push(JSON.parse(init.body as string)); return new Response(JSON.stringify({roomId:"created"}));}));
  const view=render(React.createElement(Hub,{oidcEnabled:false}));
  const input=await view.findByLabelText("Maximum players (2–10)");
  fireEvent.change(input,{target:{value:"10"}});fireEvent.click(view.getByRole("button",{name:/^Create room$/}));
  await waitFor(()=>expect(requests).toHaveLength(1));
  expect(requests[0]).toMatchObject({action:"create",capacity:10});
});
async function verifyLegacyRoom(Component:RoomView,status:string,count:number){
  vi.stubGlobal("React",React);vi.spyOn(globalThis,"setInterval").mockReturnValue(0 as never);
  const players=Array.from({length:count},(_,index)=>({id:`p${index+1}`,alias:index === 0 ? "Player One" : `Player ${index+1}`,icon:"owl",ready:false}));
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({roomId:"legacy",version:0,capacity:25,capacityBlocked:true,status,discoverable:false,availableSlots:0,role:"player",actorId:"p1",inviterId:null,followedPlayerId:null,players,observers:[],observerCount:0,canJoinPlayer:false,canObserve:false}))));
  const view=render(React.createElement(Component,{reference:"legacy",invitation:null,oidcEnabled:false}));
  await view.findByRole("button",{name:/^Leave room$/});
  expect(view.getByRole("alert").textContent).toBe("This room predates the 10-player limit. Leave and create or join a new room.");
  expect((view.getByRole("button",{name:/^Leave room$/}) as HTMLButtonElement).disabled).toBe(false);
  expect(view.queryByRole("button",{name:/^Mark ready$/})).toBeNull();
}
it.each([11,15,20,25].flatMap(count=>["waiting","countdown"].map(status=>({count,status}))))("CAP10 legacy$count $status explains the block and retains Leave without readiness",({count,status})=>verifyLegacyRoom(Room,status,count));
it("rejects wrong fifteen-player UI using the same creation assertions",async()=>{
  const WrongHub:HubView=props=>React.createElement(CapacityHubFixture,{...props,kind:"wrong-player-limit"});
  await expect(verifyCreationInput(WrongHub)).rejects.toThrow();
});
it.each(["waiting","countdown"])("rejects wrong legacy %s UI using the same notice/Leave/readiness assertions",async status=>{
  const WrongRoom:RoomView=props=>React.createElement(CapacityRoomFixture,{...props,kind:"wrong-legacy"});
  await expect(verifyLegacyRoom(WrongRoom,status,11)).rejects.toThrow();
});
