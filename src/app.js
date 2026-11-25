(() => {
  const $=id=>document.getElementById(id),world=$('world'),key='unbound-save-1',keys={};
  let saved=null;try{saved=JSON.parse(localStorage.getItem(key))}catch{}
  const game=new PC.Game(saved);let renderer;
  try{renderer=createRenderer(world)}catch(e){$('error').hidden=false;$('error').textContent=e.message;return}
  let mode='title',dialog='',last=performance.now(),lastHud=-1,lastSave=0,look=game.player.h,waypoint=null,storageOK=true;
  if(saved?.v===1)$('begin').innerHTML='Continue game <span>▶</span>';
  function district(p){return p.x< -8?'Coral Beach':p.x<15?'Ocean Drive':p.x>272?'Galleria District':p.x>210?'East Keys':p.x>144?'Skyline Heights':p.z< -68?'Arts Quarter':p.z<0?'Marina Gardens':'Palma District'}
  $('titlePlace').textContent=district(game.cars[0]);
  function save(){if(mode==='title')return;try{localStorage.setItem(key,JSON.stringify(game.save()));game.dirty=false}catch{if(storageOK)game.notify('Saving unavailable','This browser is blocking local storage.');storageOK=false}}
  const stick=$('stick'),touchInput={},held=new Map();
  let stickPointer=null;
  function centerStick(){
    stickPointer=null;stick.style.setProperty('--dx','0px');stick.style.setProperty('--dy','0px');
    for(const key of ['up','down','left','right'])delete touchInput[key];
  }
  function moveStick(e){
    if(e.pointerId!==stickPointer)return;
    const box=stick.getBoundingClientRect(),radius=box.width/2;
    const x=(e.clientX-box.left-radius)/radius,y=(e.clientY-box.top-radius)/radius;
    const scale=radius*.57/Math.max(1,Math.hypot(x,y));
    stick.style.setProperty('--dx',x*scale+'px');stick.style.setProperty('--dy',y*scale+'px');
    for(const [key,value] of Object.entries({right:x,left:-x,down:y,up:-y})){
      if(value>.22)touchInput[key]=true;else delete touchInput[key];
    }
  }
  stick.onpointerdown=e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)};
  stick.onpointermove=moveStick;
  stick.onlostpointercapture=stick.onpointerup=stick.onpointercancel=e=>{if(e.pointerId===stickPointer)centerStick()};
  function clearKeys(){centerStick();held.clear();for(const input of [keys,touchInput])for(const key of Object.keys(input))delete input[key]}
  function start(){if(!audioCtx)sound();mode='play';document.body.classList.add('live');look=game.player.h;renderer.reset();last=performance.now();game.notify(saved?.v===1?'Welcome back to UNBOUND':'Welcome to Ocean Drive',matchMedia('(any-pointer:coarse)').matches?'Tap Jobs to find work.':'WASD to move · F to enter or exit · J for jobs');updateHud();save()}
  $('hotelStart').onclick=()=>{game.inside=null;const r=PC.rooms[0];Object.assign(game.player,{car:null,x:r.x-2,z:r.z,h:Math.PI/2});start();game.notify('Palma Hotel','Walk toward the pink doorway and press E to enter.')};
  $('begin').onclick=start;$('walkStart').onclick=()=>{if(!saved||game.vehicle&&!game.toggleCar()){if(game.vehicle)game.vehicle.speed=0;Object.assign(game.player,{car:null,x:-38,z:48,h:0})}start();game.notify('On foot',matchMedia('(any-pointer:coarse)').matches?'Drag to walk. Tap Board beside a vehicle.':'WASD or arrows to walk · Shift to sprint · Enter to ride')};
  let audioCtx,master,engine,engineGain,audioOn=false,nextNote=0,note=0;
  const sirens=new Map();let rotor;
  function sound(){try{if(!audioCtx){audioCtx=new AudioContext();master=audioCtx.createGain();master.gain.value=.18;master.connect(audioCtx.destination);engine=audioCtx.createOscillator();engine.type='triangle';engineGain=audioCtx.createGain();engineGain.gain.value=.03;engine.connect(engineGain).connect(master);engine.start()}audioOn=!audioOn;if(audioOn){audioCtx.resume();nextNote=audioCtx.currentTime}else audioCtx.suspend();$('soundText').textContent=audioOn?'Audio on':'Audio off';$('sound').setAttribute('aria-label',audioOn?'Turn audio off':'Turn audio on')}catch{game.notify('Audio unavailable')}}
  function audioTick(){if(!audioOn||audioCtx.state!=='running')return;const now=audioCtx.currentTime,v=game.vehicle;
    const active=mode==='play'&&!dialog&&!game.busted&&game.alert?[...game.patrols,...game.marine]:[];
    for(const [id,voice] of sirens)if(!active.some(c=>c.id===id)){voice.gain.gain.setTargetAtTime(.0001,now,.045);voice.osc.stop(now+.24);sirens.delete(id)}
    for(const cop of active){let voice=sirens.get(cop.id);if(!voice){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='triangle';gain.gain.value=0;osc.connect(gain).connect(master);osc.onended=()=>{osc.disconnect();gain.disconnect()};osc.start();voice={osc,gain};sirens.set(cop.id,voice)}
      const range=PC.dist(cop,game.player),phase=now*(game.alert.level>=3?5.6:3.1)+cop.id;
      voice.osc.frequency.setTargetAtTime(735+247*Math.sin(phase),now,.035);
      voice.gain.gain.setTargetAtTime(.68/(1+range/22)/Math.sqrt(active.length)*(game.room ? .27 : 1),now,.10)}
    if((game.air||v?.heli)&&mode==='play'&&!dialog&&!game.busted){
      if(!rotor){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),pulse=audioCtx.createOscillator(),depth=audioCtx.createGain();osc.type='sawtooth';osc.frequency.value=46;pulse.frequency.value=13;gain.gain.value=.025;depth.gain.value=.018;pulse.connect(depth).connect(gain.gain);osc.connect(gain).connect(master);osc.start();pulse.start();rotor={osc,gain,pulse,depth}}
      const level=.29/(1+(v?.heli?0:PC.dist(game.air,game.player))/24)*(game.room ? .22 : 1);rotor.gain.gain.setTargetAtTime(level,now,.1);rotor.depth.gain.setTargetAtTime(level*.82,now,.1)
    }else if(rotor){const old=rotor;rotor=null;old.gain.gain.setTargetAtTime(0,now,.04);old.depth.gain.setTargetAtTime(0,now,.04);old.osc.stop(now+.2);old.pulse.stop(now+.2);old.osc.onended=()=>{old.osc.disconnect();old.pulse.disconnect();old.gain.disconnect();old.depth.disconnect()}}
    const moving=mode==='play'&&!dialog&&v&&Math.abs(v.speed)>.2;
    const waveform=v?.boat?'sine':v?.bike?'sawtooth':'triangle';if(engine.type!==waveform)engine.type=waveform;
    engine.frequency.setTargetAtTime((v?.boat?44:v?.bike?66:32)+Math.abs(v?.speed||0)*(v?.bike?5:2.8),now,.12);engineGain.gain.setTargetAtTime(moving ? .23 : (v&&!dialog ? .10 : 0),now,.3);
    if(now<nextNote)return;const seq=[57,64,69,72,55,62,67,71,53,60,65,69,52,59,64,67],pitch=seq[note++%16];nextNote=now+.43;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=440*2**((pitch-69)/12);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.22,now+.045);gain.gain.exponentialRampToValueAtTime(.0001,now+1.48);osc.connect(gain).connect(master);osc.start(now);osc.stop(now+1.5);osc.onended=()=>{osc.disconnect();gain.disconnect()}}
  $('sound').onclick=sound;
  const panel=$('panel'),body=$('panelBody');let opener=null;
  function close(){if(!dialog)return;dialog='';$('veil').hidden=true;clearKeys();last=performance.now();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null}
  function show(which){
    if(which===dialog){close();return}if(!dialog)opener=document.activeElement;clearKeys();if(mode==='play')save();dialog=which;$('veil').hidden=false;
    const titles={talk:[game.room?.label||'',''+(game.room?.host||'')],jobs:['COUNTY DISPATCH','Jobs'],map:['UNBOUND','City map'],help:['PLAYER GUIDE','Controls'],pause:['UNBOUND','Paused'],garage:['PALMA AUTO','Paint shop']};$('panelTag').textContent=titles[which][0];$('panelTitle').textContent=titles[which][1];body.replaceChildren();
    if(which==='talk'){const r=game.room,o=game.objective();const handoff=o?.room===r.id;const c=PC.contracts.find(c=>c.id===r.job);
      const line=handoff?(game.job.stage===0?'Thanks for bringing this in. Take my signed receipt back.':'You made it. Here’s the pay we agreed on.'):game.job?'Finish your current job, then come see me.':r.pitch;
      body.innerHTML='<p>'+line+'</p><div class="dialogactions">'+(handoff?'<button class="major" data-ui="handoff">Complete handoff</button>':!game.job?'<button class="major" data-job="'+c.id+'">Accept · $'+c.fee+'</button>':'')+'<button class="ghost" data-ui="resume">Leave conversation</button></div>'}
    if(which==='garage'){const names=['Sunset coral','Lagoon','Marigold','Sea salt','Orchid','Pacific blue','Cherry'];body.innerHTML='<p class="panelnote">A respray costs $80. Your balance is $'+game.money+'.</p><div class="paintgrid">'+PC.carColors.map((c,i)=>'<button class="ghost" data-paint="'+c+'" '+(game.money<80||game.vehicle?.color===c?'disabled':'')+'><i style="background:'+c+'"></i>'+names[i]+(game.vehicle?.color===c?' · Current':'')+'</button>').join('')+'</div>'}
    if(which==='help'){body.innerHTML='<div class="controls">'+[['Drive or walk','W A S D / arrows'],['Brake or sprint','Space / Shift'],['Helicopter climb / descend','Space / C'],['Board, take or exit a vehicle','Enter or F'],['Talk, collect, or deliver','E'],['Look around on foot','Drag / Q and R'],['City map','M'],['Jobs','J'],['Pause or resume','Esc']].map(([n,k])=>'<div><span>'+n+'</span><kbd>'+k+'</kbd></div>').join('')+'</div><p class="panelnote">On touchscreens, drag the joystick to move or steer and drag the street view to look around on foot. Tap the minimap for the city map.</p>'}
    if(which==='pause'){body.innerHTML='<p class="panelnote">'+(storageOK?'Progress saved on this device.':'Saving is unavailable in this browser.')+'</p><div class="dialogactions"><button class="major" data-ui="resume">Resume game</button><button class="ghost" data-ui="help">Controls</button><button class="ghost" data-ui="map">City map</button><button class="ghost" data-ui="title">Title screen</button></div>'}
    if(which==='jobs'){const active=game.job;
      if(active){const o=game.objective();body.innerHTML='<div class="job"><div><small>ACTIVE · '+o.contract.type.toUpperCase()+'</small><h3>'+o.contract.name+'</h3><p>'+o.action+' at '+o.label+'. '+(o.mode==='foot'?'Approach on foot.':o.mode==='boat'?'Stop your boat at the buoy.':o.mode==='car'?'Stop your car at the marker.':'Drive through the gate.')+'</p></div><b>$'+o.contract.fee+'</b></div><div class="dialogactions"><button class="major" data-ui="resume">Continue job</button><button class="ghost" data-ui="cancel">Abandon job</button></div>'}
      else body.innerHTML=PC.contracts.map(c=>'<article class="job"><div><small>'+c.type.toUpperCase()+' · $'+c.fee+(game.done.includes(c.id)?' · COMPLETED':'')+'</small><h3>'+c.name+'</h3><p>'+c.desc+'</p></div><button class="major" data-job="'+c.id+'">'+(game.done.includes(c.id)?'Replay':'Accept')+'</button></article>').join('');
      body.innerHTML+='<div class="sectionline">'+game.done.length+' / '+PC.contracts.length+' jobs completed &nbsp; · &nbsp; '+game.found.length+' / 5 lost film rolls recovered</div>'
    }
    if(which==='map'){body.innerHTML='<canvas id="mapFull" width="800" height="760" aria-label="City map. Click or tap a location to place a waypoint."></canvas><div class="legend"><span><i>▲</i> You</span><span><b>◆</b> Objective</span><span><em>●</em> Waypoint</span><span>▰ Parked vehicle · Pink square: entrance</span></div><p class="panelnote">Click or tap the map to set a waypoint.</p><div class="dialogactions"><button class="ghost" data-ui="clear">Clear waypoint</button><button class="major" data-ui="resume">Back to game</button></div>';const map=$('mapFull');drawMap(map,true);map.onclick=e=>{const box=map.getBoundingClientRect(),factor=Math.min(box.width/map.width,box.height/map.height),ox=(box.width-map.width*factor)/2,oy=(box.height-map.height*factor)/2;const x=(e.clientX-box.left-ox)/factor,z=(e.clientY-box.top-oy)/factor;if(x<0||x>map.width||z<0||z>map.height)return;const tr=mapTransform(map,true);waypoint={x:PC.clamp((x-tr.ox)/tr.k,-130,420),z:PC.clamp((z-tr.oz)/tr.k,-216,148)};drawMap(map,true)}}
    if(which==='map'){const btn=document.createElement('button');btn.className='ghost';btn.dataset.ui='garageRoute';btn.textContent='Route to paint shop';body.querySelector('.dialogactions').append(btn)}
    panel.focus();updateHud()
  }
  body.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.job){game.startJob(b.dataset.job);save();close();updateHud();return}
    if(b.dataset.paint){if(game.respray(b.dataset.paint)){save();close();updateHud()}return}
    switch(b.dataset.ui){case 'handoff':game.advance();save();close();updateHud();break;case 'resume':close();break;case 'help':case 'map':show(b.dataset.ui);break;case 'garageRoute':waypoint={...PC.garage};close();game.notify('Paint shop marked','Palma Auto · South Palma District');break;case 'clear':waypoint=null;drawMap($('mapFull'),true);break;case 'cancel':game.endJob();game.notify('Job abandoned');save();close();break;case 'title':save();close();mode='title';document.body.classList.remove('live');$('begin').innerHTML='Continue game <span>▶</span>';saved=game.save();$('titlePlace').textContent=district(game.cars[0]);renderer.reset();break}
  });
  $('closePanel').onclick=close;$('helpTitle').onclick=()=>show('help');$('veil').addEventListener('click',e=>{if(e.target===$('veil'))close()});
  function command(cmd){if(game.busted)return;if(mode!=='play')return;if(['pause','map','jobs','help'].includes(cmd)){show(cmd);return}if(dialog)return;
    if(cmd==='car'){const before=game.notice;if(game.toggleCar()){if(before===game.notice)game.notify(game.vehicle?(game.vehicle.heli?'Helicopter':game.vehicle.policeBoat?'Police launch':game.vehicle.boat?'Speedboat':game.vehicle.bike?'Motorcycle':'Driving'):'On foot',game.vehicle?'F to dismount or exit':'Walk beside a vehicle and press F or Enter.');look=game.player.h;renderer.reset();save()}}
    if(cmd==='act'){if(game.room&&game.atHost())show('talk');else if(game.room||game.entrance()){if(game.doorway()){renderer.reset();clearKeys();save()}}else if(game.vehicle&&PC.dist(game.player,PC.garage)<10.5&&Math.abs(game.vehicle.speed)<1.7)show('garage');else game.interact()}updateHud()}
  document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>command(b.dataset.cmd));
  const actions={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyC:'descend',Space:'brake',ShiftLeft:'brake',ShiftRight:'brake',KeyQ:'lookLeft',KeyR:'lookRight'},commands={Enter:'car',KeyF:'car',KeyE:'act',KeyM:'map',KeyJ:'jobs',KeyH:'help',Escape:'pause'};
  window.addEventListener('keydown',e=>{
    if(dialog&&e.key==='Tab'){const bs=[...panel.querySelectorAll('button')];if(!bs.length)return;if(e.shiftKey&&(document.activeElement===bs[0]||document.activeElement===panel)){e.preventDefault();bs.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===bs.at(-1)){e.preventDefault();bs[0].focus()}return}
    if(dialog&&e.code==='Escape'){e.preventDefault();if(!e.repeat)close();return}if(mode!=='play')return;
    if(e.code==='Enter'&&dialog)return;if(commands[e.code]){e.preventDefault();if(!e.repeat)command(commands[e.code]);return}
    if(!dialog&&actions[e.code]){e.preventDefault();keys[e.code==='Space'&&game.vehicle?.heli?'rise':actions[e.code]]=true}
  });
  window.addEventListener('keyup',e=>{if(e.code==='Space')delete keys.rise;if(actions[e.code])delete keys[actions[e.code]]});
  document.querySelectorAll('[data-hold]').forEach(button=>{
    const key=button.dataset.hold;
    button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,key);touchInput[key]=true};
    button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{held.delete(e.pointerId);if(![...held.values()].includes(key))delete touchInput[key]};
  });
  let drag=null;world.onpointerdown=e=>{if(mode==='play'&&!dialog&&!game.vehicle){drag=e.clientX;world.setPointerCapture(e.pointerId)}};world.onpointermove=e=>{if(drag!=null){look+=(e.clientX-drag)*.009;drag=e.clientX}};world.onpointerup=world.onpointercancel=()=>drag=null;
  window.addEventListener('blur',()=>{clearKeys();if(mode==='play'&&!dialog)show('pause')});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();save();if(mode==='play'&&!dialog)show('pause')}});window.addEventListener('pagehide',save);
  const mapTransform=(c,full)=>{const k=full?Math.min(c.width/580,c.height/390):c.width/108;return {k,ox:c.width/2-(full?145:game.player.x)*k,oz:c.height/2-(full?-34:game.player.z)*k}};
  function route(p,o){
    const nodes=[];for(const x of PC.xs)for(const z of PC.zs)nodes.push({x,z});
    function attach(p){let best=Infinity,ans;for(const a of nodes)for(const b of nodes){if(Math.abs(PC.dist(a,b)-68)>.01||a.x>b.x||a.z>b.z)continue;const t=PC.clamp(((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/4624,0,1),q={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},d=PC.dist(p,q);if(d<best){best=d;ans={a,b,q}}}return ans}
    const s=attach(p),e=attach(o);if(s.a===e.a&&s.b===e.b)return [p,s.q,e.q,o];
    let best=Infinity,path;for(const a of [s.a,s.b])for(const b of [e.a,e.b]){const len=PC.dist(s.q,a)+Math.abs(a.x-b.x)+Math.abs(a.z-b.z)+PC.dist(b,e.q);if(len<best){best=len;path=[p,s.q,a,{x:a.x,z:b.z},b,e.q,o]}}return path
  }
  function drawMap(c,full){
    const ctx=c.getContext('2d'),{k,ox,oz}=mapTransform(c,full);ctx.setTransform(k,0,0,k,ox,oz);
    ctx.fillStyle='#3c7779';ctx.fillRect(-10000,-10000,20000,20000);const rect=(x,z,w,d,col)=>{ctx.fillStyle=col;ctx.fillRect(x-w/2,z-d/2,w,d)};
    rect(189,-34,461,380,'#bcab87');rect(202,-34,448,380,'#718776');for(const l of PC.lots)rect(l.x,l.z,51,51,l.park?'#829b78':'#9e9d88');for(const b of PC.buildings)rect(b.x,b.z,b.w,b.d,'#868879');for(const x of PC.xs)rect(x,-34,8.4,366,'#d6c9aa');for(const z of PC.zs)rect(204,z,426,8.4,'#d6c9aa');
    const dot=(p,r,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.z,r,0,PC.TAU);ctx.fill()};
    const obj=game.objective(),dest=obj||waypoint;
    if(dest){ctx.strokeStyle=obj?'#fbc265':'#e7836b';ctx.lineWidth=full?2.1:1.8;ctx.lineJoin='round';ctx.beginPath();(game.vehicle?.boat||dest.mode==='boat'?[game.player,dest]:route(game.player,dest)).forEach((p,i)=>i?ctx.lineTo(p.x,p.z):ctx.moveTo(p.x,p.z));ctx.stroke()}
    if(waypoint){dot(waypoint,3.5,'#874f4d');dot(waypoint,2.3,'#ff9f85')}
    for(const d of PC.docks){rect(d.x+5,d.z,12,2.4,'#ebb78d')}for(const room of PC.rooms){rect(room.x,room.z,3.8,3.8,'#ec82b1')}if(full){const heli=game.cars.find(c=>c.heli);if(heli){rect(heli.x,heli.z,7,7,'#37595b');ctx.fillStyle='#fff1ba';ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.fillText('H',heli.x,heli.z+1.8)}const g=PC.garage;rect(g.x,g.z,7,7,'#355a58');ctx.fillStyle='#fbe0a6';ctx.textAlign='center';ctx.font='bold 5px sans-serif';ctx.fillText('P',g.x,g.z+1.8)}
    if(obj){ctx.save();ctx.translate(obj.x,obj.z);ctx.rotate(Math.PI/4);rect(0,0,6,6,'#503e30');rect(0,0,4.4,4.4,'#ffd17f');ctx.restore()}
    for(const v of game.cars){if(v===game.vehicle)continue;rect(v.x,v.z,3,4.3,'#304f53')}
    if(game.air){dot(game.air,3.8,'#543759');dot(game.air,2.1,'#f3a4e1')}for(const boat of game.marine){dot(boat,3.2,'#2b537c');dot(boat,1.8,'#90e2ff')}
    if(game.alert)for(const cop of game.patrols){if(cop.state==='blocking')rect(cop.x,cop.z,7,4,'#ffb05e');dot(cop,3.3,'#3f4761');dot(cop,2.1,Math.floor(game.time*4)%2?'#8acfff':'#ff846e')}
    const p=game.player;ctx.save();ctx.translate(p.x,p.z);ctx.rotate(p.h);ctx.beginPath();ctx.moveTo(0,-4.4);ctx.lineTo(3.6,3.7);ctx.lineTo(0,2.1);ctx.lineTo(-3.6,3.7);ctx.closePath();ctx.fillStyle='#a5f3df';ctx.fill();ctx.strokeStyle='#264645';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    if(full){ctx.font='bold 5.4px Bahnschrift, sans-serif';ctx.textAlign='center';const lab=(s,x,z)=>{ctx.lineWidth=1.4;ctx.strokeStyle='#37524e';ctx.strokeText(s,x,z);ctx.fillStyle='#fff0cf';ctx.fillText(s,x,z)};lab('NEON GALLERIA',306,46);lab('ARCADE 88',374,-107);lab('EAST KEYS',241,43);lab('SKYLINE HEIGHTS',164,-178);lab('ARTS QUARTER',88,-105);lab('MARINA GARDENS',104,-30);lab('PALMA DISTRICT',95,85);ctx.save();ctx.translate(-25,-69);ctx.rotate(-Math.PI/2);lab('C O R A L   B E A C H',0,0);ctx.restore()}
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#203631';ctx.fillRect(7,7,23,22);ctx.fillStyle='#ffebbf';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('N',18,23)
  }
  $('release').onclick=()=>{game.busted=null;game.dirty=true;clearKeys();look=game.player.h;renderer.reset();save();updateHud()};
  function updateHud(){
    $('arrest').hidden=!game.busted||mode!=='play';
    if(game.busted){$('arrestInfo').textContent='Police caught you. Fine: $'+game.busted.fine+'.';return}
    if(mode!=='play')return;document.querySelector('.topbuttons [data-cmd=car]').textContent=game.vehicle?'Get out / walk':'Board / ride';const p=game.player,v=game.vehicle,o=game.objective(),dd=o?Math.round(PC.dist(p,o)):0,t=game.clock,hh=Math.floor(t);
    $('district').textContent=district(p);$('roadName').textContent=district(p).toUpperCase();$('time').textContent=String(hh).padStart(2,'0')+':'+String(Math.floor((t-hh)*60)).padStart(2,'0');$('money').textContent='$'+game.money;
    $('alertState').hidden=!game.alert;if(game.alert)$('alertState').textContent='★'.repeat(game.alert.level)+ (game.alert.seen?' WANTED':' SEARCHING · '+Math.ceil(8-game.alert.unseen)+'s')+(game.air?' · AIR':'')+(game.marine.length?' · MARINE':'');
    $('speed').textContent=v?String(Math.round(Math.abs(v.speed)*3.6)).padStart(3,'0'):'Foot';$('unit').textContent=v?'KM/H':'ON FOOT';$('gear').textContent=v?(Math.abs(v.speed)<.35?'P':v.speed<0?'R':'D'):((keys.brake||touchInput.brake)?'RUN':'WALK');
    $('jobType').textContent=o?(o.contract.type.toUpperCase()+(game.job.remaining!=null?' · '+Math.ceil(game.job.remaining)+' s':'')):'JOB BOARD';
    $('jobTitle').textContent=o?o.action:'Available jobs';$('jobHint').textContent=o?o.label+' · '+dd+' m':game.done.length+' / '+PC.contracts.length+' complete · Open jobs';
    const use=matchMedia('(any-pointer:coarse)').matches?'Use':'E',entry=matchMedia('(any-pointer:coarse)').matches?'Board':'F';
    let prompt='';if(o&&dd<(o.mode==='foot'?4:11)&&o.mode!=='gate'){prompt=o.mode==='foot'&&v?'Step out to '+o.action.toLowerCase():o.mode==='boat'&&!v?.boat?'Bring a speedboat':o.mode==='car'&&!v?'Bring a car to this stop':v&&Math.abs(v.speed)>1.7?'Stop at the marker':'<kbd>'+use+'</kbd> '+o.action}
    else if(v&&PC.dist(p,PC.garage)<10.5)prompt=Math.abs(v.speed)<1.7?'<kbd>'+use+'</kbd> Open paint shop':'Stop for Palma Auto';
    else if(!v){const film=PC.film.some((f,i)=>!game.found.includes(i)&&PC.dist(p,f)<3.5),npc=game.nearestPed();prompt=film?'<kbd>'+use+'</kbd> Collect film roll':npc?'<kbd>'+use+'</kbd> Talk to '+npc.name:game.nearestCar()?'<kbd>'+entry+'</kbd> '+(game.nearestCar().a?'Take NPC '+(game.nearestCar().bike?'motorcycle':'car'):'Board vehicle'):''}
    const board=document.querySelector('#touch [data-cmd=car]'),brake=document.querySelector('#touch [data-hold=brake]');
    board.textContent=v?'Exit':'Board';if(v?.boat&&!v.policeBoat&&game.nearbyPatrolBoat())board.textContent='Take boat';
    brake.textContent=v?'Brake':'Sprint';brake.hidden=!!v?.heli;
    document.body.classList.toggle('flying',!!v?.heli);
    if(v?.heli){$('gear').textContent=Math.round(v.alt)+' m';prompt=matchMedia('(any-pointer:coarse)').matches?(v.alt>.05?'Lower to land':'Hold Climb to take off'):v.alt>.05?'Space · Climb &nbsp; C · Descend':'Space · Take off &nbsp; F · Exit'}
    if((!v||v.boat&&!v.policeBoat)&&game.nearbyPatrolBoat())prompt='<kbd>'+entry+'</kbd> Take police launch';
    if(!v&&game.nearestCar()?.heli)prompt='<kbd>'+entry+'</kbd> Board helicopter';
    const r=game.room||game.entrance();if(r){if(game.room){$('district').textContent=r.label;$('roadName').textContent=r.label.toUpperCase();prompt=game.atHost()?'<kbd>'+use+'</kbd> Talk to '+r.host:game.atExit()?'<kbd>'+use+'</kbd> Exit to street':'Walk to '+r.host+' at the counter'}else prompt='<kbd>'+use+'</kbd> Enter '+r.label}
    $('context').innerHTML=prompt;const n=game.notice;if(n&&game.time<n.until){$('notification').innerHTML='';const b=document.createElement('b');b.textContent=n.title;$('notification').append(b);if(n.detail){const s=document.createElement('span');s.textContent=n.detail;$('notification').append(s)}}else $('notification').replaceChildren();
    const dest=o||waypoint,point=!game.room&&dest&&renderer.project(dest.x,3.7,dest.z);if(point&&point.dep<125&&point.x>40&&point.x<innerWidth-45&&point.y>75&&point.y<innerHeight-65){const pin=$('pin');pin.style.display='block';pin.style.left=point.x+'px';pin.style.top=point.y+'px';pin.textContent=(o?'◆ ':'● ')+Math.round(PC.dist(p,dest))+' m'}else $('pin').style.display='none';
    if(waypoint&&!o&&PC.dist(p,waypoint)<4){waypoint=null;game.notify('Waypoint reached')}
    drawMap($('mini'),false)
  }
  let accumulator=0;const fixed=1/120;
  function frame(now){const dt=Math.min(.12,Math.max(.001,(now-last)/1000));last=now;
    if(!dialog){const input={...keys,...touchInput};accumulator+=dt;while(accumulator>=fixed){if(mode==='play'){if(!game.vehicle)look+=((+!!keys.lookRight)-(+!!keys.lookLeft))*fixed*1.8;game.tick(fixed,input,look)}else{for(const c of game.traffic)game.trafficTick(c,fixed);for(const n of game.people)game.pedTick(n,fixed);game.time+=fixed}accumulator-=fixed}
      renderer.render(game,mode,dt,look);if(mode==='play'&&now-lastHud>110){updateHud();lastHud=now}if(mode==='play'&&(game.dirty||now-lastSave>4500)){save();lastSave=now}}
    audioTick();requestAnimationFrame(frame)
  }
  world.addEventListener('webglcontextlost',e=>{e.preventDefault();save();$('error').hidden=false;$('error').textContent='Graphics interrupted. Reload this page to resume from your last save.'});
  renderer.render(game,'title',.1,look);requestAnimationFrame(frame);
})();
