// Real Chrome audits of the production initial page. No speech/HR energy claims.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const toolRoot=process.env.MEASURE_TOOLS_DIR || join(root,'measurements/private/audit-tools');
const out=resolve(process.env.MEASURE_AUDIT_OUT || join(root,'measurements/private/lighthouse'));
await mkdir(out,{recursive:true});
const cli=join(toolRoot,'node_modules/lighthouse/cli/index.js');
const version=JSON.parse(await readFile(join(toolRoot,'node_modules/lighthouse/package.json'),'utf8')).version;
if(version!=='13.6.0')throw Error('Use pinned Lighthouse 13.6.0 for this experiment.');
const server=spawn(process.execPath,['scripts/measure-server.mjs'],{cwd:root,stdio:['ignore','pipe','inherit'],env:{...process.env,MEASURE_BOOTSTRAP:'0',PORT:'4173',HOST:'127.0.0.1'}});
server.stdout.on('data',chunk=>process.stdout.write(chunk));
let serverError;
server.on('error',error=>{serverError=error;});
const reports=[];
try {
  const deadline=Date.now()+20000;
  while(true){
    if(serverError)throw serverError;
    if(server.exitCode!==null)throw Error('Audit server exited.');
    try{if((await fetch('http://127.0.0.1:4173/')).ok)break;}catch{}
    if(Date.now()>deadline)throw Error('Production audit server not ready.');
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  for(const profile of ['mobile','desktop'])for(let run=1;run<=3;run++){
    const prefix=join(out,`${profile}-${run}`);
    const args=[cli,'http://127.0.0.1:4173/','--chrome-flags=--headless --disable-dev-shm-usage',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json','--output=html',`--output-path=${prefix}`,'--quiet'];
    if(profile==='desktop')args.push('--preset=desktop');
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});
      const timeout=setTimeout(()=>{child.kill();reject(Error('Lighthouse timed out'));},150000);
      child.on('error',error=>{clearTimeout(timeout);reject(error);});
      child.on('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(Error(`Lighthouse exited ${code}`));});
    });
    const lhr=JSON.parse(await readFile(prefix+'.report.json','utf8'));
    if(lhr.runtimeError)throw Error(JSON.stringify(lhr.runtimeError));
    reports.push({profile,run,fetchTime:lhr.fetchTime,lighthouseVersion:lhr.lighthouseVersion,
      userAgent:lhr.userAgent,environment:lhr.environment,settings:lhr.configSettings,
      scores:Object.fromEntries(Object.entries(lhr.categories).map(([key,value])=>[key,value.score===null?null:Math.round(value.score*100)])),
      metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index','total-byte-weight'].map(key=>[key,lhr.audits[key]?.numericValue??null])),
      warnings:lhr.runWarnings,
      failures:Object.values(lhr.audits).filter(a=>a.score!==null && a.score<1 && a.scoreDisplayMode!=='informative').map(a=>({id:a.id,title:a.title,score:a.score,displayValue:a.displayValue})),
      json:`${profile}-${run}.report.json`,html:`${profile}-${run}.report.html`});
    console.log(`Completed ${profile} audit ${run}/3`);
  }
  const median=values=>{if(values.some(x=>x===null))return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[1];};
  const medians=Object.fromEntries(['mobile','desktop'].map(profile=>{
    const group=reports.filter(r=>r.profile===profile);
    return [profile,{scores:Object.fromEntries(Object.keys(group[0].scores).map(key=>[key,median(group.map(r=>r.scores[key]))])),
      metrics:Object.fromEntries(Object.keys(group[0].metrics).map(key=>[key,median(group.map(r=>r.metrics[key]))]))}];
  }));
  const result={createdAt:new Date().toISOString(),sourceCommit:process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    scope:'Production initial candidate page on loopback, gzip static assets; no applicant interaction, authentication, ASR, database or public hosting measurement.',
    lighthouseVersion:version,nodeVersion:process.version,platform:process.platform,
    chromeVersion:process.env.CHROME_PATH?execFileSync(process.env.CHROME_PATH,['--version'],{encoding:'utf8'}).trim():null,
    runnerImage:process.env.ImageVersion||null,medians,reports};
  await writeFile(join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');
  console.log('LIGHTHOUSE_SUMMARY_BEGIN');console.log(JSON.stringify(result));console.log('LIGHTHOUSE_SUMMARY_END');
}finally{server.kill();}
