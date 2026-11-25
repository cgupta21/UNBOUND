const {chromium}=require(process.env.UNBOUND_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const p=await browser.newPage({hasTouch:true,viewport:{width:900,height:780}});
  await p.goto(process.env.UNBOUND_URL||pathToFileURL(path.resolve(__dirname,'../UNBOUND.html')).href);
  await p.locator('#begin').click();await p.locator('#miniButton').click();
  const map=p.locator('#mapFull'),snapshot=()=>map.evaluate(c=>{const ctx=c.getContext('2d'),pixels=[];for(let y=30;y<c.height;y+=31)for(let x=30;x<c.width;x+=31)pixels.push(ctx.getImageData(x,y,1,1).data[0]);return pixels});
  const box=await map.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const initial=await snapshot();await p.mouse.move(x,y);await p.mouse.wheel(0,-400);
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const zoomed=await snapshot();await p.mouse.down();await p.mouse.move(x+65,y+30,{steps:6});await p.mouse.up();
  assert.notDeepEqual(await snapshot(),zoomed);await p.locator('#fitMap').click();assert.ok((await snapshot()).filter((v,i)=>Math.abs(v-initial[i])>3).length<3);
  const cdp=await p.context().newCDPSession(p);
  for(const [type,span] of [['touchStart',20],['touchMove',50],['touchEnd',0]]){
   await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:span?[{x:x-span,y,id:1},{x:x+span,y,id:2}]:[]});
  }
  assert.notDeepEqual(await snapshot(),initial);
  await p.touchscreen.tap(x,y);const marked=await map.evaluate(c=>Array.from(c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data));
  assert.deepEqual(marked.slice(0,3),[255,159,133]);
  await p.locator('[data-ui=clear]').click();await p.locator('#fitMap').click();assert.ok((await snapshot()).filter((v,i)=>Math.abs(v-initial[i])>3).length<3);
  console.log('Passed wheel zoom, mouse drag, fit city, pinch zoom, waypoint alignment and clearing.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

