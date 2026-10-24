"""Rebuild the website CSVs directly from the supplied CSV/XLSX files.
Run from any directory: python scripts/prepare_data.py
Requires openpyxl. No chart values are manually transcribed.
"""
from pathlib import Path
import csv,json
import openpyxl
P=Path(__file__).resolve().parents[1]
U=P/'data/source'
def writecsv(name,rows):
 with (P/'data'/name).open('w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
def excel(file,sheet,header):
 w=openpyxl.load_workbook(U/file,data_only=True); r=list(w[sheet].values); h=r[header-1];return [dict(zip(h,x)) for x in r[header:] if isinstance(x[0],(int,float))]
def dump(path,d):path.write_text(json.dumps(d,ensure_ascii=False,indent=2))
# Runtime CSVs retain every value; only UTF-8 BOM markers are removed.
for src,dst in [('1..csv','journey-to-work-original.csv'),('8. riderlog_sydney_hexbin_ready.csv','riderlog.csv'),('9. sydney_harbour_bridge_daily_cycle_counts.csv','daily-counts.csv'),('10. cycling_counter_seasonal_radial.csv','monthly-counts.csv'),('11. cycling_region_treemap_direct.csv','regions.csv')]:
 (P/'data'/dst).write_text((U/src).read_text(encoding='utf-8-sig'),encoding='utf-8')
with (P/'data/journey-to-work-original.csv').open(encoding='utf-8-sig') as f:
 r=list(csv.reader(f));h=r[1]; rows=[]
 for x in r[2:]:
  if len(x)!=5 or not x[0]:continue
  try:rows.append({'Mode':x[0],'Count2021':int(x[1].replace(',','')),'Count2016':int(x[3].replace(',',''))})
  except ValueError:pass
writecsv('journey-to-work.csv',rows)
state=[{'State':r['State'],'Bicycle':r['Bicycle'],'Total_employed':r['Total_employed']} for r in excel('3. Bicycle only commuting share by rates.xlsx','Sheet1',1)];writecsv('state-share.csv',state)
codes=dict(zip(['New South Wales','Victoria','Queensland','South Australia','Western Australia','Tasmania','Northern Territory','Australian Capital Territory'],['NSW','VIC','QLD','SA','WA','TAS','NT','ACT']))
ranks=[{'Year':r['Year'],'State':codes[r['State']],'StateName':r['State'],'Bicycle':r['Bicycle Commuters'],'Employed':r['Total Employed']} for r in excel('4 which state lead over time.xlsx','Bump Chart Data',5)];writecsv('state-ranks.csv',ranks)
age=[{'Age':r['Age Group'].replace(' years','').replace('75 and over','75+'),'Sex':r['Sex'],'Count':r['Bicycle Count']} for r in excel('5. bicycle commuting by age and gender.xlsx','Long Data',5)];writecsv('age-sex.csv',age)
active=[{'State':r['State'],'Code':codes[r['State']],'Bicycle':r['Bicycle Count'],'Walking':r['Walked Only Count'],'Employed':r['Total Employed']} for r in excel('6. cycling vs walking to work.xlsx','Connected Dot Data',6)];writecsv('active-travel.csv',active)
lga=[{'LGA':r['LGA Name'],'State':r['State/Territory'],'Count':r['Bicycle Commuters'],'Employed':r['Total Employed Persons'],'Share':r['Bicycle Rate'],'Longitude':r['Longitude'],'Latitude':r['Latitude']} for r in excel('7. Australia_Bicycle_Commuters_by_LGA_2021.xlsx','LGA Map Data',6) if r['Longitude'] is not None and r['Latitude'] is not None and isinstance(r['Bicycle Commuters'],(int,float))];writecsv('lga.csv',lga)

print('CSV exports rebuilt from supplied source files.')
