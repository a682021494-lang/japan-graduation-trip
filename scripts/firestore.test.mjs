import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

let env,alice,bob,carol;
const groupId='test-travel-group';
const code='0123456789ABCDEF0123456789ABCDEF';
const rotated='FEDCBA9876543210FEDCBA9876543210';
const profile=(db,uid)=>doc(db,'users',uid);
const group=db=>doc(db,'groups',groupId);
const member=(db,uid)=>doc(db,'groups',groupId,'members',uid);
const index=(db,uid)=>doc(db,'users',uid,'memberships',groupId);
const invite=(db,secret)=>doc(db,'invites',secret);
const shared=(db,kind,id)=>doc(db,'groups',groupId,kind,id);
const item=(db,uid)=>doc(db,'users',uid,'items','notes:tokyo');
const nickname=uid=>uid.slice(0,1).toUpperCase()+uid.slice(1);
const membership=(uid,secret,role='member')=>({nickname:nickname(uid),role,joinCode:secret,joinedAt:serverTimestamp()});
const join=(db,uid,secret,role='member')=>{
  const b=writeBatch(db);
  b.update(group(db),{memberCount:increment(1)});
  b.set(member(db,uid),membership(uid,secret,role));
  b.set(index(db,uid),{joinedAt:serverTimestamp()});
  return b.commit();
};
const leave=(db,uid)=>{
  const b=writeBatch(db);
  b.update(group(db),{memberCount:increment(-1)});
  b.delete(member(db,uid));b.delete(index(db,uid));
  b.delete(shared(db,'votes',uid));b.delete(shared(db,'expenses',uid));b.delete(shared(db,'opinions',uid));
  return b.commit();
};

before(async()=>{
  env=await initializeTestEnvironment({
    projectId:'demo-trip-2027',
    firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}
  });
  await env.clearFirestore();
  [alice,bob,carol]=['alice','bob','carol'].map(uid=>env.authenticatedContext(uid).firestore());
  for(const [db,uid] of [[alice,'alice'],[bob,'bob'],[carol,'carol']]){
    await assertSucceeds(setDoc(profile(db,uid),{nickname:nickname(uid),deleting:false}));
  }
});
after(async()=>{await env?.cleanup();});

test('개인 문서 및 소속 인덱스를 다른 계정과 비로그인 방문자로부터 보호한다',async()=>{
  const guest=env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(item(alice,'alice'),{kind:'notes',key:'tokyo',payload:'"개인 메모"'}));
  await assertFails(getDoc(profile(bob,'alice')));
  await assertFails(getDoc(item(bob,'alice')));
  await assertFails(getDocs(collection(bob,'users','alice','items')));
  await assertFails(getDoc(item(guest,'alice')));
  await assertFails(deleteDoc(item(bob,'alice')));
  await assertFails(setDoc(index(bob,'bob'),{joinedAt:serverTimestamp()}));
  assert.equal((await assertSucceeds(getDoc(item(alice,'alice')))).data().payload,'"개인 메모"');
});
test('그룹 생성, 비회원 격리, 코드 참여 및 권한 검증',async()=>{
  const b=writeBatch(alice);
  b.set(group(alice),{name:'친구 여행',ownerUid:'alice',inviteCode:code,memberCount:1,closing:false,createdAt:serverTimestamp()});
  b.set(member(alice,'alice'),membership('alice',code));
  b.set(index(alice,'alice'),{joinedAt:serverTimestamp()});
  b.set(invite(alice,code),{groupId});
  await assertSucceeds(b.commit());

  await assertFails(getDoc(group(bob)));
  await assertFails(getDocs(collection(bob,'groups',groupId,'members')));
  await assertFails(getDocs(collection(carol,'invites')));
  await assertFails(getDoc(invite(env.unauthenticatedContext().firestore(),code)));
  await assertSucceeds(getDoc(invite(bob,code)));
  await assertFails(setDoc(member(bob,'bob'),membership('bob',code)));
  await assertFails(join(bob,'bob','A'.repeat(32)));
  await assertFails(join(bob,'bob',code,'admin'));
  await assertSucceeds(join(bob,'bob',code));
  assert.equal((await assertSucceeds(getDoc(group(bob)))).data().memberCount,2);
  await assertFails(updateDoc(group(bob),{memberCount:4}));
  await assertFails(updateDoc(group(bob),{ownerUid:'bob'}));
  await assertFails(updateDoc(member(bob,'bob'),{role:'admin'}));
});
test('투표 사칭 금지, 후보/일정/예산/공동 경비 편집 및 관리자 권한',async()=>{
  await assertSucceeds(setDoc(shared(bob,'candidates','tokyo'),{addedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(shared(bob,'votes','bob'),{destination:'tokyo',days:4}));
  const date='2027-02-06';
  await assertSucceeds(setDoc(shared(alice,'dates',date),{addedAt:serverTimestamp()}));
  await assertFails(setDoc(shared(carol,'dates','2027-02-08'),{addedAt:serverTimestamp()}));
  await assertFails(getDoc(shared(carol,'dates',date)));
  const vote={destination:'tokyo',days:4,date,ratings:{tokyo:1}};
  await assertSucceeds(setDoc(shared(bob,'votes','bob'),vote));
  await assertFails(updateDoc(shared(bob,'votes','bob'),{date:'2027-02-07'}));
  await assertFails(updateDoc(shared(bob,'votes','bob'),{ratings:{tokyo:3}}));
  await assertFails(setDoc(shared(bob,'votes','alice'),vote));
  await assertSucceeds(setDoc(shared(alice,'checklist','passport'),{title:'여권 확인',done:false,revision:1}));
  await assertSucceeds(updateDoc(shared(bob,'checklist','passport'),{done:true,revision:2}));
  await assertFails(updateDoc(shared(carol,'checklist','passport'),{done:false,revision:3}));
  await assertFails(updateDoc(shared(alice,'checklist','passport'),{done:false,revision:2}));
  await assertSucceeds(setDoc(shared(bob,'opinions','bob'),{memo:'이른 항공편 선호'}));
  await assertFails(setDoc(shared(bob,'opinions','alice'),{memo:'다른 사람의 의견'}));
  await assertFails(deleteDoc(shared(alice,'opinions','bob')));
  await assertFails(getDoc(shared(carol,'opinions','bob')));
  const dining={kind:'food',title:'우에노 라멘',memo:'역 주변',revision:1};
  await assertSucceeds(setDoc(shared(alice,'places','ramen'),dining));
  await assertSucceeds(getDoc(shared(bob,'places','ramen')));
  await assertFails(getDoc(shared(carol,'places','ramen')));
  await assertFails(updateDoc(shared(carol,'places','ramen'),{revision:2,memo:'외부인'}));
  await assertSucceeds(updateDoc(shared(bob,'places','ramen'),{revision:2,memo:'저녁 후보'}));
  await assertFails(updateDoc(group(bob),{name:'무단 변경'}));
  await assertSucceeds(updateDoc(group(alice),{name:'이름 변경'}));
  assert.equal((await assertSucceeds(getDoc(shared(alice,'votes','bob')))).data().days,4);
  await assertFails(setDoc(shared(bob,'votes','alice'),{destination:'tokyo',days:3}));
  await assertFails(setDoc(shared(bob,'votes','bob'),{destination:'outside',days:3}));
  await assertFails(getDoc(shared(carol,'votes','bob')));
  const visit={day:1,time:'09:00',title:'우에노 공원',memo:'',revision:1};
  await assertSucceeds(setDoc(shared(alice,'schedule','entry'),visit));
  await assertSucceeds(updateDoc(shared(bob,'schedule','entry'),{revision:2,title:'도쿄역'}));
  await assertFails(updateDoc(shared(alice,'schedule','entry'),{revision:2,title:'충돌'}));
  await assertFails(updateDoc(shared(carol,'schedule','entry'),{revision:3,title:'외부인'}));
  await assertSucceeds(setDoc(shared(bob,'budget','shared'),{total:500000,memo:'입장료 포함',revision:1}));
  await assertFails(setDoc(shared(bob,'budget','other'),{total:500000,memo:'',revision:1}));
  const entries=[JSON.stringify({id:'ticket',title:'입장료',amount:1000})];
  await assertSucceeds(setDoc(shared(bob,'expenses','bob'),{entries}));
  await assertFails(setDoc(shared(bob,'expenses','alice'),{entries}));
  await assertFails(setDoc(shared(bob,'expenses','bob'),{entries:Array(31).fill(entries[0])}));
  await assertFails(deleteDoc(shared(bob,'candidates','tokyo')));
  await assertSucceeds(updateDoc(member(alice,'bob'),{role:'admin'}));
  await assertSucceeds(deleteDoc(shared(bob,'candidates','tokyo')));
  await assertFails(updateDoc(member(bob,'alice'),{role:'member'}));
});
test('초대 갱신, 소유권 이전, 계정 삭제 중 개인 데이터 보호',async()=>{
  const b=writeBatch(bob);
  b.set(invite(bob,rotated),{groupId});b.update(group(bob),{inviteCode:rotated});b.delete(invite(bob,code));
  await assertSucceeds(b.commit());
  assert.equal((await assertSucceeds(getDoc(invite(carol,code)))).exists(),false);
  await assertFails(join(carol,'carol',code));
  await assertSucceeds(join(carol,'carol',rotated));

  await assertFails(updateDoc(group(alice),{closing:true}));
  await assertSucceeds(updateDoc(group(alice),{ownerUid:'bob'}));
  await assertSucceeds(updateDoc(profile(alice,'alice'),{deleting:true}));
  await assertFails(updateDoc(profile(alice,'alice'),{deleting:false}));
  await assertFails(setDoc(item(alice,'alice'),{kind:'notes',key:'tokyo',payload:'"작업 중"'}));
  await assertSucceeds(leave(alice,'alice'));
  await assertFails(getDoc(group(alice)));
  await assertSucceeds(deleteDoc(item(alice,'alice')));
  await assertSucceeds(deleteDoc(profile(alice,'alice')));
  await assertSucceeds(leave(carol,'carol'));
});
test('마지막 소유자가 그룹과 연결된 자료를 정리한다',async()=>{
  await assertFails(deleteDoc(group(bob)));
  await assertSucceeds(updateDoc(group(bob),{closing:true}));
  await assertFails(setDoc(shared(bob,'schedule','later'),{day:1,time:'10:00',title:'수정',memo:'',revision:1}));
  await assertSucceeds(deleteDoc(shared(bob,'schedule','entry')));
  await assertSucceeds(deleteDoc(shared(bob,'budget','shared')));
  await assertSucceeds(deleteDoc(shared(bob,'dates','2027-02-06')));
  await assertSucceeds(deleteDoc(shared(bob,'checklist','passport')));
  await assertSucceeds(deleteDoc(shared(bob,'places','ramen')));
  const b=writeBatch(bob);
  b.delete(shared(bob,'votes','bob'));b.delete(shared(bob,'expenses','bob'));b.delete(shared(bob,'opinions','bob'));
  b.delete(member(bob,'bob'));b.delete(index(bob,'bob'));
  b.delete(invite(bob,rotated));b.delete(group(bob));
  await assertSucceeds(b.commit());
  assert.equal((await assertSucceeds(getDoc(index(bob,'bob')))).exists(),false);
  await assertFails(getDoc(group(bob)));
});
