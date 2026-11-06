import {createClient} from '@supabase/supabase-js';

export const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export const fail=(message,status=400)=>json({error:message},status);
export function adminClient(){
  const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase service role key не настроен в Netlify');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function identity(req,db){
  const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)throw Object.assign(new Error('Войдите в аккаунт'),{status:401});
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw Object.assign(new Error('Сессия недействительна'),{status:401});
  return data.user;
}
export async function staffRole(db,userId){
  const {data,error}=await db.from('staff_roles').select('role').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  return data?.role||'participant';
}
export function requireSameOrigin(req){
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)throw Object.assign(new Error('Запрос с другого сайта запрещён'),{status:403});
}

