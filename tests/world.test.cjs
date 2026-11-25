const assert = require('node:assert/strict');
const { test } = require('node:test');
const PC = require('../src/world.js');
const game = () => new PC.Game();
function run(g, seconds, input = {}) {
  for (let i = 0; i < Math.round(seconds * 30); i++) g.tick(1 / 30, input, 0);
}
function place(g, point) {
  const location = { x: point.x, z: point.z };
  Object.assign(g.player, location);
  if (g.vehicle) Object.assign(g.vehicle, location, { speed: 0 });
}
test('ten-minute soak keeps intersections clear and all drivers circulating',()=>{
  const g=game(),previous=g.traffic.map(c=>({...c})),idle=g.traffic.map(()=>0);
  for(let frame=0;frame<18000;frame++){
    g.tick(1/30);
    if(frame%10)continue;
    g.traffic.forEach((c,i)=>{
      if(PC.dist(previous[i],c)<.35)idle[i]+=1/3;
      else{idle[i]=0;previous[i]={x:c.x,z:c.z}}
      assert.ok(idle[i]<35,'Intersection stalled driver '+i);
      for(let j=0;j<i;j++)assert.ok(PC.dist(g.traffic[j],c)>4,'Overlapping traffic');
    })
  }
});
test('a traffic collision alerts patrol and a stopped driver is busted',()=>{
  const g=game(),other=g.traffic[0];g.money=180;place(g,{x:other.x,z:other.z+3.45});g.vehicle.h=0;g.vehicle.speed=14;
  g.tick(1/30);assert.equal(g.alert?.level,1);const resumed=new PC.Game(g.save());assert.equal(resumed.alert.level,1);
  place(g,{x:g.patrol.x+5,z:g.patrol.z});for(let i=0;i<65;i++)g.patrolTick(1/30);
  assert.equal(g.alert,null);assert.equal(g.money,115);assert.equal(g.busted.fine,65);
});
test('Sol stays with her pickup car, then remains at the club',()=>{
  const g=game();g.startJob('fare');place(g,g.objective());g.interact();
  g.toggleCar();place(g,g.cars[1]);g.toggleCar();place(g,PC.stops.club);assert.ok(!g.advance());
  const restored=new PC.Game(g.save());assert.equal(restored.job.passengerCar,0);
  g.toggleCar();place(g,g.cars[0]);g.toggleCar();place(g,PC.stops.club);assert.ok(g.advance());
  assert.equal(new PC.Game(g.save()).sol.z,PC.stops.club.z);
});
test('the paint shop charges once for the selected car and saves its new finish',()=>{
  const g=game();assert.ok(!g.respray(PC.carColors[1]));place(g,PC.garage);assert.ok(!g.respray(PC.carColors[1]));
  g.money=180;assert.ok(g.respray(PC.carColors[1]));assert.ok(!g.respray(PC.carColors[1]));
  const restored=new PC.Game(g.save());assert.equal(restored.vehicle.color,PC.carColors[1]);assert.equal(restored.money,100)
});
test('acceleration, steering, braking, car exit, walking and re-entry', () => {
  const g = game();
  run(g, 1.3, { up: true }); assert.ok(g.player.z < 43);
  assert.equal(g.toggleCar(), true); assert.equal(g.toggleCar(),true);
  run(g, .25, { up: true, right: true }); assert.ok(g.player.h > 0);
  run(g, 2, { brake: true }); assert.ok(g.vehicle.speed < .2);
  assert.ok(g.toggleCar()); const start = { ...g.player };
  run(g, .4, { left: true }); assert.ok(PC.dist(start, g.player) > .2);
  assert.ok(g.toggleCar()); assert.equal(g.player.car, 0);
});
test('passenger contract enforces pickup and stop conditions, settles once and survives reload', () => {
  const g = game(); assert.ok(g.startJob('fare')); assert.ok(!g.startJob('vinyl')); assert.ok(!g.advance());
  place(g, g.objective()); g.vehicle.speed = 4; assert.ok(!g.advance());
  g.vehicle.speed = 0; g.interact(); assert.equal(g.sol.state, 'riding');
  const resumed = new PC.Game(JSON.parse(JSON.stringify(g.save()))); assert.equal(resumed.sol.state, 'riding');
  place(resumed,resumed.objective()); resumed.interact(); resumed.interact();
  assert.equal(resumed.money,180); assert.deepEqual(resumed.done,['fare']); assert.equal(resumed.sol.state,'host');
});
test('both courier stops require on-foot handoffs', () => {
  const g=game();g.startJob('vinyl');place(g,g.objective());assert.ok(!g.advance());assert.ok(g.toggleCar());
  place(g,g.objective());g.interact();assert.equal(g.job.stage,1);
  place(g,g.objective());g.interact();assert.equal(g.money,260);assert.equal(g.job,null);
});
test('rally checkpoints require the correct order, time out, and pay on completion', () => {
  const g=game();g.startJob('rally');place(g,g.objective());g.advance();assert.equal(g.job.remaining,90);
  place(g,PC.stops.lookout);run(g,.1);assert.equal(g.job.stage,1);g.job.remaining=.01;run(g,.1);assert.equal(g.job,null);
  g.startJob('rally');place(g,g.objective());g.advance();for(let i=0;i<4;i++){place(g,g.objective());run(g,.1)}
  assert.equal(g.money,420);assert.deepEqual(g.done,['rally']);
});
test('every film roll is reachable, collectible once, and saved', () => {
  const g=game();g.toggleCar();for(const f of PC.film){assert.ok(PC.allowed(f,.4),'unreachable roll '+JSON.stringify(f));place(g,f);g.interact();g.interact()}
  assert.equal(g.money,250);assert.equal(new PC.Game(g.save()).found.length,5);
});
test('the entire NPC population navigates, crosses, and stays within the playable city', () => {
  const g=game(),start=g.people.map(p=>({...p})),walked=new Set(),crossed=new Set(),turned=new Set(),trafficStarts=g.traffic.map(c=>({...c}));
  for(let frame=0;frame<5400;frame++){
    g.tick(1/30);
    if(frame%15)continue;
    for(const p of g.people){
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=-41&&p.x<=420&&p.z>=-216&&p.z<=148);
      assert.ok(!PC.buildings.some(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2),'pedestrian entered building');
      if(PC.dist(start[p.id],p)>2)walked.add(p.id);if(p.state==='cross')crossed.add(p.id)
    }
    for(let i=0;i<g.traffic.length;i++){const c=g.traffic[i];assert.ok(Number.isFinite(c.h)&&c.x>=-9&&c.x<=417&&c.z>=-213&&c.z<=145);if(c.a.i!==trafficStarts[i].a.i||c.a.j!==trafficStarts[i].a.j)turned.add(i)}
  }
  assert.equal(walked.size,76);assert.ok(crossed.size>15);assert.equal(turned.size,g.traffic.length);assert.equal(g.sol.state,'host');
});
test('traffic stops at its red light and resumes on green', () => {
  const g=game(),c=g.traffic[0];g.traffic=[c];g.people=[];c.z=c.b.z-13;c.speed=0;g.time=10-c.b.z/68*2;
  for(let n=0;n<20;n++)g.trafficTick(c,1/30);assert.equal(c.state,'road');assert.equal(c.speed,0);
  g.time=3-c.b.z/68*2;for(let n=0;n<300;n++)g.trafficTick(c,1/30);assert.notEqual(c.a.z,-204);
});
test('pedestrian conversation, world boundaries, and guarded save recovery', () => {
  const g=game();g.toggleCar();place(g,g.sol);g.interact();assert.equal(g.notice.title,'Sol');
  place(g,{x:-40,z:40});run(g,5,{left:true});assert.ok(g.player.x>=-41);
  const malformed=new PC.Game({v:1,player:{x:Infinity,z:NaN},cars:[{}],job:{id:'invalid'},found:[-1,100]});
  assert.equal(malformed.job,null);assert.equal(malformed.found.length,0);assert.equal(malformed.player.x,3.25);
});

test('motorcycle mounts, drives, stops on dismount and restores',()=>{
 const g=game();g.toggleCar();place(g,g.cars[5]);assert.ok(g.toggleCar());assert.equal(g.vehicle.bike,true);run(g,1,{up:true});assert.ok(g.vehicle.speed>1);assert.ok(g.toggleCar());assert.equal(g.vehicle,null);assert.equal(g.cars[5].speed,0);assert.equal(new PC.Game(g.save()).player.car,null)
});
test('a car and motorcycle stop at signal poles, lamp posts and palm trunks',()=>{
 for(const id of [0,5])for(const obstacle of [{x:8.75,z:8.75},PC.props.find(p=>p.kind==='lamp'),PC.props.find(p=>p.kind==='palm')]){const g=game();g.player.car=id;place(g,{x:obstacle.x,z:obstacle.z+6});g.vehicle.h=0;g.vehicle.speed=20;run(g,1,{up:true});assert.ok(g.vehicle.z>obstacle.z+.6);assert.ok(g.vehicle.speed<1)}
});

test('shore boarding, steering, sea bounds, save, and safe disembarkation',()=>{
 const g=game();g.toggleCar();place(g,{x:-38,z:44});assert.ok(g.toggleCar());assert.ok(g.vehicle.boat);run(g,1,{up:true,left:true});assert.ok(g.player.z<44&&g.player.x< -45);const re=new PC.Game(g.save());assert.ok(re.vehicle.boat);assert.equal(re.player.x,g.player.x);place(g,{x:-129,z:0});g.vehicle.h=-Math.PI/2;run(g,2,{up:true});assert.equal(g.player.x,-130);assert.ok(!g.toggleCar());place(g,{x:-45,z:10});assert.ok(g.toggleCar());assert.ok(PC.allowed(g.player,.4))
});
test('Nell and Frankie give missions and pay for completing their handoffs',()=>{
 for(const [person,id,fee] of [['Nell','buoy',390],['Frankie','relay',320]]){const g=game();g.toggleCar();place(g,g.people.find(p=>p.name===person));g.interact();assert.equal(g.job.id,id);assert.equal(g.job.stage,1);if(id==='buoy'){place(g,g.objective());assert.ok(!g.advance());place(g,{x:-38,z:44});assert.ok(g.toggleCar());place(g,g.objective());g.interact();place(g,{x:-45,z:44});g.toggleCar()}else{place(g,g.objective());g.interact()}place(g,g.objective());g.interact();assert.equal(g.money,fee);assert.equal(g.job,null)}
});

test('walk into all three interiors, reach staff, save, deliver, return for payment and exit',()=>{
 for(const r of PC.rooms){const g=game();g.toggleCar();const visit=(room)=>{place(g,{x:room.x-3,z:room.z});run(g,.65,{right:true});assert.equal(g.entrance()?.id,room.id);assert.ok(g.doorway());run(g,1.7,{up:true});assert.ok(g.atHost());assert.ok(new PC.Game(g.save()).atHost())};const leave=()=>{run(g,2,{down:true});assert.ok(g.atExit());assert.ok(g.doorway());assert.equal(g.inside,null)};
 visit(r);assert.ok(g.startJob(r.job));assert.ok(!g.advance());leave();const destination=PC.rooms.find(x=>x.id===g.objective().room);visit(destination);assert.ok(g.advance());leave();visit(r);assert.ok(g.advance());assert.equal(g.money,PC.contracts.find(c=>c.id===r.job).fee);leave()}
});

test('actual pedestrian contact dispatches police, who reach and arrest a stationary suspect',()=>{
  for(const id of [0,5]){const g=game();g.player.car=id;place(g,{x:g.sol.x,z:g.sol.z+3.5});g.vehicle.h=0;run(g,1.1,{up:true});
  assert.equal(g.alert?.level,2);assert.ok(g.officer);run(g,30);assert.ok(g.busted);assert.equal(g.player.car,null);assert.equal(g.alert,null);assert.ok(new PC.Game(g.save()).busted)}
});

test('six wanted tiers dispatch independent moving cars and restore reinforcements on reload',()=>{
 const g=game();const original=g.traffic.length;
 for(let tier=1;tier<=6;tier++){g.time+=5;g.reportCrash();assert.equal(g.alert.level,tier);assert.equal(g.patrols.length,tier);assert.equal(g.traffic.length,original+tier-1)}
 const resumed=new PC.Game(g.save());assert.equal(resumed.patrols.length,6);assert.equal(new Set(resumed.patrols.map(c=>c.id)).size,6);
 const before=resumed.patrols.map(c=>({...c}));run(resumed,.75);assert.ok(resumed.patrols.slice(1).every((c,i)=>c.state==="blocking"?Math.abs(c.h-before[i+1].h)>.01:PC.dist(c,before[i+1])>.01))
});
test('driving out of sight drops stars one at a time and releases responding units',()=>{
 const loc={x:3.25,z:120,h:0};const g=new PC.Game({v:1,alert:2,player:{...loc,car:0},cars:[loc]});run(g,13,{up:true});assert.equal(g.alert.level,1);assert.equal(g.patrols.length,1);run(g,9,{up:true});assert.equal(g.alert,null);assert.ok(!g.busted);assert.equal(g.notice.title,'Escaped')
});
test('a patrol spotting the player again resets the search countdown',()=>{
 const g=game();g.reportCrash(true);g.alert.unseen=7.5;g.alert.scan=0;place(g,{x:g.patrol.x,z:g.patrol.z+2});g.patrolTick(.1);assert.equal(g.alert.unseen,0);assert.equal(g.alert.level,2)
});

test('NPC cars, ridden motorcycles and patrol cars can be taken, driven, saved and re-entered',()=>{
 for(const kind of ['car','bike','patrol']){
   const g=game(),npc=g.traffic.find(c=>kind==='patrol'?c.patrol:!c.patrol&&!!c.bike===(kind==='bike'));
   g.toggleCar();const before={...npc};run(g,.7);assert.ok(PC.dist(npc,before)>.1);
   place(g,{x:npc.x+2,z:npc.z});const people=g.people.length,location={...npc};
   assert.equal(g.nearestCar(),npc);assert.ok(g.toggleCar());assert.equal(g.people.length,people+1);assert.ok(g.vehicle.acquired);assert.equal(g.vehicle.bike,kind==='bike');assert.equal(g.vehicle.cruiser,kind==='patrol');
   assert.equal(PC.dist(location,g.vehicle),0);assert.ok(PC.dist(location,npc)>20);
   const dismounted=g.people.at(-1),footStart={...dismounted};run(g,3,{up:true});assert.ok(PC.dist(g.vehicle,location)>1);assert.ok(PC.dist(dismounted,footStart)>.2);
   const restored=new PC.Game(g.save()),id=g.vehicle.id;assert.equal(restored.vehicle.id,id);assert.equal(restored.vehicle.color,g.vehicle.color);assert.ok(restored.toggleCar());assert.ok(restored.toggleCar());assert.equal(restored.vehicle.id,id)
 }
});

for(const bike of [false,true])test('Displaced '+(bike?'rider':'driver')+' protests; only a witnessed takeover starts a chase',()=>{
 for(const sight of ['visible','behind','wall','distant']){
  const g=game();g.toggleCar();const v=g.traffic.find(c=>!c.patrol&&!!c.bike===bike);
  // The café occupies x=43..53. Its walls separate the last pair of nearby observers.
  Object.assign(v,sight==='wall'?{x:48,z:10}:{x:0,z:19});place(g,{x:v.x+1,z:v.z});
  Object.assign(g.patrol,{x:sight==='wall'?48:sight==='distant'?135:0,z:sight==='wall'?28:31,h:sight==='behind'?Math.PI:0});
  assert.ok(g.toggleCar());const npc=g.people.at(-1);assert.equal(npc.protest.vehicle,g.vehicle.id);assert.match(g.notice.title,bike?/bike/:/car/);
  assert.equal(!!g.alert,sight==='visible');if(g.alert){assert.equal(g.alert.level,1);assert.ok(g.officer)}
  g.pedTick(npc,.1);assert.ok(Number.isFinite(npc.h));g.time+=2.1;g.pedTick(npc,.1);assert.ok(!npc.protest);
  g.toggleCar();g.toggleCar();assert.equal(g.alert?.level||0,sight==='visible'?1:0)
 }
});

test('high-star units cover four approach directions and physically hold a lane',()=>{
 const g=game();place(g,{x:139.25,z:0});g.vehicle.h=g.player.h=0;
 for(let i=0;i<6;i++){g.time+=5;g.reportCrash()}
 const quadrants=new Set(g.patrols.slice(1).map(c=>Math.abs(c.x-g.player.x)>Math.abs(c.z-g.player.z)?(c.x>g.player.x?'E':'W'):(c.z>g.player.z?'S':'N')));
 assert.equal(quadrants.size,4);const blockers=g.patrols.filter(c=>c.state==='blocking');assert.equal(blockers.length,2);
 const b=blockers[0],origin={...b};for(let i=0;i<60;i++)g.trafficTick(b,1/30);assert.equal(PC.dist(b,origin),0);assert.ok(Math.abs(PC.angle(b.h,b.blockHeading))<.02);
 place(g,{x:b.x,z:b.z+4});g.vehicle.h=0;g.vehicle.speed=12;
 for(let n=0;n<20;n++)g.driveContact(g.vehicle,0,-.2);assert.ok(g.vehicle.z>b.z+1);
});
test('cars and bikes can reverse and steer away from tree, light and vehicle corners',()=>{
 for(const id of [0,5])for(const kind of ['palm','lamp','car']){
 const g=game();g.player.car=id;const ob=kind==='car'?g.cars[2]:PC.props.find(p=>p.kind===kind);
 place(g,{x:ob.x+.34,z:ob.z+4.9});g.vehicle.h=0;g.vehicle.speed=12;run(g,.7,{up:true});
 const start={...g.vehicle};run(g,1.6,{down:true,right:true});assert.ok(PC.dist(g.vehicle,start)>1.8,kind+' corner blocked reverse');
 }
});

function offshore(stars){const g=game(),position={x:-97,z:100,h:0};Object.assign(g.cars[7],position);Object.assign(g.player,position,{car:7});g.money=390;g.startPursuit(stars,g.player);return g}
test('air dispatch at four stars and marine escalation at five, with moving units restored on reload',()=>{
 for(const [stars,boats] of [[1,1],[3,1],[4,1],[5,2],[6,2]]){const g=offshore(stars);g.tick(1/120);assert.equal(!!g.air,stars>=4);assert.equal(g.marine.length,boats);
 const initial=g.marine.map(m=>({...m}));const air=g.air&&{...g.air};run(g,.5,{up:true});assert.ok(g.marine.every((m,i)=>PC.dist(m,initial[i])>1&&m.x<=-44));if(air)assert.ok(PC.dist(air,g.air)>1);
 const copy=new PC.Game(JSON.parse(JSON.stringify(g.save())));assert.deepEqual(copy.marine,g.marine);assert.deepEqual(copy.air,g.air)}
});
test('four-star helicopter and marine chase can end in a complete offshore escape',()=>{
 const g=offshore(4),levels=[];for(let i=0;i<4800&&g.alert;i++){if(levels.at(-1)!==g.alert.level)levels.push(g.alert.level);g.tick(1/120,{up:true})}
 assert.deepEqual(levels,[4,3,2,1]);assert.equal(g.alert,null);assert.equal(g.air,null);assert.equal(g.marine.length,0);assert.ok(!g.busted);assert.ok(g.vehicle.boat);assert.equal(g.notice.title,'Escaped')
});
test('police boats can board a slowed speedboat offshore while land units are out of reach',()=>{
 const g=offshore(4);run(g,1.5,{up:true});let boarding=false;for(let n=0;n<1200&&!g.busted;n++){if(g.marine.some(m=>PC.dist(m,g.player)<4.5))boarding=true;assert.ok(PC.dist(g.officer||g.patrol,g.player)>30);assert.ok(g.patrols.every(c=>PC.dist(c,g.player)>30));g.tick(1/120,{brake:true})}
 assert.ok(boarding);assert.equal(g.busted?.fine,260);assert.equal(g.money,130);assert.equal(g.alert,null);assert.equal(g.air,null);assert.equal(g.marine.length,0)
});

test('pilot boards, lifts off, steers, saves in flight, lands and exits on foot',()=>{
 const g=game();g.toggleCar();const heli=g.cars.find(v=>v.heli);place(g,{x:heli.x+2,z:heli.z});assert.ok(g.toggleCar());assert.equal(g.vehicle,heli);
 run(g,1.5,{rise:true});assert.ok(heli.alt>10);assert.equal(g.toggleCar(),false);const before={...heli};run(g,.8,{up:true,right:true});assert.ok(PC.dist(before,heli)>1);assert.ok(heli.h>0);
 const resumed=new PC.Game(g.save());assert.equal(resumed.vehicle.alt,heli.alt);assert.equal(resumed.vehicle.heli,true);run(resumed,3,{descend:true,brake:true});assert.equal(resumed.vehicle.alt,0);assert.ok(resumed.toggleCar());assert.equal(resumed.vehicle,null)
});
test('take a docked or pursuing police launch, drive it, reload and disembark',()=>{
 for(const atDock of [true,false]){
 const g=atDock?game():offshore(2);if(atDock){g.toggleCar();place(g,{x:-39,z:64})}else{g.supportTick(0);place(g,{x:g.marine[0].x+1,z:g.marine[0].z})}
 assert.ok(g.toggleCar());assert.ok(g.vehicle.policeBoat);assert.ok(g.alert);const initial={...g.vehicle};run(g,1.1,{up:true});assert.ok(PC.dist(initial,g.vehicle)>2);const copy=new PC.Game(g.save());assert.ok(copy.vehicle.boat&&copy.vehicle.policeBoat);assert.equal(copy.vehicle.id,g.vehicle.id);
 place(copy,{x:-45,z:75});assert.ok(copy.toggleCar());assert.equal(copy.vehicle,null)
 }
});
