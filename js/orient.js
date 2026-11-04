const i=Math.PI/180,m=(t,n)=>[t[3]*n[0]+t[0]*n[3]+t[1]*n[2]-t[2]*n[1],t[3]*n[1]-t[0]*n[2]+t[1]*n[3]+t[2]*n[0],t[3]*n[2]+t[0]*n[1]-t[1]*n[0]+t[2]*n[3],t[3]*n[3]-t[0]*n[0]-t[1]*n[1]-t[2]*n[2]],p=(t,n,o,a)=>{const e=Math.sin(a/2);return[t*e,n*e,o*e,Math.cos(a/2)]};function P(t,n){const[o,a,e,r]=t,[c,s,h]=n,u=2*(a*h-e*s),d=2*(e*c-o*h),x=2*(o*s-a*c);return[c+r*u+a*x-e*d,s+r*d+e*u-o*x,h+r*x+o*d-a*u]}const K=p(1,0,0,-Math.PI/2);function A(t,n,o,a=0){let e=m(K,p(0,0,1,(t||0)*i));return e=m(e,p(1,0,0,(n||0)*i)),e=m(e,p(0,1,0,(o||0)*i)),m(e,p(0,0,1,-(a||0)*i))}const I=(t,n)=>Math.atan2(-t,-n),g=t=>P(t,[0,0,-1]),C=t=>P(t,[0,1,0]),R=t=>p(0,1,0,t),V=(t,n)=>m(p(0,1,0,t),p(1,0,0,n));function F(t){const n=g(t),o=C(t);let a=n[0]-o[0]*n[1],e=n[2]-o[2]*n[1];const r=Math.hypot(a,e)||1;return[a/r,0,e/r]}const Q=t=>Math.asin(Math.max(-1,Math.min(1,g(t)[1])));function _(){const t=typeof screen<"u"&&screen.orientation;return t&&typeof t.angle=="number"?t.angle:typeof window<"u"&&typeof window.orientation=="number"?window.orientation:0}const M={min:25,maxV:180,maxLong:270,C:0,ramp:60,dMax:2,dWide:1},D=(t,n,o)=>{const a=Math.max(0,Math.min(1,(o-t)/(n-t)));return a*a*(3-2*a)},w=(t,n)=>(n+1)*Math.sin(t)/(n+Math.cos(t));function z(t,n){const o=n+1,a=t*t,e=(-a*n+o*Math.sqrt(Math.max(0,o*o+a*(1-n*n))))/(o*o+a);return Math.acos(Math.max(-1,Math.min(1,e)))}const q=(t,n)=>{const o=Math.sin(t),a=Math.cos(t);return n-o>1e-9?Math.max(0,(o-n*a)/(n-o)):M.dMax};function L(t){return Math.max(60,Math.min(90,2*Math.atan(Math.tan(50*i)/t)/i))}function W(t,n,o=L(n)){const a=n,e=c=>{const s=c/2*i,h=Math.atan(a*Math.tan(s)),u=Math.atan(Math.hypot(a*Math.tan(s),Math.tan(s))),d=Math.min(s,h),x=Math.max(0,Math.min(M.C*D(30*i,55*i,u),Math.tan(d)/w(d,M.dMax)-1)),f=(1+x)/Math.tan(s);return{K:f,dh:x>0?q(h,a/f):0,dv:x>0?q(s,1/f):0,C:x}};let r;if(t<=o+1e-9)r=e(t);else{const c=e(o),s=Math.min(1,(t-o)/Math.max(1e-6,Math.min(M.ramp,M.maxV-o))),h=1-(1-s)*(1-s),u=c.dh+(M.dWide-c.dh)*h,d=c.dv+(M.dWide-c.dv)*h;r={K:1/w(t/2*i,d),dh:u,dv:d,C:c.C}}return r.a=a,r.vfov=t,r.hfov=2*z(a/r.K,r.dh)/i,r}function k(t){const n=L(t),o=r=>Math.max(r,W(r,t,n).hfov);let a=n,e=M.maxV;if(o(e)<=M.maxLong)a=e;else for(let r=0;r<40;r++){const c=(a+e)/2;o(c)>M.maxLong?e=c:a=c}return{min:M.min,def:n,max:Math.max(n,a)}}const O=(t,n,o)=>{const a=n*n+o*o;return a>0?t.dh+(t.dv-t.dh)*(o*o)/a:t.dh};function U(t,n){const o=Math.hypot(n[0],n[1]),a=Math.atan2(o,-n[2]),e=o>1e-12?n[0]/o:0,r=o>1e-12?n[1]/o:1,c=O(t,e/t.a,r),s=Math.cos(a);if(c+s<=.002)return null;const h=t.K*(c+1)*Math.sin(a)/(c+s);return[e*h/t.a,r*h]}function E(t,n,o){const a=n*t.a,e=o,r=Math.hypot(a,e);if(r<1e-12)return[0,0,-1];const c=z(r/t.K,O(t,Math.abs(n),Math.abs(o))),s=Math.sin(c);return[a/r*s,e/r*s,-Math.cos(c)]}const G=`
uniform int uProj;
uniform vec4 uPj;
uniform vec2 uPz;
float pjD(vec2 n) { float t = dot(n, n); return t > 0.0 ? mix(uPj.y, uPj.z, n.y * n.y / t) : uPj.y; }
vec4 pjForward(vec3 v) {
  float L = length(v.xy);
  float th = atan(L, -v.z);
  vec2 dir = L > 1e-9 ? v.xy / L : vec2(0.0, 1.0);
  float d = pjD(vec2(dir.x / uPj.w, dir.y));
  float c = cos(th);
  float z = 2.0 * log(max(length(v), 1e-5) / uPz.x) / log(uPz.y / uPz.x) - 1.0;
  if (d + c < 0.002) return vec4(dir * 1e4, 2.0, 1.0);
  float rho = uPj.x * (d + 1.0) * sin(th) / (d + c);
  return vec4(dir.x * rho / uPj.w, dir.y * rho, z, 1.0);
}
vec3 pjInverse(vec2 ndc) {
  vec2 P = vec2(ndc.x * uPj.w, ndc.y);
  float rho = length(P);
  if (rho < 1e-7) return vec3(0.0, 0.0, -1.0);
  float d = pjD(abs(ndc));
  float q = rho / uPj.x, d1 = d + 1.0, q2 = q * q;
  float c = (-q2 * d + d1 * sqrt(max(0.0, d1 * d1 + q2 * (1.0 - d * d)))) / (d1 * d1 + q2);
  return vec3(P / rho * sqrt(max(0.0, 1.0 - c * c)), -c);
}
`,l={uProj:{value:0},uPj:{value:[1,0,0,1]},uPz:{value:[.05,200]}};function H(t){if(!t){l.uProj.value=0;return}l.uProj.value=1;const n=l.uPj.value;n[0]=t.K,n[1]=t.dh,n[2]=t.dv,n[3]=t.a}function J(t,n,o,a,e=40){const r=o+a*i,c=-Math.sin(r),s=-Math.cos(r);let h=null;for(const u of n){const d=u.pos[0]-t[0],x=u.pos[2]-t[2],f=Math.hypot(d,x);if(f<.15||Math.abs(u.pos[1]-t[1])>1.2)continue;const v=Math.max(-1,Math.min(1,(d*c+x*s)/f)),j=Math.acos(v)/i;if(j>e)continue;const y=f*(1+3*(1-v));(!h||y<h.score)&&(h={id:u.id,score:y,ang:j,dist:f})}return h}export{G as PROJ_GLSL,M as ZOOM,L as defaultVfov,A as deviceQuat,F as facing,g as forwardOf,w as gP,z as gPinv,J as pickWalk,Q as pitchOf,U as projForward,E as projInverse,W as projParams,l as projU,p as qAxis,m as qMul,P as qRotate,_ as screenAngle,H as setProjU,C as upOf,I as yawOf,V as yawPitchQuat,R as yawQuat,k as zoomLimits};
