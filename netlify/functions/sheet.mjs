import {adminClient,identity,staffRole,requireSameOrigin,json,fail} from '../lib/shared.mjs';
import {analyzeProject} from '../lib/analysis-core.mjs';

function csv(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'&&text[i+1]==='"'){value+='"';i++}else if(c==='"')quoted=false;else value+=c}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(value);value=''}
    else if(c==='\n'){row.push(value.replace(/\r$/,''));rows.push(row);row=[];value=''}
    else value+=c;
  }
  if(row.length||value){row.push(value);rows.push(row)}
  return rows;
}
function sheetUrl(raw){
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||!u.pathname.startsWith('/spreadsheets/d/'))throw new Error('Нужна ссылка на Google Sheets с доступом для чтения');
  const id=u.pathname.match(/^\/spreadsheets\/d\/([^/]+)/)?.[1];
  if(!id)throw new Error('Неверная ссылка Google Sheets');
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(u.searchParams.get('gid')||'0')}`;
}
const column=(o,names)=>{for(const n of names){const key=Object.keys(o).find(x=>x.includes(n));if(key&&o[key])return o[key]}return ''};

export default async function handler(req){
  if(req.method!=='POST')return fail('Метод не поддерживается',405);
  try{
    requireSameOrigin(req);
    const db=adminClient(),user=await identity(req,db);
    if((await staffRole(db,user.id))!=='admin')return fail('Нужны права администратора',403);
    const body=await req.json();
    if(body.action==='process'){
      const {data:project,error}=await db.from('submissions').select('*').eq('source','sheet').is('analysis',null).order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(error)throw error;
      if(!project)return json({done:true});
      const {data:archive,error:archiveError}=await db.from('archive_projects').select('id,year,title,summary,category,place,source_url');
      if(archiveError)throw archiveError;
      const analysis=await analyzeProject(project,archive||[]);
      const {error:updateError}=await db.from('submissions').update({analysis,status:'analyzed'}).eq('id',project.id);
      if(updateError)throw updateError;
      return json({done:false,id:project.id,title:project.title,analysis});
    }
    if(body.action!=='import')return fail('Неверное действие');
    const target=sheetUrl(String(body.url||'').trim());
    const response=await fetch(target,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)return fail('Google Sheets вернул HTTP '+response.status);
    const raw=await response.text();
    if(raw.length>1_000_000)return fail('Таблица слишком большая');
    const rows=csv(raw);if(rows.length<2)return fail('В таблице нет заявок');
    const headers=rows.shift().map(x=>x.toLowerCase()),records=[];
    for(let i=0;i<Math.min(rows.length,500);i++){
      const obj=Object.fromEntries(headers.map((x,j)=>[x,rows[i][j]||'']));
      const title=String(column(obj,['назван','жоба ата','project title','title'])).trim().slice(0,180);
      const concept=String(column(obj,['описан','концеп','сипат','идея','description','concept'])).trim().slice(0,12000);
      if(title.length<3||concept.length<30)continue;
      records.push({title,concept,category:String(column(obj,['направ','секци','катег','category'])||'Без направления').slice(0,80),user_email:String(column(obj,['email','почта','электрон'])).slice(0,200),source:'sheet',source_key:`sheet:${target}:${i+2}`,status:'pending'});
    }
    if(!records.length)return fail('Не найдены столбцы «Название» и «Описание»');
    const {error}=await db.from('submissions').upsert(records,{onConflict:'source_key',ignoreDuplicates:true});
    if(error)throw error;
    return json({imported:records.length,total:rows.length});
  }catch(e){console.error(e);return fail(String(e.message||e).slice(0,180),e.status||500)}
}

