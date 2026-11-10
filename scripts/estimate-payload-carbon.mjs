// A model estimate for hypothetical internet payloads, never a power-meter reading.
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { pathToFileURL,fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const tools=process.env.MEASURE_TOOLS_DIR || join(root,'measurements/private/audit-tools');
const {co2}=await import(pathToFileURL(join(tools,'node_modules/@tgwf/co2/dist/esm/index.js')));
const version=JSON.parse(await readFile(join(tools,'node_modules/@tgwf/co2/package.json'),'utf8')).version;
const directory=resolve(process.argv[2] || join(root,'docs/measurements/results/ui-2026-11-10'));
const {medians}=JSON.parse(await readFile(join(directory,'ui-results.json'),'utf8'));
const model=new co2({model:'swd',version:4});
const inputs={text:medians.text_response_body_bytes,text_plus_audio:medians.text_plus_audio_body_bytes,video:medians.video_response_body_bytes};
const result={type:'MODEL_ESTIMATE_NOT_MEASURED_EMISSIONS',package:'@tgwf/co2',package_version:version,model:'SWD',model_version:4,
  assumptions:'Default global intensities; green hosting false; hypothetical internet delivery of selected payloads. Not the actual local test machine emissions.',
  exclusions:'Whisper computation, recording, initial upload, initial page assets, storage lifetime, model download, headers and transport overhead are not measured in these inputs.',
  source:'https://developers.thegreenwebfoundation.org/co2js/models/overview/',
  estimates:Object.fromEntries(Object.entries(inputs).map(([name,bytes])=>[name,model.perByteTrace(bytes,false)]))};
await writeFile(join(directory,'carbon-estimates.json'),JSON.stringify(result,null,2)+'\n');
console.log(Object.fromEntries(Object.entries(result.estimates).map(([key,value])=>[key,value.co2])));
