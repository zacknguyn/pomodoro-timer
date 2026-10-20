import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {flushSync} from 'react-dom'
import {MotionConfig} from 'motion/react'
import {DitherDonutChart} from './dashboard-preview-kit/DitherCharts'
import {AreaChart,LineChart} from './dashboard-preview-kit/upstream/area-chart'
import {Area,Line} from './dashboard-preview-kit/upstream/area'
import {XAxis} from './dashboard-preview-kit/upstream/x-axis'
import {YAxis} from './dashboard-preview-kit/upstream/y-axis'
import {Legend} from './dashboard-preview-kit/upstream/legend'
import {Tooltip} from './dashboard-preview-kit/upstream/tooltip'
let roots=[],markers={}
function color(token){const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.fillStyle=getComputedStyle(document.querySelector('.dashboard-demo')).getPropertyValue(token).trim();ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)}
const focusConfig={api:{label:'checkout-api',color:'blue'},web:{label:'web-client',color:'purple'},unassigned:{label:'No project',color:'grey'}}
function KitChart({type,data}){
 const [marker,setMarker]=useState(null)
 markers[type]=setMarker
 const common={data,animate:false,bloom:'aura',markerIndex:marker,margins:{top:type==='focus'?34:12,left:34,right:12,bottom:24},onHoverChange:index=>{if(index!==null)window.dashboardChartInspect?.(type,index)}}
 return <MotionConfig reducedMotion="user">{type==='focus'
  ? <AreaChart {...common} config={focusConfig} stackType="stacked" className="kit-chart-root"><XAxis dataKey="day" maxTicks={7}/><YAxis tickCount={3}/><Legend isClickable/><Tooltip labelKey="label" valueFormatter={value=>value+' min'}/><Area dataKey="api" variant="gradient"/><Area dataKey="web" variant="gradient"/><Area dataKey="unassigned" variant="gradient"/></AreaChart>
  : <LineChart {...common} config={{completed:{label:'Completed',color:'purple'}}} className="kit-chart-root"><XAxis dataKey="day" maxTicks={7}/><YAxis tickCount={3} tickFormatter={value=>Number.isInteger(value)?String(value):''}/><Tooltip labelKey="label" valueFormatter={value=>value+' tasks'}/><Line dataKey="completed" variant="gradient"/></LineChart>}
 </MotionConfig>
}
window.markDashboardChart=(type,index)=>markers[type]?.(index)
window.unmountDashboardDonut=()=>{for(const root of roots)root.unmount();roots=[];markers={}}
window.mountDashboardDonut=()=>{
 window.unmountDashboardDonut()
 const el=document.querySelector('[data-donut]')
 if(el){const root=createRoot(el);roots.push(root);const colors={'checkout-api':color('--series-api'),'web-client':color('--series-web'),'No project':color('--series-unassigned')};flushSync(()=>root.render(<DitherDonutChart label="Project share of recorded focus. Exact values beside the donut." data={JSON.parse(el.dataset.donut).map(item=>({...item,color:colors[item.name]}))}/>))}
 for(const el of document.querySelectorAll('[data-kit-native]')){const root=createRoot(el);roots.push(root);flushSync(()=>root.render(<KitChart type={el.dataset.kitNative} data={JSON.parse(el.dataset.values)}/>))}
}
