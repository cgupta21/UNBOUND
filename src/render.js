function createRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
  if(!gl)throw Error('WebGL is unavailable. Enable hardware acceleration in your browser and reopen the game.');
  const {xs,zs,clamp,seed}=PC, pi=Math.PI,ta=pi*2;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
  const sky=program('attribute vec2 a;varying vec2 uv;void main(){uv=a;gl_Position=vec4(a,.99999,1.);}',`
    precision mediump float;varying vec2 uv;uniform vec3 rightV,upV,forwardV;uniform vec2 lens;uniform float light,tm;
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.989,78.233)))*4375.54);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(forwardV+rightV*uv.x*lens.x+upV*uv.y*lens.y);float h=max(0.,d.y);
      vec3 dusk=mix(vec3(.99,.70,.51),vec3(.94,.55,.62),smoothstep(.0,.17,h));dusk=mix(dusk,vec3(.44,.46,.70),smoothstep(.12,.55,h));dusk=mix(dusk,vec3(.17,.27,.48),smoothstep(.48,1.,h));
      vec3 night=mix(vec3(.25,.24,.37),vec3(.035,.075,.17),smoothstep(0.,.48,h));vec3 col=mix(night,dusk,light);
      vec3 sun=normalize(vec3(-.37,.155,-.94));float sd=length(d-sun);col+=vec3(.32,.13,.02)*exp(-sd*6.)*light;
      col=mix(col,mix(vec3(.91,.89,.79),vec3(1.,.91,.61),light),1.-smoothstep(.052,.056,sd));
      col+=vec3(.22,.09,.035)*exp(-sd*sd*105.)*light;vec2 cp=d.xz/max(.055,d.y+.045)*vec2(2.,7.)+tm*.0004;float cloud=noise(cp)*.6+noise(cp*2.1)*.3+noise(cp*4.2)*.1;
      col=mix(col,mix(vec3(.25,.25,.40),vec3(.99,.75,.72),light),smoothstep(.58,.80,cloud)*smoothstep(.035,.14,h)*.48);gl_FragColor=vec4(col,1.);}`);
  const mesh=program(`attribute vec3 pos,col;attribute vec2 uv;attribute float mat;uniform vec3 eye,rightV,upV,forwardV,offset;uniform vec2 lens,rot;uniform float walk;
    varying vec3 color,world,viewRay;varying vec2 tex;varying float material,depth;
    void main(){vec3 p=pos;if(walk!=0.&&p.y<.83)p.z+=sin(walk)*sign(p.x)*(.83-p.y)*.48;
    world=vec3(p.x*rot.x-p.z*rot.y,p.y,p.x*rot.y+p.z*rot.x)+offset;vec3 d=world-eye;viewRay=-d;depth=dot(d,forwardV);
    gl_Position=vec4(dot(d,rightV)/lens.x,dot(d,upV)/lens.y,depth*1.0006-.2801,depth);color=col;tex=uv;material=mat;}`,`
    precision mediump float;varying vec3 color,world,viewRay;varying vec2 tex;varying float material,depth;uniform float light,tm;uniform sampler2D atlas;uniform vec4 roadCars[4];uniform vec4 lamps;uniform float lensPower;
    void main(){vec3 c=color;if(material>.5&&material<1.5)c*=texture2D(atlas,tex).rgb;
      if(material>2.5&&material<3.5){
        vec3 view=normalize(viewRay);
        float a=world.z*1.45+world.x*.42+tm*1.1,b=world.z*.63-world.x*1.21+tm*.85;
        vec3 n=normalize(vec3(.07*cos(a)-.09*cos(b),1.,.16*cos(a)+.06*cos(b)));
        float grazing=pow(1.-clamp(dot(n,view),0.,1.),3.);
        vec3 reflection=mix(vec3(.32,.41,.58),vec3(.93,.59,.52),light);
        c=mix(c,reflection,.12+.52*grazing);
        vec3 halfVector=normalize(view+normalize(vec3(-.37,.155,-.94)));
        c+=light*vec3(1.,.73,.43)*pow(max(dot(n,halfVector),0.),85.);
      }
      if(material>5.5&&material<6.5){
        vec3 view=normalize(viewRay);
        float skyline=smoothstep(-.15,.65,-view.y);
        c=mix(c,mix(vec3(.93,.60,.53),vec3(.29,.52,.66),skyline),.28+.16*sin(world.y*.24));
      }
      if(material>3.5&&material<4.5){float grit=fract(sin(dot(floor(world.xz*7.),vec2(12.989,7.233)))*127.41);c+=vec3(.018)*(grit-.5);}
      c*=mix(vec3(.27,.32,.51),vec3(1.),light);
      if(material>4.5&&material<5.5)c=mix(c,vec3(.99,.72,.40),.79*(1.-light));
      if(material>1.5&&material<2.5)c=mix(c,color*1.2,.80);
      if(material>6.5&&material<7.5){
        vec2 pane=fract(tex),cell=floor(tex);
        float edge=min(min(pane.x-.12,.88-pane.x),min(pane.y-.15,.82-pane.y));
        float interior=smoothstep(-.016,.016,edge);
        float room=fract(sin(mod(dot(cell,vec2(3.17,7.31)),6.283))*459.31);
        vec3 glass=mix(vec3(.07,.13,.18),vec3(.31,.43,.49),pane.y*.65+room*.35);
        vec3 lamp=mix(vec3(.64,.93,.97),vec3(1.,.79,.53),step(.77,room));
        float lit=smoothstep(.56,.62,room);
        glass=mix(glass,lamp*(.8+.2*pane.y),lit);
        c=mix(c,glass,interior);
        c+=lamp*lit*.12*exp(-abs(edge)*13.);
      }
      if(material>7.5&&material<8.5)c=mix(vec3(.30,.32,.34),vec3(1.,.94,.76),lensPower);
      if(material>8.5&&material<9.5){
        float rim=pow(1.-abs(normalize(viewRay).y),4.);
        c+=vec3(.21,.14,.20)*rim*(.4+.6*light);
      }
      if(material>3.5&&material<4.5){
        float sheen=pow(1.-abs(normalize(viewRay).y),6.);
        float streak=.65+.35*sin(world.x*8.+sin(world.z*.7));
        c+=sheen*streak*mix(vec3(.08,.08,.15),vec3(.17,.095,.11),light);
        for(int i=0;i<4;i++){
          vec2 front=roadCars[i].zw,delta=world.xz-roadCars[i].xy;
          float along=dot(delta,front),across=dot(delta,vec2(-front.y,front.x));
          float shadow=1.-smoothstep(.55,1.55,length(vec2((across-.52)/1.35,(along+.4)/2.65)));
          c*=1.-shadow*.62;
          float reach=max(0.,along-1.9),width=.34+reach*.14;
          float cone=exp(-pow(abs(abs(across)-.74)/width,2.))*smoothstep(1.8,2.8,along)*(1.-smoothstep(5.,27.,along));
          c+=lamps[i]*cone*vec3(.57,.48,.32)*(.8-.28*light);
          float tail=exp(-abs(abs(across)-.72)*3.)*smoothstep(2.,2.6,-along)*(1.-smoothstep(2.6,7.,-along));
          c+=vec3(.22,.018,.01)*tail*streak;
        }
      }
      vec3 haze=mix(vec3(.22,.23,.34),vec3(.94,.68,.61),light);c=mix(c,haze,(1.-exp(-max(depth-12.,0.)*.0033))*.92);gl_FragColor=vec4(c,1.);}`);
  const uniforms=(p,attrs,unifs)=>Object.fromEntries([...attrs.map(k=>[k,gl.getAttribLocation(p,k)]),...unifs.map(k=>[k,gl.getUniformLocation(p,k)])]);
  const su=uniforms(sky,['a'],['rightV','upV','forwardV','lens','light','tm']),mu=uniforms(mesh,['pos','col','uv','mat'],['eye','rightV','upV','forwardV','lens','offset','rot','light','walk','tm','atlas','roadCars[0]','lamps','lensPower']);
  const quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const labels=[...new Set([...PC.buildings.map(b=>b.sign),'UNBOUND','BEACH CLUB','RECORDS','OCEAN DRIVE','SURF SHOP'])];
  const sheet=document.createElement('canvas');sheet.width=1024;sheet.height=1024;const art=sheet.getContext('2d');
  labels.forEach((s,i)=>{const x=(i%2)*512,y=Math.floor(i/2)*96;art.fillStyle=i%3===0?'#326764':i%3===1?'#994d57':'#51536c';art.fillRect(x,y,512,96);art.strokeStyle='#eed29d';art.lineWidth=3;art.strokeRect(x+7,y+6,498,84);art.fillStyle='#ffedc3';art.textAlign='center';art.textBaseline='middle';art.font='italic 900 52px Georgia';art.fillText(s,x+256,y+46,474)});
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,sheet);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  const colors=new Map();function rgb(s){if(Array.isArray(s))return s;if(!colors.has(s)){const n=parseInt(s.slice(1),16);colors.set(s,[n>>16,(n>>8)&255,n&255].map(x=>x/255))}return colors.get(s)}
  const tint=(s,k)=>rgb(s).map(x=>x*k);
  class Geo{
    constructor(){this.data=[]}
    tri(a,b,c,col,mat=0,uv){const r=rgb(col);for(const [i,p] of [a,b,c].entries())this.data.push(...p,...r,...(uv?.[i]||[0,0]),mat)}
    quad(a,b,c,d,col,mat=0){this.tri(a,b,c,col,mat);this.tri(a,c,d,col,mat)}
    box(x,y,z,w,h,d,col,mat=0){
      const l=x-w/2,r=x+w/2,b=z-d/2,f=z+d/2,t=y+h;
      this.quad([l,y,f],[r,y,f],[r,t,f],[l,t,f],tint(col,.84),mat);this.quad([r,y,b],[l,y,b],[l,t,b],[r,t,b],tint(col,.96),mat);
      this.quad([l,y,b],[l,y,f],[l,t,f],[l,t,b],tint(col,1.02),mat);this.quad([r,y,f],[r,y,b],[r,t,b],[r,t,f],tint(col,.69),mat);
      this.quad([l,t,b],[r,t,b],[r,t,f],[l,t,f],tint(col,1.12),mat)
    }
    ground(x,z,w,d,col,y=0,mat=0){this.quad([x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2],col,mat)}
    disc(x,y,z,w,d,col,n=12){for(let i=0;i<n;i++){const a=i*ta/n,b=(i+1)*ta/n;this.tri([x,y,z],[x+Math.cos(a)*w,y,z+Math.sin(a)*d],[x+Math.cos(b)*w,y,z+Math.sin(b)*d],col)}}
    beam(a,b,r1,r2,col,n=6){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1,flat=Math.hypot(dx,dz),u=flat>.001?[dz/flat,0,-dx/flat]:[1,0,0],v=[dy*u[2]/len,(dz*u[0]-dx*u[2])/len,-dy*u[0]/len];
      const ring=(p,r,k)=>p.map((c,i)=>c+r*(u[i]*Math.cos(k*ta/n)+v[i]*Math.sin(k*ta/n)));
      for(let i=0;i<n;i++){this.quad(ring(a,r1,i),ring(a,r1,i+1),ring(b,r2,i+1),ring(b,r2,i),tint(col,.79+.2*Math.cos(i*ta/n)));this.tri(b,ring(b,r2,i),ring(b,r2,i+1),col)}}
    sign(a,b,c,d,label){const i=labels.indexOf(label),x=(i%2)*.5,y=Math.floor(i/2)*96/1024,uv=[[x+.002,y+94/1024],[x+.498,y+94/1024],[x+.498,y+.002],[x+.002,y+.002]];
      this.tri(a,b,c,'#ffffff',1,uv.slice(0,3));this.tri(a,c,d,'#ffffff',1,[uv[0],uv[2],uv[3]])}
    upload(){const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.data),gl.STATIC_DRAW);const n=this.data.length/9;this.data=[];return {buf,n}}
  }
  function palm(g,p){const {x,z,size:s}=p,r=seed(p.seed),h=(7+r()*2)*s,lean=(r()-.5)*1.7,top=[x+lean,h,z+.6];
    const shadowY=.224,sx=top[0]+h*.29,sz=top[2]+h*.51;
    g.quad([x-.18,shadowY,z],[x+.18,shadowY,z],[sx+.1,shadowY,sz],[sx-.1,shadowY,sz],'#b09b81');g.beam([x,.18,z],[x+lean*.32,h*.57,z+.17],.30*s,.23*s,'#987a61',7);g.beam([x+lean*.32,h*.57,z+.17],top,.23*s,.15*s,'#a78a6c',7);
    for(let i=0;i<12;i++){const a=i*2.399+r()*.32,L=(2.65+r()*1.9)*s,hi=(1.1+r()*.95)*s,drop=(1.1+r()*1.4)*s,dx=Math.cos(a),dz=Math.sin(a),color=['#558259','#486f50','#638a54','#77935b'][i%4];
      const pt=t=>[top[0]+dx*L*t,top[1]+Math.sin(t*pi)*hi-drop*t*t,top[2]+dz*L*t];
      const tip=pt(1);g.tri([sx,shadowY,sz],[sx+dx*1.8-dz*.28,shadowY,sz+dz*1.8+dx*.28],[sx+tip[0]-top[0],shadowY,sz+tip[2]-top[2]],'#b09b81');
      for(let k=0;k<8;k++){const t=k/8,en=(k+1)/8,start=pt(t),end=pt(en),mid=pt(t+.04),width=(.13+.55*Math.sin((t+.1)*pi))*s;
        for(const dir of [-1,1]){const outer=[mid[0]-dz*width*dir+dx*.54,mid[1]-width*.68,mid[2]+dx*width*dir+dz*.54];g.tri(start,outer,end,dir===1?color:tint(color,.84))}
        g.quad([start[0]-dz*.07,start[1],start[2]+dx*.07],[start[0]+dz*.07,start[1],start[2]-dx*.07],[end[0]+dz*.04,end[1],end[2]-dx*.04],[end[0]-dz*.04,end[1],end[2]+dx*.04],tint(color,1.12))}}
  }
  function building(g,b){
    const {x,z,w,d,paint,sign}=b,h=b.podium||b.h,l=x-w/2,f=z+d/2,r=seed(b.seed);
    if(b.podium){
      const base=b.podium+1.15,tw=w*.9,td=d*.88,height=b.h-base;
      const stone=['#858999','#97939f','#718b96','#ac9c9e'][b.seed%4];
      // Each wall carries a floor-and-bay grid, including the faces seen driving south.
      const corners=[[x-tw/2,z+td/2],[x+tw/2,z+td/2],[x+tw/2,z-td/2],[x-tw/2,z-td/2]];
      for(let side=0;side<4;side++){
        const [ax,az]=corners[side],[bx,bz]=corners[(side+1)%4];
        const A=[ax,base,az],B=[bx,base,bz],C=[bx,b.h,bz],D=[ax,b.h,az];
        const bays=Math.max(3,Math.round(Math.hypot(bx-ax,bz-az)/2.55)),floors=Math.max(3,Math.round(height/2.9));
        const u=b.seed%17+side*7,col=tint(stone,[1,.77,.82,1.08][side]);
        g.tri(A,B,C,col,7,[[u,0],[u+bays,0],[u+bays,floors]]);
        g.tri(A,C,D,col,7,[[u,0],[u+bays,floors],[u,floors]]);
      }
      g.box(x,b.h,z,tw+.3,.32,td+.3,'#d1bdba');
      g.box(x,b.h+.32,z,tw*.54,1.7,td*.57,stone);
      g.box(x,b.h+.08,z,tw+.35,.12,td+.35,b.seed%2?'#a7e8dc':'#ffaba1',2);
    }
    g.box(x,.21,z,w,h,d,paint);g.box(x,h-.16,z,w+.32,.16,d+.32,b.seed%2?'#ff74b9':'#55e4d8',2);g.box(x,2.78,z,w+.26,.11,d+.27,'#ff94b9',2);g.box(x,h+.21,z,w+.75,.48,d+.75,'#f3dcc7');
    g.box(x,h+.7,z,w*.79,.42,d*.8,tint(paint,.92));g.box(x+1,h+1.1,z-1,w*.40,1.45,d*.38,paint);
    g.box(x+2,h+2.55,z-1,w*.43,.18,d*.4,'#e6cfc0');g.box(x-3,h+.7,z+3,2.5,.9,1.6,'#b1a699');
    const glass=['#536e7a','#657d84','#7e9193','#4d7779'],floors=Math.max(1,Math.floor((h-3)/3.15));
    for(let k=0;k<floors;k++){const y=3.1+k*3.15;
      for(let n=0;n<Math.floor(w/3.5);n++){const xx=x+(n-(Math.floor(w/3.5)-1)/2)*3.5;g.box(xx,y,f+.05,2.55,1.55,.09,glass[Math.floor(r()*4)],6);g.box(xx,y+.02,f+.103,.12,1.5,.04,'#d7beb0')}
      for(let n=0;n<Math.floor(d/3.5);n++){const zz=z+(n-(Math.floor(d/3.5)-1)/2)*3.5;g.box(l-.06,y,zz,.1,1.6,2.5,glass[Math.floor(r()*4)],(k+n)%5===0?5:6);g.box(l-.12,y+.06,zz,.04,1.50,.10,'#cbb9a8');g.box(l-.13,y-.12,zz,.30,.14,2.7,'#e6c4a7')}
      g.box(x,y-.36,z,w+.39,.22,d+.4,k%2?'#e8c6ad':'#d9b9a7')
    }
    for(let i=-1;i<=1;i++){g.box(x+i*w*.29,.26,f+.07,w*.23,2.2,.15,'#44666f');g.box(x+i*w*.29,.23,f+.2,.12,2.2,.13,'#e1c3a8')}
    g.box(x,2.58,f+.76,w*.94,.27,1.5,'#e99c7d');g.box(l-.68,2.62,z,1.44,.24,d*.88,'#e3a181');
    const bays=Math.max(3,Math.floor(d/4));for(let k=0;k<bays;k++){const zz=z+(k-(bays-1)/2)*3.65;
      g.box(l-.09,.24,zz,.14,2.29,3.25,'#526f74');g.box(l-.19,.26,zz,.1,2.23,.095,'#e9cdb1');g.box(l-.18,1.98,zz,.08,.07,3.22,'#c4b29c');
      g.box(l-.74,2.87,zz,1.38,.04,1.22,'#f9d9b0');g.box(l-1.38,2.45,zz,.13,.39,1.22,'#f9d9b0')}
    for(const f of [-1,1]){g.box(l-1.5,.21,z+f*d*.44,1.05,.87,1.07,'#c69376');g.disc(l-1.5,1.09,z+f*d*.44,.45,.45,'#8b705a');for(let i=0;i<8;i++){const a=i*2.399,xx=l-1.5,zz=z+f*d*.44;g.tri([xx-.17,1,zz],[xx+Math.cos(a)*.61,1.18+.62*(i%3),zz+Math.sin(a)*.61],[xx+.17,1,zz],i%2?'#698660':'#4f775b')}}
    const sw=Math.min(w*.91,14),sy=h-.2;
    g.sign([x-sw/2,sy,f+.26],[x+sw/2,sy,f+.26],[x+sw/2,sy+2.2,f+.26],[x-sw/2,sy+2.2,f+.26],sign);
    g.sign([l-.3,sy,z-sw/2],[l-.3,sy,z+sw/2],[l-.3,sy+2.2,z+sw/2],[l-.3,sy+2.2,z-sw/2],sign);
    if(b.type==='deco'){for(let k=0;k<3;k++)g.box(x+(.5-k*.5)*1.3,h-2.5,f+.18,.22,5.3-Math.abs(k-1)*.75,.26,'#fff0ce')}
  }
  const base=new Geo(),chunks=new Map();function chunk(x,z){const key=Math.floor(x/55)+','+Math.floor(z/55);if(!chunks.has(key))chunks.set(key,{g:new Geo(),x:(Math.floor(x/55)+.5)*55,z:(Math.floor(z/55)+.5)*55});return chunks.get(key).g}
  base.ground(196,-34,465,382,'#bbad99',-.08);base.ground(-612,-52,1140,1440,'#4b999b',-.16,3);
  base.ground(-31,-34,23,385,'#e6c393',-.04);base.ground(-17,-34,8,382,'#d8ac91',.12);base.ground(-10.8,-34,5.6,382,'#e0c9b0',.13);
  for(let z=-224;z<155;z+=4)base.ground(-42+Math.sin(z*.09)*.7,z,2.4,4.2,'#a9c9b6',-.09);
  for(const x of xs){base.ground(x,-34,16,365,'#424653',.005,4);base.ground(x-7.72,-34,.16,365,'#e8c5a1',.02);base.ground(x+7.72,-34,.16,365,'#e8c5a1',.02)}
  for(const z of zs)base.ground(204,z,424,16,'#424653',.012,4);
  for(const x of xs)for(let z=-214;z<148;z+=6){if(zs.every(s=>Math.abs(s-z)>10)){base.ground(x-.19,z,.12,6.01,'#f0c68a',.045);for(const lane of [-4,4])base.ground(x+lane,z,.14,2.8,'#e0d9cc',.046);base.ground(x+.19,z,.12,6.01,'#f0c68a',.045)}}
  for(const z of zs)for(let x=-6;x<417;x+=6)if(xs.every(s=>Math.abs(s-x)>10))base.ground(x,z,3.6,.19,'#edc487',.045);
  for(const x of xs)for(const z of zs){for(const f of [-1,1])for(let k=-6;k<=6;k+=2){base.ground(x+k,z+f*9.05,.65,2.0,'#d3c8b9',.055);base.ground(x+f*9.05,z+k,2,.65,'#d3c8b9',.055)}}
  const lights=[];for(const x of xs)for(const z of zs)for(const f of [-1,1]){
    const px=x+8.75*f,pz=z+8.75*f,g=chunk(px,pz);g.beam([px,.18,pz],[px,4.6,pz],.105,.083,'#697573');g.box(px,3.42,pz,.54,1.24,.5,'#41494b');
    lights.push({x:px,z:pz,ix:x,iz:z,f})
  }
  for(const l of PC.lots){base.box(l.x,.025,l.z,52,.15,52,'#dec6ae');base.ground(l.x,l.z,44,44,l.park?'#8da37b':'#b9aa91',.19);if(l.park){base.ground(l.x,l.z,4,43,'#d7be9c',.21);base.ground(l.x,l.z,43,4,'#d7be9c',.21)}}
  for(const b of PC.buildings){const g=chunk(b.x,b.z);g.ground(b.x+2.8,b.z+4,b.w+2,b.d+3,'#b1a08f',.207);building(g,b)}
  for(const p of PC.props){const g=chunk(p.x,p.z),{x,z}=p;switch(p.kind){
    case 'palm':palm(g,p);break;
    case 'lamp':g.beam([x,.2,z],[x,5.6,z],.11,.075,'#576767');g.beam([x,5.5,z],[x,5.7,z-1.25],.085,.08,'#677575');g.box(x,5.52,z-1.3,.45,.15,.75,'#ffde93',2);break;
    case 'bench':g.box(x,.55,z,.8,.14,2,'#9e7258');g.box(x+.35,.67,z,.12,.52,2,'#af8061');for(const f of [-.65,.65])g.box(x,.14,z+f,.55,.44,.12,'#4f6262');break;
    case 'kiosk':g.box(x,.18,z,4.8,2.5,2.8,'#80b6ac');g.box(x,2.68,z,5.8,.36,3.7,'#e89973');g.box(x+2.42,1,z,.04,1.25,2.3,'#44646a');g.sign([x+2.92,2.64,z+1.65],[x+2.92,2.64,z-1.65],[x+2.92,3.26,z-1.65],[x+2.92,3.26,z+1.65],'SURF SHOP');break;
    case 'towel':g.ground(x,z,.95,2,'#d98974',.018);break;
    case 'umbrella':g.beam([x,0,z],[x,2.6,z],.07,.06,'#b28b68');for(let i=0;i<10;i++)g.tri([x,2.8,z],[x+1.65*Math.cos(i*ta/10),2.1,z+1.65*Math.sin(i*ta/10)],[x+1.65*Math.cos((i+1)*ta/10),2.1,z+1.65*Math.sin((i+1)*ta/10)],i%2?'#e28c70':'#f4d8ad');break
  }}
  // A distant silhouette gives each end of the playable avenues a skyline.
  const r=seed(911);
  for(let k=0;k<108;k++){let x,z;if(k<56){x=-76+r()*430;z=-242-r()*85}else{x=447+r()*70;z=-265+r()*465}const h=12+r()*54,w=6+r()*12,d=7+r()*10;const g=chunk(x,z);g.box(x,-.5,z,w,h,d,['#a296a3','#ab9fab','#b5a2a6','#a09aa4'][k%4]);if(k%3===0)g.box(x,h-.5,z,w*.66,3+r()*8,d*.7,'#ac9baa')}
  for(const l of [153,-220])base.box(206,.05,l,429,.95,.6,'#c7b099');base.box(422,.1,-34,.6,1,375,'#c7b099');
  for(const dock of PC.docks){for(let i=0;i<13;i++)base.box(-35-i*.62,.10,dock.z,.59,.18,2.1,'#ad886a');for(const z of [-1,1])base.box(-42,-.18,dock.z+z,.22,1.15,.22,'#e9c69f')}
  base.beam([-91,-.1,-65],[-91,1.9,-65],.6,.22,'#f5a343');base.box(-91,1.92,-65,.4,.3,.4,'#ffdf88',2);
  for(const r of PC.rooms){if(r.id==='cafe'){base.box(r.x,.2,r.z+.85,1.9,2.65,.14,'#314a58');for(const n of [-1,1])base.box(r.x+n,.2,r.z+.65,.09,2.78,.16,r.color,2);base.box(r.x,2.91,r.z+.64,2.1,.11,.17,r.color,2);base.ground(r.x,r.z,2.1,1.65,r.color,.224);continue}base.box(r.x+.85,.2,r.z,.14,2.65,1.9,'#314a58');for(const sign of [-1,1])base.box(r.x+.65,.2,r.z+sign*.99,.16,2.78,.09,r.color,2);base.box(r.x+.64,2.91,r.z,.17,.11,2.1,r.color,2);base.ground(r.x-.2,r.z,1.65,2.1,r.color,.224)}
  function interior(r){const g=new Geo(),half=r.id==='mall'?14:7;g.ground(0,0,half*2+1,12,'#63526c');for(let x=-half;x<=half;x++)for(let z=-5;z<=5;z++)g.ground(x,z,.98,.98,(x+z)%2?'#c3a4aa':'#efd0bb',.012);
    g.box(0,0,-5.75,half*2+1,5,.26,r.wall);for(const side of [-1,1])g.box(side*(half+.4),0,-.1,.22,4.5,11.6,r.wall);
    for(const y of [.3,3.7,4.1])g.box(0,y,-5.54,14.8,.08,.12,r.color,2);
    g.box(0,0,-2.55,3.8,.87,.65,'#795267');g.box(0,.87,-2.55,4,.12,.78,'#f4cdb1');g.box(0,.49,-2.18,3.7,.055,.05,r.color,2);
    if(r.id==='mall')for(const x of [-10,10]){g.box(x,.2,-5.47,6.6,2.8,.16,'#456c80');g.box(x,3.02,-5.4,7,.22,.22,'#72ebdc',2);for(const k of [-2,0,2])g.box(x+k,0,-5.25,.14,3,.2,'#e5b9ae');g.ground(x,-3,6,1.35,'#e0a5ad',.03)}
    g.sign([-2.7,2.48,-5.50],[2.7,2.48,-5.50],[2.7,3.52,-5.50],[-2.7,3.52,-5.50],r.b.sign);
    for(const side of [-1,1])for(const z of [-1.6,1.5]){const x=side*5.35;
      if(r.id==='vinylroom'){g.box(x,0,z,2,.95,1.2,'#855c69');for(let k=0;k<5;k++){g.box(x,.90,z-.45+k*.19,1.15,.65,.09,['#cf8394','#e2bd89','#61999c'][k%3]);g.beam([x,1.28,z-.40+k*.19],[x,1.28,z-.37+k*.19],.24,.24,'#3e414c',12)}}
      else if(r.id==='arcade'){g.box(x,0,z,1.35,1.85,.95,'#483960');g.box(x,1.02,z+.50,1,.72,.05,'#76eddc',2);g.box(x,.82,z+.65,1.32,.11,.5,'#e487b1');g.box(x,1.92,z,1.4,.24,1,'#f1ae68',2)}
      else if(r.id==='cafe'){g.beam([x,.02,z],[x,.93,z],.14,.12,'#66656c');g.beam([x,.91,z],[x,1.02,z],.83,.83,'#ebc399',16);g.box(x+.9,.2,z,.55,.4,.6,'#b96d76');g.box(x-.9,.2,z,.55,.4,.6,'#b96d76')}
      else{g.box(x,.18,z,2.15,.45,1.15,'#b87686');g.box(x,.62,z+.47,2.2,.5,.28,'#e19a9f');}}
    for(const x of [-5,5])for(let k=0;k<7;k++){const a=(k-3)*.28;g.beam([x,1.2,-5.48],[x+Math.sin(a)*1.6,1.2+Math.cos(a)*1.6,-5.48],.045,.07,r.color,6)}
    g.ground(0,4.25,2.4,1.15,r.color,.04);return g.upload()}
  base.disc(-24,.24,49,4.2,4.2,'#597879',30);for(const d of [-1,1])base.ground(-24+d,49,.36,2.9,'#f7d4a2',.25);base.ground(-24,49,2,.36,'#f7d4a2',.25);
  const baseMesh=base.upload(),staticMeshes=[...chunks.values()].map(c=>({m:c.g.upload(),x:c.x,z:c.z}));
  function carModel(color,style){
    const g=new Geo();const w=style===1?1.03:1.08,d=style===2?2.2:2.38;
    // Body rings shape the taper of the nose and the bevel along the fenders.
    const ring=(y,width,length,clip)=>[[-width+clip,y,-length],[width-clip,y,-length],[width,y,-length+clip],[width,y,length-clip],[width-clip,y,length],[-width+clip,y,length],[-width,y,length-clip],[-width,y,-length+clip]];
    const rings=[ring(.31,w-.12,d-.05,.26),ring(.5,w,d,.27),ring(.86,w,d-.10,.31),ring(.96,w-.10,d-.23,.32)];
    for(let j=0;j<3;j++)for(let k=0;k<8;k++){const n=(k+1)%8;g.quad(rings[j][k],rings[j][n],rings[j+1][n],rings[j+1][k],tint(color,[.55,.89,1.04][j]*(k>4?1:.91)))}
    for(let k=0;k<8;k++)g.tri([0,.96,0],rings[3][k],rings[3][(k+1)%8],tint(color,1.04));
    g.box(0,.43,-d+.03,w*1.7,.12,.12,'#d3c1a9');g.box(0,.42,d-.03,w*1.75,.12,.12,'#c9bbaa');
    g.box(0,.59,-d+.055,.72,.15,.06,'#38444b');for(const n of [-1,1]){g.box(n*.71,.67,-d+.075,.45,.17,.085,'#ffdeab',8);g.box(n*.72,.66,d-.078,.56,.14,.105,'#ed5643',2);
      g.box(n*w,.49,0,.06,.075,3.4,'#d5bfa6');g.box(n*(w+.06),1.08,-.57,.19,.13,.28,color);g.box(n*(w-.03),.86,.53,.055,.052,.28,'#ebd2b9')}
    g.box(0,.38,d-.06,w*1.69,.13,.24,'#333842');
    for(const side of [-1,1]){
      g.beam([side*.78,.35,d-.12],[side*.78,.35,d+.09],.08,.085,'#83858b',10);
      for(let strip=0;strip<3;strip++)g.box(side*.71,.66+strip*.047,d-.006,.48,.018,.024,'#ff544c',2);
    }
    g.box(0,.53,d+.005,.43,.16,.03,'#f0c88b',2);
    const tall=style===1?1.66:1.47,front=-.99,rear=style===1?1.64:1.25,rf=-.51,rb=style===1?1.33:.78,ww=w-.14,tw=ww-.16;
    const A=[-ww,.95,front],B=[ww,.95,front],C=[tw,tall,rf],D=[-tw,tall,rf],E=[-ww,.95,rear],F=[ww,.95,rear],H=[-tw,tall,rb],I=[tw,tall,rb];
    g.quad(A,B,C,D,'#586e80',9);g.quad(E,F,I,H,'#394f60',9);g.quad(A,E,H,D,'#657d80');g.quad(B,F,I,C,'#3c535d');g.quad(D,C,I,H,color);
    for(const [a,b] of [[A,D],[B,C],[E,H],[F,I],[D,C],[C,I],[D,H]])g.beam(a,b,.045,.045,color,4);
    for(const s of [-1,1])g.beam([s*ww,.96,.34],[s*tw,tall,.26],.045,.045,'#3e4548',4);
    for(const side of [-1,1])for(const zz of [-1.46,1.44]){const a=[side*(w-.17),.46,zz],b=[side*(w+.045),.46,zz];g.beam(a,b,.39,.39,'#30333d',12);g.beam(b,[side*(w+.053),.46,zz],.22,.22,'#c4bba9',10);g.beam([side*(w+.056),.46,zz],[side*(w+.068),.46,zz],.10,.10,'#616871',8)}
    return g.upload()
  }
  function speedboat(color){const g=new Geo();const ring=[[-1.12,1.95],[1.12,1.95],[1.05,-.85],[.64,-2.2],[0,-2.85],[-.64,-2.2],[-1.05,-.85]];for(let i=0;i<ring.length;i++){const [x,z]=ring[i],[a,b]=ring[(i+1)%ring.length];g.quad([x*.65,-.12,z*.9],[a*.65,-.12,b*.9],[a,.58,b],[x,.58,z],color);g.tri([0,.58,0],[x,.58,z],[a,.58,b],'#f8dbbc')}g.box(0,.60,.28,1.64,.14,1.7,'#67586e');g.box(0,.75,.7,1.35,.3,.36,'#eec0aa');g.box(0,.73,-.5,1.35,.41,.12,'#7dadba');g.box(0,.18,2.04,.54,.64,.43,'#454a5a');return g.upload()}
  function helicopter(){const g=new Geo();g.box(0,.45,0,1.65,1.25,2.6,'#455b75');g.box(0,.58,-1.32,1.45,.87,.75,'#79b4bf');g.box(0,1.48,-.55,1.7,.21,2.4,'#e7dbc6');g.beam([0,.97,.9],[0,1.34,4.6],.48,.16,'#51627b',8);g.box(0,1.35,4.34,.13,.82,.59,'#e1c7ab');g.box(0,1.29,3.55,1.85,.12,.45,'#657993');g.box(0,1.7,0,.19,.55,.19,'#425064');for(const k of [-1,1]){g.box(k*.78,.03,0,.13,.12,2.8,'#485064');for(const z of [-.82,.81])g.beam([k*.76,.12,z],[k*.58,.55,z],.06,.06,'#556477');g.box(k*.84,.82,.1,.04,.18,1.95,'#ece1c8')}return g.upload()}
  function blades(){const g=new Geo();g.box(0,0,0,7.6,.06,.18,'#414651');g.box(0,0,0,.18,.06,7.6,'#414651');return g.upload()}
  function motorcycle(color){const g=new Geo();for(const z of [-.84,.83]){g.beam([-.135,.4,z],[.135,.4,z],.37,.37,'#343641',16);g.beam([-.15,.4,z],[.15,.4,z],.21,.21,'#b1aaa0',12)}
    g.box(0,.52,0,.46,.44,.72,'#464c53');g.box(0,.91,-.25,.54,.27,.57,color);g.box(0,.94,.38,.42,.16,.65,'#403d43');for(const s of [-1,1]){g.beam([s*.14,.4,-.84],[s*.17,1.25,-.48],.05,.055,'#d2c3ab');g.beam([s*.13,.42,.83],[s*.13,.7,-.12],.07,.07,color)}g.box(0,1.19,-.53,.78,.07,.10,'#545459');g.box(0,1.02,-.65,.26,.19,.12,'#ffd994',2);g.box(0,.89,.83,.28,.09,.12,'#fd6554',2);return g.upload()}
  function rider(){const g=new Geo();g.box(0,1.13,.23,.48,.57,.34,'#c97556');g.box(0,1.69,.18,.34,.34,.34,'#594f55');g.box(0,1.78,-.005,.32,.12,.03,'#384951');for(const s of [-1,1]){g.beam([s*.22,1.53,.19],[s*.33,1.23,-.49],.10,.07,'#ae795e');g.beam([s*.13,1.15,.24],[s*.27,.69,-.10],.13,.12,'#465363')}return g.upload()}
  function personModel(color,skin,k,protest=false){
    const g=new Geo(),pants=k%2?'#465567':'#3b3746',hair=k%3?'#41342f':'#77523b';
    // Elliptical cross sections define the jaw, waist and shoulders.
    function form(rows,col){
      const ring=(row,i)=>{const a=i*ta/10;return [Math.cos(a)*row[1],row[0],Math.sin(a)*row[2]]};
      for(let j=1;j<rows.length;j++)for(let i=0;i<10;i++)
        g.quad(ring(rows[j-1],i),ring(rows[j-1],i+1),ring(rows[j],i+1),ring(rows[j],i),tint(col,.85+.15*Math.cos(i*ta/10)));
    }
    g.disc(.14,.015,.10,.49,.26,'#8c827d',16);g.disc(0,.022,0,.29,.19,'#686361',14);
    form([[.78,.18,.13],[.91,.21,.15],[1.08,.19,.135],[1.30,.265,.16],[1.39,.235,.135],[1.43,.10,.09]],color);
    g.beam([0,1.37,0],[0,1.52,0],.092,.082,skin,10);
    form([[1.47,.068,.09],[1.53,.126,.14],[1.65,.15,.149],[1.74,.137,.137],[1.80,.07,.09]],skin);
    form([[1.70,.151,.15],[1.77,.145,.143],[1.815,.097,.10],[1.83,.005,.005]],hair);
    g.box(0,1.585,-.145,.045,.055,.04,skin);
    for(const side of [-1,1]){
      g.box(side*.057,1.655,-.139,.036,.011,.014,'#403735');
      g.beam([side*.118,.86,0],[side*.13,.47,-.015],.126,.096,pants,9);
      g.beam([side*.13,.47,-.015],[side*.14,.13,.015],.096,.075,pants,9);
      g.box(side*.14,.035,-.044,.18,.115,.29,'#443f43');
      const raised=protest&&side===1,elbow=[side*(raised?.43:.303),raised?1.49:1.04,-.028];
      g.beam([side*.216,1.335,0],elbow,.108,.082,color,9);
      g.beam(elbow,[side*(raised?.52:.306),raised?1.78:.79,-.092],.077,.052,skin,9);
    }
    return g.upload()
  }
  const models=new Map();function cached(key,fn){if(!models.has(key))models.set(key,fn());return models.get(key)}
  function signalMesh(ns,ew){const g=new Geo();
    for(const [dir,on] of [[0,ns],[1,ew]])for(let k=0;k<3;k++){const lit=k===on,col=lit?['#ff654d','#ffcb59','#6dd7a3'][k]:'#484d47',y=4.4-k*.36;
      if(dir===0)g.box(0,y-.09,.257,.22,.18,.038,col,lit?2:0);else g.box(-.276,y-.09,0,.04,.18,.22,col,lit?2:0)}
    return g.upload()}
  function patrolLivery(flash){const g=new Geo();g.box(0,1.66,.24,1.18,.08,.34,'#343f48');g.box(-.31,1.74,.24,.46,.15,.29,flash===1?'#fe6655':'#a95c60',flash===1?2:0);g.box(.31,1.74,.24,.46,.15,.29,flash===2?'#8ecfff':'#567eaa',flash===2?2:0);
    for(const s of [-1,1]){g.box(s*1.038,.56,.06,.025,.22,1.88,'#d5ded6');g.box(s*1.055,.61,0,.025,.16,.22,'#c49a5f')}return g.upload()}
  const beacon=new Geo();for(let i=0;i<24;i++){const a=i*ta/24,b=(i+.74)*ta/24;beacon.quad([Math.cos(a)*3,.25,Math.sin(a)*3],[Math.cos(b)*3,.25,Math.sin(b)*3],[Math.cos(b)*2.8,.25,Math.sin(b)*2.8],[Math.cos(a)*2.8,.25,Math.sin(a)*2.8],'#ffcf69',2)}const beaconMesh=beacon.upload();
  const fGeo=new Geo();fGeo.box(0,.3,0,.62,.52,.36,'#f7c34c',2);fGeo.box(0,.55,0,.64,.11,.38,'#3e5b60');const filmMesh=fGeo.upload();
  const eye=[0,0,0],target=[0,0,0];let init=false,followH=0,aspect=1,lens=.50,basis;
  const norm=a=>{const d=Math.hypot(...a)||1;return a.map(n=>n/d)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  function draw(m,x=0,y=0,z=0,h=0,walk=0){gl.bindBuffer(gl.ARRAY_BUFFER,m.buf);for(const [loc,n,off] of [[mu.pos,3,0],[mu.col,3,12],[mu.uv,2,24],[mu.mat,1,32]])gl.vertexAttribPointer(loc,n,gl.FLOAT,false,36,off);gl.uniform3f(mu.offset,x,y,z);gl.uniform2f(mu.rot,Math.cos(h),Math.sin(h));gl.uniform1f(mu.walk,walk);gl.drawArrays(gl.TRIANGLES,0,m.n)}
  function night(clock){return clamp(Math.min((clock-5)/2,(20.5-clock)/2.3),0,1)}
  function project(x,y,z){if(!basis)return null;const d=[x-eye[0],y-eye[1],z-eye[2]],dep=dot(d,basis[2]);return dep<.3?null:{x:(.5+dot(d,basis[0])/(dep*lens*aspect)*.5)*canvas.clientWidth,y:(.5-dot(d,basis[1])/(dep*lens)*.5)*canvas.clientHeight,dep}}
  function render(game,mode,dt,look){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2,2560/Math.max(1,w));if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}aspect=w/h;gl.viewport(0,0,canvas.width,canvas.height);
    const p=game.player,v=game.vehicle,intro=mode==='title',ch=intro?0:v?v.h:look;
    if(!init)followH=ch;followH+=PC.angle(followH,ch)*Math.min(1,dt*5.2);
    let e,t;if(intro){const car=game.cars[0],sx=car.x,sz=car.z;const k=Math.sin(performance.now()*.000085)*.65;e=[sx-5.3+k,2.12,sz+6.9];t=[sx+.6,2.16,sz-8.6];if(aspect<.85){e=[sx-4.3,2.3,sz+8.9];t=[sx,2.12,sz-5.4]}lens=.49}
    else if(v?.heli){const yaw=followH;e=[p.x-Math.sin(yaw)*13,v.alt+6.5,p.z+Math.cos(yaw)*13];t=[p.x+Math.sin(yaw)*3,v.alt+1.15,p.z-Math.cos(yaw)*3];lens=.58}
    else if(game.room){const q=game.inside;e=[q.x*.82,5.7,q.z*.36+7.3];t=[q.x*.82,1.12,q.z*.36-1.6];lens=.61}
    else{const yaw=followH,back=v?11.8:5.9,side=v?0:.58,cx=Math.cos(yaw),sz=Math.sin(yaw);e=[p.x-sz*back+cx*side,v?3.85:3.05,p.z+cx*back+sz*side];t=[p.x+sz*4+cx*side,v?1.9:1.38,p.z-cx*4+sz*side];lens=v?.52+Math.min(.055,Math.abs(v.speed)*.002):.51;
      // Pull the chase camera forward when its ray would pass through a building.
      for(let i=1;i<=14;i++){const f=i/14,x=p.x+(e[0]-p.x)*f,z=p.z+(e[2]-p.z)*f;if(PC.buildings.some(b=>Math.abs(x-b.x)<b.w/2+.3&&Math.abs(z-b.z)<b.d/2+.3)){const q=Math.max(.09,(i-1)/14);e=[p.x+(e[0]-p.x)*q,e[1],p.z+(e[2]-p.z)*q];break}}
    }
    const smooth=init?1-Math.exp(-dt*(intro?3:10)):1;for(let i=0;i<3;i++){eye[i]+=(e[i]-eye[i])*smooth;target[i]+=(t[i]-target[i])*smooth}init=true;
    const forward=norm(target.map((n,i)=>n-eye[i])),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));basis=[right,up,forward];
    const light=!intro&&game.room?1:night(game.clock);function scene(u){gl.uniform3fv(u.rightV,right);gl.uniform3fv(u.upV,up);gl.uniform3fv(u.forwardV,forward);gl.uniform2f(u.lens,lens*aspect,lens);gl.uniform1f(u.light,light);gl.uniform1f(u.tm,game.time%1000)}
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.useProgram(sky);scene(su);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.enableVertexAttribArray(su.a);gl.vertexAttribPointer(su.a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(su.a);
    gl.useProgram(mesh);gl.enable(gl.DEPTH_TEST);scene(mu);
    const emitters=[...game.traffic,...game.cars,...game.patrols].filter(c=>!c.boat&&!c.heli)
      .sort((a,b)=>PC.dist(a,p)-PC.dist(b,p)).slice(0,4);
    const roadCars=[],lamps=[];
    for(let i=0;i<4;i++){const c=emitters[i];roadCars.push(c?.x??3000,c?.z??3000,Math.sin(c?.h||0),-Math.cos(c?.h||0));lamps.push(c&&!c.lightsOff&&(c===v||c.a||c.cruiser)?1:0)}
    gl.uniform4fv(mu['roadCars[0]'],roadCars);gl.uniform4fv(mu.lamps,lamps);gl.uniform1f(mu.lensPower,1);
    gl.uniform3fv(mu.eye,eye);gl.uniform1i(mu.atlas,0);for(const k of ['pos','col','uv','mat'])gl.enableVertexAttribArray(mu[k]);
    function visible(x,z,r,max=370){const dx=x-eye[0],dz=z-eye[2],dp=dx*forward[0]+dz*forward[2];return dp>-r&&dp<max&&Math.abs(dx*right[0]+dz*right[2])<Math.max(0,dp)*lens*aspect+r}
    if(!intro&&game.room){const r=game.room,q=game.inside;draw(cached('room'+r.id,()=>interior(r)));draw(cached('host'+r.id,()=>personModel(r.color,'#b18164',2)),0,.04,-3.35,Math.PI);draw(cached('player',()=>personModel('#d77d5a','#b68263',1)),q.x,.04,q.z,q.h,q.walk);for(const k of ['pos','col','uv','mat'])gl.disableVertexAttribArray(mu[k]);return}
    draw(baseMesh);for(const c of staticMeshes)if(visible(c.x,c.z,69,430))draw(c.m);
    for(const c of [...game.traffic,...game.cars])if(visible(c.x,c.z,6,148)){if(c.heli){draw(cached('helicopter',helicopter),c.x,c.alt+.17,c.z,c.h);draw(cached('blades',blades),c.x,c.alt+2.42,c.z,c===v?game.time*25:c.h);continue}if(c.policeBoat)continue;gl.uniform1f(mu.lensPower,!c.lightsOff&&(c===v||c.a||c.cruiser)?1:0);draw(cached((c.boat?'s':c.bike?'b':'c')+c.color+c.style,()=>c.boat?speedboat(c.color):c.bike?motorcycle(c.color):carModel(c.color,c.style)),c.x,.08,c.z,c.h);if((c.bike||c.boat)&&(c===v||c.bike&&c.a))draw(cached('rider',rider),c.x,.08,c.z,c.h)}
    for(const c of game.cars)if(c.cruiser&&visible(c.x,c.z,4,148))draw(cached('patrol0',()=>patrolLivery(0)),c.x,.08,c.z,c.h);
    const air=game.air;if(air&&visible(air.x,air.z,20,200)){draw(cached('helicopter',helicopter),air.x,air.alt,air.z,air.h);draw(cached('blades',blades),air.x,air.alt+2.25,air.z,game.time*25)}
    for(const boat of [...game.marine,...(game.harborBoat?[game.harborBoat]:[]),...game.cars.filter(c=>c.policeBoat)])if(visible(boat.x,boat.z,4,160)){draw(cached('marineHull',()=>speedboat('#374f72')),boat.x,.10,boat.z,boat.h);draw(cached('marineLights'+(Math.floor(game.time*5)%2),()=>{const g=new Geo();g.box(0,1.35,.3,1.1,.08,.3,'#526382');g.box(-.30,1.43,.3,.45,.16,.28,Math.floor(game.time*5)%2?'#ff7569':'#954253',2);g.box(.30,1.43,.3,.45,.16,.28,Math.floor(game.time*5)%2?'#3e698d':'#81ccff',2);return g.upload()}),boat.x,.10,boat.z,boat.h)}
    const unit=game.officer;if(unit&&visible(unit.x,unit.z,3,140))draw(cached('officer',()=>personModel('#334f76','#a87961',1)),unit.x,.2,unit.z,unit.h,unit.walk);
    for(const cop of game.patrols)if(visible(cop.x,cop.z,4,148)){const flash=game.alert?1+Math.floor(game.time*5+cop.id)%2:0;draw(cached('patrol'+flash,()=>patrolLivery(flash)),cop.x,.08,cop.z,cop.h)}
    for(const l of lights)if(visible(l.x,l.z,3,100)){const phase=PC.signal(l.ix,l.iz,game.time),ns=phase>=.4&&phase<7.4?2:phase>=7.4&&phase<8?1:0,ew=phase>=8.4&&phase<15.4?2:phase>=15.4?1:0;draw(cached('l'+ns+ew,()=>signalMesh(ns,ew)),l.x,0,l.z,l.f<0?pi:0)}
    for(const n of game.people)if(n.state!=='riding'&&visible(n.x,n.z,2,110)){draw(cached('p'+n.color+n.skin+n.id%3+!!n.protest,()=>personModel(n.color,n.skin,n.id,!!n.protest)),n.x,.20,n.z,n.h,n.wait>0||n.state==='host'?0:n.step)}
    if(!v&&!intro)draw(cached('player',()=>personModel('#d77d5a','#b68263',1)),p.x,.19,p.z,p.h,p.walk);
    if(!intro){const o=game.objective();if(o)draw(beaconMesh,o.x,0,o.z,game.time*.35);PC.film.forEach((f,i)=>{if(!game.found.includes(i)&&visible(f.x,f.z,2,65))draw(filmMesh,f.x,.15+Math.sin(game.time*2)*.1,f.z,game.time)})}
    for(const k of ['pos','col','uv','mat'])gl.disableVertexAttribArray(mu[k])
  }
  return {render,project,reset(){init=false}}
}
