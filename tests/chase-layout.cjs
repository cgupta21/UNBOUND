const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const b=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const p=await b.newPage({hasTouch:true,isMobile:true,viewport:{width:320,height:568}});
 await p.goto(process.env.UNBOUND_URL||pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href);
 await p.locator('#begin').tap();const seed=await p.evaluate(()=>JSON.parse(localStorage.getItem('unbound-save-1')));
 for(const type of ['car','boat','heli']){
 const id=type==='car'?0:seed.cars.findIndex(v=>v[type]);Object.assign(seed.player,{car:id,x:seed.cars[id].x,z:seed.cars[id].z});seed.alert=6;
 await p.addInitScript(s=>localStorage.setItem('unbound-save-1',JSON.stringify(s)),seed);
 await p.reload();await p.locator('#begin').tap();await p.waitForFunction(()=>document.querySelector('#alertState').textContent.includes('AIR'));
 for(const [width,height] of [[320,568],[568,320],[390,844],[844,390]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(130);
 const issues=await p.evaluate(()=>{
 const problems=[],rects=[];
 for(const e of document.querySelectorAll('#status,#jobCard,#mapDock,#speedBox,#stick,#touch button')){
 const r=e.getBoundingClientRect();if(!r.width)continue;const name=e.id||e.textContent;
 if(r.left<0||r.right>innerWidth+1||r.bottom>innerHeight)problems.push(name+' clipped');
 for(const [other,q] of rects)if(r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top)problems.push(name+' overlaps '+other);
 rects.push([name,r]);
 if(e.matches('#stick,#touch button,#mapDock')&&!e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))problems.push(name+' obstructed');
 }return problems});
 console.log(type,width,height,issues);assert.deepEqual(issues,[]);
 await p.locator('#miniButton').tap();await p.locator('#closePanel').tap();
 }}
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

