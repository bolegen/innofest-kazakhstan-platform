import {adminClient,identity,staffRole,requireSameOrigin,json,fail} from '../lib/shared.mjs';
import {analyzeProject} from '../lib/analysis-core.mjs';

export default async function handler(req){
  if(req.method!=='POST')return fail('Метод не поддерживается',405);
  try{
    requireSameOrigin(req);
    const db=adminClient(),user=await identity(req,db);
    const body=await req.json();
    if(!/^[0-9a-f-]{36}$/i.test(String(body.submission_id||'')))return fail('Неверный ID заявки');
    const {data:project,error}=await db.from('submissions').select('*').eq('id',body.submission_id).single();
    if(error||!project)return fail('Заявка не найдена',404);
    const role=await staffRole(db,user.id);
    if(project.owner_id!==user.id&&role!=='admin'&&role!=='expert')return fail('Нет доступа',403);
    const {data:archive,error:archiveError}=await db.from('archive_projects').select('id,year,title,summary,category,place,source_url').order('year',{ascending:false});
    if(archiveError)throw archiveError;
    const analysis=await analyzeProject(project,archive||[]);
    const {error:updateError}=await db.from('submissions').update({analysis,status:'analyzed'}).eq('id',project.id);
    if(updateError)throw updateError;
    return json({analysis});
  }catch(e){console.error(e);return fail(String(e.message||e).slice(0,180),e.status||500)}
}

