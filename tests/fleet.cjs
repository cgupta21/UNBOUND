const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const p=await browser.newPage({viewport:{width:960,height:580}});
 const url=process.env.UNBOUND_URL||'http://unbound.test/';
 await p.route(url,async route=>{
   const html=process.env.UNBOUND_URL?await (await route.fetch()).text():fs.readFileSync(path.join(__dirname,'../UNBOUND.html'),'utf8');
   const inspected=html.replace('const game=new PC.Game(saved)','const game=window.qaGame=new PC.Game(saved)').replace('const smooth=init?',`if(window.subject){
     const u=window.subject;const a=u.h+1.03,r=u.alt?9:u.boat?6.7:6.1;
     const y=u.alt||0;e=[u.x+Math.sin(a)*r,y+3.4,u.z-Math.cos(a)*r];t=[u.x,y+1,u.z];lens=.46;init=false;
   }const smooth=init?`);
   await route.fulfill({contentType:'text/html',body:inspected});
 });
 await p.addInitScript(()=>{let frame,t;requestAnimationFrame=f=>(frame=f,1);window.step=n=>{t=Math.max(t||0,performance.now());while(n--)frame(t+=100)}});
 await p.goto(url);await p.locator('#skylineStart').click();
 for(const kind of ['cruiser','helicopter','boat']){
 const data=await p.evaluate(kind=>{
   const g=qaGame;if(!g.alert){g.reportCrash(true);g.alert.level=6;g.dispatch(6)}
   if(kind==='boat'){const b=g.cars.find(c=>c.boat);Object.assign(b,{x:-80,z:40,h:0});Object.assign(g.player,{car:b.id,x:b.x,z:b.z})}
   g.supportTick(0);
   const u=kind==='boat'?g.marine[0]:kind==='helicopter'?g.air:g.patrols.find(c=>c.state!=='blocking');
   window.subject=u;const start={x:u.x,z:u.z};step(12);
   return {stars:g.alert?.level,motion:Math.hypot(u.x-start.x,u.z-start.z),units:[g.patrols.length,g.marine.length,!!g.air]};
 },kind);
 console.log(kind,data);assert.ok(data.stars>=5);assert.ok(data.motion>.01);
 await p.addStyleTag({content:'#hud,header{display:none!important}'});
 const dir=path.join(__dirname,'../chase-captures');fs.mkdirSync(dir,{recursive:true});
 await p.screenshot({path:path.join(dir,kind+'.jpg'),quality:92});
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})

