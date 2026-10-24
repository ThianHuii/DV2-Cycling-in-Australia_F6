"""Rebuild density contours from supplied RiderLog CSV cell centres.
Requires numpy, scipy, shapely, matplotlib.
The local coastline is clipped from Natural Earth 1:10m land.
These are weighted-cell approximations, not original GPS trajectories.
"""
from pathlib import Path
import csv,json,math
import numpy as np
from scipy.ndimage import gaussian_filter
from shapely.geometry import shape,mapping,box,Polygon
from shapely.ops import unary_union
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
P=Path(__file__).resolve().parents[1]
def dump(path,d):path.write_text(json.dumps(d,ensure_ascii=False,indent=2))
bounds=(150.90,-34.02,151.30,-33.70);nx,ny=160,154
rr=list(csv.DictReader((P/'data/riderlog.csv').open()));gps=[r for r in rr if bounds[0]<=float(r['longitude'])<=bounds[2] and bounds[1]<=float(r['latitude'])<=bounds[3]]
x=np.array([float(r['longitude']) for r in gps]);y=np.array([float(r['latitude']) for r in gps]);w=np.array([float(r['point_records']) for r in gps]);hist,ye,xe=np.histogram2d(y,x,bins=[ny,nx],range=[[bounds[1],bounds[3]],[bounds[0],bounds[2]]],weights=w)
# 1km bandwidth: latitude ~111km/degree, longitude corrected for Sydney latitude.
sigma=(1/(111*(ye[1]-ye[0])),1/(111*math.cos(math.radians(-33.86))*(xe[1]-xe[0])))
z=gaussian_filter(hist,sigma=sigma,mode='constant');z=z/z.max()*100
X=(xe[:-1]+xe[1:])/2;Y=(ye[:-1]+ye[1:])/2
cs=plt.contourf(X,Y,z,levels=[5,20,40,60,80,101]);features=[]
landraw=json.loads((P/'data/sydney-land.geojson').read_text());landgeom=unary_union([shape(f['geometry']) for f in landraw['features']])
dump(P/'data/sydney-land.geojson',{'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':mapping(landgeom)}]})
for low,segs,kinds in zip([5,20,40,60,80],cs.allsegs,cs.allkinds):
 for seg,kind in zip(segs,kinds):
  starts=np.flatnonzero(kind==1);rings=[seg[s:e] for s,e in zip(starts,list(starts[1:])+[len(seg)])];
  if not rings:continue
  geom=Polygon(rings[0],rings[1:]).buffer(0).intersection(landgeom)
  if not geom.is_empty:features.append({'type':'Feature','properties':{'Level':low},'geometry':mapping(geom)})
dump(P/'data/sydney-density.geojson',{'type':'FeatureCollection','features':features});plt.close()
metadata={'input':'riderlog.csv','rows_in_extent':len(gps),'weighted_point_records':int(w.sum()),'extent':bounds,'grid':[nx,ny],'bandwidth_km':1,'thresholds_relative_to_peak':[5,20,40,60,80],'method':'Gaussian smoothing of supplied weighted cell centres, clipped to Natural Earth land. Relative density, not unique people or routes.'};dump(P/'data/density-method.json',metadata)

print('Weighted density contours rebuilt.')
