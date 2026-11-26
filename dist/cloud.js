import { freshState, travelSettings, tripDays, dateAfter } from './logic.js';
import { changedRecords, expenseEntries, inviteCode, makeInviteCode, overlayRecords, recordsFor, stateFor, validTripDate, TripError } from './cloud-model.js';

const demoProject='demo-trip-2027';
const isLocal=location.hostname==='localhost'||location.hostname==='127.0.0.1';
const emulate=isLocal&&new URLSearchParams(location.search).get('emulator')==='1';

async function getConfig() {
  if(emulate) return {projectId:demoProject,apiKey:'demo-api-key',authDomain:'localhost'};
  const abort=new AbortController();
  const deadline=setTimeout(()=>abort.abort(),5000);
  try{
    const response=await fetch('/__/firebase/init.json',{signal:abort.signal});
    if(!response.ok)return null;
    const config=await response.json();
    return config.projectId&&config.apiKey&&config.authDomain ? config : null;
  }finally{clearTimeout(deadline);}
}

const asMap = snapshot => new Map(snapshot.docs.map(d=>[d.id,d.data()]));
const asObject = snapshot => Object.fromEntries(asMap(snapshot));
const timeLimit = (promise,ms,message) => new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new TripError(message)),ms);
  promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
});
const accountName = user => (user.displayName?.trim()||'여행 친구').slice(0,40);
const check = (valid,message) => {if(!valid)throw new TripError(message);};
const field = (raw,max) => String(raw??'').trim().slice(0,max);

export function explain(error){
  if(error instanceof TripError)return error.message;
  const messages={
    'auth/popup-blocked':'팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 다음 다시 눌러 주세요.',
    'auth/popup-closed-by-user':'로그인 창이 닫혔습니다. 다시 시도해 주세요.',
    'auth/cancelled-popup-request':'다른 로그인 창이 열려 있습니다.',
    'auth/unauthorized-domain':'Firebase Authentication의 승인된 도메인에 이 주소를 추가해야 합니다.',
    'auth/operation-not-allowed':'Firebase Authentication에서 Google 로그인을 활성화해야 합니다.',
    'auth/network-request-failed':'Google 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
    'auth/user-mismatch':'현재 사이트에 로그인한 Google 계정으로 다시 인증해 주세요.',
    'auth/requires-recent-login':'보안을 위해 Google 계정 재인증이 필요합니다. 탈퇴를 다시 시도해 주세요.',
    'auth/account-exists-with-different-credential':'동일한 이메일이 다른 로그인 방식에 등록되어 있습니다. 프로젝트 관리자에게 문의하세요.',
    'permission-denied':'이 작업의 권한이 없거나 그룹 상태가 바뀌었습니다. 다시 불러온 뒤 확인해 주세요.',
    'resource-exhausted':'Firebase 무료 사용량 한도에 도달했을 수 있습니다. 나중에 다시 시도해 주세요.',
    unavailable:'서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
    'not-found':'해당 항목을 찾을 수 없습니다. 최신 화면으로 다시 확인해 주세요.'
  };
  return messages[error?.code]||'작업을 완료하지 못했습니다. 다시 시도해 주세요.';
}

export async function startCloud(events) {
  let config;
  try {config=await getConfig();}
  catch {events.account({mode:'unconfigured'});return null;}
  if(!config){events.account({mode:'unconfigured'});return null;}

  const sdk=await import('./cloud-sdk.js');
  const {doc,collection,writeBatch,getDocFromServer,getDocsFromServer,onSnapshot,serverTimestamp,deleteDoc,updateDoc,setDoc,runTransaction,increment}=sdk;
  const app=sdk.initializeApp(config);
  const auth=sdk.initializeAuth(app,{persistence:sdk.browserLocalPersistence});
  const db=sdk.getFirestore(app);
  if(emulate){
    sdk.connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
    sdk.connectFirestoreEmulator(db,'127.0.0.1',18080);
  }
  const provider=new sdk.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const ref=(...path)=>doc(db,...path);
  const coll=(...path)=>collection(db,...path);
  let session, revision=0;
  let stopList=()=>{},stopGroup=()=>{};
  const current=()=>{
    if(!session||!auth.currentUser||session.uid!==auth.currentUser.uid) throw new TripError('먼저 Google 계정으로 로그인해 주세요.');
    return session;
  };
  const profileRef=uid=>ref('users',uid);
  const itemRef=(uid,id)=>ref('users',uid,'items',id);
  const indexRef=(uid,gid)=>ref('users',uid,'memberships',gid);
  const groupRef=gid=>ref('groups',gid);
  const memberRef=(gid,uid)=>ref('groups',gid,'members',uid);
  const inviteRef=code=>ref('invites',code);
  const shared=(gid,kind,id)=>ref('groups',gid,kind,id);

  function apply(s) {
    if(session!==s)return;
    const visible=overlayRecords(s.confirmed,s.pending);
    s.presented=visible;
    events.personal(stateFor(visible));
  }
  function tell(s,mode,error) {
    if(session===s) events.account({mode,user:s.user,nickname:s.profile?.nickname||accountName(s.user),error});
  }
  function stopSession(){
    if(session){clearTimeout(session.timer);session.stop();session=null;}
    stopList();stopList=()=>{};
    stopGroup();stopGroup=()=>{};
  }
  function savePersonal(state){
    const s=current();
    check(s.ready&&!s.profile.deleting,'개인 데이터를 불러온 뒤 다시 시도해 주세요.');
    const next=recordsFor(state);
    const patch=changedRecords(s.presented,next);
    if(!patch.size)return;
    for(const [id,value] of patch)s.pending.set(id,value);
    s.presented=next;
    clearTimeout(s.timer);
    s.timer=setTimeout(()=>flush(s).catch(error=>events.error(explain(error))),500);
  }
  async function importGuest(state){
    const s=current();
    const combined=new Map(s.presented);
    for(const [id,value] of recordsFor(state))if(!combined.has(id))combined.set(id,value);
    savePersonal(stateFor(combined));
    apply(s);
    await timeLimit(flush(s),8000,'동기화가 끝나지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  async function flush(s=current()){
    clearTimeout(s.timer);
    if(s.writing) {
      await s.writing;
      if(session!==s||!s.pending.size)return;
    }
    if(!s.pending.size||session!==s)return;
    const drain=async()=>{
      while(s.pending.size&&session===s){
        const changes=[...s.pending].slice(0,50);
        const batch=writeBatch(db);
        for(const [id,value] of changes){
          const target=itemRef(s.uid,id);
          if(value)batch.set(target,value);else batch.delete(target);
        }
        await batch.commit();
        for(const [id,value] of changes){
          if(s.pending.get(id)===value)s.pending.delete(id);
          if(value)s.confirmed.set(id,value);else s.confirmed.delete(id);
        }
      }
    };
    s.writing=drain();
    try{await s.writing;}
    catch(error){tell(s,'ready',explain(error));throw error;}
    finally{s.writing=null;}
  }

  async function attach(user){
    const cycle=++revision;
    stopSession();
    if(!user){events.account({mode:'guest'});return;}
    const s={uid:user.uid,user,confirmed:new Map(),pending:new Map(),presented:new Map(),stop:()=>{}};
    session=s;
    tell(s,'loading');
    try{
      let profile=await getDocFromServer(profileRef(s.uid));
      if(cycle!==revision)return;
      if(!profile.exists()){
        await runTransaction(db,async tx=>{
          const target=profileRef(s.uid);
          if(!(await tx.get(target)).exists())tx.set(target,{nickname:accountName(user),deleting:false});
        });
        profile=await getDocFromServer(profileRef(s.uid));
      }
      if(cycle!==revision)return;
      s.profile=profile.data();
      if(s.profile.deleting){tell(s,'deleting');return;}
      s.stop=onSnapshot(coll('users',s.uid,'items'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites||(!s.ready&&snapshot.metadata.fromCache))return;
        s.confirmed=asMap(snapshot);
        if(!s.ready){s.ready=true;tell(s,'ready');}
        apply(s);
      },error=>tell(s,'error',explain(error)));
    }catch(error){tell(s,'error',explain(error));}
  }
  sdk.onAuthStateChanged(auth,user=>{void attach(user);},error=>events.account({mode:'error',error:explain(error)}));

  function watchGroups(update,error){
    stopList();
    const {uid}=current();
    let generation=0;
    stopList=onSnapshot(coll('users',uid,'memberships'),async snapshot=>{
      const tick=++generation;
      try{
        const result=await Promise.allSettled(snapshot.docs.map(async idx=>{
          const entry=await getDocFromServer(groupRef(idx.id));
          return entry.exists()?{id:entry.id,...entry.data()}:null;
        }));
        if(tick!==generation||session?.uid!==uid)return;
        update(result.flatMap(row=>row.status==='fulfilled'&&row.value?[row.value]:[]));
        if(result.some(row=>row.status==='rejected'))error(new TripError('일부 그룹을 불러오지 못했습니다.'));
      }catch(err){if(tick===generation)error(err);}
    },error);
    return ()=>{generation++;stopList();stopList=()=>{};};
  }

  function watchGroup(gid,update,error){
    stopGroup();
    current();
    let group;
    const parts={};
    const names=['members','candidates','votes','schedule','budget','expenses','dates','checklist','opinions','places'];
    const emit=()=>{if(group&&names.every(n=>parts[n]))update({group,...parts});};
    const guard=err=>error(err);
    const stops=[onSnapshot(groupRef(gid),ss=>{
      if(!ss.exists()){error(new TripError('여행 그룹을 찾을 수 없습니다.'));return;}
      group=ss.data();emit();
    },guard)];
    for(const name of names){
      stops.push(onSnapshot(coll('groups',gid,name),ss=>{parts[name]=asObject(ss);emit();},guard));
    }
    const stop=()=>stops.splice(0).forEach(fn=>fn());
    stopGroup=stop;
    return stop;
  }
  async function createGroup(rawName){
    const s=current();
    const name=field(rawName,70),code=makeInviteCode();
    check(name,'그룹 이름을 입력해 주세요.');
    const target=doc(coll('groups')),gid=target.id,stamp=serverTimestamp();
    const batch=writeBatch(db);
    batch.set(target,{name,inviteCode:code,ownerUid:s.uid,memberCount:1,closing:false,travelDays:3,departure:'',createdAt:stamp});
    batch.set(inviteRef(code),{groupId:gid});
    batch.set(memberRef(gid,s.uid),{nickname:s.profile.nickname,role:'member',joinCode:code,joinedAt:stamp});
    batch.set(indexRef(s.uid,gid),{joinedAt:stamp});
    await batch.commit();
    return gid;
  }
  async function joinGroup(raw) {
    const s=current(), code=inviteCode(raw);
    check(code,'32자리 초대 코드를 확인해 주세요.');
    const invite=await getDocFromServer(inviteRef(code));
    check(invite.exists(),'만료되었거나 유효하지 않은 초대 코드입니다.');
    const {groupId:gid}=invite.data();
    if((await getDocFromServer(indexRef(s.uid,gid))).exists())return gid;
    const stamp=serverTimestamp(),batch=writeBatch(db);
    batch.update(groupRef(gid),{memberCount:increment(1)});
    batch.set(memberRef(gid,s.uid),{nickname:s.profile.nickname,role:'member',joinCode:code,joinedAt:stamp});
    batch.set(indexRef(s.uid,gid),{joinedAt:stamp});
    await batch.commit();
    return gid;
  }
  async function rotateInvite(gid){
    const code=makeInviteCode();
    await runTransaction(db,async tx=>{
      const target=groupRef(gid),group=(await tx.get(target)).data();
      check(group,'여행 그룹을 찾을 수 없습니다.');
      tx.set(inviteRef(code),{groupId:gid});
      tx.update(target,{inviteCode:code});
      tx.delete(inviteRef(group.inviteCode));
    });
    return code;
  }
  async function vote(gid,patch,reaction){
    const {uid}=current();
    await runTransaction(db,async tx=>{
      const target=shared(gid,'votes',uid);
      const old=(await tx.get(target)).data();
      const next={destination:old?.destination||'',days:old?.days||0,date:old?.date||'',ratings:{...old?.ratings},...patch};
      if(reaction){
        const {id,value}=reaction;
        const candidate=await tx.get(shared(gid,'candidates',id));
        check(candidate.exists(),'여행지 후보가 삭제되었습니다.');
        if(next.ratings[id]===value) delete next.ratings[id];
        else {
          check(Object.hasOwn(next.ratings,id)||Object.keys(next.ratings).length<100,'찬반 투표는 그룹당 100곳까지 저장할 수 있습니다.');
          next.ratings[id]=value;
        }
      }
      // A deleted option must not block editing a different poll.
      if(next.destination && !(await tx.get(shared(gid,'candidates',next.destination))).exists()) next.destination='';
      if(next.date && !(await tx.get(shared(gid,'dates',next.date))).exists()) next.date='';
      if(next.destination||next.days||next.date||Object.keys(next.ratings).length)tx.set(target,next);
      else tx.delete(target);
    });
  }
  async function revise(gid,kind,id,data,expected) {
    const target=shared(gid,kind,id);
    await runTransaction(db,async tx=>{
      const existing=(await tx.get(target)).data();
      if(kind==='schedule'&&data){
        const group=(await tx.get(groupRef(gid))).data();
        check(group&&data.day<=tripDays(group.travelDays,4),'여행 기간 안의 일차를 선택해 주세요.');
      }
      check((existing?.revision||0)===expected,'다른 친구가 먼저 변경했습니다. 최신 내용을 확인한 뒤 다시 저장해 주세요.');
      if(data)tx.set(target,{...data,revision:expected+1});else tx.delete(target);
    });
  }
  function setSchedule(gid,id,values,expected){
    const data={day:Number(values.day),time:values.time,title:field(values.title,100),memo:field(values.memo,1000)};
    check(data.title&&Number.isInteger(data.day)&&tripDays(data.day,0)&&/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(data.time),'일차, 시간, 일정 이름을 확인해 주세요.');
    return revise(gid,'schedule',id||doc(coll('groups',gid,'schedule')).id,data,expected);
  }
  async function expense(gid,data,id=''){
    const {uid}=current();
    const target=shared(gid,'expenses',uid);
    const row=data?{id:doc(coll('groups',gid,'expenses')).id,title:field(data.title,100),amount:Number(data.amount)}:null;
    if(row)check(row.title&&Number.isSafeInteger(row.amount)&&row.amount>=1&&row.amount<=1e8,'결제 내용과 1원~1억 원 사이의 금액을 입력해 주세요.');
    await runTransaction(db,async tx=>{
      const old=(await tx.get(target)).data()?.entries;
      const entries=expenseEntries(old).filter(e=>e.id!==id);
      if(row){
        check(entries.length<30,'공동 경비는 구성원당 30건까지 입력할 수 있습니다.');
        entries.push(row);
      }
      if(entries.length)tx.set(target,{entries:entries.map(e=>JSON.stringify(e))});else tx.delete(target);
    });
  }
  async function leaveGroup(gid){
    const {uid}=current();
    const batch=writeBatch(db);
    batch.update(groupRef(gid),{memberCount:increment(-1)});
    batch.delete(memberRef(gid,uid));
    batch.delete(indexRef(uid,gid));
    batch.delete(shared(gid,'votes',uid));
    batch.delete(shared(gid,'expenses',uid));
    batch.delete(shared(gid,'opinions',uid));
    await batch.commit();
  }
  async function closeGroup(gid){
    const {uid}=current();
    const target=groupRef(gid);
    const group=await runTransaction(db,async tx=>{
      const group=(await tx.get(target)).data();
      check(group?.ownerUid===uid&&group.memberCount===1,'그룹에 다른 구성원이 있다면 먼저 관리자 소유권을 넘겨 주세요.');
      if(!group.closing)tx.update(target,{closing:true});
      return group;
    });
    for(const name of ['candidates','schedule','budget','dates','checklist','places'])await deleteCollection(coll('groups',gid,name));
    const batch=writeBatch(db);
    batch.delete(shared(gid,'votes',uid));
    batch.delete(shared(gid,'expenses',uid));
    batch.delete(shared(gid,'opinions',uid));
    batch.delete(memberRef(gid,uid));
    batch.delete(indexRef(uid,gid));
    batch.delete(inviteRef(group.inviteCode));
    batch.delete(target);
    await batch.commit();
  }
  async function deleteCollection(target){
    const records=await getDocsFromServer(target);
    for(let i=0;i<records.docs.length;i+=250){
      const batch=writeBatch(db);
      for(const entry of records.docs.slice(i,i+250))batch.delete(entry.ref);
      await batch.commit();
    }
  }
  async function groupListFor(uid){
    const indices=await getDocsFromServer(coll('users',uid,'memberships'));
    return Promise.all(indices.docs.map(async idx=>({id:idx.id,...(await getDocFromServer(groupRef(idx.id))).data()})));
  }
  async function nickname(raw){
    const s=current(),nickname=field(raw,40);
    check(nickname,'닉네임을 입력해 주세요.');
    await updateDoc(profileRef(s.uid),{nickname});
    s.profile.nickname=nickname;
    tell(s,'ready');
    const groups=await groupListFor(s.uid);
    for(const group of groups)if(!group.closing)await updateDoc(memberRef(group.id,s.uid),{nickname});
  }
  async function eraseAccount() {
    const s=current();
    // The popup must start from the explicit confirmation click.
    await sdk.reauthenticateWithPopup(s.user,provider,sdk.browserPopupRedirectResolver);
    const before=await groupListFor(s.uid);
    const owned=before.find(g=>g.ownerUid===s.uid&&g.memberCount>1);
    check(!owned,'다른 구성원이 있는 그룹의 소유권을 먼저 넘겨 주세요. 그룹: '+(owned?.name||''));
    await timeLimit(flush(s),8000,'동기화가 끝나지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
    if(!s.profile?.deleting){
      await updateDoc(profileRef(s.uid),{deleting:true});
      s.profile={nickname:s.profile?.nickname||accountName(s.user),deleting:true};
    }
    s.stop();tell(s,'deleting');
    const groups=await groupListFor(s.uid);
    for(const g of groups){
      if(g.ownerUid===s.uid)await closeGroup(g.id);else await leaveGroup(g.id);
    }
    await deleteCollection(coll('users',s.uid,'items'));
    if((await getDocFromServer(profileRef(s.uid))).exists())await deleteDoc(profileRef(s.uid));
    await sdk.deleteUser(s.user);
  }

  function logout(){
    const s=current();
    return timeLimit(flush(s),8000,'저장 대기 중인 항목이 있습니다. 인터넷 연결을 확인한 뒤 로그아웃해 주세요.').then(()=>sdk.signOut(auth));
  }

  return {
    signIn:()=>sdk.signInWithPopup(auth,provider,sdk.browserPopupRedirectResolver),
    logout,savePersonal,importGuest,flush:()=>timeLimit(flush(),8000,'동기화가 끝나지 않았습니다. 인터넷 연결을 확인해 주세요.'),
    retry:()=>attach(auth.currentUser),
    watchGroups,watchGroup,createGroup,joinGroup,rotateInvite,vote,setSchedule,expense,leaveGroup,closeGroup,nickname,eraseAccount,
    rename:(gid,value)=>{
      const name=field(value,70);
      check(name,'그룹 이름을 입력해 주세요.');
      return updateDoc(groupRef(gid),{name});
    },
    setTravel:(gid,values,previous)=>runTransaction(db,async tx=>{
      const target=groupRef(gid),group=(await tx.get(target)).data();
      check(group&&group.travelDays===previous.savedDays&&(group.departure||'')===previous.departure,
        '다른 친구가 먼저 기간을 변경했습니다. 새 기간을 확인해 주세요.');
      const next=travelSettings(values);
      check(next,'출국일, 귀국일과 여행 일수를 확인해 주세요.');
      tx.update(target,{travelDays:next.days,departure:next.departure});
    }),
    addTemplate:(gid,templateId,lines,previous)=>runTransaction(db,async tx=>{
      const target=groupRef(gid),group=(await tx.get(target)).data();
      check(group&&group.travelDays===previous.savedDays&&/^[a-z0-9-]+$/.test(templateId)&&[3,4].includes(lines.length),'여행 일정 템플릿을 확인해 주세요.');
      const refs=lines.map((_,index)=>shared(gid,'schedule','template-'+templateId+'-'+(index+1)));
      const existing=await Promise.all(refs.map(ref=>tx.get(ref)));
      const days=Math.max(previous.days,lines.length);
      check(!group.departure||dateAfter(group.departure,days-1),'귀국일을 확인해 주세요.');
      if(group.travelDays!==days)tx.update(target,{travelDays:days});
      refs.forEach((ref,index)=>{
        if(!existing[index].exists())tx.set(ref,{day:index+1,time:'09:00',title:field(lines[index],100),memo:'추천 일정 템플릿 · 방문 시각 조정 가능',revision:1});
      });
    }),
    addDate:(gid,date)=>{
      check(validTripDate(date),'출발 날짜를 확인해 주세요.');
      return setDoc(shared(gid,'dates',date),{addedAt:serverTimestamp()});
    },
    removeDate:(gid,date)=>deleteDoc(shared(gid,'dates',date)),
    setPlace:(gid,id,values,expected)=>{
      const title=field(values.title,100),memo=field(values.memo,1000),kind=values.kind;
      check(title&&['spot','food'].includes(kind),'장소 이름과 분류를 확인해 주세요.');
      return revise(gid,'places',id||doc(coll('groups',gid,'places')).id,{title,memo,kind},expected);
    },
    removePlace:(gid,id,expected)=>revise(gid,'places',id,null,expected),
    addTask:(gid,value)=>{
      const title=field(value,100);
      check(title,'준비 항목을 입력해 주세요.');
      return revise(gid,'checklist',doc(coll('groups',gid,'checklist')).id,{title,done:false},0);
    },
    toggleTask:(gid,id,task)=>revise(gid,'checklist',id,{title:task.title,done:!task.done},task.revision),
    removeTask:(gid,id,expected)=>revise(gid,'checklist',id,null,expected),
    opinion:(gid,value)=>{
      const target=shared(gid,'opinions',current().uid);
      const memo=field(value,1500);
      return memo?setDoc(target,{memo}):deleteDoc(target);
    },
    transfer:(gid,uid)=>updateDoc(groupRef(gid),{ownerUid:uid}),
    role:(gid,uid,role)=>updateDoc(memberRef(gid,uid),{role}),
    addCandidate:(gid,id)=>setDoc(shared(gid,'candidates',id),{addedAt:serverTimestamp()}),
    removeCandidate:(gid,id)=>deleteDoc(shared(gid,'candidates',id)),
    removeSchedule:(gid,id,expected)=>revise(gid,'schedule',id,null,expected),
    setBudget:(gid,values,expected)=>{
      const costs=Object.fromEntries(['total','nightly','foodDaily','transitDaily'].map(key=>[key,Number(values[key]||0)]));
      check(Object.values(costs).every(value=>Number.isSafeInteger(value)&&value>=0&&value<=1e8),'각 예산은 0원~1억 원 사이로 입력해 주세요.');
      return revise(gid,'budget','shared',{...costs,memo:field(values.memo,400)},expected);
    }
  };
}
