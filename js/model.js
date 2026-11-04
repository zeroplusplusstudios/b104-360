import*as i from"../vendor/three/three.module.min.js";import{MeshoptDecoder as f}from"../vendor/meshopt/meshopt_decoder.module.js";const y=`
varying vec3 vRay;
void main() {
  vec4 p = inverse(projectionMatrix) * vec4(position.xy, 1.0, 1.0);
  vRay = (vec4(p.xyz / p.w, 0.0) * viewMatrix).xyz;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`,x=`
uniform samplerCube envA;
uniform samplerCube envB;
uniform float uMix;
uniform vec3 uGrade;
varying vec3 vRay;
void main() {
  vec3 w = vec3(-vRay.x, vRay.y, vRay.z), tg = uGrade * uMix;
  gl_FragColor = vec4(mix(textureCube(envA, w).rgb * exp2(tg), textureCube(envB, w).rgb * exp2(tg - uGrade), uMix), 1.0);
}`,p=`
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,w=`
uniform samplerCube envA;
uniform samplerCube envB;
uniform samplerCube depA;
uniform samplerCube depB;
uniform vec3 eyeA;
uniform vec3 eyeB;
uniform float uMix;
uniform float uVis;
uniform float uDbg;
uniform vec3 uGrade;
uniform float uTexel;
varying vec3 vW;
// what the eye sees along r (the distance cube drawn from the same model): 1 = this surface, 0 = something in front.
// Five taps half a texel to a texel apart, so the edge of what it sees is soft, not stepped. o: how far in front the
// nearest thing stands, as a share of the distance (0 when seen)
float seen(samplerCube d, vec3 r, out float o) {
  float L = length(r);
  vec3 n = r / max(L, 1e-5);
  vec3 t1 = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(n, t1);
  float a = 0.02 + 0.012 * L, b = 0.05 + 0.03 * L, v = 0.0, z, gap = 1e9;
  z = textureCube(d, n).r; v += 2.0 * (1.0 - smoothstep(a, b, L - z)); gap = min(gap, L - z);
  z = textureCube(d, n + uTexel * t1).r; v += 1.0 - smoothstep(a, b, L - z); gap = min(gap, L - z);
  z = textureCube(d, n - uTexel * t1).r; v += 1.0 - smoothstep(a, b, L - z); gap = min(gap, L - z);
  z = textureCube(d, n + uTexel * t2).r; v += 1.0 - smoothstep(a, b, L - z); gap = min(gap, L - z);
  z = textureCube(d, n - uTexel * t2).r; v += 1.0 - smoothstep(a, b, L - z); gap = min(gap, L - z);
  o = max(gap, 0.0) / L;
  return v / 6.0;
}
void main() {
  vec3 ra = vW - eyeA, rb = vW - eyeB;
  vec3 vr = vW - cameraPosition;
  float lc = length(vr);
  vec3 vn = vr / max(lc, 1e-4);
  vec3 gx = dFdx(vn), gy = dFdy(vn);
  float la = max(length(ra), 1e-4), lb = max(length(rb), 1e-4);
  vec3 na = ra / la, nb = rb / lb;
  // the texture footprint as seen from each eye (the screen's, scaled by the distances): no blurred rims at edges
  float ka = lc / la, kb = lc / lb;
  vec3 ca = textureGrad(envA, vec3(-na.x, na.y, na.z), vec3(-gx.x, gx.y, gx.z) * ka, vec3(-gy.x, gy.y, gy.z) * ka).rgb;
  vec3 cb = textureGrad(envB, vec3(-nb.x, nb.y, nb.z), vec3(-gx.x, gx.y, gx.z) * kb, vec3(-gy.x, gy.y, gy.z) * kb).rgb;
  float va = 1.0, vb = 1.0, oa = 0.0, ob = 0.0;
  if (uVis > 0.5) { va = seen(depA, ra, oa); vb = seen(depB, rb, ob); }
  // seen by neither (the back of a chair you pass): the picture whose blocker stands nearest to it, often the same thing
  float wa = (1.0 - uMix) * (va + 0.03 * exp(-8.0 * oa)), wb = uMix * (vb + 0.03 * exp(-8.0 * ob));
  // one grade for both pictures, sliding from A's to B's: no patchwork where only one of them sees
  vec3 tg = uGrade * uMix;
  ca *= exp2(tg); cb *= exp2(tg - uGrade);
  vec3 c = (ca * wa + cb * wb) / max(wa + wb, 1e-6);
  if (uDbg > 0.5) c = vec3(va, vb, 0.15);
  gl_FragColor = vec4(c, 1.0);
}`,M=p,S=`
uniform vec3 uEye;
varying vec3 vW;
void main() { gl_FragColor = vec4(length(vW - uEye), 0.0, 0.0, 1.0); }`;class z{constructor(e,t){this.r=e,this.o=t,this.ready=!1,this.failed=null;const s=e.getContext();this.floatOK=e.capabilities.isWebGL2&&!!(s.getExtension("EXT_color_buffer_float")||s.getExtension("EXT_color_buffer_half_float")),this.liveRes=0,this.live=null,this.dist=new Map,this.distMax=t.phone?3:4,this.distRes=t.maxRes?Math.min(t.maxRes,1024):t.phone?512:1024,this.stats={distMade:0,faces:0,frames:0},this.scene=new i.Scene,this.distScene=new i.Scene,this.skyMat=new i.ShaderMaterial({uniforms:{envA:{value:null},envB:{value:null},uMix:{value:0},uGrade:null},vertexShader:y,fragmentShader:x,depthTest:!1,depthWrite:!1,toneMapped:!1});const r=new i.Mesh(new i.PlaneGeometry(2,2),this.skyMat);r.frustumCulled=!1,r.renderOrder=-10,this.scene.add(r),this.mat=new i.ShaderMaterial({uniforms:{envA:{value:null},envB:{value:null},depA:{value:null},depB:{value:null},eyeA:{value:new i.Vector3},eyeB:{value:new i.Vector3},uMix:{value:0},uVis:{value:0},uDbg:{value:0},uGrade:{value:new i.Vector3},uTexel:{value:.003}},vertexShader:p,fragmentShader:w,side:i.DoubleSide,toneMapped:!1}),this.skyMat.uniforms.uGrade=this.mat.uniforms.uGrade,this.distMat=new i.ShaderMaterial({uniforms:{uEye:{value:new i.Vector3}},vertexShader:M,fragmentShader:S,side:i.DoubleSide,toneMapped:!1}),this.distScene.background=new i.Color(1e3,0,0),this.cam=new i.CubeCamera(.03,600,new i.WebGLCubeRenderTarget(16)),this.cam.renderTarget.dispose(),this.origin=[0,0,0]}load(){return this.loading?this.loading:(this.loading=(async()=>{try{if(!this.floatOK)throw new Error("no float render targets");const e=await fetch(this.o.url,{priority:"low"});if(!e.ok)throw new Error(`HTTP ${e.status}`);const t=new Uint8Array(await e.arrayBuffer());if(String.fromCharCode(t[0],t[1],t[2],t[3])!=="B4M2")throw new Error("not a model file");const r=new DataView(t.buffer,t.byteOffset,t.byteLength).getUint32(4,!0),n=JSON.parse(new TextDecoder().decode(t.subarray(8,8+r)));let o=8+r;await f.ready;const l=this.o.shift||[0,0,0];this.parts=[],this.tris=0;for(const a of n.chunks){const d=new Uint8Array(a.v*n.vsize),u=new Uint8Array(a.i*4);f.decodeVertexBuffer(d,a.v,n.vsize,t.subarray(o,o+a.vbytes)),o+=a.vbytes+(4-a.vbytes%4)%4,f.decodeIndexBuffer(u,a.i,4,t.subarray(o,o+a.ibytes)),o+=a.ibytes+(4-a.ibytes%4)%4;const h=new i.BufferGeometry,b=new i.InterleavedBuffer(new Uint16Array(d.buffer),n.vsize/2);h.setAttribute("position",new i.InterleavedBufferAttribute(b,3,0,!0)),h.setIndex(new i.BufferAttribute(new Uint32Array(u.buffer),1));const c=new i.Mesh(h,this.mat),v=new i.Mesh(h,this.distMat);for(const g of[c,v])g.frustumCulled=!1,g.scale.set(...a.size);this.scene.add(c),this.distScene.add(v),this.parts.push({mesh:c,distMesh:v,geo:h,min:[a.min[0]+l[0],a.min[1]+l[1],a.min[2]+l[2]]}),this.tris+=a.i/3}this.place([0,0,0]);try{await this.r.compileAsync(this.scene,this.cam.children[0]),await this.r.compileAsync(this.distScene,this.cam.children[0])}catch{}this.ready=!0}catch(e){this.failed=String(e&&e.message||e),console.warn("model",e)}return this.ready})(),this.loading)}place(e){this.origin=e.slice();for(const t of this.parts||[])for(const s of[t.mesh,t.distMesh])s.position.set(t.min[0]-e[0],t.min[1]-e[1],t.min[2]-e[2]),s.updateMatrixWorld(!0)}distFor(e,t=[]){let s=this.dist.get(e.id);if(s)return this.dist.delete(e.id),this.dist.set(e.id,s),s;s={rt:new i.WebGLCubeRenderTarget(this.distRes,{type:i.HalfFloatType,format:i.RedFormat,minFilter:i.NearestFilter,magFilter:i.NearestFilter,generateMipmaps:!1,depthBuffer:!0}),world:e.pos.slice()},this.renderDist(s),this.dist.set(e.id,s);for(const n of[...this.dist.keys()]){if(this.dist.size<=this.distMax)break;n===e.id||t.includes(n)||(this.dist.get(n).rt.dispose(),this.dist.delete(n))}return this.stats.distMade++,s}renderDist(e){const t=this.origin,s=[e.world[0]-t[0],e.world[1]-t[1],e.world[2]-t[2]];this.distMat.uniforms.uEye.value.set(...s),this.cam.renderTarget=e.rt,this.cam.position.set(...s),this.cam.updateMatrixWorld(!0),this.renderCube(this.distScene,[!0,!0,!0,!0,!0,!0]),e.at=t.slice()}eyeLocal(e){const t=this.origin;return[e.world[0]-t[0],e.world[1]-t[1],e.world[2]-t[2]]}renderCube(e,t){const s=this.r,r=this.cam;r.coordinateSystem!==s.coordinateSystem&&(r.coordinateSystem=s.coordinateSystem,r.updateCoordinateSystem());const n=s.getRenderTarget(),o=s.getActiveCubeFace(),l=s.getActiveMipmapLevel(),a=s.xr.enabled,d=s.autoClear;s.xr.enabled=!1,s.autoClear=!0;for(let u=0;u<6;u++)t[u]&&(s.setRenderTarget(r.renderTarget,u,0),s.render(e,r.children[u]),this.stats.faces++);s.setRenderTarget(n,o,l),s.xr.enabled=a,s.autoClear=d}gradeOf(e,t){const s=this.o.grade||{},r=s[`${e.id}|${t.id}`],n=s[`${t.id}|${e.id}`];return(r||(n?n.map(l=>-l):[0,0,0])).map(l=>Math.max(-3,Math.min(3,Number(l)||0)))}begin(e,t,s,r){this.place(e.pos);const n=[e.id,t.id],o=this.distFor(e,n),l=this.distFor(t,n),a=this.mat.uniforms;a.envA.value=s,a.envB.value=r,a.depA.value=o.rt.texture,a.depB.value=l.rt.texture,a.eyeA.value.set(...this.eyeLocal(o)),a.eyeB.value.set(...this.eyeLocal(l)),a.uVis.value=1,a.uTexel.value=1.4/this.distRes,a.uGrade.value.set(...this.o.noGrade?[0,0,0]:this.gradeOf(e,t)),this.skyMat.uniforms.envA.value=s,this.skyMat.uniforms.envB.value=r,this.on=!0}sizeFor(e){const t=this.o.maxRes||(this.o.phone?1024:1536),s=Math.max(Math.min(256,t),Math.min(t,Math.round(e/128)*128));return s!==this.liveRes&&(this.live&&this.live.dispose(),this.live=new i.WebGLCubeRenderTarget(s,{type:i.UnsignedByteType,format:i.RGBAFormat,colorSpace:i.SRGBColorSpace,minFilter:i.LinearFilter,magFilter:i.LinearFilter,generateMipmaps:!1,depthBuffer:!0}),this.liveRes=s),this.live}draw(e,t,s,r){const n=this.sizeFor(r);return this.mat.uniforms.uMix.value=t,this.skyMat.uniforms.uMix.value=t,this.cam.renderTarget=n,this.cam.position.copy(e),this.cam.updateMatrixWorld(!0),this.renderCube(this.scene,s),this.stats.frames++,n.texture}setB(e){this.mat.uniforms.envB.value=e,this.skyMat.uniforms.envB.value=e}end(){this.on=!1;const e=this.mat.uniforms;e.envA.value=e.envB.value=null,this.skyMat.uniforms.envA.value=this.skyMat.uniforms.envB.value=null,this.live&&(this.live.dispose(),this.live=null,this.liveRes=0)}reset(){for(const e of this.dist.values())e.rt.dispose();this.dist.clear(),this.live&&(this.live.dispose(),this.live=null,this.liveRes=0),this.on=!1}held(){const e=this.mat.uniforms;return[e.envA.value,e.envB.value]}}function B(m){const e=[!1,!1,!1,!1,!1,!1];for(const t of m){const s=Math.abs(t[0]),r=Math.abs(t[1]),n=Math.abs(t[2]);s>=r&&s>=n?e[t[0]>0?0:1]=!0:r>=n?e[t[1]>0?2:3]=!0:e[t[2]>0?4:5]=!0}return e}export{z as Model,B as facesOf};
