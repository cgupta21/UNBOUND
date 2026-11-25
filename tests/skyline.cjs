const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:700}});
 await page.addInitScript(()=>{let frame,time;requestAnimationFrame=f=>(frame=f,1);window.advance=n=>{time=Math.max(time||0,performance.now());while(n--)frame(time+=100)}});
 await page.goto(process.env.UNBOUND_URL||pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href);
 assert.ok(await page.locator('#error').isHidden());await page.locator('#skylineStart').click();
 await page.keyboard.down('w');await page.evaluate(()=>advance(30));await page.keyboard.up('w');await page.evaluate(()=>advance(20));
 const shot=path.join(os.tmpdir(),'unbound-sunset-drive.jpg');await page.screenshot({path:shot});console.log(shot);
 await page.keyboard.press('Escape');const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
 assert.equal(save.player.car,0);assert.ok(save.player.z<45);console.log('Sunset drive rendered and moved',save.player.z);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
