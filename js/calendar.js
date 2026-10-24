/* Shared by the UI and the interaction checks. */
(function (root) {
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthLimit(year){return Number(year)===2020?9:12;}
  function normalize(year,month){
    year=Number(year);if(![2018,2019,2020].includes(year))year=2020;
    month=Math.max(1,Math.min(monthLimit(year),Math.round(Number(month)||1)));
    return {year,month,max:monthLimit(year)};
  }
  const api={months,monthLimit,normalize};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CyclingCalendar=api;
})(typeof window!=='undefined'?window:globalThis);
