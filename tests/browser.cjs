// Run with PALM_PLAYWRIGHT pointing at a Playwright installation if it is not on NODE_PATH.
const {chromium} = require(process.env.PALM_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href;
const captures=process.env.PALM_CAPTURES || os.tmpdir();
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1240,height:760},deviceScaleFactor:1});const p=await context.newPage();const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{
      let frame;window.requestAnimationFrame=cb=>(frame=cb,1);
      window.stepGame=seconds=>{window.qaTime??=performance.now();for(let i=0;i<Math.ceil(seconds*10);i++){window.qaTime+=100;frame(window.qaTime)}};
    });
    await p.goto(url);assert.equal(await p.locator('#error').innerText(),'');
    const step=t=>p.evaluate(t=>window.stepGame(t),t);
    const press=k=>p.keyboard.press(k);
    const hold=async(k,t)=>{await p.keyboard.down(k);await step(t);await p.keyboard.up(k)};
    const shot=name=>p.screenshot({path:path.join(captures,'palm-'+name+'.png')});
    await step(.1);await shot('title');await p.getByText('Controls',{exact:true}).first().click();assert.equal(await p.locator('#panelTitle').innerText(),'Controls');await press('Escape');
    await p.locator('#begin').click();await step(.2);await shot('drive');
    await press('j');await p.locator('[data-job="fare"]').click();await step(.1);
    assert.equal(await p.locator('#jobTitle').innerText(),'Pick up Sol');
    await hold('w',1.8);await hold('Space',1.6);await press('e');await step(.2);
    assert.equal(await p.locator('#jobTitle').innerText(),'Drop off Sol');
    await hold('w',4.1);await hold('Space',1.6);await press('e');await step(.2);
    // The exact stop depends on traffic. Save and inspect the position through the regular pause menu.
    await press('Escape');let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
    console.log('Passenger drive',JSON.stringify({player:s.player,money:s.money,job:s.job}));
    await press('Escape');if(s.job){
      const delta=s.player.z+38,k=delta>0?'w':'s',seconds=Math.sqrt(Math.abs(delta)*2/(delta>0?8.5:5.5))*.87;
      await hold(k,seconds);await hold('Space',1.8);await press('e');await step(.2)
    }
    assert.equal(await p.locator('#money').innerText(),'$180');
    await press('f');await step(.2);assert.equal(await p.locator('#unit').innerText(),'ON FOOT');await shot('walk');
    await press('f');await step(.2);assert.equal(await p.locator('#unit').innerText(),'KM/H');
    await press('m');await p.locator('#mapFull').click({position:{x:135,y:140}});await shot('map');await press('Escape');
    await press('j');await p.locator('[data-job="vinyl"]').click();await step(.2);await press('Escape');
    await p.reload();await p.locator('#begin').click();await step(.2);assert.equal(await p.locator('#money').innerText(),'$180');assert.equal(await p.locator('#jobTitle').innerText(),'Collect the records');
    assert.equal(await p.locator('#soundText').innerText(),'Audio on');
    await p.locator('#sound').click();await press('j');await p.locator('[data-ui="cancel"]').click();await step(.2);assert.equal(await p.locator('#jobTitle').innerText(),'Available jobs');
    await press('Escape');await p.evaluate(()=>{const k='unbound-save-1',s=JSON.parse(localStorage.getItem(k));s.player={x:7.7,z:48,h:0,car:null,walk:0};localStorage.setItem(k,JSON.stringify(s))});
    // Navigate through a fresh page so the outgoing page's final autosave cannot override the fixture.
    const bike=await p.context().newPage();await bike.goto(url);await bike.locator('#begin').click();await bike.keyboard.press('f');await bike.keyboard.down('w');await bike.waitForTimeout(1200);await bike.keyboard.up('w');await bike.keyboard.press('Escape');
    const riding=await bike.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));assert.equal(riding.player.car,5);assert.ok(riding.player.z<48);
    await bike.keyboard.press('Escape');await bike.locator('.topbuttons [data-cmd="car"]').click();await bike.waitForFunction(()=>document.querySelector('#unit').textContent==='ON FOOT');await bike.close();
    assert.deepEqual(errors,[]);console.log('Desktop browser playthrough and motorcycle mounting, riding and exit passed');
    const coast=await browser.newPage({viewport:{width:980,height:680}});await coast.goto(url);await coast.locator('#walkStart').click();await coast.keyboard.down('ArrowUp');await coast.waitForTimeout(1200);await coast.keyboard.up('ArrowUp');await coast.keyboard.press('Escape');
    const foot=await coast.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')).player);assert.equal(foot.car,null);assert.ok(foot.z<47.8);
    await coast.keyboard.press('Escape');await coast.keyboard.press('Enter');await coast.waitForFunction(()=>document.querySelector('#unit').textContent==='KM/H');await coast.keyboard.down('ArrowUp');await coast.waitForTimeout(1000);await coast.keyboard.up('ArrowUp');await coast.keyboard.press('Escape');const sailing=await coast.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')).player);assert.equal(sailing.car,7);assert.ok(sailing.z<44);await coast.keyboard.press('Escape');await coast.keyboard.press('Enter');await coast.waitForFunction(()=>document.querySelector('#unit').textContent==='ON FOOT');await coast.close();console.log('Start on foot, arrow-key walking, boating and shore exit passed');
    const lobby=await browser.newPage({viewport:{width:1024,height:700}});lobby.on('pageerror',e=>errors.push(e.message));await lobby.goto(url);await lobby.locator('#hotelStart').click();await lobby.keyboard.press('e');
    await lobby.waitForFunction(()=>document.querySelector('#district').textContent==='Palma Hotel');await lobby.keyboard.down('ArrowUp');await lobby.waitForFunction(()=>document.querySelector('#context').textContent.includes('Talk to Alma'));await lobby.keyboard.up('ArrowUp');await lobby.keyboard.press('e');await lobby.locator('[data-job="guestlist"]').click();await lobby.keyboard.press('Escape');
    const hotelSave=await lobby.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));assert.equal(hotelSave.inside.id,'lobby');assert.ok(hotelSave.inside.z<0);assert.equal(hotelSave.job.id,'guestlist');
    await lobby.reload();await lobby.locator('#begin').click();await lobby.keyboard.down('s');await lobby.waitForFunction(()=>document.querySelector('#context').textContent.includes('Exit to street'));await lobby.keyboard.up('s');await lobby.keyboard.press('e');await lobby.waitForFunction(()=>document.querySelector('#context').textContent.includes('Enter Palma Hotel'));await lobby.close();console.log('Hotel doorway, continuous walking, NPC mission acceptance, indoor reload and sidewalk exit passed');
    const pursuit=await browser.newPage({viewport:{width:800,height:520}});
    await pursuit.addInitScript(()=>{localStorage.setItem('unbound-save-1',JSON.stringify({v:1,money:200,player:{x:9.5,z:35.5,h:0,car:0},cars:[{x:9.5,z:35.5,h:0}]}));let cb,t=performance.now();window.requestAnimationFrame=f=>(cb=f,1);window.advance=ticks=>{for(let i=0;i<ticks;i++)cb(t+=100)}});
    await pursuit.goto(url);await pursuit.locator('#begin').click();await pursuit.keyboard.down('w');await pursuit.evaluate(()=>window.advance(16));await pursuit.keyboard.up('w');assert.match(await pursuit.locator('#alertState').innerText(),/WANTED/);
    await pursuit.evaluate(()=>window.advance(180));assert.ok(await pursuit.locator('#arrest').isVisible());assert.match(await pursuit.locator('#arrestInfo').innerText(),/130/);
    await pursuit.locator('#release').click();assert.ok(await pursuit.locator('#arrest').isHidden());await pursuit.close();console.log('NPC collision, WANTED, police capture, BUSTED and release passed');
    const escape=await browser.newPage({viewport:{width:720,height:450}});
    await escape.addInitScript(()=>{
      const loc={x:3.25,z:120,h:0};localStorage.setItem('unbound-save-1',JSON.stringify({v:1,alert:2,player:{...loc,car:0},cars:[loc]}));
      const original=AudioContext.prototype.createOscillator;window.sources=[];
      AudioContext.prototype.createOscillator=function(){const osc=original.call(this);window.sources.push(osc);return osc};
      let cb,t=performance.now();window.requestAnimationFrame=f=>(cb=f,1);window.advance=n=>{for(let i=0;i<n;i++)cb(t+=100)}
    });
    await escape.goto(url);await escape.locator('#begin').click();await escape.evaluate(()=>window.advance(4));await escape.waitForTimeout(160);
    assert.equal(await escape.evaluate(()=>window.sources.filter(o=>o.type==='triangle'&&o.frequency.value>450&&o.frequency.value<1100).length),2);
    await escape.keyboard.down('w');await escape.evaluate(()=>window.advance(136));assert.match(await escape.locator('#alertState').innerText(),/^★ SEARCHING/);
    await escape.evaluate(()=>window.advance(77));await escape.keyboard.up('w');assert.ok(await escape.locator('#alertState').isHidden());assert.match(await escape.locator('#notification').innerText(),/Escaped/);assert.ok(await escape.locator('#arrest').isHidden());
    await escape.close();console.log('Two patrol siren voices, driving escape, stepwise star loss and all-clear passed');
    const trafficWorld=new (require('../src/world.js').Game)();
    for(const bike of [false,true])for(const witnessed of [false,true]){
      const npc=trafficWorld.traffic.find(c=>!c.patrol&&!!c.bike===bike);
      const page=await browser.newPage({viewport:{width:800,height:540}});
      await page.addInitScript(({x,z})=>{
        if(!localStorage.getItem('unbound-save-1'))localStorage.setItem('unbound-save-1',JSON.stringify({v:1,player:{x:x+2.4,z,h:0,car:null}}));
        let callback,t=performance.now();window.requestAnimationFrame=f=>(callback=f,1);window.step=n=>{for(let i=0;i<n;i++)callback(t+=100)}
      },{x:npc.x,z:npc.z});
      await page.goto(url);await page.locator('#walkStart').click();await page.evaluate(()=>window.step(3));
      // Set up a nearby observer before input, keeping takeover, visibility and dispatch on the live game path.
      if(witnessed)await page.evaluate(()=>{const original=PC.Game.prototype.toggleCar;PC.Game.prototype.toggleCar=function(){const v=this.nearestCar();Object.assign(this.patrol,{x:v.x,z:v.z-12,h:Math.PI});PC.Game.prototype.toggleCar=original;return original.call(this)}});
      await page.keyboard.press(bike?'Enter':'f');
      assert.match(await page.locator('#notification').innerText(),bike?/back my bike/:/my car/);
      assert.equal(await page.locator('#alertState').isVisible(),witnessed);if(witnessed)assert.match(await page.locator('#notification').innerText(),/Police witnessed/);
      await page.keyboard.down('w');await page.evaluate(()=>window.step(13));await page.keyboard.up('w');await page.keyboard.press('Escape');
      const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
      let snapshot1=await snapshot();const vehicle=snapshot1.cars[snapshot1.player.car];assert.ok(vehicle.acquired);assert.equal(vehicle.bike,bike);assert.ok(Math.abs(vehicle.z-npc.z)>2);
      await page.reload();await page.locator('#begin').click();await page.locator('.topbuttons [data-cmd="car"]').click();await page.evaluate(()=>window.step(2));assert.equal(await page.locator('#unit').innerText(),'ON FOOT');
      await page.locator('.topbuttons [data-cmd="car"]').click();assert.equal((await snapshot()).player.car,snapshot1.player.car);await page.close()
    }
    console.log('NPC car and ridden motorcycle takeover, driving, reload, exit and re-entry passed');
    for(const room of require('../src/world.js').rooms.filter(r=>['mall','arcade'].includes(r.id))){
      const page=await browser.newPage({viewport:{width:850,height:550}});page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({x,z})=>{localStorage.setItem('unbound-save-1',JSON.stringify({v:1,player:{x,z,h:0,car:null}}));let cb,t=performance.now();window.requestAnimationFrame=f=>(cb=f,1);window.step=n=>{for(let i=0;i<n;i++)cb(t+=100)}},{x:room.x,z:room.z});
      await page.goto(url);await page.locator('#walkStart').click();await page.keyboard.press('e');await page.keyboard.down('ArrowUp');await page.evaluate(()=>window.step(18));await page.keyboard.up('ArrowUp');await page.keyboard.press('e');assert.equal(await page.locator('#panelTitle').innerText(),room.host);
      await page.locator('[data-job="'+room.job+'"]').click();await page.keyboard.press('Escape');const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));assert.equal(state.inside.id,room.id);assert.equal(state.job.id,room.job);await page.close()
    }
    console.log('Both eastern district interiors, NPC conversations and new mission acceptances passed');
    for(const outcome of ['escape','capture']){
      const seaPage=await browser.newPage({viewport:{width:800,height:500}});seaPage.on('pageerror',e=>errors.push(e.message));
      const testGame=new (require('../src/world.js').Game)(),loc={x:-97,z:100,h:0};Object.assign(testGame.cars[7],loc);Object.assign(testGame.player,loc,{car:7});testGame.money=390;testGame.startPursuit(4,testGame.player);
      await seaPage.addInitScript(save=>{localStorage.setItem('unbound-save-1',JSON.stringify(save));let cb,t=performance.now();window.requestAnimationFrame=f=>(cb=f,1);window.advance=n=>{for(let i=0;i<n;i++)cb(t+=100)}},testGame.save());
      await seaPage.goto(url);await seaPage.locator('#begin').click();await seaPage.keyboard.down('w');await seaPage.evaluate(()=>window.advance(15));
      assert.match(await seaPage.locator('#alertState').innerText(),/★★★★ WANTED · AIR · MARINE/);
      if(outcome==='escape'){const stages=[];for(let i=0;i<20;i++){await seaPage.evaluate(()=>window.advance(20));const hud=seaPage.locator('#alertState');if(await hud.isHidden())break;const stars=((await hud.innerText()).match(/★/g)||[]).length;if(stages.at(-1)!==stars)stages.push(stars)}
        await seaPage.keyboard.up('w');assert.deepEqual(stages,[4,3,2,1]);assert.ok(await seaPage.locator('#alertState').isHidden());assert.match(await seaPage.locator('#notification').innerText(),/Escaped/);assert.ok(await seaPage.locator('#arrest').isHidden());
      }else{await seaPage.keyboard.up('w');await seaPage.keyboard.down('Space');await seaPage.evaluate(()=>window.advance(90));await seaPage.keyboard.up('Space');assert.ok(await seaPage.locator('#arrest').isVisible());assert.match(await seaPage.locator('#arrestInfo').innerText(),/260/);await seaPage.locator('#release').click();assert.equal(await seaPage.locator('#unit').innerText(),'ON FOOT')}
      await seaPage.close();console.log('Four-star airborne and offshore pursuit browser outcome:',outcome)
    }
    for(const scenario of ['fly','dock','intercept']){
      const pg=await browser.newPage({viewport:{width:830,height:510}});pg.on('pageerror',e=>errors.push(e.message));
      const g=new (require('../src/world.js').Game)();
      if(scenario==='intercept'){Object.assign(g.player,{x:-95,z:110,h:0,car:7});Object.assign(g.cars[7],{x:-95,z:110,h:0});g.startPursuit(2,g.player);g.supportTick(0);Object.assign(g.marine[0],{x:-99,z:111})}
      else Object.assign(g.player,{x:scenario==='fly'?-26:-39,z:scenario==='fly'?49:64,h:0,car:null});
      await pg.addInitScript(save=>{localStorage.setItem('unbound-save-1',JSON.stringify(save));let cb,t=performance.now();window.requestAnimationFrame=f=>(cb=f,1);window.step=n=>{for(let i=0;i<n;i++)cb(t+=100)}},g.save());
      await pg.goto(url);await pg.locator('#begin').click();const hold=async(key,n)=>{await pg.keyboard.down(key);await pg.evaluate(n=>window.step(n),n);await pg.keyboard.up(key)};
      await pg.keyboard.press('f');
      if(scenario==='fly'){await hold('Space',17);assert.match(await pg.locator('#gear').innerText(),/1[0-9] m/);await hold('w',8);await pg.keyboard.press('f');assert.match(await pg.locator('#notification').innerText(),/Land before exiting/);await hold('c',31);assert.equal(await pg.locator('#gear').innerText(),'0 m');await pg.keyboard.press('f');await pg.evaluate(()=>window.step(2));assert.equal(await pg.locator('#unit').innerText(),'ON FOOT')}
      else{assert.match(await pg.locator('#notification').innerText(),/Police launch taken/);await hold('w',15);await pg.keyboard.press('Escape');const saved=await pg.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));const v=saved.cars[saved.player.car];assert.ok(v.policeBoat&&v.boat);assert.ok(v.z<(scenario==='dock'?64:111)-3)}
      await pg.close();console.log('Player vehicle browser check passed:',scenario)
    }
    const m=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    m.on('pageerror',e=>errors.push(e.message));await m.goto(url);await m.locator('#begin').tap();await m.locator('.topbuttons [data-cmd="car"]').tap();
    await m.waitForFunction(()=>document.querySelector('#unit').textContent==='ON FOOT');await m.locator('#miniButton').tap();assert.equal(await m.locator('#panelTitle').innerText(),'City map');await m.locator('#closePanel').tap();
    assert.deepEqual(errors,[]);console.log('Touch layout, vehicle exit and city map passed');
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
