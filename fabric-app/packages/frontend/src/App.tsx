import { useEffect, useMemo, useState } from 'react';
import { getTotalReviews, getSentimentCounts } from './lib/rayfin-client';
import './App.css';

type Page = 'Overview' | 'Feedback Explorer' | 'Predictive Intelligence' | 'Action Center';
type Sentiment = 'Positive' | 'Negative';
type Review = { id: string; category: string; sentiment: Sentiment; rating: number; date: string; text: string };
type Action = { id: number; title: string; owner: string; status: 'Open' | 'In progress' | 'Resolved'; priority: 'High' | 'Medium' | 'Low' };
const reviews: Review[] = [
  {id:'REV-1001',category:'Electronics',sentiment:'Negative',rating:2,date:'2026-10-20',text:'Battery life was shorter than expected and support took too long.'},
  {id:'REV-1002',category:'Home & Kitchen',sentiment:'Positive',rating:5,date:'2026-10-19',text:'Excellent quality, arrived quickly, and works perfectly.'},
  {id:'REV-1003',category:'Beauty',sentiment:'Positive',rating:4,date:'2026-10-18',text:'Good value and packaging. Would purchase again.'},
  {id:'REV-1004',category:'Electronics',sentiment:'Negative',rating:1,date:'2026-10-17',text:'The item stopped working after a week.'},
  {id:'REV-1005',category:'Sports',sentiment:'Positive',rating:5,date:'2026-10-16',text:'Comfortable and durable. Highly recommended.'},
  {id:'REV-1006',category:'Fashion',sentiment:'Negative',rating:2,date:'2026-10-15',text:'Size did not match the listing and return was difficult.'},
];
const trend = [28,32,30,34,31,33,29,35,32,34,33,34];
const categoryData = [
  {name:'Electronics',positive:58,negative:42}, {name:'Home & Kitchen',positive:73,negative:27},
  {name:'Beauty',positive:69,negative:31}, {name:'Sports',positive:77,negative:23},
  {name:'Fashion',positive:61,negative:39},
];
const initialActions: Action[] = [
  {id:1,title:'Investigate battery complaints',owner:'Product Team',status:'Open',priority:'High'},
  {id:2,title:'Review delivery support response times',owner:'Support',status:'In progress',priority:'Medium'},
  {id:3,title:'Improve apparel sizing guidance',owner:'Merchandising',status:'Resolved',priority:'Low'},
];
const menu: {name:Page; icon:string}[] = [
  {name:'Overview',icon:'▦'}, {name:'Feedback Explorer',icon:'◎'},
  {name:'Predictive Intelligence',icon:'⌁'}, {name:'Action Center',icon:'☷'},
];
const fmt = (v:number) => new Intl.NumberFormat('en-US').format(v);
function LineChart({values,forecast=false}:{values:number[];forecast?:boolean}) {
  const width=760, height=230, pad=28, min=20, max=45;
  const coords=values.map((v,i)=>`${pad+i*(width-2*pad)/(values.length-1)},${height-pad-(v-min)/(max-min)*(height-2*pad)}`).join(' ');
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Illustrative weekly negative sentiment trend">
    {[25,30,35,40].map(v=><g key={v}><line x1={pad} y1={height-pad-(v-min)/(max-min)*(height-2*pad)} x2={width-pad} y2={height-pad-(v-min)/(max-min)*(height-2*pad)} stroke="#e9eef5"/><text x="0" y={height-pad-(v-min)/(max-min)*(height-2*pad)+4} fontSize="12" fill="#8b96a8">{v}%</text></g>)}
    <polyline points={coords} fill="none" stroke={forecast?'#8b5cf6':'#0d9488'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    {values.map((v,i)=><circle key={i} cx={pad+i*(width-2*pad)/(values.length-1)} cy={height-pad-(v-min)/(max-min)*(height-2*pad)} r="4" fill={forecast?'#8b5cf6':'#0d9488'}/>)}
  </svg><div className="axis-labels"><span>Week 1</span><span>Week {Math.ceil(values.length/2)}</span><span>Week {values.length}</span></div></div>;
}
function App() {
  const [page,setPage]=useState<Page>('Overview');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('All');
  const [actions,setActions]=useState<Action[]>(initialActions);
  const [newAction,setNewAction]=useState('');
  const [mobileMenu,setMobileMenu]=useState(false);
  const [totalReviews, setTotalReviews] = useState<number | null>(null);
  const [totalReviewsError, setTotalReviewsError] = useState(false);
  const [sentimentCounts, setSentimentCounts] = useState<{
    positive: number;
    negative: number;
  } | null>(null);
  const [sentimentError, setSentimentError] = useState(false);
  // Load the Total Reviews KPI from Microsoft Fabric Lakehouse.
  useEffect(() => {
    let active = true;
    getTotalReviews()
      .then((count) => {
        if (!active) return;
        setTotalReviews(count);
        setTotalReviewsError(false);
        console.log('LIVE TOTAL REVIEWS:', count);
      })
      .catch((error) => {
        if (!active) return;
        setTotalReviewsError(true);
        console.error('FABRIC KPI ERROR:', error);
      });
    getSentimentCounts()
      .then((counts) => {
        if (!active) return;
        setSentimentCounts(counts);
        setSentimentError(false);
        console.log('LIVE SENTIMENT COUNTS:', counts);
      })
      .catch((error) => {
        if (!active) return;
        setSentimentError(true);
        console.error('FABRIC SENTIMENT ERROR:', error);
      });
    return () => { active = false; };
  }, []);
  const sentimentTotal = sentimentCounts === null ? 0 : sentimentCounts.positive + sentimentCounts.negative;
  const sentimentPct = (count: number) => sentimentTotal > 0 ? `${(count / sentimentTotal * 100).toFixed(2)}% of all reviews` : 'No sentiment records';
  const filtered=useMemo(()=>reviews.filter(r=>(filter==='All'||r.sentiment===filter) && `${r.text} ${r.category} ${r.id}`.toLowerCase().includes(search.toLowerCase())),[search,filter]);
  const addAction=()=>{const title=newAction.trim();if(!title)return;setActions(a=>[{id:Date.now(),title,owner:'Unassigned',status:'Open',priority:'Medium'},...a]);setNewAction('');};
  const changeStatus=(id:number,status:Action['status'])=>setActions(a=>a.map(item=>item.id===id?{...item,status}:item));
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'show':''}`}>
      <div className="brand"><div className="brand-icon">✦</div><div><strong>Intelligence Hub</strong><small>MICROSOFT FABRIC</small></div></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{menu.map(item=><button key={item.name} className={`nav-link ${page===item.name?'active':''}`} onClick={()=>{setPage(item.name);setMobileMenu(false);}}><span className="nav-icon">{item.icon}</span>{item.name}</button>)}</nav>
      <div className="sidebar-bottom"><span className="status-dot"/> Prototype mode <small>Local demo data · Not live</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label="Toggle menu">☰</button><div className="breadcrumb">Workspace <span>/</span> AI Customer Intelligence <span>/</span> <b>{page}</b></div><div className="user-chip">AI <span>Fabric App Preview</span></div></header>
      <div className="content"><div className="heading"><div><div className="eyebrow">CUSTOMER EXPERIENCE ANALYTICS</div><h1>{page}</h1><p>{page==='Overview'?'Monitor customer sentiment and surface actionable insights.':page==='Feedback Explorer'?'Explore and investigate customer reviews.':page==='Predictive Intelligence'?'Understand predicted sentiment risk and model quality.':'Turn customer signals into accountable actions.'}</p></div><span className="demo-tag">● Prototype / reference data</span></div>
      {page==='Overview'&&<>
        <div className="kpi-grid"><div className="kpi"><span>Total Reviews</span><strong>{totalReviewsError ? 'Unavailable' : totalReviews === null ? 'Loading...' : fmt(totalReviews)}</strong><small>{totalReviewsError ? 'Unable to load Fabric data' : totalReviews === null ? 'Connecting to Fabric...' : 'Live Microsoft Fabric Lakehouse'}</small><div className="kpi-icon">▤</div></div><div className="kpi"><span>Positive Reviews</span><strong>{sentimentError ? 'Unavailable' : sentimentCounts === null ? 'Loading...' : fmt(sentimentCounts.positive)}</strong><small className="green">{sentimentError ? 'Unable to load Fabric data' : sentimentCounts === null ? 'Connecting to Fabric...' : sentimentPct(sentimentCounts.positive)}</small><div className="kpi-icon green-bg">↗</div></div><div className="kpi"><span>Negative Reviews</span><strong>{sentimentError ? 'Unavailable' : sentimentCounts === null ? 'Loading...' : fmt(sentimentCounts.negative)}</strong><small className="red">{sentimentError ? 'Unable to load Fabric data' : sentimentCounts === null ? 'Connecting to Fabric...' : sentimentPct(sentimentCounts.negative)}</small><div className="kpi-icon red-bg">↘</div></div><div className="kpi"><span>Product Categories</span><strong>10</strong><small>In project dataset</small><div className="kpi-icon purple-bg">▦</div></div></div>
        <div className="two-col"><section className="panel"><div className="panel-heading"><div><h2>Negative Sentiment Trend</h2><p>Illustrative weekly values · not live</p></div><span className="mini-tag">12 weeks</span></div><LineChart values={trend}/></section><section className="panel"><div className="panel-heading"><div><h2>Sentiment Breakdown</h2><p>Historical project totals</p></div></div><div className="donut-area"><div className="donut"><div><strong>100,001</strong><small>Reviews</small></div></div><div className="legend"><div><i className="legend-dot teal"/>Positive <b>66.50%</b></div><div><i className="legend-dot coral"/>Negative <b>33.50%</b></div></div></div></section></div>
        <section className="panel"><div className="panel-heading"><div><h2>Product Category Sentiment</h2><p>Illustrative category distribution</p></div><span className="mini-tag">Sample breakdown</span></div><div className="categories">{categoryData.map(c=><div className="category-row" key={c.name}><span>{c.name}</span><div className="stacked"><div style={{width:`${c.positive}%`}}/><div style={{width:`${c.negative}%`}}/></div><b>{c.positive}% positive</b></div>)}</div></section>
      </>}
      {page==='Feedback Explorer'&&<section className="panel"><div className="panel-heading"><div><h2>Customer Review Explorer</h2><p>Six illustrative records · search and filter are interactive</p></div><span className="mini-tag">{filtered.length} results</span></div><div className="filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search review, category or ID..." aria-label="Search reviews"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Sentiment filter"><option>All</option><option>Positive</option><option>Negative</option></select></div><div className="table-scroll"><table><thead><tr><th>Review ID</th><th>Category</th><th>Feedback</th><th>Rating</th><th>Sentiment</th><th>Date</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td className="mono">{r.id}</td><td>{r.category}</td><td className="review-text">{r.text}</td><td>{'★'.repeat(r.rating)}<span className="muted">{'☆'.repeat(5-r.rating)}</span></td><td><span className={`pill ${r.sentiment.toLowerCase()}`}>{r.sentiment}</span></td><td>{r.date}</td></tr>)}</tbody></table>{filtered.length===0&&<p className="empty">No matching reviews.</p>}</div></section>}
      {page==='Predictive Intelligence'&&<><div className="kpi-grid forecast-kpis"><div className="kpi"><span>Next Forecast</span><strong>33.68%</strong><small>Negative review rate · Nov 2, 2026</small></div><div className="kpi"><span>Model MAE</span><strong>0.686</strong><small>Percentage points · holdout</small></div><div className="kpi"><span>Baseline MAE</span><strong>0.823</strong><small>Percentage points · holdout</small></div><div className="kpi"><span>Model</span><strong className="model-name">Holt Trend</strong><small>Linear trend forecasting</small></div></div><section className="panel"><div className="panel-heading"><div><h2>Projected Negative Sentiment</h2><p>Illustrative projection shape · reference forecast point: 33.68%</p></div><span className="mini-tag purple">Model output preview</span></div><LineChart values={[32.4,32.9,33.1,33.4,33.68,34.0,34.2]} forecast/><p className="footnote">Only the 33.68% value for Nov 2 is drawn from the existing project summary. Other plotted values are illustrative, not model predictions.</p></section><section className="panel insight"><div className="insight-icon">✧</div><div><h2>Model insight</h2><p>The Holt linear trend model achieved a lower holdout MAE than the baseline (0.686 vs 0.823 percentage points). This is a historical validation result, not a guarantee of future accuracy.</p></div></section></>}
      {page==='Action Center'&&<><div className="kpi-grid action-kpis"><div className="kpi"><span>Total Actions</span><strong>{actions.length}</strong><small>Local prototype only</small></div><div className="kpi"><span>Open</span><strong>{actions.filter(a=>a.status==='Open').length}</strong><small>Awaiting action</small></div><div className="kpi"><span>In Progress</span><strong>{actions.filter(a=>a.status==='In progress').length}</strong><small>Being investigated</small></div><div className="kpi"><span>Resolved</span><strong>{actions.filter(a=>a.status==='Resolved').length}</strong><small>Completed</small></div></div><section className="panel"><div className="panel-heading"><div><h2>Customer Experience Actions</h2><p>Interactive local state · changes reset when you refresh</p></div></div><div className="add-action"><input value={newAction} onChange={e=>setNewAction(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addAction();}} placeholder="Describe a new action..." aria-label="New action"/><button onClick={addAction} disabled={!newAction.trim()}>+ Add action</button></div><div className="table-scroll"><table><thead><tr><th>Action</th><th>Owner</th><th>Priority</th><th>Status</th></tr></thead><tbody>{actions.map(a=><tr key={a.id}><td><b>{a.title}</b></td><td>{a.owner}</td><td><span className={`priority ${a.priority.toLowerCase()}`}>{a.priority}</span></td><td><select className="status-select" value={a.status} onChange={e=>changeStatus(a.id,e.target.value as Action['status'])}><option>Open</option><option>In progress</option><option>Resolved</option></select></td></tr>)}</tbody></table></div></section></>}
      <footer>AI Customer Intelligence Hub · Microsoft Fabric Apps (Preview) · Prototype data, not a live connection</footer>
      </div>
    </main>
  </div>;
}
export default App;
