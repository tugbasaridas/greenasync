// Local production-build measurement harness. Not a production deployment server.
import { createServer, request } from 'node:http';
import { readFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'frontend/dist');
const logDir = resolve(process.env.MEASURE_LOG_DIR || join(root, 'measurements/private/ui'));
await mkdir(logDir, { recursive: true });
let backend;
const syntheticPassword=randomBytes(32).toString('base64url');
if (process.env.MEASURE_BOOTSTRAP === '1') {
  backend=spawn(process.execPath,['backend/dist/main.js'],{cwd:root,stdio:['ignore','ignore','inherit'],env:{...process.env,PORT:'3000',DATA_DIR:join(root,'measurements/private/ui-db'),UPLOAD_DIR:join(root,'measurements/private/ui-audio'),HR_PASSWORD:syntheticPassword}});
  process.on('exit',()=>backend.kill());
  const deadline=Date.now()+30000;
  while (true) {
    try { if ((await fetch('http://127.0.0.1:3000/api/health')).ok) break; } catch {}
    if(Date.now()>deadline)throw Error('Measurement backend not reachable');
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  try { await stat(join(logDir,'seed.json')); }
  catch {
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['scripts/measure-seed.mjs'],{cwd:root,stdio:'inherit',env:process.env});
      child.on('exit',code=>code===0?resolve():reject(Error('Seed failed')));
    });
  }
}
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
const baseline = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kontrollü video örneği</title><h1>Sentetik video karşılaştırması</h1><p>77 saniyelik aynı yanıt. Bu sayfa ticari mülakat ürünü değildir.</p><button id="load">Videoyu yükle</button><p id="status"></p><video controls preload="none" width="640"></video><script>let url; document.querySelector('#load').onclick=async()=>{if(!url){const r=await fetch('/benchmark/video.mp4',{cache:'no-store'});if(!r.ok)throw Error('video');url=URL.createObjectURL(await r.blob());document.querySelector('video').src=url;}document.querySelector('#status').textContent='Video yüklendi';};</script></html>`;
const server = createServer(async (req, res) => {
  let phase = 'unmarked';
  try { phase = (await readFile(join(logDir, 'phase.txt'), 'utf8')).trim(); } catch {}
  const pathname = new URL(req.url, 'http://local').pathname;
  let responseBodyBytes = 0;
  const write = res.write.bind(res), end = res.end.bind(res);
  const size = (chunk, encoding) => typeof chunk === 'string' ? Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : undefined) : chunk?.byteLength || 0;
  res.write = (chunk, encoding, callback) => { responseBodyBytes += size(chunk, encoding); return write(chunk, encoding, callback); };
  res.end = (chunk, encoding, callback) => { responseBodyBytes += size(chunk, encoding); return end(chunk, encoding, callback); };
  res.on('finish', () => {
    const route = pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
    void appendFile(join(logDir, 'responses.jsonl'), JSON.stringify({ at:new Date().toISOString(), phase, method:req.method, route, status:res.statusCode, responseBodyBytes })+'\n');
  });
  // Synthetic-only test fixture: use the normal login API server-side.
  // Never enable this harness against a real applicant database or public host.
  if (pathname === '/benchmark/start-hr' && process.env.MEASURE_BOOTSTRAP === '1') {
    const login=await fetch('http://127.0.0.1:3000/api/hr/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'ik',password:syntheticPassword})});
    if(!login.ok){res.writeHead(502);res.end('Synthetic fixture login failed');return;}
    res.writeHead(303,{'Set-Cookie':login.headers.get('set-cookie'),'Location':'/'});res.end();return;
  }
  if (pathname.startsWith('/api/')) {
    const upstream = request({hostname:'127.0.0.1', port:process.env.MEASURE_BACKEND_PORT || 3000, path:req.url, method:req.method, headers:req.headers}, incoming => {
      res.writeHead(incoming.statusCode || 502, incoming.headers); incoming.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Backend unavailable'); });
    req.pipe(upstream); return;
  }
  try {
    let body, type;
    if (pathname === '/benchmark') { body=Buffer.from(baseline); type=mime['.html']; }
    else if (pathname === '/benchmark/video.mp4') { body=await readFile(join(root,'samples/synthetic-interview/yanit.mp4')); type=mime['.mp4']; }
    else {
      let path = resolve(dist, '.' + decodeURIComponent(pathname));
      if (path !== dist && !path.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
      try { if (!(await stat(path)).isFile()) path=join(dist,'index.html'); } catch { path=join(dist,'index.html'); }
      body=await readFile(path); type=mime[extname(path)] || 'application/octet-stream';
    }
    const headers={'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if (type.startsWith('text/') && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body=gzipSync(body); headers['Content-Encoding']='gzip'; headers.Vary='Accept-Encoding'; }
    headers['Content-Length']=body.length;
    res.writeHead(200,headers); res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Measurement harness error'); }
});
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => console.log(`Local: http://localhost:${server.address().port}`));
