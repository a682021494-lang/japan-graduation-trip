import { chromium, devices } from 'playwright';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const legacy=process.env.TRIP_QA_LEGACY==='1';
const entry='http://127.0.0.1:15500/?emulator=1'+(legacy?'&legacy=1':'');
const suffix=Date.now().toString(36);
const users=['owner','friend'].map(key=>({sub:key+'-'+suffix,name:key==='owner'?'여행 테스트 소유자':'여행 테스트 친구',email:key+'-'+suffix+'@example.com',email_verified:true}));
// The official Auth emulator accepts mock Google credentials. This adapter is served only by the browser test.
const adapter=`
import { getAuth as emulatorAuth, GoogleAuthProvider as EmulatorGoogle, reauthenticateWithCredential, signInWithCredential } from 'firebase/auth';
const mockCredential=profile=>EmulatorGoogle.credential(JSON.stringify(profile));
export const testGoogleLogin=profile=>signInWithCredential(emulatorAuth(),mockCredential(profile));
export function reauthenticateWithPopup(user) {
  const provider=user.providerData.find(entry=>entry.providerId==='google.com');
  return reauthenticateWithCredential(user,mockCredential({sub:provider.uid,email:user.email,email_verified:true,name:user.displayName}));
}
`;

(async()=>{
  const sdk=(await readFile(new URL('../src/cloud-sdk.js',import.meta.url),'utf8')).replace('onAuthStateChanged, reauthenticateWithPopup,','onAuthStateChanged,');
  const {outputFiles}=await build({stdin:{contents:sdk+adapter,resolveDir:root},write:false,bundle:true,format:'esm',minify:true,target:'es2022'});
  const browser=await chromium.launch({executablePath:process.env.TRIP_CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-proxy-server']});
  const failures=[];
  try {
    async function context(options={}){
      const context=await browser.newContext(options);
      await context.route('**/cloud-sdk.js',route=>route.fulfill({body:outputFiles[0].text,contentType:'application/javascript'}));
      const page=await context.newPage();
      page.on('pageerror',err=>failures.push(err.message));
      page.setDefaultTimeout(12000);
      return page;
    }
    async function go(page,hash,h){
      await page.evaluate(value=>location.hash=value,hash);
      if(h)await page.getByRole('heading',{name:h,exact:true}).waitFor();
    }
    async function login(page,user){
      try {await page.getByRole('button',{name:'Google 로그인'}).first().waitFor();}
      catch (error) {
        console.log('Login gate',page.url(),await page.locator('body').innerText(),failures,await page.locator('#account').innerHTML());
        throw error;
      }
      await page.evaluate(async profile=>{const sdk=await import('/cloud-sdk.js');await sdk.testGoogleLogin(profile);},user);
      await go(page,'profile','내 프로필');
      await page.getByLabel('닉네임',{exact:true}).waitFor();
    }
    const owner=await context({viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});
    const mobile=await context(devices['iPhone 13']);
    await owner.goto(entry);
    await owner.getByRole('heading',{name:/우리의 첫 졸업여행/}).waitFor();
    assert((await owner.locator('a[href="#explore"]').count())>=1);
    for(const image of await owner.locator('main img').all()){
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img=>img.decode());
      assert(await image.evaluate(img=>img.naturalWidth>0));
    }
    assert(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await go(owner,'trip/tokyo','도쿄');
    const official=owner.locator('a[href^="https://"][rel="noopener noreferrer"]');
    assert(await official.count()>1);
    await login(owner,users[0]);
    await owner.getByLabel('닉네임',{exact:true}).fill('여행 소유자');
    await owner.getByRole('button',{name:'닉네임 저장'}).click();
    await owner.getByRole('heading',{name:'여행 소유자',exact:true}).waitFor();
    await go(owner,'trip/tokyo','도쿄');
    await owner.getByRole('button',{name:'♡ 여행지 찜하기'}).click();
    await owner.getByRole('button',{name:'♥ 찜한 여행지'}).waitFor();
    await go(owner,'saved','나의 여행 후보');
    await owner.getByLabel('개인 메모').fill('여권 확인');
    await go(owner,'prep','여행 준비물');
    await owner.locator('[data-check="0-0"]').check();
    await go(owner,'settings','설정');
    await owner.getByRole('button',{name:'동기화 재시도'}).click();
    await owner.getByText('동기화를 마쳤습니다.').waitFor();
    await owner.reload();
    await owner.getByRole('button',{name:'동기화 재시도'}).waitFor();
    const alternate=await context();
    await alternate.goto(entry);
    await login(alternate,users[0]);
    await go(alternate,'saved','나의 여행 후보');
    await alternate.getByRole('link',{name:'도쿄 →'}).waitFor();
    assert.equal(await alternate.getByLabel('개인 메모').inputValue(),'여권 확인');
    await go(alternate,'prep','여행 준비물');
    assert(await alternate.locator('[data-check="0-0"]').isChecked());

    await go(owner,'plan','여행 일정');
    await owner.getByLabel('여행 일수',{exact:true}).fill('8');
    await owner.getByLabel('여행 일수',{exact:true}).press('Tab');
    await owner.getByLabel('8일차 장소 추가').fill('장기 일정 동기화');
    await owner.locator('[data-add-stop="7"] button').click();
    await go(owner,'settings','설정');
    await owner.getByRole('button',{name:'동기화 재시도'}).click();
    await owner.getByText('동기화를 마쳤습니다.').waitFor();
    await go(alternate,'plan','여행 일정');
    await alternate.getByRole('link',{name:'장기 일정 동기화 ↗'}).waitFor();
    assert.equal(await alternate.getByLabel('여행 일수',{exact:true}).inputValue(),'8');

    if(!legacy){
      await go(owner,'saved','나의 여행 후보');
      await owner.context().setOffline(true);
      await owner.getByLabel('개인 메모').fill('오프라인에서 작성한 메모');
      await go(owner,'settings','설정');
      await owner.getByRole('button',{name:'동기화 재시도'}).click();
      await owner.getByText(/동기화가 끝나지 않았습니다/).first().waitFor();
      await owner.context().setOffline(false);
      await owner.getByRole('button',{name:'동기화 재시도'}).click();
      await owner.getByText('동기화를 마쳤습니다.').waitFor();
      await go(alternate,'saved','나의 여행 후보');
      await alternate.waitForFunction(()=>document.querySelector('[data-note="tokyo"]')?.value==='오프라인에서 작성한 메모');
      await alternate.locator('#account summary').click();
      await alternate.getByRole('button',{name:'로그아웃'}).click();
      await alternate.getByRole('button',{name:'Google 로그인'}).first().waitFor();
      await login(alternate,users[1]);
      await go(alternate,'saved','나의 여행 후보');
      assert.equal(await alternate.getByLabel('개인 메모').count(),0);
    }

    await go(owner,'groups','친구들과 여행');
    await owner.getByLabel('그룹 이름').fill('겨울 졸업여행 '+suffix);
    await owner.getByRole('button',{name:'그룹 만들기'}).click();
    await owner.getByRole('heading',{name:'겨울 졸업여행 '+suffix}).waitFor();
    await owner.getByRole('button',{name:'초대 링크 복사'}).click();
    const invite=await owner.evaluate(()=>navigator.clipboard.readText());
    assert.match(invite,/#join\/[A-F0-9]{32}$/);
    await mobile.goto(invite);
    await mobile.getByRole('heading',{name:'여행 그룹 초대'}).waitFor();
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await login(mobile,users[1]);
    await mobile.goto(invite);
    await mobile.getByRole('button',{name:'그룹 참여',exact:true}).click();
    await mobile.getByRole('heading',{name:'겨울 졸업여행 '+suffix}).waitFor();
    await owner.getByRole('heading',{name:'구성원 2명'}).waitFor();

    await owner.locator('select[name=destination]').selectOption('tokyo');
    await owner.getByRole('button',{name:'후보 추가',exact:true}).click();
    const tokyo=mobile.getByRole('listitem').filter({has:mobile.getByRole('link',{name:'도쿄',exact:true})});
    await tokyo.getByRole('button',{name:'투표',exact:true}).click();
    const votedDuration=legacy?'3박 4일':'5박 6일';
    const voteRow=page=>page.getByRole('listitem').filter({hasText:votedDuration});
    if(legacy)await voteRow(mobile).getByRole('button',{name:'투표',exact:true}).click();
    else{
      await mobile.getByLabel('희망 여행 일수').fill('6');
      await mobile.getByRole('button',{name:'기간 투표',exact:true}).click();
    }
    await voteRow(owner).getByText('1표').waitFor();
    await owner.getByRole('listitem').filter({has:owner.getByRole('link',{name:'도쿄',exact:true})}).getByText('1표').waitFor();
    await tokyo.getByRole('button',{name:'찬성 0',exact:true}).click();
    await owner.getByRole('button',{name:'찬성 1',exact:true}).waitFor();
    await tokyo.getByRole('button',{name:'반대 0',exact:true}).click();
    await owner.getByRole('button',{name:'반대 1',exact:true}).waitFor();

    await owner.getByText('그룹 이름 변경',{exact:true}).click();
    await owner.getByLabel('새 그룹 이름',{exact:true}).fill('졸업여행 수정 '+suffix);
    await owner.getByRole('button',{name:'이름 저장',exact:true}).click();
    await mobile.getByRole('heading',{name:'졸업여행 수정 '+suffix,exact:true}).waitFor();

    await owner.getByLabel('출발 날짜',{exact:true}).fill('2027-02-06');
    await owner.getByRole('button',{name:'날짜 후보 추가',exact:true}).click();
    await mobile.getByRole('button',{name:'날짜 투표',exact:true}).click();
    await owner.getByRole('listitem').filter({hasText:'2027-02-06'}).getByText('1표',{exact:true}).waitFor();

    await owner.getByLabel('준비 항목',{exact:true}).fill('공항 이동 차량 확인');
    await owner.getByRole('button',{name:'준비 항목 추가',exact:true}).click();
    await mobile.getByRole('listitem').filter({hasText:'공항 이동 차량 확인'}).getByRole('button',{name:'완료',exact:true}).click();
    await owner.getByRole('listitem').filter({hasText:'공항 이동 차량 확인'}).getByRole('button',{name:'완료 취소',exact:true}).waitFor();

    await mobile.getByLabel('내 의견',{exact:true}).fill('오전 출발이 좋아요');
    await mobile.getByRole('button',{name:'내 의견 저장',exact:true}).click();
    await owner.getByText('오전 출발이 좋아요',{exact:true}).waitFor();

    await mobile.getByText('공동 장소 추가',{exact:true}).click();
    await mobile.locator('select[name=kind]').filter({visible:true}).selectOption('food');
    await mobile.getByLabel('장소 이름',{exact:true}).filter({visible:true}).fill('우에노 라멘');
    await mobile.getByLabel('장소 메모',{exact:true}).filter({visible:true}).fill('저녁 후보');
    await mobile.getByRole('button',{name:'장소 추가',exact:true}).click();
    await owner.getByText('맛집 · 우에노 라멘',{exact:true}).waitFor();
    assert.equal(await owner.locator('#group-attractions option[value="우에노 라멘"]').count(),1);



    if(!legacy){
      await owner.getByRole('button',{name:'여행 기간 하루 늘리기'}).click();
      await mobile.getByRole('heading',{name:'4일차',exact:true}).waitFor();
      await owner.getByLabel('출국일',{exact:true}).fill('2027-02-06');
      await owner.getByLabel('출국일',{exact:true}).press('Tab');
      await mobile.getByRole('heading',{name:'4일차 2027-02-09',exact:true}).waitFor();
    }else assert.equal(await owner.getByRole('heading',{name:'그룹 여행 기간'}).count(),0);
    await owner.locator('summary').getByText('일정 추가',{exact:true}).click();
    await owner.getByLabel('일정 이름').fill('우에노 박물관');
    await owner.getByRole('button',{name:'일정 추가',exact:true}).click();
    await mobile.getByText('1일차 · 09:00 · 우에노 박물관').waitFor();
    await mobile.getByText('1일차 · 09:00 · 우에노 박물관').click();
    await mobile.getByLabel('일정 이름',{exact:true}).filter({visible:true}).fill('도쿄역 산책');
    await mobile.getByRole('button',{name:'변경 저장'}).click();
    await owner.getByText('1일차 · 09:00 · 도쿄역 산책').waitFor();

    await owner.getByText('예산 수정',{exact:true}).click();
    await owner.getByLabel(legacy?'그룹 전체 예산 (원)':'그룹 고정비 (원)',{exact:true}).fill('500000');
    if(!legacy)await owner.getByLabel('그룹 1박 숙박비 (원)').fill('10000');
    await owner.getByRole('button',{name:'그룹 예산 저장'}).click();
    await mobile.getByText(legacy?'₩500,000':'₩530,000',{exact:true}).waitFor();
    assert.equal(await mobile.getByText(legacy?'₩250,000':'₩265,000',{exact:true}).count(),2);
    if(!legacy){
      await owner.getByRole('button',{name:'여행 기간 하루 늘리기'}).click();
      await mobile.getByText('₩540,000',{exact:true}).waitFor();
    }
    await mobile.getByLabel('내가 낸 경비 내역').fill('숙박비');
    await mobile.getByLabel('금액 (원)',{exact:true}).fill('20000');
    await mobile.getByRole('button',{name:'공동 경비 추가'}).click();
    await owner.getByText(/여행 소유자 → 여행 테스트 친구/).waitFor();
    await owner.getByText('₩10,000',{exact:true}).waitFor();
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    await owner.getByRole('button',{name:'관리자로 지정'}).click();
    await mobile.getByRole('button',{name:'초대 코드 갱신'}).waitFor();
    await mobile.locator('#account summary').click();
    await mobile.getByRole('button',{name:'로그아웃'}).click();
    await mobile.getByRole('button',{name:'Google 로그인'}).first().waitFor();
    await login(mobile,users[1]);
    await go(mobile,'settings','설정');
    mobile.on('dialog',d=>d.accept());
    await mobile.getByRole('button',{name:'회원 탈퇴 및 데이터 삭제'}).click();
    await mobile.getByRole('heading',{name:/우리의 첫 졸업여행/}).waitFor();
    await owner.getByRole('heading',{name:'구성원 1명'}).waitFor();
    if(legacy)await voteRow(owner).getByText('0표').waitFor();
    else await voteRow(owner).waitFor({state:'hidden'});
    await owner.getByText('남겨진 의견이 없습니다.',{exact:true}).waitFor();

    await go(owner,'settings','설정');
    owner.on('dialog',d=>d.accept());
    await owner.getByRole('button',{name:'회원 탈퇴 및 데이터 삭제'}).click();
    await owner.getByRole('heading',{name:/우리의 첫 졸업여행/}).waitFor();
    await owner.getByRole('button',{name:'Google 로그인'}).waitFor();
    assert.deepEqual(failures,[]);
    console.log('Chromium PC·모바일 에뮬레이션 통과: 게스트 자산, 테스트 로그인 및 유지, 다른 세션 개인 데이터, 초대, 실시간 투표·일정·예산, 공동 경비, 관리자 지정, 로그아웃·탈퇴');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
