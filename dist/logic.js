export const numbers = {
  flight:'왕복 항공권 (1인)', rooms:'객실 수', roomPrice:'객실 1박 비용', food:'1일 식비 (1인)',
  transit:'현지 교통비 (1인)', tickets:'관광지 입장료 (1인)', park:'놀이공원 (1인)', shopping:'쇼핑비 (1인)',
  insurance:'여행자보험 (1인)', sim:'유심·eSIM (1인)', other:'기타 비용 (1인)', reserve:'비상금 (1인)'
};
export const budgetDefaults = {
  id:'osaka',days:3,people:4,airport:'CJJ',flight:0,rooms:2,roomPrice:0,food:0,transit:0,tickets:0,park:0,
  shopping:0,insurance:0,sim:0,other:0,reserve:0,limit:0,rate:0
};
export const freshState = () => ({saved:[],compare:[],attractions:[],notes:{},checks:[],plans:{},budget:{...budgetDefaults}});
const integer = (v, min=0, max=1e8) => Math.min(max,Math.max(min,Math.round(Number(v)||0)));
export const formatMoney = n => Math.round(n).toLocaleString('ko-KR');
export function normalizeBudget(base) {
  const b = {...budgetDefaults};
  for (const k of Object.keys(numbers)) b[k] = integer(base[k], k==='rooms'?1:0,k==='rooms'?100:1e8);
  b.people = integer(base.people,1,100);
  b.days = Number(base.days)===4?4:3;
  b.airport = base.airport==='ICN'?'ICN':'CJJ';
  b.id = typeof base.id==='string' ? base.id.slice(0,50) : b.id;
  b.limit = integer(base.limit);
  b.rate = Math.min(100,Math.max(0,Number(base.rate)||0));
  return b;
}
export function calculate(base) {
  const b = normalizeBudget(base);
  const roomTotal = b.rooms*b.roomPrice*(b.days-1);
  const individual = b.flight+b.food*b.days+b.transit+b.tickets+b.park+b.shopping+b.insurance+b.sim+b.other+b.reserve;
  const total = roomTotal + individual*b.people;
  return {b,roomTotal,individual,total,perPerson:total/b.people,roomShare:roomTotal/b.people};
}
const list = (v,max=180,size=160) => Array.isArray(v) ? v.filter(x=>typeof x==='string').slice(0,max).map(x=>x.slice(0,size)) : [];
const text = (v,max=2000) => typeof v==='string'?v.slice(0,max):'';
const goodKey = k => /^[a-z0-9-]{1,60}$/.test(k) && !['constructor','prototype'].includes(k);
const mapEntries = (v,f) => Object.fromEntries(Object.entries(v&&typeof v==='object'&&!Array.isArray(v)?v:{}).filter(([k])=>goodKey(k)).slice(0,180).map(([k,value])=>[k,f(value)]));
export function parseImport(raw) {
  if (typeof raw!=='string'||raw.length>2e6) throw new Error('파일이 너무 큽니다.');
  const data = JSON.parse(raw);
  if (!data || typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.saved)) throw new Error('여행 데이터 형식이 올바르지 않습니다.');
  return {
    saved:[...new Set(list(data.saved))],compare:[...new Set(list(data.compare,4))],attractions:[...new Set(list(data.attractions))],checks:[...new Set(list(data.checks))],
    notes:mapEntries(data.notes,v=>text(v)),
    plans:mapEntries(data.plans,v=>Array.isArray(v)?v.slice(0,4).map(d=>({stops:list(d?.stops,30),memo:text(d?.memo)})):[]),
    budget:normalizeBudget(data.budget&&typeof data.budget==='object'?{...budgetDefaults,...data.budget}:budgetDefaults)
  };
}
export function move(items, index, difference) {
  const target = index + difference;
  if (index<0||index>=items.length||target<0||target>=items.length) return false;
  [items[index],items[target]] = [items[target],items[index]];
  return true;
}
export function matches(d,f) {
  const query = f.q.trim().toLowerCase();
  if (query && ![d.name,d.region,d.description,...(d.tags||[]),...d.attractions].join(' ').toLowerCase().includes(query)) return false;
  if (f.region && d.region!==f.region || f.pref && !(d.relatedPrefs||[d.pref]).map(String).includes(f.pref) || f.type && !d.tags?.includes(f.type)) return false;
  const allTypes=[...new Set([...(d.tags||[]),...(d.scores?.[7]>=4?['친구들과 여행하기 좋은 곳']:[])])];
  if (/성$|사찰|도쇼구|기념공원/.test(d.attractions.join(' '))||d.attractions.some(name=>name.endsWith('성'))) allTypes.push('역사');
  if (allTypes.includes('액티비티')) allTypes.push('체험');
  if (f.types?.some(type=>!allTypes.includes(type))) return false;
  if (f.budget) {
    const [min,max] = f.budget==='custom' ? [0, f.custom===''?Infinity:Number(f.custom)] : f.budget.split('-').map((v,i)=>v===''?(i?Infinity:0):Number(v));
    const ranges = f.days==='' ? d.price : [d.price?.[Number(f.days)]];
    return Boolean(ranges?.some(r=>r&&r[0]<=max&&r[1]>=min));
  }
  return true;
}
