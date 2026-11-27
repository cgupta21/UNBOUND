const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
async function main(){
  const browser=await chromium.launch({channel:'msedge',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    for(const scenario of ['boat','car','bike','heli']){
      const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:scenario==='heli'?{width:844,height:390}:{width:375,height:812}});
      const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.addInitScript(()=>{
        let next,time;requestAnimationFrame=cb=>{next=cb;return 1};
        window.step=seconds=>{time=Math.max(time||0,performance.now());for(let i=0;i<seconds*10;i++)next(time+=100)};
      });
      const url=process.env.UNBOUND_URL||pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href;
      await p.goto(url);await p.locator('#walkStart').tap();
      const cdp=await context.newCDPSession(p);
      async function hold(selectors,seconds){
        const touchPoints=[];
        for(const selector of selectors){
          const box=await p.locator(selector).boundingBox();assert.ok(box,selector);
          touchPoints.push({id:touchPoints.length+1,x:box.x+box.width/2,y:box.y+box.height*(selector==='#stick'?.12:.5)});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints});
        }
        await p.evaluate(s=>step(s),seconds);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }
      const board=p.locator('#touch [data-cmd=car]');
      async function state(){
        await p.locator('[data-cmd=pause]').tap();
        const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
        await p.locator('[data-ui=resume]').tap();return s;
      }
      if(scenario==='boat'){
        const start=await state();await hold(['#stick','[data-hold=brake]'],.2);
        assert.ok((await state()).player.z<start.player.z);
      }else{
        await p.evaluate(kind=>{
          const s=JSON.parse(localStorage.getItem('unbound-save-1'));
          const pos=kind==='heli'?[-24,49]:kind==='bike'?[7.7,48]:[s.cars[0].x,s.cars[0].z];
          Object.assign(s.player,{x:pos[0],z:pos[1],car:null});localStorage.setItem('unbound-save-1',JSON.stringify(s));
        },scenario);
        const seed=await p.evaluate(()=>localStorage.getItem('unbound-save-1'));
        await p.addInitScript(s=>localStorage.setItem('unbound-save-1',s),seed);await p.reload();await p.locator('#begin').tap();
      }
      await board.tap();await p.evaluate(()=>step(.2));
      const lights=p.locator('#touchLights');
      if(scenario==='car'||scenario==='bike'){
        await lights.tap();assert.equal(await lights.getAttribute('aria-pressed'),'false');
        const saved=await state();assert.equal(saved.cars[saved.player.car].lightsOff,true);
        await lights.tap();assert.equal(await lights.getAttribute('aria-pressed'),'true');
      }else assert.ok(await lights.isHidden());
      const boarded=await state();assert.notEqual(boarded.player.car,null,scenario);
      await hold(scenario==='heli'?['[data-hold=rise]','#stick']:['#stick'],1);
      const moving=await state();assert.ok(Math.hypot(moving.player.x-boarded.player.x,moving.player.z-boarded.player.z)>.1,scenario);
      if(scenario==='heli'){
        assert.ok(parseInt(await p.locator('#gear').innerText())>0);
        await hold(['[data-hold=descend]'],3);assert.equal(await p.locator('#gear').innerText(),'0 m');
      }else await hold(['[data-hold=brake]'],2);
      await board.tap();await p.evaluate(()=>step(.2));assert.equal((await state()).player.car,null);
      assert.deepEqual(errors,[]);console.log('Touch passed:',scenario);await context.close();
    }
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
