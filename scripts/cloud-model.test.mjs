import assert from 'node:assert/strict';
import test from 'node:test';
import { freshState } from '../dist/logic.js';
import { changedRecords, inviteCode, makeInviteCode, overlayRecords, recordsFor, settlement, splitShare, stateFor, validTripDate } from '../dist/cloud-model.js';

test('독립적인 개인 항목을 왕복 및 병합하고 삭제를 반영한다',()=>{
  const old=freshState();
  old.saved.push('osaka');old.attractions.push('tokyo:0');old.checks.push('0-0');
  old.compare.push('osaka','tokyo');
  old.notes.osaka='1일차에 도착';
  old.plans['osaka-0']=[{stops:['난바'],memo:'교통 패스 확인'}];
  old.budget.flight=450000;
  const confirmed=recordsFor(old);
  assert.deepEqual(stateFor(confirmed),old);
  const next=structuredClone(old);
  next.saved=[];next.notes.osaka='새 메모';
  const pending=changedRecords(confirmed,recordsFor(next));
  assert.deepEqual([...pending.keys()],['saved:osaka','notes:osaka']);
  const anotherDevice=structuredClone(old);
  anotherDevice.checks.push('0-1');
  assert.deepEqual(stateFor(overlayRecords(recordsFor(anotherDevice),pending)),{
    ...next,checks:['0-0','0-1']
  });
});
test('손상된 문서와 잘못된 경비 항목을 제외한다',()=>{
  const records=new Map([['notes:osaka',{kind:'notes',key:'osaka',payload:'{'}]]);
  assert.deepEqual(stateFor(records),freshState());
  const expenses={a:{entries:[
    '{"id":"hotel","title":"숙박","amount":10001}',
    '{"id":"bad","title":"오류","amount":-5}'
  ]}, left:{entries:['{"id":"left","title":"탈퇴자","amount":30000}']}};
  const result=settlement(['c','b','a'],expenses);
  assert.equal(result.total,10001);
  assert.deepEqual(result.balances.map(r=>r.share),[3334,3334,3333]);
  assert.deepEqual(result.transfers,[{from:'b',to:'a',amount:3334},{from:'c',to:'a',amount:3333}]);
  assert.deepEqual(settlement([],{}),{total:0,balances:[],transfers:[]});
});
test('초대 코드의 128비트 형식을 유지한다',()=>{
  const code=makeInviteCode();
  assert.match(code,/^[A-F0-9]{32}$/);
  assert.equal(inviteCode('  '+code.slice(0,16)+'-'+code.slice(16).toLowerCase()+' '),code);
  assert.equal(inviteCode('expired-url'), '');
});


test('유효한 출발 날짜를 검증하고 예산을 원 단위로 나눈다',()=>{
  assert(validTripDate('2028-02-29'));
  assert(!validTripDate('2027-02-29'));
  assert(!validTripDate('2027-01-01T00:00:00Z'));
  const shares=Array.from({length:3},(_,i)=>splitShare(10001,3,i));
  assert.deepEqual(shares,[3334,3334,3333]);
});
