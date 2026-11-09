import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function solve(values) {
  const n = values[0];
  const x = new Int32Array(n), y = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = values[2*i+1];
    y[i] = values[2*i+2];
  }
  function square(a, b) {
    const dx = x[a]-x[b], dy = y[a]-y[b];
    return dx*dx + dy*dy;
  }
  const dist = (a,b) => Math.round(Math.sqrt(square(a,b)));
  const length = t => t.reduce((sum,a,i) => sum+dist(a,t[(i+1)%n]),0);
  const ids = Array.from({length:n}, (_,i) => i);
  const sorted = ids.slice().sort((a,b) => x[a]-x[b] || a-b);
  const near = new Array(n);
  const count = Math.min(20,n-1);
  for (let i=0; i<n; i++) {
    const a = sorted[i], pool = [];
    let left=i-1, right=i+1;
    while (left>=0 || right<n) {
      const dl = left<0 ? Infinity : x[a]-x[sorted[left]];
      const dr = right===n ? Infinity : x[sorted[right]]-x[a];
      if (pool.length===count && Math.min(dl,dr)**2 > pool[count-1][0]) break;
      const b = dl<=dr ? sorted[left--] : sorted[right++];
      const d = square(a,b);
      if (pool.length===count && d>=pool[count-1][0]) continue;
      let k = pool.length;
      while (k && pool[k-1][0]>d) k--;
      pool.splice(k,0,[d,b]);
      if (pool.length>count) pool.pop();
    }
    near[a] = pool.map(p => p[1]);
  }
  function greedy(start) {
    const used = new Uint8Array(n), t = [start];
    used[start]=1;
    while (t.length<n) {
      const a=t[t.length-1];
      let b=near[a].find(v => !used[v]);
      if (b===undefined) {
        let best=Infinity;
        for (const v of ids) if (!used[v]) {
          const d=square(a,v);
          if (d<best) { best=d; b=v; }
        }
      }
      t.push(b); used[b]=1;
    }
    return t;
  }
  const pos = new Int32Array(n);
  function improve(t, passes) {
    t.forEach((v,i) => { pos[v]=i; });
    function reverse(lo,hi) {
      while (lo<hi) {
        const v=t[lo]; t[lo]=t[hi]; t[hi]=v;
        pos[t[lo]]=lo++; pos[v]=hi--;
      }
    }
    for (let pass=0; pass<passes; pass++) {
      let changed=false;
      for (let i=0; i<n; i++) {
        const a=t[i], b=t[(i+1)%n], ab=dist(a,b);
        for (const c of near[a]) {
          const j=pos[c], d=t[(j+1)%n];
          if (b===c || d===a) continue;
          if (dist(a,c)+dist(b,d)<ab+dist(c,d)) {
            reverse(Math.min(i,j)+1,Math.max(i,j));
            changed=true; break;
          }
          // Relocate one to three consecutive cities after c (Or-opt).
          let moved=false;
          for (let size=1; size<=3 && i+size<n; size++) {
            const end=i+size;
            if (j>=i && j<=end) continue;
            const last=t[end], next=t[(end+1)%n];
            if (dist(a,next)+dist(c,b)+dist(last,d)>=ab+dist(last,next)+dist(c,d)) continue;
            // Three reversals exchange two adjacent blocks in place.
            const lo=Math.min(j,i)+1, mid=j<i ? i : end, hi=Math.max(j,end);
            reverse(lo,mid); reverse(mid+1,hi); reverse(lo,hi);
            moved=true; break;
          }
          if (moved) { changed=true; break; }
          // Reconnect three cut edges by reversing both interior segments.
          if (j<=i+1 || j+2>=n) continue;
          const k=pos[near[b][pass%Math.min(5,count)]];
          if (k<=j+1) continue;
          const e=t[k], f=t[(k+1)%n];
          if (dist(a,c)+dist(b,e)+dist(d,f)<ab+dist(c,d)+dist(e,f)) {
            reverse(i+1,j); reverse(j+1,k); changed=true; break;
          }
        }
      }
      if (!changed) break;
    }
    return t;
  }
  let best=improve(greedy(0),16), bestLen=length(best);
  const alt=improve(greedy(sorted[n>>1]),12);
  if (length(alt)<bestLen) { best=alt; bestLen=length(alt); }
  let state=0x67b38d;
  function random(limit) {
    state=(Math.imul(1664525,state)+1013904223)>>>0;
    return Math.floor(state/4294967296*limit);
  }
  for (let round=0; round<10; round++) {
    const t=best.slice();
    // Rotate the seam and kick short stretches throughout the tour.
    t.push(...t.splice(0,random(n)));
    for (let kick=0; kick<Math.max(1,Math.floor(n/200)); kick++) {
      const a=random(n-24), b=a+2+random(5), c=b+2+random(5), d=c+2+random(5);
      t.splice(a,d-a,...t.slice(c,d),...t.slice(b,c),...t.slice(a,b));
    }
    improve(t,5);
    const score=length(t);
    if (score<bestLen) { best=t; bestLen=score; }
  }
  return best;
}

const input=process.argv[2] ?? '/input', output=process.argv[3] ?? '/output';
for (const name of readdirSync(input).filter(s => s.endsWith('.txt')).sort()) {
  const data=readFileSync(join(input,name),'utf8').trim().split(/\s+/).map(Number);
  writeFileSync(join(output,name.slice(0,-4)+'.tour'),solve(data).join(' ')+'\n');
}
