const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try{
    for(const [kind,x,z] of [['car',3.25,48],['bike',7.7,48],['boat',-38,44],['heli',-24,49]]){
      const page=await browser.newPage({viewport:{width:900,height:640}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        let frame,t;window.requestAnimationFrame=cb=>(frame=cb,1);
        window.advance=n=>{t=Math.max(performance.now(),t||0);while(n--)frame(t+=100)};
      });
      const url=process.env.UNBOUND_URL||pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href;
      await page.goto(url);assert.ok(await page.locator('#error').isHidden());
      await page.locator('#begin').click();
      const seed=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
      Object.assign(seed.player,{car:null,x,z,h:0});
      await page.addInitScript(s=>localStorage.setItem('unbound-save-1',JSON.stringify(s)),seed);
      await page.reload();await page.locator('#begin').click();await page.keyboard.press('f');
      async function state(){
        await page.keyboard.press('Escape');
        const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')).player);
        await page.keyboard.press('Escape');return p;
      }
      const start=await state();assert.equal(start.car,{car:0,bike:5,boat:7,heli:seed.cars.length-1}[kind],kind);
      if(kind==='heli'){await page.keyboard.down('Space');await page.evaluate(()=>advance(10));await page.keyboard.up('Space')}
      let previous=start;
      for(const direction of [1,-1]){
        await page.keyboard.down('w');await page.mouse.move(450,320);await page.mouse.down();await page.mouse.move(450+100*direction,320);
        await page.evaluate(()=>advance(7));await page.mouse.up();await page.keyboard.up('w');
        const now=await state();assert.ok((now.h-previous.h)*direction>.025,kind+' heading '+previous.h+' -> '+now.h);
        assert.ok(Math.hypot(now.x-previous.x,now.z-previous.z)>.05);previous=now;
      }
      assert.deepEqual(errors,[]);console.log(kind+' mouse steering passed');await page.close();
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

