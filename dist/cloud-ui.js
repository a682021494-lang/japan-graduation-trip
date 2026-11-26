import { extendedGroups } from './cloud-config.js';
import { calculate, formatMoney, freshState, durationControl, durationLabel, maxTripDays, travelDates, dateAfter, travelSettings, tripDays } from './logic.js';
import { expenseEntries, inviteCode, settlement, splitShare, TripError } from './cloud-model.js';

const cloudRoutes = new Set(['profile','groups','group','join','settings','privacy']);
const success = {
  nickname:'닉네임을 저장했습니다.', 'merge-guest':'게스트 데이터를 가져왔습니다.', flush:'동기화를 마쳤습니다.', candidate:'후보를 추가했습니다.',
  schedule:'일정을 저장했습니다.', 'group-template':'공동 일정에 템플릿을 추가했습니다.', budget:'그룹 예산을 공유했습니다.', expense:'공동 경비를 추가했습니다.',
  place:'공동 장소를 저장했습니다.', rename:'그룹 이름을 변경했습니다.', date:'출발 날짜 후보를 추가했습니다.', task:'준비 항목을 추가했습니다.', opinion:'의견을 저장했습니다.',
  rotate:'새 초대 코드를 발급했습니다.', transfer:'그룹 소유권을 이전했습니다.'
};
const money=n=>'₩'+formatMoney(n);
const duration=n=>n?durationLabel(n):'선택 안 함';
const safePhoto=url=>{
  try {
    const parsed=new URL(url);
    return parsed.protocol==='https:'&&/^([a-z0-9-]+\.)*googleusercontent\.com$/.test(parsed.hostname) ? parsed.href : '';
  } catch { return ''; }
};
const loginButton='<button class="btn google-login" type="button" data-cloud-action="signin"><span aria-hidden="true" class="google-g">G</span><span>Google 로그인</span></button>';

export function setupCloudUI({main,page,esc,render,refresh,go,notify,copy,getState,guestState,sessionChanged,catalogue}){
  const header=document.querySelector('#account');
  let client, explain=e=>e instanceof TripError?e.message:'작업을 완료하지 못했습니다. 다시 시도해 주세요.';
  let account={mode:'starting'}, view={route:'',arg:''}, subscription='',stop=()=>{};
  let groups, shared,error='',busy=false,deferred=false;

  const action=(name,label,attrs='',className='')=>`<button type="button" class="btn ${className}" data-cloud-action="${name}" ${attrs}>${label}</button>`;
  const form=(name,inner,attrs='',style='stack')=>`<form class="${style}" data-cloud-form="${name}" ${attrs}>${inner}</form>`;
  const submit=(label,style='primary')=>`<button class="btn ${style}"${busy?' disabled':''}>${label}</button>`;
  const numberInput=(name,label,value,min,max)=>`<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="1" value="${esc(value)}" required></label>`;
  const textInput=(name,label,value,max,required=true)=>`<label>${label}<input name="${name}" type="text" value="${esc(value)}" maxlength="${max}"${required?' required':''}></label>`;
  const message=()=>error?`<p class="notice" role="status">${esc(error)}</p>`:'';
  const profilePhoto=(size='')=>{
    const photo=safePhoto(account.user?.photoURL);
    return photo?`<img class="avatar ${size}" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`:`<span class="avatar avatar-initial ${size}" aria-hidden="true">${esc((account.nickname||'여').slice(0,1))}</span>`;
  };

  function headerState(){
    if(!header)return;
    if(account.user) {
      const expanded=header.querySelector?.('details')?.open?' open':'';
      header.innerHTML=`<details class="account-menu"${expanded}><summary aria-label="프로필 메뉴">${profilePhoto()}<span class="account-name">${esc(account.nickname||'내 계정')}</span></summary>
        <div class="account-links"><a href="#profile">내 프로필</a><a href="#plan">나의 여행</a><a href="#groups">친구들과 여행</a><a href="#saved">저장한 여행지</a><a href="#settings">설정</a><button data-cloud-action="logout">로그아웃</button></div></details>`;
    } else header.innerHTML=account.mode==='guest'?loginButton:`<a href="#groups" class="btn">친구들과 여행</a>`;
  }
  function updateView() {
    if(busy||main.matches?.(':has(input:focus, textarea:focus, select:focus, [data-travel-draft])')){deferred=true;return;}
    deferred=false;refresh();
  }
  function changed(value){
    const previous=account;
    account=value;
    const switched=previous.user?.uid!==value.user?.uid;
    if(switched) {
      sessionChanged(value.user?freshState():guestState());
      error='';
    }
    headerState();subscribe();
    if(switched||value.user&&previous.mode!==value.mode)render();
    else if(cloudRoutes.has(view.route))updateView();
  }
  function clearSubscription(){
    stop();
    stop=()=>{};
    subscription='';
    groups=undefined;shared=undefined;
  }
  function subscribe(){
    const {route,arg}=view;
    const allowed=client&&account.user&&['ready','deleting'].includes(account.mode);
    const desired=allowed && (route==='groups'||(route==='group'&&/^[a-zA-Z0-9]{20}$/.test(arg))) ? account.user.uid+':'+route+':'+arg : '';
    if(subscription===desired)return;
    clearSubscription();
    if(!desired)return;
    subscription=desired;
    const failed=e=>{
      if(subscription!==desired)return;
      error=explain(e); updateView();
    };
    stop=route==='groups'
      ?client.watchGroups(rows=>{if(subscription===desired){groups=rows;updateView();}},failed)
      :client.watchGroup(arg,data=>{if(subscription===desired){if(!shared)error='';shared=data;updateView();}},failed);
  }
  function routeChanged(route='',arg='') {
    if(view.route!==route||view.arg!==arg) {
      view={route,arg};error='';
      const details=header?.querySelector?.('details');
      if(details)details.open=false;
    }
    subscribe();
  }

  function gate() {
    if(account.mode==='guest')return `<div class="panel stack"><p>Google 계정으로 로그인하면 여러 기기에서 데이터를 이어 쓰고 친구들과 여행을 계획할 수 있습니다.</p>${loginButton} ${message()}<a class="text-btn" href="#privacy">개인정보 처리방침</a></div>`;
    if(account.mode==='starting'||account.mode==='loading')return '<p class="panel">로그인 상태를 확인하고 있습니다.</p>';
    if(account.mode==='error')return `<div class="panel stack"><p>${esc(account.error||'계정 데이터에 연결하지 못했습니다.')}</p>${action('retry','다시 연결')}${message()}</div>`;
    return '<p class="panel">공동 여행은 Firebase Hosting에서 사용합니다. 이 주소에서는 여행 정보와 기기 내 저장 기능을 이용할 수 있습니다.</p>';
  }

  function profilePage(settings=false){
    let body=gate();
    if(account.user&&['ready','deleting'].includes(account.mode)){
      body=`<div class="stack">${message()}${account.mode==='deleting'?'<p class="notice">계정 삭제가 진행 중입니다. 아래에서 다시 시도해 남은 단계를 완료할 수 있습니다.</p>':''}${settings||account.mode==='deleting'?`<section class="panel stack">
        <h2>저장 데이터</h2><p>여행 데이터는 이 Google 계정에 연결됩니다. 기존 사이트의 브라우저 데이터는 그 사이트에서 JSON으로 내보낸 후 여기의 <a class="text-btn" href="#saved">저장한 여행지</a>에서 불러올 수 있습니다.</p>
        ${account.mode==='ready'?`<div class="actions">${action('flush','동기화 재시도')}${action('merge-guest','이 주소의 게스트 데이터 가져오기')}</div>`:''}
      </section><section class="panel stack"><h2>계정 및 데이터 삭제</h2><p>Google 재인증 후 개인 데이터, 그룹 소속 정보, 본인의 투표, 의견 및 공동 경비 내역이 삭제됩니다. 다른 구성원이 있는 그룹은 소유권을 먼저 넘겨 주세요. 혼자 있는 소유 그룹은 함께 삭제됩니다.</p><div class="actions">${action('erase','회원 탈퇴 및 데이터 삭제','','accent')} <a class="btn" href="#groups">내 여행 그룹</a></div></section>`:
      `<section class="panel stack"><div class="row">${profilePhoto('avatar-large')}<div><h2>${esc(account.nickname)}</h2><p class="muted">Google 계정으로 연결됨</p></div></div>${form('nickname',textInput('nickname','닉네임',account.nickname,40)+`<p class="muted">그룹에서는 구성원에게 닉네임이 표시됩니다.</p>${submit('닉네임 저장')}`)}<a href="#settings" class="text-btn">계정 설정 →</a></section>`}</div>`;
    }
    return page('ACCOUNT',settings?'설정':'내 프로필',settings?'여행 데이터와 계정을 관리합니다.':'친구들에게 표시할 닉네임을 설정하세요.',body);
  }
  function groupsPage(){
    if(!account.user||!['ready','deleting'].includes(account.mode))return page('GROUPS','친구들과 여행','초대 코드로 친구를 모아 공동 여행을 계획하세요.',gate());
    const ownRows=groups?.sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(g=>`<a href="#group/${esc(g.id)}"><b>${esc(g.name)}</b><small>${g.ownerUid===account.user.uid?'소유자 · ':''}${g.memberCount}명</small></a>`).join('');
    const controls=account.mode==='ready'?`<div class="two"><section class="panel stack"><h2>새 여행 그룹</h2>${form('create',textInput('name','그룹 이름','',70)+submit('그룹 만들기'))}</section>
      <section class="panel stack"><h2>친구 그룹 참여</h2>${joinForm('')}</section></div>`:'';
    return page('GROUPS','친구들과 여행','공동 후보, 실시간 투표, 일정, 예산과 정산을 한곳에 모으세요.',`<div class="stack">${message()}${controls}<section class="panel stack"><h2>내 여행 그룹</h2>
      ${ownRows?`<div class="city-grid">${ownRows}</div>`:groups?'<p>참여한 여행 그룹이 없습니다.</p>':'<p>여행 그룹을 불러오고 있습니다.</p>'}</section></div>`);
  }
  function joinForm(code){
    return form('join',textInput('code','초대 코드',code,45)+submit('그룹 참여'));
  }
  function joinPage(arg){
    const code=inviteCode(arg);
    const content=account.mode==='ready'?`<section class="panel stack">${message()}${joinForm(code)}</section>`:gate();
    return page('GROUP INVITE','여행 그룹 초대','참여하면 그룹 구성원에게 닉네임과 그룹 활동이 표시됩니다.',content);
  }
  const inputSelect=(name,label,options,current='')=>`<label>${label}<select name="${name}" required>${options.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(current)?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  function groupTravel() {
    const {group,schedule}=shared;
    return {days:tripDays(group.travelDays,Math.max(extendedGroups?3:4,...Object.values(schedule).map(item=>item.day))),
      savedDays:group.travelDays,departure:group.departure||''};
  }
  function scheduleForm(id='',value={day:1,time:'09:00',title:'',memo:'',revision:0}){
    return form('schedule',`<div class="form-grid">${numberInput('day','일차',value.day,1,groupTravel().days)}<label>시간<input type="time" name="time" value="${esc(value.time)}" required></label></div>
      <label>일정 이름<input name="title" type="text" value="${esc(value.title)}" maxlength="100" list="group-attractions" required></label><label>메모<textarea name="memo" rows="2" maxlength="1000">${esc(value.memo)}</textarea></label>
      <div class="row">${submit(id?'변경 저장':'일정 추가')}${id?action('remove-schedule','삭제',`data-item="${esc(id)}" data-revision="${value.revision}"`):''}</div>`,
      `data-item="${esc(id)}" data-revision="${value.revision}"`);
  }
  function groupPage(arg){
    if(!account.user||!['ready','deleting'].includes(account.mode))return page('GROUP','여행 그룹','친구들과 함께 계획을 작성하세요.',gate());
    if(!/^[a-zA-Z0-9]{20}$/.test(arg))return page('GROUP','여행 그룹','그룹 주소를 확인해 주세요.','<a class="btn" href="#groups">내 여행 그룹</a>');
    if(!shared)return page('GROUP','여행 그룹','참여한 그룹의 계획을 불러옵니다.',`<div class="panel stack">${error?message()+action('retry-group','다시 불러오기'):'<p>그룹을 불러오고 있습니다.</p>'}<a class="btn" href="#groups">내 여행 그룹</a></div>`);
    const {group,members,candidates,votes,schedule,budget,expenses,dates,checklist,opinions,places}=shared;
    const uid=account.user.uid;
    const owner=group.ownerUid===uid,admin=owner||members[uid]?.role==='admin';
    const writable=account.mode==='ready'&&!group.closing;
    const nickname=id=>esc(members[id]?.nickname||'구성원');
    const personal=votes[uid]||{};
    const catalogueRows=catalogue();
    const names=new Map(catalogueRows.map(d=>[d.id,d.name]));
    const groupTemplates=catalogueRows.flatMap(d=>d.itineraries?.map((lines,i)=>[d.id+'-'+i,d.name+' · '+duration(lines.length)])||[]);
    const attractions=new Set(catalogueRows.filter(d=>Object.hasOwn(candidates,d.id)).flatMap(d=>d.attractions||[]));
    for(const place of Object.values(places))attractions.add(place.title);
    const attractionOptions=[...attractions].map(name=>`<option value="${esc(name)}"></option>`).join('');
    const trip=groupTravel();
    const participantIds=Object.keys(members);
    const ballots=Object.values(votes);
    const options=[...names].filter(([id])=>!Object.hasOwn(candidates,id));
    const candidatesList=Object.keys(candidates).map(id=>{
      const count=ballots.filter(v=>v.destination===id).length;
      const reactions=[1,-1].map(value=>{
        const label=value===1?'찬성':'반대';
        const total=ballots.filter(v=>v.ratings?.[id]===value).length;
        const active=personal.ratings?.[id]===value;
        return writable?action('rate-destination',`${label} ${total}`,`data-item="${esc(id)}" data-next="${value}" aria-pressed="${active}"`):`<span class="pill">${label} ${total}</span>`;
      }).join('');
      return `<li><a href="#trip/${esc(id)}">${esc(names.get(id)||id)}</a><span class="pill">${count}표</span><span class="row">${writable?action('vote-destination',personal.destination===id?'투표 취소':'투표',`data-item="${esc(id)}" aria-pressed="${personal.destination===id}"`):''}${reactions}${writable&&admin?action('remove-candidate','후보 삭제',`data-item="${esc(id)}"`):''}</span></li>`;
    }).join('');
    const durationPoll=(extendedGroups?[...new Set(ballots.map(v=>v.days).filter(Boolean))].sort((a,b)=>a-b):[3,4]).map(days=>`<li><b>${duration(days)}</b><span class="pill">${ballots.filter(v=>v.days===days).length}표</span>
      ${writable?action('vote-days',personal.days===days?'투표 취소':'투표',`data-item="${days}" aria-pressed="${personal.days===days}"`):''}</li>`).join('');
    const dateRows=Object.keys(dates).sort().map(date=>{
      const chosen=personal.date===date;
      const key=`data-item="${esc(date)}"`;
      return `<li><time datetime="${esc(date)}">${esc(date)}</time><span class="pill">${ballots.filter(v=>v.date===date).length}표</span><span class="row">${writable?action('vote-date',chosen?'날짜 투표 취소':'날짜 투표',key+` aria-pressed="${chosen}"`):''}${writable&&admin?action('remove-date','날짜 삭제',key):''}</span></li>`;
    }).join('');
    const taskRows=Object.entries(checklist).map(([id,task])=>{
      const key=`data-item="${esc(id)}" data-revision="${task.revision}"`;
      return `<li><span>${esc(task.title)}</span><span class="row">${writable?action('toggle-task',task.done?'완료 취소':'완료',key+` aria-pressed="${task.done}"`):`<span class="pill">${task.done?'완료':'준비 중'}</span>`}${writable?action('remove-task','항목 삭제',key):''}</span></li>`;
    }).join('');
    const placeForm=(id='',place={kind:'spot',title:'',memo:'',revision:0})=>form('place',
      inputSelect('kind','장소 분류',[['spot','관광지'],['food','맛집']],place.kind)+textInput('title','장소 이름',place.title,100)+
      `<label>장소 메모<textarea name="memo" rows="2" maxlength="1000">${esc(place.memo)}</textarea></label>
      <div class="row">${submit(id?'장소 변경 저장':'장소 추가')}${id?action('remove-place','장소 삭제',`data-item="${esc(id)}" data-revision="${place.revision}"`):''}</div>`,
      `data-item="${esc(id)}" data-revision="${place.revision}"`);
    const placeRows=Object.entries(places).map(([id,place])=>{
      const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.title+' 일본');
      return `<details class="cloud-edit"><summary>${place.kind==='food'?'맛집':'관광지'} · ${esc(place.title)}</summary>
        <p class="links"><a href="${esc(map)}" target="_blank" rel="noopener noreferrer">구글 지도 ↗</a></p>
        ${writable?placeForm(id,place):`<p>${esc(place.memo)}</p>`}</details>`;
    }).join('');
    const opinionRows=Object.entries(opinions).map(([id,row])=>`<li class="group-opinion"><b>${nickname(id)}${id===uid?' (나)':''}</b><p>${esc(row.memo)}</p></li>`).join('');
    const membersList=Object.entries(members).sort((a,b)=>a[1].nickname.localeCompare(b[1].nickname,'ko')).map(([id,m])=>{
      const role=group.ownerUid===id?'소유자':m.role==='admin'?'관리자':'구성원';
      return `<li><b>${nickname(id)}${id===uid?' (나)':''}</b><span class="pill">${role}</span>
      ${owner&&id!==uid&&!group.closing?`<span class="row">${writable?action('role',m.role==='admin'?'관리자 해제':'관리자로 지정',`data-item="${esc(id)}" data-next="${m.role==='admin'?'member':'admin'}"`):''}${action('transfer','소유권 이전',`data-item="${esc(id)}"`)}</span>`:''}</li>`;
    }).join('');
    const days=Array.from({length:trip.days},()=>[]);
    let archived=0;
    for(const [id,item] of Object.entries(schedule).sort((a,b)=>a[1].time.localeCompare(b[1].time))){
      const day=days[item.day-1];
      if(day)day.push(`<details class="cloud-edit"><summary>${item.day}일차 · ${esc(item.time)} · ${esc(item.title)}</summary>${writable?scheduleForm(id,item):`<p>${esc(item.memo)}</p>`}</details>`);
      else archived++;
    }
    const itinerary=days.map((rows,i)=>`<article class="day stack"><h3>${i+1}일차 ${trip.departure?`<small>${dateAfter(trip.departure,i)}</small>`:''}</h3>
      ${rows.join('')||'<p class="muted">등록된 일정이 없습니다.</p>'}</article>`).join('');
    const budgetValue=budget.shared;
    const budgetTotal=budgetValue?budgetValue.total+(budgetValue.nightly||0)*(trip.days-1)+((budgetValue.foodDaily||0)+(budgetValue.transitDaily||0))*trip.days:0;
    const result=settlement(participantIds,expenses);
    const budgetShares=budgetValue?result.balances.map((row,index)=>`<li><span>${nickname(row.uid)}${row.uid===uid?' (나)':''}</span><b>${money(splitShare(budgetTotal,result.balances.length,index))}</b></li>`).join(''):'';
    const expenseList=Object.entries(expenses).flatMap(([id,d])=>expenseEntries(d.entries).map(e=>`<li><span>${esc(e.title)} <small>${nickname(id)}</small></span><b>${money(e.amount)}</b>${writable&&id===uid?action('remove-expense','삭제',`data-item="${esc(e.id)}"`):''}</li>`)).join('');
    const transfers=result.transfers.map(r=>`<li><span>${nickname(r.from)} → ${nickname(r.to)}</span><b>${money(r.amount)}</b></li>`).join('');
    return page('GROUP',esc(group.name),`${group.memberCount}명 참여 · 변경 사항 실시간 동기화`,`<div class="stack group-page">${message()}
      <div class="actions"><a class="btn" href="#groups">← 내 여행 그룹</a>${writable?action('invite','초대 링크 복사','','primary')+action('code','초대 코드 복사'):''}
      ${writable&&admin?action('rotate','초대 코드 갱신'):''}
      ${!owner?action('leave','그룹 나가기'):group.memberCount===1?action('close-group',group.closing?'그룹 삭제 계속':'그룹 삭제'):''}</div>
      ${group.closing?'<p class="notice">소유자가 그룹을 정리 중입니다.</p>':''}
      ${writable&&admin?`<details class="cloud-edit"><summary>그룹 이름 변경</summary>${form('rename',textInput('name','새 그룹 이름',group.name,70)+submit('이름 저장'))}</details>`:''}
      ${writable?`<p class="notice">초대 코드 <code>${esc(group.inviteCode)}</code> · 링크나 코드를 받은 로그인 사용자가 그룹에 참여할 수 있습니다.</p>`:''}
      ${extendedGroups?`<section class="panel stack"><h2>그룹 여행 기간</h2>${writable&&admin?form('travel',durationControl(trip.days,esc,'data-group-duration')+`<div class="form-grid">${travelDates(trip,esc)}</div><div>${submit('여행 날짜 저장')}</div>`):`<p>${duration(trip.days)} ${trip.departure?' · '+esc(trip.departure)+' ~ '+dateAfter(trip.departure,trip.days-1):''}</p>`}</section>`:''}
      <div class="two"><section class="panel stack"><h2>여행지 후보</h2><p class="muted">가장 선호하는 후보 한 곳에 투표하고, 각 후보에 찬반을 표시할 수 있습니다.</p>${writable&&options.length?form('candidate',inputSelect('destination','여행지',options)+submit('후보 추가')):''}
        ${candidatesList?`<ul class="cloud-list">${candidatesList}</ul>`:'<p>아직 후보가 없습니다.</p>'}</section>
      <section class="panel stack"><h2>여행 기간 투표</h2>${writable&&extendedGroups?form('vote-days',numberInput('days','희망 여행 일수',personal.days||trip.days,1,maxTripDays)+submit('기간 투표')):''}<ul class="cloud-list">${durationPoll}</ul><p class="muted">내 선택 · ${esc(names.get(personal.destination)||'여행지 미선택')} · ${duration(personal.days)}</p></section></div>
      <div class="two"><section class="panel stack"><h2>여행 날짜 투표</h2><p class="muted">출발 날짜 후보 중 한 곳에 투표할 수 있습니다.</p>
        ${writable?form('date','<label>출발 날짜<input type="date" name="date" required></label>'+submit('날짜 후보 추가')):''}
        ${dateRows?`<ul class="cloud-list">${dateRows}</ul>`:'<p>등록된 날짜 후보가 없습니다.</p>'}</section>
      <section class="panel stack"><h2>공동 준비 체크리스트</h2>
        ${writable?form('task',textInput('title','준비 항목','',100)+submit('준비 항목 추가')):''}
        ${taskRows?`<ul class="cloud-list">${taskRows}</ul>`:'<p>등록된 준비 항목이 없습니다.</p>'}</section></div>
      <div class="two"><section class="panel stack"><h2>공동 일정</h2>${writable&&admin&&extendedGroups?form('group-template',inputSelect('template','공동 일정 템플릿',[['','선택하세요'],...groupTemplates])+submit('템플릿 추가'),'','row'):''}<datalist id="group-attractions">${attractionOptions}</datalist>${itinerary}${archived?`<p class="notice">기간 밖 일정 ${archived}개가 보관 중입니다. 기간을 늘리면 다시 표시됩니다.</p>`:''}${writable?`<details class="cloud-edit"><summary>일정 추가</summary>${scheduleForm()}</details>`:''}</section>
      <section class="panel stack"><h2>공유 예산</h2>${budgetValue?`<p class="total">${money(budgetTotal)}</p><p>${esc(budgetValue.memo)}</p><h3>개인별 예상 부담금</h3><p class="muted">그룹 예산을 현재 인원으로 균등 분담한 예상 금액입니다.</p><ul class="cloud-list">${budgetShares}</ul>`:'<p>아직 공유 예산이 없습니다.</p>'}
      ${writable?`<details class="cloud-edit"><summary>예산 수정</summary>${form('budget',(extendedGroups?numberInput('total','그룹 고정비 (원)',budgetValue?.total||0,0,1e8)+numberInput('nightly','그룹 1박 숙박비 (원)',budgetValue?.nightly||0,0,1e8)+numberInput('foodDaily','그룹 1일 식비 (원)',budgetValue?.foodDaily||0,0,1e8)+numberInput('transitDaily','그룹 1일 교통비 (원)',budgetValue?.transitDaily||0,0,1e8):numberInput('total','그룹 전체 예산 (원)',budgetValue?.total||'',1,1e8))+textInput('memo','예산 메모',budgetValue?.memo||'',400,false)+
      `<div class="row">${submit('그룹 예산 저장')}${action('personal-budget','내 예산 금액 채우기')}</div>`,`data-revision="${budgetValue?.revision||0}"`)}</details>`:''}</section></div>
      <div class="two"><section class="panel stack"><h2>공동 경비 정산</h2><p>현재 구성원이 사용한 공동 경비를 균등 분담합니다.</p><p class="total">${money(result.total)}</p>
      ${writable?form('expense',textInput('title','내가 낸 경비 내역','',100)+numberInput('amount','금액 (원)','',1,1e8)+submit('공동 경비 추가')):''}
      ${expenseList?`<ul class="cloud-list">${expenseList}</ul>`:''}<h3>추천 송금</h3>${transfers?`<ul class="cloud-list">${transfers}</ul>`:'<p>현재 정산할 차액이 없습니다.</p>'}</section>
      <section class="panel stack"><h2>구성원 <small>${participantIds.length}명</small></h2><ul class="cloud-list">${membersList}</ul></section></div>
      <div class="two"><section class="panel stack"><h2>공동 관광지와 맛집</h2>
        ${placeRows||'<p>등록된 관광지와 맛집이 없습니다.</p>'}
        ${writable?`<details class="cloud-edit"><summary>공동 장소 추가</summary>${placeForm()}</details>`:''}</section>
      <section class="panel stack"><h2>친구별 의견과 메모</h2>
        ${writable?form('opinion',`<label>내 의견<textarea name="memo" rows="3" maxlength="1500">${esc(opinions[uid]?.memo||'')}</textarea></label>
        <div class="row">${submit('내 의견 저장')}${opinions[uid]?action('remove-opinion','내 의견 삭제'):''}</div>`):''}
        ${opinionRows?`<ul class="cloud-list">${opinionRows}</ul>`:'<p>남겨진 의견이 없습니다.</p>'}</section></div></div>`);
  }
  function privacyPage(){
    return page('PRIVACY','개인정보 처리방침','여행 사이트가 저장하는 정보와 삭제 방법입니다.',`<section class="panel stack links">
    <h2>계정 및 저장 데이터</h2><p>로그인은 Google 및 Firebase Authentication으로 처리됩니다. Firebase Authentication은 계정 식별자, 이메일, Google 이름과 프로필 사진 정보를 처리합니다. 사이트는 Google 비밀번호를 수집하지 않습니다. Google 프로필 사진은 로그인 메뉴와 프로필에 개인용으로 표시됩니다.</p>
    <p>Cloud Firestore에는 사용자 ID로 연결된 닉네임과 관심 여행지·관광지, 예산, 일정, 준비물, 메모 등이 저장됩니다. 로그인 없이 입력한 개인 계획은 이 브라우저에 저장됩니다.</p>
    <h2>그룹에서 공유되는 정보</h2><p>가입한 그룹의 구성원은 내 닉네임, 투표, 의견 및 공동 경비 내역을 볼 수 있습니다. 그룹 후보, 일정, 예산은 구성원끼리 공유되며 개인정보를 입력하지 않는 것을 권장합니다. 초대 링크나 코드가 전달된 경우 해당 정보를 가진 로그인 사용자가 참여할 수 있습니다.</p>
    <h2>보관과 삭제</h2><p>계정 정보와 개인 계획은 이용자가 삭제하거나 가입을 유지하는 동안 보관됩니다. <a href="#settings">설정</a>에서 Google 재인증 후 계정과 개인 데이터를 삭제할 수 있습니다. 그룹 탈퇴 시 자신의 투표, 의견 및 공동 경비도 삭제됩니다. 여러 사람이 편집한 후보·공동 일정과 공유 예산은 그룹 기록으로 남을 수 있으므로 직접 입력한 개인정보는 탈퇴 전에 수정하거나 지워 주세요.</p>
    <p>비로그인 데이터는 브라우저의 사이트 데이터 삭제 기능으로 지울 수 있습니다. 다른 사람에게 보낸 파일과 텍스트는 수신자가 별도로 관리합니다.</p>
    <h2>서비스 제공자 및 문의</h2><p>Google Firebase를 인증과 호스팅 및 데이터 저장에 사용합니다. 정보 처리 또는 삭제 지원이 필요하면 이 사이트를 전달한 여행 그룹 운영자에게 문의하세요. ${'<a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase 개인정보 및 보안 안내 ↗</a>'}</p></section>`);
  }

  function cloudPage(route,arg){
    if(route==='groups')return groupsPage();
    if(route==='group')return groupPage(arg);
    if(route==='join')return joinPage(arg);
    if(route==='privacy')return privacyPage();
    return profilePage(route==='settings');
  }

  async function run(work,label=''){
    if(!client||busy)return;
    busy=true;error='';
    const controls=[...document.querySelectorAll('button[data-cloud-action]:enabled, form[data-cloud-form] button:enabled, form[data-cloud-form="travel"] input:enabled')];
    for(const control of controls)control.disabled=true;
    main.setAttribute('aria-busy','true');
    try{
      await work();
      if(success[label])notify(success[label]);
    }catch(e){error=explain(e);notify(error);}
    finally{
      busy=false;
      for(const control of controls)control.disabled=false;
      main.removeAttribute('aria-busy');
      updateView();
    }
  }
  function onSubmit(e){
    const target=e.target;
    const name=target.dataset?.cloudForm;
    if(!name)return false;
    e.preventDefault();
    const data=Object.fromEntries(new FormData(target));
    if(name==='travel')delete target.dataset.travelDraft;
    const gid=view.arg,id=target.dataset.item,expected=Number(target.dataset.revision);
    const commands={
      nickname:()=>client.nickname(data.nickname),
      create:async()=>go('group/'+await client.createGroup(data.name)),
      join:async()=>go('group/'+await client.joinGroup(data.code)),
      candidate:()=>client.addCandidate(gid,data.destination),
      rename:()=>client.rename(gid,data.name),
      date:()=>client.addDate(gid,data.date),
      task:()=>client.addTask(gid,data.title),
      place:()=>client.setPlace(gid,id,data,expected),
      opinion:()=>client.opinion(gid,data.memo),
      schedule:()=>client.setSchedule(gid,id,data,expected),
      'vote-days':()=>client.vote(gid,{days:tripDays(data.days,0)}),
      travel:()=>saveGroupTravel(data),
      'group-template':()=>{
        const match=data.template?.match(/^(.+)-([01])$/);
        const lines=match&&catalogue().find(d=>d.id===match[1])?.itineraries?.[Number(match[2])];
        if(!lines)throw new TripError('공동 일정 템플릿을 선택해 주세요.');
        return client.addTemplate(gid,data.template,lines,groupTravel());
      },
      budget:()=>client.setBudget(gid,data,expected),
      expense:()=>client.expense(gid,data)
    };
    if(Object.hasOwn(commands,name)) void run(async()=>{await commands[name]();if(!id&&['schedule','expense','date','task','place'].includes(name))target.reset();},name);
    return true;
  }
  async function saveGroupTravel(input) {
    const before=groupTravel();
    const next=travelSettings(input);
    if(!next)throw new TripError('출국일, 귀국일과 여행 일수를 확인해 주세요.');
    if(next.days<before.days&&Object.values(shared.schedule).some(item=>item.day>next.days)&&
      !confirm('기간 밖 공동 일정은 보관되고 다시 늘리면 표시됩니다. 기간을 줄일까요?'))return;
    await client.setTravel(view.arg,next,before);
  }
  main.addEventListener('input',event=>{
    const input=event.target, form=input.form;
    if(form?.dataset.cloudForm!=='travel'||input.type!=='date')return;
    form.dataset.travelDraft='';
    if(input.name==='departure')form.elements.returnDate.value=dateAfter(input.value,groupTravel().days-1);
  });
  main.addEventListener('change',event=>{
    const input=event.target;
    if(input.form?.dataset.cloudForm!=='travel'||input.name!=='days')return;
    const previous=groupTravel();
    const values={...previous,[input.name]:input.value};
    input.blur();
    void run(()=>saveGroupTravel(values),'travel');
  });
  function onClick(e){
    const step=e.target.closest?.('[data-group-duration] [data-duration-step]');
    if(step){
      if(!step.form?.hasAttribute('data-travel-draft'))document.activeElement?.blur();
      const current=groupTravel();
      void run(()=>saveGroupTravel({...current,days:current.days+Number(step.dataset.durationStep)}),'travel');
      return true;
    }
    const control=e.target.closest?.('[data-cloud-action]');
    if(!control)return false;
    const name=control.dataset.cloudAction,gid=view.arg,id=control.dataset.item;
    const confirmation=message=>confirm(message);
    const commands={
      signin:()=>client.signIn(),logout:()=>client.logout(),retry:()=>client.retry(),'retry-group':()=>{error='';clearSubscription();subscribe();},flush:()=>client.flush(),
      invite:()=>{const url=new URL(location.href);url.hash='join/'+shared.group.inviteCode;return copy(url.href);},
      code:()=>copy(shared.group.inviteCode),
      rotate:()=>confirmation('기존 초대 링크와 코드가 무효화됩니다. 새 코드를 발급할까요?')&&client.rotateInvite(gid),
      'vote-destination':()=>client.vote(gid,{destination:shared.votes[account.user.uid]?.destination===id?'':id}),
      'rate-destination':()=>client.vote(gid,{},{id,value:Number(control.dataset.next)}),
      'vote-date':()=>client.vote(gid,{date:shared.votes[account.user.uid]?.date===id?'':id}),
      'remove-date':()=>confirmation('이 출발 날짜 후보를 삭제할까요?')&&client.removeDate(gid,id),
      'toggle-task':()=>client.toggleTask(gid,id,shared.checklist[id]),
      'remove-task':()=>confirmation('이 준비 항목을 삭제할까요?')&&client.removeTask(gid,id,Number(control.dataset.revision)),
      'remove-opinion':()=>client.opinion(gid,''),
      'remove-place':()=>confirmation('이 공동 장소를 삭제할까요?')&&client.removePlace(gid,id,Number(control.dataset.revision)),
      'vote-days':()=>client.vote(gid,{days:shared.votes[account.user.uid]?.days===Number(id)?0:Number(id)}),
      'remove-candidate':()=>confirmation('이 여행지 후보를 삭제할까요?')&&client.removeCandidate(gid,id),
      'remove-schedule':()=>confirmation('이 공동 일정 항목을 삭제할까요?')&&client.removeSchedule(gid,id,Number(control.dataset.revision)),
      'remove-expense':()=>confirmation('이 경비 항목을 삭제할까요?')&&client.expense(gid,null,id),
      'personal-budget':()=>{const input=control.form.elements.total;input.value=Math.min(1e8,Math.round(calculate(getState().budget).total))||'';input.focus();},
      role:()=>client.role(gid,id,control.dataset.next),
      transfer:()=>confirmation('선택한 구성원에게 그룹 소유권을 넘길까요?')&&client.transfer(gid,id),
      leave:async()=>{if(confirmation('그룹에서 나가면 내 투표, 의견과 경비가 삭제되고 정산 금액이 달라집니다. 나갈까요?')){await client.leaveGroup(gid);go('groups');}},
      'close-group':async()=>{if(confirmation('이 그룹과 공유 일정, 후보, 예산 및 내 경비를 영구 삭제할까요?')){await client.closeGroup(gid);go('groups');}},
      erase:async()=>{if(confirmation('Google 재인증을 시작하고 계정과 개인정보를 삭제할까요?')){await client.eraseAccount();go('home');}},
      'merge-guest':()=>{if(confirmation('이 주소의 게스트 데이터를 가져올까요? 이미 있는 계정 항목은 유지됩니다.'))return client.importGuest(guestState());}
    };
    if(name==='retry'&&!client)void init();
    else if(Object.hasOwn(commands,name))void run(commands[name],name);
    return true;
  }
  header?.addEventListener('click',onClick);
  main.addEventListener('focusout',()=>{if(deferred)setTimeout(updateView,0);});
  const init=async()=>{
    headerState();
    try{
      const module=await import('./cloud.js');
      explain=module.explain;
      client=await module.startCloud({
        account:changed,
        personal:state=>{sessionChanged(state);updateView();},
        error:text=>{error=text;notify(text);}
      });
      subscribe();headerState();
    }catch(e){changed({mode:'error',error:explain(e)});}
  };
  return {
    init,routeChanged,onClick,onSubmit,hasRoute:route=>cloudRoutes.has(route),cloudPage,
    locked:()=>Boolean(account.user&&account.mode!=='ready'),
    identity:()=>account.user?.uid||null,
    storageText:()=>account.user?'Google 계정에 저장됩니다.':'이 브라우저에 저장됩니다.',
    savePersonal:(state)=>{
      if(!account.user)return false;
      try{client.savePersonal(state);}catch(e){notify(explain(e));}
      return true;
    }
  };
}
