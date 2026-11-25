import { budgetDefaults, freshState, normalizeBudget } from './logic.js';

const lists = ['saved','attractions','checks'];
const maps = ['notes','plans'];

function put(records, kind, key, value) {
  const payload = JSON.stringify(value);
  if (payload.length > 36000) throw new Error('한 항목에 저장할 수 있는 데이터의 크기를 넘었습니다.');
  records.set(kind+':'+encodeURIComponent(key), {kind,key,payload});
}
export function recordsFor(state) {
  const records = new Map();
  for (const kind of lists) for (const key of state[kind]) {
    if (/^[a-z0-9-]+(?::[0-9]+)?$/.test(key)) put(records,kind,key,true);
  }
  for (const kind of maps) for (const [key,value] of Object.entries(state[kind]||{})) put(records,kind,key,value);
  if (state.compare.length) put(records,'compare','current',state.compare);
  if (JSON.stringify(state.budget)!==JSON.stringify(budgetDefaults)) put(records,'budget','current',state.budget);
  return records;
}
export function stateFor(records) {
  const state = freshState();
  for (const value of records.values()) {
    if (!value) continue;
    const {kind,key,payload} = value;
    if (!key || ['__proto__','constructor','prototype'].includes(key)) continue;
    try {
      const parsed = JSON.parse(payload);
      if (lists.includes(kind) && parsed===true) state[kind].push(key);
      if (kind==='notes' && typeof parsed==='string') state.notes[key]=parsed.slice(0,2000);
      if (kind==='plans' && Array.isArray(parsed)) state.plans[key]=parsed.slice(0,4).map(day=>({
        stops:Array.isArray(day?.stops)?day.stops.filter(stop=>typeof stop==='string').slice(0,30).map(stop=>stop.slice(0,160)):[],
        memo:typeof day?.memo==='string'?day.memo.slice(0,2000):''
      }));
      if (kind==='budget' && parsed && typeof parsed==='object') state.budget=normalizeBudget(parsed);
      if (kind==='compare' && Array.isArray(parsed)) state.compare=parsed.filter(x=>typeof x==='string').slice(0,4);
    } catch { /* A malformed record cannot affect the rest of the account. */ }
  }
  return state;
}
export function changedRecords(previous, next) {
  const changed = new Map();
  for (const id of new Set([...previous.keys(),...next.keys()])) {
    const value=next.get(id);
    if (previous.get(id)?.payload!==value?.payload) changed.set(id,value??null);
  }
  return changed;
}
export function overlayRecords(confirmed, pending) {
  const result=new Map(confirmed);
  for (const [id,record] of pending) {
    if(record===null) result.delete(id); else result.set(id,record);
  }
  return result;
}
export function inviteCode(raw = '') {
  const code = String(raw).trim().replace(/[\s-]/g,'').toUpperCase();
  return /^[0-9A-F]{32}$/.test(code)?code:'';
}
export function makeInviteCode(random = globalThis.crypto) {
  return Array.from(random.getRandomValues(new Uint8Array(16)), n=>n.toString(16).toUpperCase().padStart(2,'0')).join('');
}
export function expenseEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(entry=>{
    try {
      const {id,title,amount}=JSON.parse(entry);
      if (typeof id==='string' && /^[a-zA-Z0-9_-]{1,40}$/.test(id) && typeof title==='string' &&
        title.length<=100 && Number.isSafeInteger(amount) && amount>=1 && amount<=1e8) return [{id,title,amount}];
    } catch { /* Ignore unparseable entries. */ }
    return [];
  }).slice(0,30);
}
export function validTripDate(value) {
  if (!/^[1-9][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value)) return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function splitShare(total,count,index) {
  return count>0 ? Math.floor(total/count)+(index<total%count?1:0) : 0;
}
export function settlement(members, expenses) {
  const balances=[...members].sort().map(uid=>({uid,paid:0,share:0,balance:0}));
  const byUid=new Map(balances.map(b=>[b.uid,b]));
  let total=0;
  for(const [uid,raw] of Object.entries(expenses)) {
    const payer=byUid.get(uid);
    if(!payer) continue;
    payer.paid=expenseEntries(raw.entries).reduce((sum,e)=>sum+e.amount,0);
    total+=payer.paid;
  }
  for(const [i,row] of balances.entries()){
    row.share=splitShare(total,balances.length,i);
    row.balance=row.paid-row.share;
  }
  const debt=balances.filter(x=>x.balance<0).map(x=>({uid:x.uid,remaining:-x.balance}));
  const credit=balances.filter(x=>x.balance>0).map(x=>({uid:x.uid,remaining:x.balance}));
  const transfers=[];
  let i=0,j=0;
  while(i<debt.length&&j<credit.length){
    const amount=Math.min(debt[i].remaining,credit[j].remaining);
    transfers.push({from:debt[i].uid,to:credit[j].uid,amount});
    debt[i].remaining-=amount;
    credit[j].remaining-=amount;
    if(!debt[i].remaining)i++;
    if(!credit[j].remaining)j++;
  }
  return {total,balances,transfers};
}

export class TripError extends Error {
  constructor(message) { super(message);this.name='TripError'; }
}
