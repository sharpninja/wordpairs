import * as React from "react";
const notice = "This room predates the 10-player limit. Leave and create or join a new room.";
export function CapacityHubFixture({kind=process.env.WORDPAIRS_CAPACITY_FIXTURE}:{kind?:string;oidcEnabled:boolean}) {
  const maximum = kind === "wrong-player-limit" ? 15 : 10;
  const [count, setCount] = React.useState(4);
  return React.createElement("form", {onSubmit:(event: React.FormEvent)=>{event.preventDefault();void fetch("/api/rooms",{method:"POST",body:JSON.stringify({action:"create",capacity:count})});}},
    React.createElement("label",{htmlFor:"capacity"},`Maximum players (2–${maximum})`),
    React.createElement("input",{id:"capacity",type:"number",min:2,max:maximum,value:count,onChange:(event:React.ChangeEvent<HTMLInputElement>)=>setCount(Number(event.target.value))}),
    React.createElement("button",{type:"submit"},"Create room"));
}
export function CapacityRoomFixture({kind=process.env.WORDPAIRS_CAPACITY_FIXTURE}:{kind?:string;reference:string;invitation:string|null;oidcEnabled:boolean}) {
  const [snapshot,setSnapshot] = React.useState<{status:string;capacityBlocked?:boolean}|null>(null);
  React.useEffect(()=>{void fetch("/api/rooms/legacy").then(r=>r.json()).then(setSnapshot);},[]);
  if (!snapshot) return null;
  const blocked = snapshot.capacityBlocked && kind !== "wrong-legacy";
  return React.createElement("section",null,
    blocked ? React.createElement("p",{role:"alert"},notice) : null,
    !blocked && snapshot.status === "waiting" ? React.createElement("button",null,"Mark ready") : null,
    React.createElement("button",null,"Leave room"));
}
