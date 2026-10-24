/* JSON files define chart marks; this file embeds and sizes their views. */
(async function () {
  // Request these faces explicitly before Vega measures any labels.
  await Promise.all([
    document.fonts.load('18px "Source Sans 3"'),
    document.fonts.load('20px "Source Sans 3"'),
    document.fonts.load('28px "Bree Serif"')
  ]);
  await document.fonts.ready;
  const views=new Map();
  const hosts=[...document.querySelectorAll('[data-spec]')];
  const margins={1:55,2:60,3:80,4:120,5:140,6:180,7:80,8:80,9:80,10:60,11:60,12:80};
  function adapt(spec,host,correction=0){
    const n=+host.id.replace('chart-','');
    const available=host.clientWidth||620;
    const width=Math.min(n===1?520:[10,11].includes(n)?1300:1000,Math.max(n===10?820:n===11?620:330,available-(margins[n]||90)-correction));
    function visit(node){
      if(!node||typeof node!=='object')return;
      if(node.usermeta?.fixedLegend && !node.usermeta?.lockColumns && available<780){
        const rows=node.data?.values||[];
        if(rows.length>2 && node.width>500){
          rows.forEach((row,i)=>{row.X=12;row.TextX=30;row.Y=i*28+16;});
          node.width=400;node.height=rows.length*28+8;
        }
      }
      if(typeof node.width==='number' && !node.usermeta?.fixedLegend){
        node.width=width;
        if([10,11].includes(n)&&node.encoding?.x?.scale)node.encoding.x.scale.rangeMax=width;
        if(n===1&&node.mark?.type==='rect')node.height=width/4;
        if(n===2&&node.layer)node.height=125;
        if(node.projection?.clipExtent)node.projection.clipExtent[1][0]=width;
      }
      for(const key of ['vconcat','hconcat','concat','layer'])if(node[key])node[key].forEach(visit);
      if(node.spec)visit(node.spec);
    }
    visit(spec);return spec;
  }
  function setupCalendar(view){
    const year=document.getElementById('calendar-year');
    const month=document.getElementById('calendar-month');
    const output=document.getElementById('calendar-month-output');
    const availability=document.getElementById('calendar-availability');
    const heading=document.getElementById('calendar-heading');
    const calendar=window.CyclingCalendar;
    function sync(){
      const state=calendar.normalize(view.signal('SelectedYear'),view.signal('SelectedMonth'));
      year.value=String(state.year);month.max=String(state.max);month.value=String(state.month);
      const name=calendar.months[state.month-1];output.textContent=name;
      month.setAttribute('aria-valuetext',name);
      heading.textContent=name+' '+state.year;
      availability.textContent=state.year===2020?'2020 observations cover January through September.':'All twelve months are available for '+state.year+'.';
    }
    async function apply(){
      // Clamp first, then update both signals together. December -> September
      // when changing 2019 to 2020; earlier years retain all twelve months.
      const state=calendar.normalize(year.value,month.value);
      await view.signal('SelectedYear',state.year).signal('SelectedMonth',state.month).runAsync();sync();
    }
    year.onchange=apply;month.oninput=apply;
    view.addSignalListener('SelectedYear',sync);view.addSignalListener('SelectedMonth',sync);sync();
  }
  async function render(host){
    try{
      const specURL=new URL(host.dataset.spec,window.location.href);
      specURL.searchParams.set('v','centre-9');
      const response=await fetch(specURL);
      if(!response.ok)throw new Error(`Chart returned ${response.status}`);
      const original=await response.json();
      host.innerHTML='';
      let result,correction=0;
      // Use the SVG's measured bounds, including labels, to catch excess width.
      for(let attempt=0;attempt<3;attempt++){
        if(result)result.view.finalize();
        const spec=adapt(structuredClone(original),host,correction);
        result=await vegaEmbed(host,spec,{actions:false,renderer:'svg'});
        await result.view.resize().runAsync();
        const svg=host.querySelector('svg');
        const overflow=Number(svg?.getAttribute('width'))-host.clientWidth+8;
        if(host.clientWidth<600||overflow<=0)break;
        correction+=overflow;
      }
      views.set(host,result.view);
      if(host.id==='chart-9')setupCalendar(result.view);
    }catch(error){
      host.innerHTML='<p class="chart-error">Chart unavailable. Check the data and js folders.</p>';
      console.error(host.dataset.spec,error);
    }
  }
  await Promise.all(hosts.map(render));
  let previous=window.innerWidth,timer;
  window.addEventListener('resize',()=>{
    clearTimeout(timer);timer=setTimeout(async()=>{
      if(Math.abs(window.innerWidth-previous)<30)return;
      previous=window.innerWidth;
      const calendar=views.get(document.getElementById('chart-9'));
      const selected=calendar?window.CyclingCalendar.normalize(calendar.signal('SelectedYear'),calendar.signal('SelectedMonth')):null;
      views.forEach(view=>view.finalize());views.clear();
      await Promise.all(hosts.map(render));
      const updated=views.get(document.getElementById('chart-9'));
      if(updated&&selected)await updated.signal('SelectedYear',selected.year).signal('SelectedMonth',selected.month).runAsync();
    },200);
  });
  window.chartViews=views;
})();
