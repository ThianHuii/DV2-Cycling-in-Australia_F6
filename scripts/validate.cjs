/* Optional maintenance check: npm install && npm run check. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const vega=require('vega'),vl=require('vega-lite'),calendar=require('../js/calendar.js');
const root=path.resolve(__dirname,'..');
const loader=vega.loader();loader.load=async uri=>fs.promises.readFile(path.resolve(root,uri),'utf8');
assert.deepStrictEqual(calendar.normalize(2020,12),{year:2020,month:9,max:9});
assert.deepStrictEqual(calendar.normalize(2019,12),{year:2019,month:12,max:12});
assert.deepStrictEqual(calendar.normalize(2018,10),{year:2018,month:10,max:12});
(async()=>{
 const output=[];
 for(let n=1;n<=12;n++){
  const filename=`chart${String(n).padStart(2,'0')}.json`;
  const input=JSON.parse(fs.readFileSync(path.join(root,'js',filename)));
  const compiled=vl.compile(input).spec;
  const view=new vega.View(vega.parse(compiled),{renderer:'none',loader}).initialize();
  function allRows(){return compiled.data.flatMap(d=>{try{return view.data(d.name)}catch{return[]}})}
  try{
   await view.runAsync();const svg=await view.toSVG();assert(svg.includes('<svg'));
   if(n===2){const row=allRows().find(d=>d.Current!=null);assert(Math.abs(row.Previous-107962/10683842)<1e-10);assert(Math.abs(row.Current-79457/12049410)<1e-10);assert(!svg.includes('Other employed people'));}
   if(n===3){assert.strictEqual(input.vconcat[0].projection.type,'conicEqualArea');assert(svg.includes('nearly five times'));}
   if(n===5){assert(svg.includes('93 men, 17 women'));assert(svg.includes('75+ detail'));}
   if(n===9){
    for(const [year,requested,days,observed] of [[2019,4,30,30],[2020,4,30,30],[2020,12,30,11],[2018,2,28,28],[2018,10,31,31],[2018,11,30,30],[2018,12,31,31],[2019,10,31,31],[2019,11,30,30],[2019,12,31,31]]){
     const state=calendar.normalize(year,requested);
     await view.signal('SelectedYear',state.year).signal('SelectedMonth',state.month).runAsync();
     const unique=[...new Map(allRows().filter(d=>d.DateKey).map(d=>[d.DateKey,d])).values()];
     assert.strictEqual(unique.length,days,`Calendar dates: ${year}-${requested}`);
     assert.strictEqual(unique.filter(d=>d.Count!=null).length,observed,`CSV lookup: ${year}-${requested}`);
     if(year===2020&&requested===12)assert.strictEqual(view.signal('SelectedMonth'),9);
     if(year===2020&&requested===4)assert.strictEqual(unique.reduce((s,d)=>s+d.Count,0),39795);
    }
   }
   if(n===10){const rows=allRows().filter(d=>d.station&&d.month);assert.strictEqual(new Set(rows.map(d=>d.station)).size,3);assert.strictEqual(new Set(rows.map(d=>d.station+'|'+d.month)).size,36);}
   output.push(`PASS ${filename}`);
  }finally{view.finalize()}
 }
 console.log(output.join('\n'));console.log('PASS year-specific month limits and 2018/2019 full-year coverage');
})().catch(error=>{console.error(error);process.exitCode=1});
