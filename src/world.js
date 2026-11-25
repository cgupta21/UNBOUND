const PC = (() => {
  const xs=[0,68,136,204,272,340,408], zs=[-204,-136,-68,0,68,136], TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function seed(s){return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
  const rand=seed(731), solids=[], buildings=[], lots=[], props=[];
  const paints=['#ef8d78','#89b8ad','#dfb5a0','#f5ca9a','#aba2b9','#e1cfc0','#89aeb7'];
  function block(x,z,w,d,h,paint,type,sign=''){const b={x,z,w,d,h,paint,type,sign,seed:Math.floor(rand()*65535)};buildings.push(b);solids.push(b);return b}
  const names=['PALMA','SUNDIAL','AZURE','MIRAGE','OCEAN CLUB','BAY RECORDS','PARADISO','LIDO','RIVIERA','NOVA'];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<5;j++){
    const x=xs[i]+34,z=zs[j]+34,park=(i===1&&j===2)||(i===2&&j===4);
    lots.push({i,j,x,z,park});
    if(park)continue;
    if(i===4&&j===3){block(x,z,37,36,12,'#e794ad','deco','NEON GALLERIA');continue}
    if(i===5&&j===1){block(x,z,31,29,10,'#81bfb6','store','ARCADE 88');continue}
    if(i===0&&j===3){block(29,34,27,32,11,'#f1b293','deco','PALMA');block(48,19,10,11,5,'#8ec3b5','store','CAFE');continue}
    if(i===0&&j===2){block(31,-34,29,33,18,'#9bc9bd','deco','OCEAN CLUB');continue}
    if(i===0&&j===4){block(34,102,33,28,9,'#9dc8cb','deco','SURFSIDE');continue}
    const h=i===2&&j<3?20+rand()*23:7+rand()*15;
    block(x-8,z-7,19+rand()*5,19+rand()*5,h,paints[(i*3+j)%7],i===2?'tower':'deco',i===1&&j===3?'BAY RECORDS':i===1&&j===4?'PALMA AUTO':names[(i*3+j)%10]);
    block(x+10,z+12,15,12,4+rand()*6,paints[(i+j+2)%7],'store',names[(i*4+j+3)%10]);
  }
  // Thin tree trunks, shelters and street furniture share the movement collision grid.
  function prop(kind,x,z,size=1){props.push({kind,x,z,size,seed:Math.floor(rand()*1e5)});if(['palm','lamp','booth','kiosk'].includes(kind))solids.push({x,z,w:kind==='kiosk'?5:.65,d:kind==='kiosk'?3:.65})}
  for(let z=-215;z<151;z+=13){prop('palm',-12.6,z,0.88+rand()*.35);if(z%2)prop('bench',-17,z)}
  for(const l of lots){
    for(const f of [-1,1]){prop('palm',l.x-21,l.z+f*16,.74+rand()*.30);prop('lamp',l.x+f*16,l.z-24)}
    if(l.park)for(let k=0;k<10;k++)prop(k%3?'palm':'bench',l.x+(rand()-.5)*32,l.z+(rand()-.5)*32,.8+rand()*.35)
  }
  for(let z=-186;z<145;z+=29){prop('umbrella',-31-rand()*7,z,1);prop('towel',-35,z+2)}
  prop('kiosk',-20,-87);prop('kiosk',-20,91);
  const stops={
    hotel:{x:9.5,z:32,label:'Palma Hotel'},club:{x:9.5,z:-38,label:'Ocean Club'},beach:{x:-9.8,z:94,label:'Coral Beach'},
    records:{x:78,z:26,label:'Bay Records'},park:{x:100,z:-58,label:'Marina Gardens'},lookout:{x:195,z:-165,label:'Skyline Lookout'}
  };
  const docks=[{x:-45,z:44,label:'South Jetty'},{x:-45,z:-145,label:'North Jetty'}];
  const sea=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=-130&&p.x<=-44&&p.z>=-211&&p.z<=141;
  const rooms=[
    {id:'lobby',label:'Palma Hotel',host:'Alma',job:'guestlist',color:'#eb8bab',wall:'#8abfb7',b:buildings.find(b=>b.x===29&&b.z===34),pitch:'The rooftop band starts at midnight. Take our guest list to Cleo at Bay Records and bring back the stamped copy.'},
    {id:'vinylroom',label:'Bay Records',host:'Cleo',job:'testpress',color:'#65d3ce',wall:'#8a789e',b:buildings.find(b=>b.sign==='BAY RECORDS'&&b.x===94&&b.z===27),pitch:'I pressed one copy of our new single. Take it to Alma at the hotel and bring me her listening notes.'},
    {id:'cafe',label:'Palma Café',host:'Luis',job:'breakfast',color:'#f6b369',wall:'#aba0be',b:buildings.find(b=>b.sign==='CAFE'),pitch:'The hotel desk ordered breakfast for the night shift. Deliver the box to Alma, then come back for your pay.'}
  ];
  rooms.push({id:'mall',label:'Neon Galleria',host:'Luz',job:'opening',color:'#f489c9',wall:'#78b4ba',b:buildings.find(b=>b.sign==='NEON GALLERIA'),pitch:'Opening night starts in an hour. Bring the guest passes to Alma and return with the hotel reservations.'},
    {id:'arcade',label:'Arcade 88',host:'Dex',job:'tournament',color:'#89dbe6',wall:'#9d85aa',b:buildings.find(b=>b.sign==='ARCADE 88'),pitch:'The tournament needs a sound check. Take our music cue to Cleo and bring the approved mix back.'});
  for(const r of rooms){r.x=r.b.x-r.b.w/2-1.2;r.z=r.b.z;if(r.id==="cafe"){r.x=r.b.x;r.z=r.b.z-r.b.d/2-1.2}r.room=r.id}
  const roomJobs=rooms.map((r,i)=>{const target=rooms[i===0||i===4?1:0];return {id:r.job,name:['The velvet list','First pressing','Breakfast after dark','Galleria opening night','Arcade sound check'][i],type:'Local favor',fee:[240,300,160,360,400][i],desc:r.pitch,stages:[[target,'Meet '+target.host,'foot'],[r,'Return to '+r.host,'foot']]}});
  const contracts=[...roomJobs,
    {id:'relay',name:'The midnight broadcast',type:'Radio courier',fee:320,desc:'Meet Frankie for a demo tape, get Paz to record a beach intro, then return the master to Frankie.',stages:[['records','Meet Frankie for the tape','foot'],['beach','Record Paz’s introduction','foot'],['records','Return the master to Frankie','foot']]},
    {id:'buoy',name:'The missing buoy',type:'Harbor salvage',fee:390,desc:'Talk to skipper Nell at South Jetty. Pilot a speedboat to the offshore buoy, recover its recorder, then take it back to Nell.',stages:[[{x:-38,z:44,label:'South Jetty'},'Speak to Nell','foot'],[{x:-91,z:-65,label:'Offshore buoy'},'Recover the recorder','boat'],[{x:-38,z:44,label:'South Jetty'},'Give Nell the recorder','foot']]},
    {id:'fare',name:'Last fare to the club',type:'Passenger',fee:180,desc:'Pick up Sol at the Palma Hotel and drive her to Ocean Club.',stages:[['hotel','Pick up Sol','car'],['club','Drop off Sol','car']]},
    {id:'vinyl',name:'The vinyl run',type:'Courier',fee:260,desc:'Collect a record crate on foot at Bay Records, then deliver it to Coral Beach.',stages:[['records','Collect the records','foot'],['beach','Deliver the records','foot']]},
    {id:'rally',name:'Coastline time trial',type:'Time trial',fee:420,desc:'Reach the starting line in a car, then pass four gates in 90 seconds.',stages:[['beach','Start the time trial','car'],[{x:3.4,z:-63,label:'Ocean Drive'},'Pass gate 1','gate'],[{x:64.5,z:-132.5,label:'Arts Quarter'},'Pass gate 2','gate'],[{x:140,z:-137,label:'Skyline Avenue'},'Pass gate 3','gate'],['lookout','Cross the finish line','gate']]}
  ];
  const film=[{x:-20,z:18},{x:102,z:-43},{x:163,z:102},{x:-21,z:-160},{x:188,z:-178}];
  const carColors=['#ec704f','#4aaeb5','#f5c563','#d9ded2','#9476ad','#6387b3','#b84b56'];
  for(const x of xs)for(const z of zs)for(const f of [-1,1])solids.push({x:x+8.75*f,z:z+8.75*f,w:.65,d:.65});
  const garage={x:77.8,z:94,label:'Palma Auto'};
  function car(id,x,z,h,color,style=0){return {id,x,z,h,color,style,speed:0,steer:0}}
  const pedColors=['#ed8d47','#74bbaf','#eecc71','#657ea4','#e1839a','#dcd1aa','#829b66'];
  const first=['Mara','Rafa','Nina','Beau','Inez','Leo','Tess','Kai','Milo','Ada','Rio','Jules'];
  const chatter=['“The sunset looks best from the beach.”','“I left a film roll somewhere near the gardens.”','“Bay Records gets new vinyl every Friday.”','“Ocean Drive runs all the way up the coast.”','“That hotel sign has been here longer than I have.”','“I always take the long way home.”'];
  const corner=(i,j,c)=>({x:xs[i]+[10.7,57.3,57.3,10.7][c],z:zs[j]+[10.7,10.7,57.3,57.3][c]});
  const roadNode=(i,j)=>({x:xs[i],z:zs[j],i,j});
  function neighbors(n){return [[1,0],[0,1],[-1,0],[0,-1]].map(([a,b])=>[n.i+a,n.j+b]).filter(([i,j])=>xs[i]!=null&&zs[j]!=null).map(([i,j])=>roadNode(i,j))}
  function lane(a,b){const h=Math.atan2(b.x-a.x,a.z-b.z);return {h,dx:Math.sin(h),dz:-Math.cos(h),rx:Math.cos(h)*3.25,rz:Math.sin(h)*3.25}}
  function signal(x,z,t){return (t+(Math.round(x/68)*3+Math.round(z/68)*2)+1600)%16}
  function allowed(p,r){return p.x>=-41+r&&p.x<=420-r&&p.z>=-216+r&&p.z<=148-r&&!solids.some(b=>Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.z-b.z)<b.d/2+r)}
  function move(p,dx,dz,r){let hit=false;if(allowed({x:p.x+dx,z:p.z},r))p.x+=dx;else hit=true;if(allowed({x:p.x,z:p.z+dz},r))p.z+=dz;else hit=true;return hit}
  function officerRoute(start,target){
    const snap=v=>Math.round(v/2)*2;
    const origin={x:snap(start.x),z:snap(start.z),cost:0,prev:null};const pending=[origin],seen=new Set();
    for(let i=0;pending.length&&i<1700;i++){
      const n=pending.pop(),key=n.x+','+n.z;if(seen.has(key))continue;seen.add(key);
      if(dist(n,target)<3){const path=[];for(let last=n;last.prev;last=last.prev)path.unshift(last);return path}
      for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){const q={x:n.x+dx,z:n.z+dz,cost:n.cost+2,prev:n};
        if(!seen.has(q.x+','+q.z)&&allowed(q,.34)&&allowed({x:n.x+dx/2,z:n.z+dz/2},.34)){q.score=q.cost+Math.abs(q.x-target.x)+Math.abs(q.z-target.z);pending.push(q)}}
      pending.sort((a,b)=>b.score-a.score)
    }return []
  }
  class Game{
    constructor(save){
      this.r=seed(8231);this.time=0;this.money=0;this.done=[];this.found=[];this.clock=17.6;this.job=null;this.notice=null;this.dirty=false;
      this.cars=[car(0,3.25,48,0,carColors[0]),car(1,-6,8,Math.PI,carColors[1],1),car(2,62,48,Math.PI,carColors[2],2),car(3,142,-95,0,carColors[4],1),car(4,198,80,Math.PI,carColors[3],2)];
      this.cars.push({...car(5,6.5,48,0,'#45c4be'),bike:true},{...car(6,265,88,Math.PI,'#cf6959'),bike:true});
      this.player={x:3.25,z:48,h:0,car:0,walk:0};this.traffic=[];this.people=[];
      for(let i=0;i<xs.length;i++)for(let j=0;j<zs.length-1;j++)if((i+j)%3!==2){
        const a=roadNode(i,j),b=roadNode(i,j+1),l=lane(a,b),t=.22+this.r()*.55;
        this.traffic.push({...car(30+this.traffic.length,a.x+l.rx,a.z+68*t,l.h,carColors[(i*4+j+1)%7],(i+j)%3),a,b,state:'road',cruise:6+this.r()*4,wait:0})
      }
      this.patrol=this.traffic.find(c=>c.a.i===1&&c.a.j===3);this.patrol.patrol=true;this.patrol.color='#455668';this.patrol.style=1;this.alert=null;this.lastImpact=-10;this.patrols=[this.patrol];this.air=null;this.marine=[];
      for(const c of this.traffic)c.bike=!c.patrol&&c.id%3===1;
      for(let k=0;k<60;k++){const i=Math.floor(k/5)%3,j=k%5,c=Math.floor(this.r()*4),dir=this.r()>.5?1:-1,a=corner(i,j,c),b=corner(i,j,(c+dir+4)%4),f=this.r();
        this.people.push({id:k,name:first[k%12],i,j,c:(c+dir+4)%4,dir,x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,target:b,h:0,step:this.r()*6,speed:1.15+this.r()*.65,wait:0,state:'walk',color:pedColors[k%7],skin:['#b77e5f','#905d45','#dcab86','#aa7056'][k%4]})
      }
      for(let k=0;k<8;k++){const n={...this.people[k],i:3,id:this.people.length};n.target=corner(3,n.j,n.c);n.x+=204-68*this.people[k].i;this.people.push(n)}
      this.sol={...this.people[0],id:this.people.length,name:'Sol',x:stops.hotel.x,z:stops.hotel.z,h:-1.35,color:'#f8cf61',state:'host',step:0};this.people.push(this.sol);
      for(const [name,pos,color] of [['Frankie',stops.records,'#ad819a'],['Paz',stops.beach,'#5bafae']])this.people.push({...this.sol,id:this.people.length,name,x:pos.x,z:pos.z,color});
      this.people.push({...this.sol,id:this.people.length,name:'Nell',x:-38,z:44,color:'#57c8c0'});for(const dock of docks)this.cars.push({...car(this.cars.length,dock.x,dock.z,0,'#dc80ac'),boat:true});
      for(let k=0;k<8;k++){const z=-190+k*42,x=-15.1-(k%2)*1.2;this.people.push({...this.people[k+2],id:this.people.length,x,z,promenade:true,target:{x,z:k%2?-209:138},state:'walk'})}
      if(save)this.restore(save);
      if(!this.cars.some(v=>v.heli))this.cars.push({...car(this.cars.length,-24,49,0,"#455668"),heli:true,alt:0,acquired:true});
      this.harborBoat=this.cars.some(v=>v.fromHarbor)?null:{x:-46,z:64,h:0,boat:true,id:820};
    }
    get vehicle(){return this.player.car===null?null:this.cars.find(c=>c.id===this.player.car)}
    notify(title,detail=''){this.notice={title,detail,until:this.time+4}}
    startJob(id){if(this.job||!contracts.some(c=>c.id===id))return false;this.job={id,stage:0,remaining:null};if(id==='fare')Object.assign(this.sol,{x:stops.hotel.x,z:stops.hotel.z,state:'host'});this.dirty=true;this.notify('Job accepted',this.objective().label);return true}
    objective(){if(!this.job)return null;const c=contracts.find(c=>c.id===this.job.id),[key,action,mode]=c.stages[this.job.stage];return {...(typeof key==='string'?stops[key]:key),action,mode,contract:c}}
    endJob(){if(this.job?.id==='fare'){const stop=this.job.stage===2?stops.club:stops.hotel;Object.assign(this.sol,{state:'host',x:stop.x,z:stop.z})}this.job=null;this.dirty=true}
    advance(){const obj=this.objective();if(!obj)return false;
      if(obj.room?(this.room?.id!==obj.room||!this.atHost()):this.inside)return false;
      if(dist(this.player,obj)>(obj.mode==='foot'?3.5:10.5))return false;
      if((obj.mode==='foot')!==!this.vehicle){this.notify(obj.mode==='foot'?'Step out of the car':'Bring a car to this stop');return false}
      if(obj.mode==='boat'&&!this.vehicle?.boat){this.notify('Bring a boat');return false}if(obj.mode==='boat'&&Math.abs(this.vehicle.speed)>2){this.notify('Slow down at the buoy');return false}
      if((obj.mode==='car'||obj.mode==='gate')&&(this.vehicle?.heli||this.vehicle?.boat)){this.notify('Bring a road vehicle');return false}
      if(obj.mode==='car'&&Math.abs(this.vehicle.speed)>1.7){this.notify('Stop the car');return false}
      if(this.job.id==='fare'&&this.job.stage===1&&this.player.car!==this.job.passengerCar){this.notify('Sol is in your other car','Return in the car you used at the hotel.');return false}
      const line=this.job.id==='relay'?['Frankie: Get Paz on the intro before the tide comes in.','Paz: That’s the take. Bring it back to Frankie.'][this.job.stage]:this.job.id==='buoy'?'Nell: Bring the recorder back to the south jetty.':null;this.job.stage++;this.dirty=true;
      if(this.job.stage===obj.contract.stages.length){this.money+=obj.contract.fee;if(!this.done.includes(this.job.id))this.done.push(this.job.id);this.notify('Job complete','+$'+obj.contract.fee+'  ·  '+obj.contract.name);this.endJob()}
      else{if(this.job.id==='fare'){this.sol.state='riding';this.job.passengerCar=this.player.car}if(this.job.id==='rally'&&this.job.stage===1)this.job.remaining=90;this.notify(line||(obj.mode==='gate'?'Gate cleared':'Objective complete'),this.objective().action+' · '+this.objective().label)}
      return true
    }
    entrance(){return !this.vehicle&&!this.inside&&rooms.find(r=>dist(this.player,r)<2.8)}
    get room(){return rooms.find(r=>r.id===this.inside?.id)}
    atHost(){return this.inside&&dist(this.inside,{x:0,z:-2.8})<2.7}
    atExit(){return this.inside&&dist(this.inside,{x:0,z:4.2})<1.9}
    doorway(){if(this.inside){if(!this.atExit())return false;this.inside=null;this.notify('Back on the street')}else{const r=this.entrance();if(!r)return false;this.inside={id:r.id,x:0,z:3.8,h:0,walk:0};Object.assign(this.player,{x:r.x,z:r.z});this.notify(r.label,'Walk to '+r.host+' and press E to talk.')}this.dirty=true;return true}
    nearbyPatrolBoat(){return [...this.marine,...(this.harborBoat?[this.harborBoat]:[])].filter(b=>dist(b,this.player)<8).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0]}
    takePoliceBoat(unit){
      const old=this.vehicle;if(old)old.speed=0;
      const v={...car(this.cars.length,unit.x,unit.z,unit.h,'#374f72'),boat:true,policeBoat:true,acquired:true,fromHarbor:unit===this.harborBoat};
      if(v.fromHarbor)this.harborBoat=null;else this.marine=this.marine.filter(b=>b!==unit);
      this.cars.push(v);Object.assign(this.player,{x:v.x,z:v.z,h:v.h,car:v.id});
      this.startPursuit(1,v);this.notify('Police launch taken','Marine patrol alerted.');this.dirty=true;return true
    }
    nearestCar(){return [...this.cars,...this.traffic,...this.marine,...(this.harborBoat?[this.harborBoat]:[])].filter(c=>dist(this.player,c)<(c.boat?8:4.8)).sort((a,b)=>dist(this.player,a)-dist(this.player,b))[0]}
    redeployTraffic(c){
      const origins=xs.flatMap((_,i)=>zs.map((_,j)=>roadNode(i,j))).sort((a,b)=>dist(b,this.player)-dist(a,this.player));
      for(const a of origins)for(const b of neighbors(a)){
        const l=lane(a,b),pos={x:a.x+l.rx+l.dx*24,z:a.z+l.rz+l.dz*24};
        if([...this.traffic,...this.cars].some(o=>o!==c&&dist(o,pos)<7))continue;
        Object.assign(c,pos,{a,b,h:l.h,speed:0,state:'road',yielding:false,wait:0});
        if(!c.patrol)c.color=carColors[(carColors.indexOf(c.color)+1)%carColors.length];return
      }
    }
    takeTraffic(driver){
      const witnessed=this.policeSee(driver,true);
      const v={...car(this.cars.length,driver.x,driver.z,driver.h,driver.color,driver.style),bike:!!driver.bike,cruiser:!!driver.patrol,acquired:true};
      this.cars.push(v);
      const spots=[1,-1,1.6,-1.6].map(n=>({x:v.x+n*2.6*Math.cos(v.h),z:v.z+n*2.6*Math.sin(v.h)}));
      const pos=spots.find(p=>allowed(p,.4)&&!this.traffic.some(o=>o!==driver&&dist(o,p)<2.2))||{x:this.player.x,z:this.player.z};
      let nearest,sidewalk;
      for(let i=0;i<xs.length-1;i++)for(let j=0;j<5;j++)for(let c=0;c<4;c++){const dest=corner(i,j,c);if(!sidewalk||dist(pos,dest)<dist(pos,sidewalk)){nearest={i,j,c};sidewalk=dest}}
      const id=this.people.length;
      this.people.push({...this.people[id%60],...nearest,...pos,id,name:first[id%first.length],target:sidewalk,state:'walk',wait:0,step:0,protest:{until:this.time+2,vehicle:v.id},joining:officerRoute(pos,sidewalk)});
      this.redeployTraffic(driver);
      if(witnessed)this.startPursuit(1,v);
      const shout=driver.bike?'Hey! Give me back my bike!':'Hey! That’s my car!';
      this.notify(first[id%first.length]+' · “'+shout+'”',witnessed?'Police witnessed the theft.':'');
      return v
    }
    nearestPed(){return this.people.filter(p=>p.state!=='riding'&&dist(this.player,p)<3.8).sort((a,b)=>dist(this.player,a)-dist(this.player,b))[0]}
    toggleCar(){
      const p=this.player,v=this.vehicle;if(this.inside)return false;
      if(v?.heli&&v.alt>.05){this.notify('Land before exiting','Hold C over clear ground.');return false}
      if(v?.boat){const unit=this.nearbyPatrolBoat();if(unit&&!v.policeBoat)return this.takePoliceBoat(unit);if(v.x< -47){this.notify('Return to shore','Bring the boat alongside the beach to disembark.');return false}v.speed=0;Object.assign(p,{car:null,x:-39,z:v.z,h:Math.PI/2});this.dirty=true;return true}
      if(v){v.speed=0;
        const spots=[-1,1,-1.6,1.6,-2,2].map(n=>({x:v.x+Math.cos(v.h)*2.1*n,z:v.z+Math.sin(v.h)*2.1*n}));const s=spots.find(s=>allowed(s,.4)&&![...this.traffic,...this.cars].some(c=>c!==v&&dist(c,s)<1.55));if(!s){this.notify('Find room to open the door');return false}
        v.speed=0;Object.assign(p,s,{car:null});this.dirty=true;return true
      }
      let c=this.nearestCar();if(!c){this.notify('Walk closer to a vehicle');return false}
      if(c===this.harborBoat||this.marine.includes(c))return this.takePoliceBoat(c);
      if(this.traffic.includes(c))c=this.takeTraffic(c);
      Object.assign(p,{x:c.x,z:c.z,h:c.h,car:c.id});this.dirty=true;return true
    }
    interact(){const p=this.player,o=this.objective();if(o&&dist(p,o)<(o.mode==='foot'?4:10.5)){this.advance();return}
      if(!this.vehicle){const i=film.findIndex((f,i)=>!this.found.includes(i)&&dist(f,p)<3.5);if(i>=0){this.found.push(i);this.money+=50;this.dirty=true;this.notify('Film roll recovered',this.found.length+' / 5   ·   +$50');return}
        const npc=this.nearestPed();if(npc){npc.wait=3;npc.h=Math.atan2(p.x-npc.x,npc.z-p.z);if(!this.job&&(npc.name==='Nell'||npc.name==='Frankie')){this.startJob(npc.name==='Nell'?'buoy':'relay');this.advance();return}const line=npc===this.sol?(npc.z===stops.club.z?'“Thanks for the ride. I can hear the band from here!”':'“I booked a ride to Ocean Club. Check the job board.”'):npc.name==='Frankie'?'“Paz is waiting on my crate of records. Check the courier job.”':npc.name==='Paz'?'“I play records at the beach when the sun goes down.”':chatter[npc.id%chatter.length];this.notify(npc.name,line);return}}
    }
    respray(color){if(!this.vehicle||dist(this.player,garage)>10.5||Math.abs(this.vehicle.speed)>1.7||!carColors.includes(color)||this.vehicle.color===color||this.money<80)return false;this.money-=80;this.vehicle.color=color;this.dirty=true;this.notify('Fresh paint','−$80 · Palma Auto');return true}
    dispatch(level){
      const required=Math.max(1,level);
      while(this.patrols.length>required){const withdrawn=this.patrols.pop();this.traffic=this.traffic.filter(c=>c!==withdrawn)}
      if(this.patrols.length>=required)return;
      const entries=[];
      for(let i=0;i<xs.length;i++)for(let j=0;j<zs.length;j++){const a=roadNode(i,j);for(const b of neighbors(a)){const l=lane(a,b),x=a.x+l.rx+l.dx*22,z=a.z+l.rz+l.dz*22;const range=dist({x,z},this.player);if(range>48)entries.push({a,b,x,z,h:l.h,range})}}
      const p=this.player,heading=p.h;
      while(this.patrols.length<required){
        const index=this.patrols.length,desired=heading+[0,Math.PI/2,0,-Math.PI/2,Math.PI,0][index];
        const score=e=>{const direction=Math.atan2(e.x-p.x,p.z-e.z);return Math.abs(angle(desired,direction))*75+Math.abs(e.range-68)};
        entries.sort((a,b)=>score(a)-score(b));
        const spot=entries.find(s=>![...this.traffic,...this.cars].some(c=>dist(c,s)<12));if(!spot)break;
        const c={...car(100+index,spot.x,spot.z,spot.h,'#455668',1),a:spot.a,b:spot.b,state:'road',cruise:10,wait:0,patrol:true};
        c.flank=index===1?1:index===3?-1:0;
        if(index===2||index===5){
          const alongX=Math.abs(Math.sin(heading))>Math.abs(Math.cos(heading));
          const routes=entries.filter(e=>(alongX?e.a.z===e.b.z:e.a.x===e.b.x));
          const ahead={x:p.x+Math.sin(heading)*(index===2?65:120),z:p.z-Math.cos(heading)*(index===2?65:120)};
          routes.sort((a,b)=>dist(a,ahead)-dist(b,ahead));
          const laneSpot=routes.find(e=>dist(e,p)>40&&![...this.traffic,...this.cars].some(o=>dist(o,e)<10));
          if(laneSpot){Object.assign(c,{x:laneSpot.x,z:laneSpot.z,h:laneSpot.h,a:laneSpot.a,b:laneSpot.b,blockHeading:laneSpot.h+Math.PI/2,blockTime:18,state:'blocking'})}
        }
        this.traffic.push(c);this.patrols.push(c)
      }
    }
    supportTick(dt){
      const w=this.alert,p=this.player;
      if(!w){this.air=null;this.marine.length=0;return}
      if(w.level<4)this.air=null;
      else if(!this.air)this.air={x:p.x+28,z:p.z+31,h:0,alt:15,id:801};
      const count=this.vehicle?.boat?(w.level>=5?2:1):0;
      if(this.marine.length>count)this.marine.length=count;
      while(this.marine.length<count){
        const k=this.marine.length;
        const choices=[{x:p.x-18,z:p.z+32},{x:p.x-15,z:p.z-34},{x:p.x+18,z:p.z+30},{x:p.x+18,z:p.z-32}].map(q=>({x:clamp(q.x,-130,-44),z:clamp(q.z,-211,141)}));
        const q=choices.find(q=>dist(p,q)>22&&this.marine.every(m=>dist(m,q)>22))||choices[k];
        this.marine.push({...q,id:this.marine.some(m=>m.id===810)?811:810,h:0,boat:true})
      }
      function follow(u,x,z,speed){const dx=x-u.x,dz=z-u.z,d=Math.hypot(dx,dz);if(d<.15)return;
        const step=Math.min(d,speed*dt);u.h+=clamp(angle(u.h,Math.atan2(dx,-dz)),-dt*3,dt*3);u.x+=dx*step/d;u.z+=dz*step/d}
      const target=w.seen?p:w.origin;
      if(this.air){const a=this.time*.40;follow(this.air,target.x+Math.cos(a)*8,target.z+Math.sin(a)*8,12);
        let roof=0;for(const b of buildings)if(Math.abs(b.x-this.air.x)<b.w/2+9&&Math.abs(b.z-this.air.z)<b.d/2+9)roof=Math.max(roof,b.h);
        this.air.alt=Math.max(roof+3,this.air.alt+clamp(roof+15-this.air.alt,-dt*5,dt*12))}
      this.marine.forEach((u,k)=>{follow(u,clamp(target.x+(k?3:0),-130,-44),clamp(target.z,-211,141),10+w.level*.7)});
    }
    policeSee(point,witness=false){
      if(this.inside)return false;
      return [...this.patrols,...this.marine,...(this.air?[this.air]:[]),...(this.officer?[this.officer]:[])].some(c=>{
        const dx=point.x-c.x,dz=point.z-c.z,d=Math.hypot(dx,dz);
        if(d>(c===this.air?30:this.marine.includes(c)?32:38+(this.alert?.level||0)*2))return false;
        if(witness&&d>5&&(dx*Math.sin(c.h)-dz*Math.cos(c.h))<d*.25)return false;
        for(let f=1;f<d;f++){const x=c.x+dx*f/d,z=c.z+dz*f/d;if(buildings.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2&&(c!==this.air||b.h>1+(c.alt-1)*(1-f/d))))return false}
        return true
      })
    }
    reportCrash(pedestrian=false){
      if(this.time-this.lastImpact<4&&(!pedestrian||(this.alert?.level||0)>=2))return;
      this.lastImpact=this.time;
      this.startPursuit(pedestrian?2:1,this.player);
      this.notify(pedestrian?'Pedestrian hit · Police alerted':'Traffic collision · Police alerted','Patrol units are pursuing you.')
    }
    startPursuit(minimum,point){
      const level=Math.min(6,Math.max(minimum,(this.alert?.level||0)+1));this.dispatch(level);this.dirty=true;
      this.alert={level,unseen:0,stopped:0,seen:true,scan:0,origin:{x:point.x,z:point.z}};
      if(!this.officer){
        const corners=xs.flatMap(x=>zs.map(z=>({x:x+5,z:z+5})));
        const dispatch=corners.filter(n=>dist(n,this.player)>15).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];
        this.officer={...dispatch,h:0,walk:0,route:[],replan:0};
      }
    }
    patrolTick(dt){
      if(!this.alert)return;
      this.supportTick(dt);
      const p=this.player,unit=this.officer,w=this.alert;
      w.scan-=dt;
      if(w.scan<=0){
        w.scan=.2;
        w.seen=this.policeSee(p);
        if(w.seen)w.origin={x:p.x,z:p.z}
      }
      const lastSeen={x:Math.max(-40,w.origin.x),z:w.origin.z};
      if(unit){
        unit.replan-=dt;
        if(unit.replan<=0){unit.route=officerRoute(unit,lastSeen);unit.replan=1.4}
        const target=unit.route[0]||lastSeen,gap=dist(unit,target);
        if(gap<.25)unit.route.shift();
        else{const step=Math.min(gap,dt*5.7),dx=(target.x-unit.x)/gap,dz=(target.z-unit.z)/gap;
          move(unit,dx*step,dz*step,.32);unit.h=Math.atan2(dx,-dz);unit.walk+=step*4}
      }
      const carDistance=Math.min(...this.patrols.map(c=>dist(c,p))),footDistance=unit?dist(unit,p):Infinity;
      const boarding=this.vehicle?.boat&&(this.vehicle.waterSpeed??Math.abs(this.vehicle.speed))<6&&this.marine.some(m=>dist(m,p)<4.5);
      const near=!(this.vehicle?.heli&&this.vehicle.alt>3)&&!this.inside&&w.seen&&(boarding||footDistance<2.8||(carDistance<7&&(!this.vehicle||Math.abs(this.vehicle.speed)<5)));
      this.alert.stopped=near?this.alert.stopped+dt:0;
      w.unseen=w.seen?0:w.unseen+dt;
      if(this.alert.stopped>=.8){
        const fine=Math.min(this.money,this.alert.level*65);this.money-=fine;
        if(this.vehicle)this.vehicle.speed=0;if(this.job)this.endJob();
        this.inside=null;Object.assign(p,{x:9.5,z:32,h:0,car:null,walk:0});this.busted={fine};this.dispatch(0);this.alert=null;this.supportTick(0);this.officer=null;this.notice=null;this.dirty=true
      }else if(w.unseen>=8){w.level--;w.unseen=0;this.dispatch(w.level);this.supportTick(0);this.dirty=true;if(w.level===0){this.alert=null;this.supportTick(0);this.officer=null;this.notify('Escaped','All wanted stars cleared.')}else this.notify('Wanted level reduced',w.level+' stars remaining.')}
    }
    pedTick(n,dt){if(n.state==='host'||n.state==='riding')return;
      if(n.protest){if(this.time<n.protest.until){const v=this.cars[n.protest.vehicle],d=dist(n,v);n.h=Math.atan2(v.x-n.x,n.z-v.z);if(d<3.2&&d>.01){move(n,(n.x-v.x)*dt/d,(n.z-v.z)*dt/d,.32);n.step+=dt*3}return}delete n.protest}
      if(n.wait>0){n.wait-=dt;return}
      if(n.joining?.length){const q=n.joining[0],d=dist(n,q);if(d<.2)n.joining.shift();else{const k=Math.min(d,n.speed*dt)/d;n.h=Math.atan2(q.x-n.x,n.z-q.z);move(n,(q.x-n.x)*k,(q.z-n.z)*k,.32);n.step+=dt*5}return}
      const d=dist(n,n.target);
      if(d<.12){
        if(n.promenade){n.target={x:n.x,z:n.target.z<0?138:-209};n.wait=1.8;return}
        const c=n.c,delta=[[c===0||c===3?-1:1,0],[0,c<2?-1:1]][Math.floor(this.r()*2)],ni=n.i+delta[0],nj=n.j+delta[1];
        if(n.state!=='cross'&&this.r()<.2&&ni>=0&&ni<xs.length-1&&nj>=0&&nj<5){n.i=ni;n.j=nj;n.c=delta[0]?[1,0,3,2][c]:[3,2,1,0][c];n.state='cross'}
        else{n.c=(c+n.dir+4)%4;n.state='walk';if(this.r()<.22)n.wait=.8+this.r()*2}
        n.target=corner(n.i,n.j,n.c);return
      }
      const dx=(n.target.x-n.x)/d,dz=(n.target.z-n.z)/d;
      const approaching=this.vehicle;
      if(approaching&&Math.abs(approaching.speed)>3){
        const hx=Math.sin(approaching.h)*Math.sign(approaching.speed),hz=-Math.cos(approaching.h)*Math.sign(approaching.speed);
        const px=n.x-approaching.x,pz=n.z-approaching.z,along=px*hx+pz*hz,across=px*hz-pz*hx;
        if(along>0&&along<Math.min(10,3+Math.abs(approaching.speed)*.55)&&Math.abs(across)<2){
          const side=across>=0?1:-1;move(n,hz*side*dt*2.9,-hx*side*dt*2.9,.32);n.h=Math.atan2(-px,pz);n.step+=dt*8;return
        }
      }
      if(n.state==='cross'){
        const ahead={x:n.x+dx*2.2,z:n.z+dz*2.2};
        if([...this.traffic,...this.cars].some(c=>!c.yielding&&Math.abs(c.speed)>.5&&dist(c,ahead)<3.3))return
      }
      const v=this.vehicle;if(v&&dist(v,n)<3&&Math.abs(v.speed)>2){const ex=(n.x-v.x)/Math.max(.1,dist(n,v)),ez=(n.z-v.z)/Math.max(.1,dist(n,v));move(n,ex*dt*3,ez*dt*3,.32);n.wait=.15;return}
      const step=Math.min(dt*n.speed,d),ahead={x:n.x+dx*.72,z:n.z+dz*.72};
      const avoid=this.people.find(p=>p!==n&&p.state!=='riding'&&Math.abs(p.x-ahead.x)<.58&&Math.abs(p.z-ahead.z)<.58);
      const parked=this.cars.find(c=>Math.abs(c.speed)<.5&&dist(c,ahead)<2.55);
      let side=0;if(avoid||parked){const ob=parked||avoid;side=(ob.x-n.x)*dz-(ob.z-n.z)*dx>=0?1:-1}
      n.x+=step*(dx-dz*side*.85);n.z+=step*(dz+dx*side*.85);n.h=Math.atan2(dx,-dz);n.step+=step*4
    }
    trafficTick(c,dt){
      if(c.state==='blocking'){
        c.blockTime-=dt;const turn=angle(c.h,c.blockHeading);c.h+=clamp(turn,-dt*1.6,dt*1.6);c.speed=0;
        if(c.blockTime<=0||!this.alert||(!this.alert.seen&&this.alert.unseen>4)){c.state='road';c.h=lane(c.a,c.b).h}
        return
      }
      const l=lane(c.a,c.b),phase=signal(c.b.x,c.b.z,this.time),green=Math.abs(l.dx)>.5?phase>=8.4&&phase<15.4:phase>=.4&&phase<7.4;
      if(c.state==='turn'){
        const t=Math.min(1,c.t+dt*c.speed/Math.max(3,c.length)),u=1-t;
        const candidate={x:u*u*c.start.x+2*u*t*c.control.x+t*t*c.end.x,z:u*u*c.start.z+2*u*t*c.control.z+t*t*c.end.z};
        c.yielding=[...this.traffic,...this.cars,...(this.vehicle?[]:[this.player]),...this.people.filter(p=>p.state==='cross')].some(o=>o!==c&&dist(o,candidate)<(o.style!=null?4.6:2.35)&&dist(o,candidate)<dist(o,c));if(c.yielding)return;
        Object.assign(c,candidate);
        c.h=Math.atan2(u*(c.control.x-c.start.x)+t*(c.end.x-c.control.x),-u*(c.control.z-c.start.z)-t*(c.end.z-c.control.z));c.t=t;
        if(t===1){c.a=c.b;c.b=c.next;c.state='road'}return
      }
      c.h=l.h;const stop={x:c.b.x+l.rx-l.dx*13,z:c.b.z+l.rz-l.dz*13},left=(stop.x-c.x)*l.dx+(stop.z-c.z)*l.dz;
      const responding=c.patrol&&this.alert;let speed=responding?14+this.alert.level*1.4:c.cruise;
      if(left<12&&!green&&!responding)speed=Math.min(speed,Math.max(0,left*1.5));
      for(const other of [...this.traffic,...this.cars,...(this.vehicle?[]:[this.player])]){
        if(other===c||other.heli&&other.alt>3)continue;const dx=other.x-c.x,dz=other.z-c.z,along=dx*l.dx+dz*l.dz;
        if(along>0&&along<11&&Math.abs(dx*l.dz-dz*l.dx)<2.1)speed=Math.min(speed,Math.max(0,(along-4.9)*1.7))
      }
      if(this.people.some(p=>p.state==='cross'&&(p.x-c.x)*l.dx+(p.z-c.z)*l.dz>0&&(p.x-c.x)*l.dx+(p.z-c.z)*l.dz<6.5&&Math.abs((p.x-c.x)*l.dz-(p.z-c.z)*l.dx)<1.9))speed=0;
      c.speed+=clamp(speed-c.speed,-14*dt,4*dt);const travel=Math.min(Math.max(0,left),dt*c.speed);c.x+=l.dx*travel;c.z+=l.dz*travel;
      if(left<.13&&(green||responding)&&speed>1&&!this.traffic.some(o=>o!==c&&o.state==='turn'&&o.b.x===c.b.x&&o.b.z===c.b.z)){
        const routes=neighbors(c.b).filter(n=>{
          const out=lane(c.b,n),exit={x:c.b.x+out.rx+out.dx*12,z:c.b.z+out.rz+out.dz*12};
          const parked=this.cars.some(v=>{const dx=v.x-exit.x,dz=v.z-exit.z,ahead=dx*out.dx+dz*out.dz;return Math.abs(v.speed)<.5&&ahead>=0&&ahead<=44&&Math.abs(dx*out.dz-dz*out.dx)<2.1});
          return !parked&&![...this.traffic,...this.cars].some(o=>o!==c&&dist(o,exit)<6.0)
        });
        const choices=responding?routes:routes.filter(n=>n.i!==c.a.i||n.j!==c.a.j);
        if(!choices.length){if(!routes.length)return;choices.push(routes[0])}
        const target=responding?{...this.alert.origin}:null;if(responding&&c.flank&&dist(c,target)>50){target.x+=Math.cos(this.player.h)*34*c.flank;target.z+=Math.sin(this.player.h)*34*c.flank}
        const next=responding?choices.sort((a,b)=>dist(a,target)-dist(b,target))[0]:choices[Math.floor(this.r()*choices.length)],out=lane(c.b,next);
        c.next=next;c.start={x:c.x,z:c.z};c.end={x:c.b.x+out.rx+out.dx*12,z:c.b.z+out.rz+out.dz*12};
        c.control=l.dx*out.dx+l.dz*out.dz>.95?{x:(c.start.x+c.end.x)*.5,z:(c.start.z+c.end.z)*.5}:{x:c.b.x+l.rx+out.rx,z:c.b.z+l.rz+out.rz};c.t=0;c.length=Math.max(12,dist(c.start,c.end)*1.12);c.speed=5;c.state='turn'
      }
    }
    driveContact(v,dx,dz){
      const radius=v.bike?.52:1.02,reach=v.bike?.72:1.30;
      const walls=solids.filter(b=>Math.abs(v.x-b.x)<b.w/2+4&&Math.abs(v.z-b.z)<b.d/2+4);
      const others=[...this.cars,...this.traffic].filter(o=>o!==v&&!(o.heli&&o.alt>3)&&dist(o,v)<7);
      const hx=Math.sin(v.h),hz=-Math.cos(v.h);v.x+=dx;v.z+=dz;
      let struck,closing=0;
      function push(nx,nz,depth){v.x+=nx*depth;v.z+=nz*depth;closing=Math.max(closing,-Math.sign(v.speed)*(hx*nx+hz*nz))}
      for(let pass=0;pass<3;pass++){
        let touched=false;
        for(const offset of [-reach,0,reach]){
          for(const b of walls){
            const x=v.x+offset*hx-b.x,z=v.z+offset*hz-b.z,w=b.w/2,d=b.d/2;
            const ex=x-clamp(x,-w,w),ez=z-clamp(z,-d,d),gap=Math.hypot(ex,ez);
            if(gap>=radius)continue;touched=true;
            if(gap>.00001)push(ex/gap,ez/gap,radius-gap);
            else if(w-Math.abs(x)<d-Math.abs(z))push(x>=0?1:-1,0,radius+w-Math.abs(x));
            else push(0,z>=0?1:-1,radius+d-Math.abs(z))
          }
          for(const o of others){
            const ox=Math.sin(o.h),oz=-Math.cos(o.h),x=v.x+offset*hx-o.x,z=v.z+offset*hz-o.z;
            const length=o.bike?.72:1.3,t=clamp(x*ox+z*oz,-length,length),ex=x-ox*t,ez=z-oz*t,gap=Math.hypot(ex,ez),limit=radius+(o.bike?.52:1.02);
            if(gap>=limit)continue;touched=true;struck=o;
            if(gap>.00001)push(ex/gap,ez/gap,limit-gap);else push(oz,-ox,limit)
          }
          const x=v.x+hx*offset,z=v.z+hz*offset;v.x+=clamp(x,-41+radius,420-radius)-x;v.z+=clamp(z,-216+radius,148-radius)-z;
          if(x< -41+radius||x>420-radius||z< -216+radius||z>148-radius)closing=1;
        }
        if(!touched)break
      }
      if(closing>.92)v.speed=0;else if(closing>.05)v.speed*=Math.exp(-Math.hypot(dx,dz)*closing*.8);
      return struck
    }
    tick(dt,input={},viewH=this.player.h){
      if(this.busted)return;
      if(this.inside){this.time+=dt;if(this.alert){this.patrolTick(dt);if(this.busted)return}const p=this.inside,dx=Number(!!input.right)-Number(!!input.left),dz=Number(!!input.down)-Number(!!input.up),len=Math.hypot(dx,dz);if(len){const step=dt*(input.brake?5.2:3.2)/len;const mall=p.id==='mall';const free=(x,z)=>Math.abs(x)<(mall?13.6:6.6)&&z> -2.15&&z<4.75&&!(Math.abs(x)>4&&(!mall||Math.abs(x)<6.9)&&Math.abs(z)<2.7);if(free(p.x+dx*step,p.z))p.x+=dx*step;if(free(p.x,p.z+dz*step))p.z+=dz*step;p.walk+=step*len*4;p.h=Math.atan2(dx,-dz)}if(this.job?.remaining!=null&&(this.job.remaining-=dt)<=0){this.endJob();this.notify('Time expired')}return}
      this.time+=dt;this.clock=(this.clock+dt/100)%24;
      const p=this.player,v=this.vehicle,forward=(+!!input.up)-(+!!input.down),turn=(+!!input.right)-(+!!input.left);
      if(v?.heli){
        const clearance=(x,z)=>{let floor=x< -40?3:0;
          for(const b of buildings)if(Math.abs(b.x-x)<b.w/2+2&&Math.abs(b.z-z)<b.d/2+2)floor=Math.max(floor,b.h+5);
          for(const item of props)if(dist(item,{x,z})<2.1)floor=Math.max(floor,item.kind==='palm'?12:item.kind==='lamp'?7:4);
          for(const laneX of xs)for(const laneZ of zs)for(const side of [-1,1])if(Math.hypot(x-laneX-side*8.75,z-laneZ-side*8.75)<2)floor=Math.max(floor,6);
          if([...this.cars,...this.traffic].some(c=>c!==v&&dist(c,{x,z})<3.4))floor=Math.max(floor,3);
          return floor};
        const floor=clearance(v.x,v.z),lift=Number(!!input.rise)-Number(!!input.descend);
        if(lift>0)v.alt=Math.min(75,v.alt+dt*8);else if(lift<0)v.alt=Math.min(v.alt,Math.max(floor,v.alt-dt*6));
        v.h+=turn*dt*1.45;
        if(v.alt>.6){v.speed=clamp((v.speed+forward*12*dt)*Math.exp(-dt*(input.brake?3:forward?.24:1.6)),-10,28);
          const x=clamp(v.x+Math.sin(v.h)*v.speed*dt,-129,419),z=clamp(v.z-Math.cos(v.h)*v.speed*dt,-215,147);
          if(v.alt>=clearance(x,z)){v.x=x;v.z=z}else v.speed=0
        }else v.speed=0;
        Object.assign(p,{x:v.x,z:v.z,h:v.h});
      }else if(v?.boat){const previous={x:v.x,z:v.z};v.speed=clamp((v.speed+forward*dt*8)*Math.exp(-dt*(input.brake?3:forward?.17:.65)),-5,22);v.h+=turn*dt*1.35*clamp(v.speed/4,-1,1);v.x=clamp(v.x+Math.sin(v.h)*v.speed*dt,-130,-44);v.z=clamp(v.z-Math.cos(v.h)*v.speed*dt,-211,141);v.waterSpeed=dist(v,previous)/Math.max(dt,.00001);Object.assign(p,{x:v.x,z:v.z,h:v.h})}else if(v){
        const accel=forward>0?(v.speed<0?15:8.5):forward<0?(v.speed>0?-17:-5.5):0;
        v.speed+=accel*dt*(v.bike?1.28:1);v.speed*=Math.exp(-dt*(input.brake?3.5:forward?.16:.74));v.speed=clamp(v.speed,-7,v.bike?31:27);
        v.steer+=(turn-v.steer)*Math.min(1,dt*7);v.h+=v.steer*Math.sign(v.speed)*Math.min(Math.abs(v.speed)*.19,1.38)*(input.brake?1.6:1)*dt;
        const old={x:v.x,z:v.z},dx=Math.sin(v.h)*v.speed*dt,dz=-Math.cos(v.h)*v.speed*dt;
        const impactSpeed=Math.abs(v.speed),contact=this.driveContact(v,dx,dz);
        if(contact?.a&&impactSpeed>7)this.reportCrash();
        if(this.people.some(n=>n.state!=='riding'&&dist(v,n)<2.3&&dist(v,n)<dist(old,n))){this.reportCrash(true);v.x=old.x;v.z=old.z;v.speed=0}
        Object.assign(p,{x:v.x,z:v.z,h:v.h})
      }else if(forward||turn){const h=viewH+Math.atan2(turn,forward),s=(input.brake?6.2:3.5)*dt,old={x:p.x,z:p.z};p.h=h;move(p,Math.sin(h)*s,-Math.cos(h)*s,.4);if([...this.cars,...this.traffic].some(c=>dist(c,p)<1.65&&dist(c,p)<dist(c,old)))Object.assign(p,old);p.walk+=dist(p,old)*4}
      for(const c of this.traffic)this.trafficTick(c,dt);for(const n of this.people)this.pedTick(n,dt);
      this.patrolTick(dt);
      if(this.job?.remaining!=null){this.job.remaining-=dt;if(this.job.remaining<=0){this.endJob();this.notify('Time expired','Try the coastline time trial again from Jobs.')}else if(this.vehicle&&this.objective()?.mode==='gate')this.advance()}
    }
    save(){return {v:1,inside:this.inside?{...this.inside}:null,money:this.money,done:this.done,found:this.found,clock:this.clock,player:{...this.player},cars:this.cars.map(({x,z,h,color,style,bike,cruiser,acquired,heli,alt,boat,policeBoat,fromHarbor})=>({x,z,h,color,style,bike,cruiser,acquired,heli,alt,boat,policeBoat,fromHarbor})),job:this.job?{...this.job}:null,busted:this.busted||null,pursuit:this.alert?{unseen:this.alert.unseen,origin:this.alert.origin,air:this.air,marine:this.marine.map(m=>({...m}))}:null,alert:this.alert?.level||0}}
    restore(s){if(s.v!==1)return;this.money=Number.isFinite(s.money)?Math.max(0,s.money):0;this.done=Array.isArray(s.done)?[...new Set(s.done.filter(id=>contracts.some(c=>c.id===id)))]:[];this.found=Array.isArray(s.found)?[...new Set(s.found.filter(i=>Number.isInteger(i)&&film[i]))]:[];if(Number.isFinite(s.clock))this.clock=s.clock%24;
      const valid=(p,r)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.h)&&allowed(p,r);
      this.cars.forEach((c,i)=>{const p=s.cars?.[i];if(c.boat?sea(p)&&Number.isFinite(p.h):valid(p,1.4))Object.assign(c,{x:p.x,z:p.z,h:p.h,color:carColors.includes(p.color)?p.color:c.color})});
      for(const p of Array.isArray(s.cars)?s.cars.slice(this.cars.length):[]){
        if(!p?.acquired)continue;
        if(p.heli&&Number.isFinite(p.alt)&&Number.isFinite(p.h)&&p.x>=-130&&p.x<=420&&p.z>=-216&&p.z<=148){this.cars.push({...car(this.cars.length,p.x,p.z,p.h,'#455668'),acquired:true,heli:true,alt:clamp(p.alt,0,75)});continue}
        if(p.policeBoat&&sea(p)&&Number.isFinite(p.h)){this.cars.push({...car(this.cars.length,p.x,p.z,p.h,'#374f72'),acquired:true,policeBoat:true,boat:true,fromHarbor:!!p.fromHarbor});continue}
        if(!valid(p,.35))continue;
        this.cars.push({...car(this.cars.length,p.x,p.z,p.h,carColors.includes(p.color)||p.color==='#455668'?p.color:carColors[0],clamp(p.style|0,0,2)),acquired:true,bike:!!p.bike,cruiser:!!p.cruiser})
      }
      if((this.cars[s.player?.car]?.heli||valid(s.player,.4)||(this.cars[s.player?.car]?.boat&&sea(s.player)))&&(s.player.car===null||this.cars[s.player.car])){const p=s.player;Object.assign(this.player,{x:p.x,z:p.z,h:p.h,car:p.car});if(this.vehicle)Object.assign(this.player,{x:this.vehicle.x,z:this.vehicle.z,h:this.vehicle.h})}
      for(const c of this.traffic)if(this.cars.some(v=>v.acquired&&dist(v,c)<5))this.redeployTraffic(c);
      if(this.player.car===null&&rooms.some(r=>r.id===s.inside?.id)&&Number.isFinite(s.inside.x)&&Number.isFinite(s.inside.z)){this.inside={id:s.inside.id,x:clamp(s.inside.x,s.inside.id==="mall"?-13.5:-6.5,s.inside.id==="mall"?13.5:6.5),z:clamp(s.inside.z,-2.1,4.7),h:0,walk:0}}
      if(this.done.includes('fare'))Object.assign(this.sol,{x:stops.club.x,z:stops.club.z});
      if(s.busted&&Number.isFinite(s.busted.fine))this.busted={fine:clamp(s.busted.fine,0,390)};else if(Number.isInteger(s.alert)&&s.alert>=1&&s.alert<=6){this.reportCrash(s.alert>=2);this.alert.level=s.alert;this.dispatch(s.alert);this.alert.unseen=clamp(Number(s.pursuit?.unseen)||0,0,8);if(Number.isFinite(s.pursuit?.origin?.x)&&Number.isFinite(s.pursuit?.origin?.z))this.alert.origin=s.pursuit.origin;this.lastImpact=-10;
        const a=s.pursuit?.air;if(s.alert>=4&&a&&[a.x,a.z,a.h,a.alt].every(Number.isFinite))this.air={x:a.x,z:a.z,h:a.h,alt:clamp(a.alt,8,90),id:801};
        if(this.vehicle?.boat&&Array.isArray(s.pursuit?.marine))this.marine=s.pursuit.marine.slice(0,s.alert>=5?2:1).filter(m=>sea(m)&&Number.isFinite(m.h)).map((m,k)=>({x:m.x,z:m.z,h:m.h,id:m.id===811?811:810+k,boat:true}))
      }
      const j=s.job,c=contracts.find(c=>c.id===j?.id);if(c&&Number.isInteger(j.stage)&&c.stages[j.stage]&&(j.id!=='rally'||j.stage===0||Number.isFinite(j.remaining)&&j.remaining>0)){this.job={id:j.id,stage:j.stage,remaining:j.id==='rally'&&j.stage>0?j.remaining:null};if(j.id==='fare'){if(j.stage===1){this.sol.state='riding';this.job.passengerCar=this.cars[j.passengerCar]?.id??this.player.car??0}else Object.assign(this.sol,{x:stops.hotel.x,z:stops.hotel.z})}}
    }
  }
  return {Game,clamp,dist,angle,seed,TAU,xs,zs,buildings,lots,props,stops,contracts,film,allowed,signal,garage,carColors,docks,rooms};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PC;
