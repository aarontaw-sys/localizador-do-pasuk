window.Pasuk = (()=>{
const letters=s=>s.replace(/װ/g,'וו').replace(/ױ/g,'וי').replace(/ײ/g,'יי').normalize('NFKD').replace(/[^א-ת]/g,'');
const normal=s=>letters(s).replace(/[ךםןףץ]/g,c=>'כמנפצ'['ךםןףץ'.indexOf(c)]);
const pair=s=>{s=normal(s);return s?s[0]+s.at(-1):''};
const latin=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
function distance(a,b){let d=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i?j?0:i:j));for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]!==b[j-1]));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[a.length][b.length]}
const nameIndex=NAMES.map(n=>({n,h:letters(n.he),a:n.alias.map(latin)}));
const phonetic=s=>latin(s).replace(/sch/g,'sh').replace(/kh|ch/g,'h').replace(/ph/g,'f').replace(/tz/g,'ts').replace(/w/g,'v').replace(/([a-z])\1+/g,'$1');
function suggest(s){
 const h=letters(s),l=latin(s);
 if(!h&&!l)return {exact:false,items:[]};
 const exact=nameIndex.filter(x=>h?x.h===h:x.a.includes(l)).map(x=>x.n);
 if(exact.length)return {exact:true,items:exact};
 if(h)return {exact:false,items:h.length<3?[]:nameIndex.map(x=>({n:x.n,d:distance(h,x.h)})).filter(x=>x.d<=1).sort((a,b)=>a.d-b.d||a.n.priority-b.n.priority).slice(0,8).map(x=>x.n)};
 if(l.length<3)return {exact:false,items:[]};
 const p=phonetic(l),limit=Math.min(2,Math.floor(l.length/3));
 const matches=nameIndex.map(x=>({n:x.n,d:Math.min(...x.a.map(a=>distance(l,a))),sound:x.a.some(a=>phonetic(a)===p)})).filter(x=>x.sound||x.d<=limit).sort((a,b)=>Number(b.sound)-Number(a.sound)||a.d-b.d||a.n.priority-b.n.priority);
 return {exact:false,items:matches.slice(0,8).map(x=>x.n)};
}
function lookup(s){return VERSES.filter(v=>v.pair===pair(s)&&pair(v.he)===pair(s)).sort((a,b)=>({positivo:0,neutro:1,contexto:2}[a.kind])-({positivo:0,neutro:1,contexto:2}[b.kind])).slice(0,3)}
function divine(s){return s.replace(/[א-ת][\u0591-\u05c7א-ת]*/g,token=>{let l=letters(token),m=l.match(/^(?:[ובכלמשה])?(יהוה|אלהים|אלהי(?:נו|כם|כן|הם|הן|ך|ו)?|אדני|שדי|צבאות|יה)$/)||l.match(/^[ובכלמשה]{2}(יהוה)$/);if(!m&&/אֵל/.test(token))m=l.match(/^(?:[ובכלמשה])?(אל)$/);if(!m)return token;let before=l.length-m[1].length,count=0;return token.replace(/([א-ת][\u0591-\u05c7]*)/g,g=>++count===before+1?g+'־':g)})}
return {letters,normal,pair,latin,distance,suggest,lookup,divine};})();
