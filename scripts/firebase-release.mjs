// CI-only. Credentials, identities, OAuth tokens and upstream response bodies are never logged.
import { readFile, writeFile } from 'node:fs/promises';
import { GoogleAuth } from 'google-auth-library';

const [action, path] = process.argv.slice(2);
const project = 'japan-graduation-trip-2027';
const root = 'https://firebaserules.googleapis.com/v1/';
const projectPath = 'projects/'+project;
const expected = await readFile('firestore.rules','utf8');

function candidate(label, json) {
  if(!json)return null;
  try {
    const credentials=JSON.parse(json);
    if(credentials.type!=='service_account'||!credentials.client_email||!credentials.private_key||credentials.project_id!==project){
      console.log(label+': expected a service account from '+project);
      return null;
    }
    return {label,credentials};
  } catch {
    console.log(label+': invalid credential format');
    return null;
  }
}

const hosting=candidate('Existing Hosting secret',process.env.HOSTING_CREDENTIAL);
const dedicated=candidate('Dedicated rules secret',process.env.RULES_CREDENTIAL);
if(hosting&&dedicated)console.log('Secrets refer to '+(hosting.credentials.client_email===dedicated.credentials.client_email?'the same':'different')+' service accounts.');

async function currentRules(request) {
  const releasePath=projectPath+'/releases/cloud.firestore';
  const {data:release}=await request('GET',releasePath+'/(default)').catch(error=>{
    if(error.response?.status!==404)throw error;
    return request('GET',releasePath);
  });
  if(!release.rulesetName?.startsWith(projectPath+'/rulesets/'))throw new Error('Unexpected ruleset reference');
  const {data:ruleset}=await request('GET',release.rulesetName);
  const files=ruleset.source?.files||[];
  return files.length===1&&files[0].name==='firestore.rules'&&files[0].content===expected;
}

if(!['select','verify','check'].includes(action)||((action==='select'||action==='verify')&&!path))throw new Error('Invalid release command');
const credentials=action==='verify'?[candidate('Publishing credential',await readFile(path,'utf8'))]:[hosting,dedicated];
let success=false;
for(const account of credentials.filter(Boolean)){
  try {
    const client=await new GoogleAuth({credentials:account.credentials,scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
    const request=(method,resource,data)=>client.request({method,url:root+resource,data,timeout:12000,retry:false});
    if(action==='select'){
      const {data}=await request('POST',projectPath+':test',{source:{files:[{name:'firestore.rules',content:expected}]}});
      if(data.issues?.some(issue=>issue.severity==='ERROR'))throw new Error('Rules validation failed');
      await currentRules(request);
      await writeFile(path,JSON.stringify(account.credentials),{mode:0o600});
      console.log(account.label+': target-project rule test and release read permitted.');
    }else{
      if(!await currentRules(request)){
        console.log(account.label+': published Firestore rules differ from this checkout.');
        continue;
      }
      console.log(account.label+': published default Firestore rules exactly match this checkout.');
    }
    success=true;
    break;
  } catch(error) {
    const status=error.response?.status;
    console.log(account.label+': '+(Number.isInteger(status)?'Firebase API HTTP '+status:'credential, connection or rule validation failed')+'.');
  }
}
if(action==='check'){
  if(!process.env.GITHUB_OUTPUT)throw new Error('GITHUB_OUTPUT is required');
  await writeFile(process.env.GITHUB_OUTPUT,'extended='+success+'\n',{flag:'a'});
}else if(!success)process.exitCode=1;
