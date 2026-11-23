import './style.css';
import './theme.css';
import {initAppearance, applyTranslations} from './appearance.js';
import {teamBuilder} from './team-builder.js';
import organizations from './organizations.json';
import {supabase,configured,esc,sourceUrl,date,toast,unwrap,functionCall,fileText,fileMime} from './lib.js';

const screen=document.getElementById('screen'),menu=document.getElementById('menu'),account=document.getElementById('account');
let user=null,role='guest',profile=null,view='overview';
const uid=()=>user?.id||'';
const field=(name,label,type='text',required=true,extra='')=>`<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${required?'required':''} ${extra}></div>`;
const get=id=>document.getElementById(id);
const cities=Object.keys(organizations).sort((a,b)=>a.localeCompare(b,'ru'));
const cityOptions=(value='')=>'<option value="">Выберите город</option>'+cities.map(c=>`<option value="${esc(c)}" ${c===value?'selected':''}>${esc(c)}</option>`).join('')+'<option value="__other">Другой город</option>';
function organizationField(city='',value=''){return `<div class="field"><label for="city">Город</label><select id="city" required>${cityOptions(city)}</select></div><div class="field" id="otherCityWrap" hidden><label for="otherCity">Название города</label><input id="otherCity" maxlength="100"></div><div class="field"><label for="organization">Университет или колледж</label><select id="organization" required></select><p class="small muted">Не нашли организацию? Выберите «Другая организация» и введите название.</p></div><div class="field" id="otherOrgWrap" hidden><label for="otherOrg">Название организации</label><input id="otherOrg" maxlength="180"></div>`}
function wireOrganization(city='',value=''){const toggleOther=()=>{const other=get('organization').value==='__other';get('otherOrgWrap').hidden=!other;get('otherOrg').required=other;if(other&&value)get('otherOrg').value=value};const update=()=>{const otherCity=get('city').value==='__other';get('otherCityWrap').hidden=!otherCity;get('otherCity').required=otherCity;const entries=organizations[get('city').value]||[];get('organization').innerHTML='<option value="">Выберите организацию</option>'+entries.map(x=>`<option value="${esc(x.name)}" ${x.name===value?'selected':''}>${esc(x.name)} · ${x.type}</option>`).join('')+'<option value="__other">Другая организация</option>';if(otherCity||value&&!entries.some(x=>x.name===value))get('organization').value='__other';toggleOther()};get('city').onchange=()=>{value='';get('otherOrg').value='';update()};get('organization').onchange=()=>{value='';toggleOther()};update()}
const selectedCity=()=>get('city').value==='__other'?get('otherCity').value.trim():get('city').value;
const selectedOrganization=()=>get('organization').value==='__other'?get('otherOrg').value.trim():get('organization').value;
async function requireVerifiedEmail(){const {data,error}=await supabase.auth.getUser();if(error)throw error;if(role!=='participant')throw new Error('Подача заявки доступна только участнику');if(!data.user?.email_confirmed_at)throw new Error('Подтвердите email по ссылке из письма перед отправкой заявки. Ссылку можно отправить повторно в профиле.')}
async function myTeams(){return unwrap(await supabase.rpc('get_my_teams'))||[]}

const fmtStatus=s=>({pending:'Ожидает анализа',analyzed:'Анализ готов',needs_review:'На экспертизе',approved:'Одобрена',rejected:'Отклонена'})[s]||s;
function setBusy(form,busy){const b=form.querySelector('[type=submit]');if(b)b.disabled=busy}
async function run(form,fn){setBusy(form,true);try{await fn()}catch(e){toast(e.message||String(e),true)}finally{setBusy(form,false)}}
function nav(){const links=[['overview','Главная']];if(user){links.push(['dashboard','Дашборд']);if(role==='participant')links.push(['teams','Команды'],['builder','Биржа талантов'],['submit','Подать проект'],['applications','Мои заявки']);if(role==='expert')links.push(['review','Экспертиза']);if(role==='admin')links.push(['admin','Админ-панель'],['archive','Архив']);links.push(['profile','Профиль'])}else links.push(['login','Вход'],['register','Регистрация']);menu.innerHTML=links.map(([v,label])=>`<button data-nav="${v}" class="${view===v?'active':''}">${label}</button>`).join('');account.innerHTML=user?`<span class="email" title="${esc(user.email)}">${esc(user.email)}</span><button id="logout" class="btn small">Выйти</button>`:'';get('logout')?.addEventListener('click',async()=>{unwrap(await supabase.auth.signOut());location.hash='overview';await refreshAuth()});menu.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.nav;menu.classList.remove('open');get('menuToggle').setAttribute('aria-expanded','false')});applyTranslations()}
async function refreshAuth(){if(!configured){user=null;role='guest';profile=null;render();return}const {data:{user:u}}=await supabase.auth.getUser();user=u||null;role='guest';profile=null;if(user){const [p,r]=await Promise.all([supabase.from('profiles').select('*').eq('id',uid()).maybeSingle(),supabase.from('staff_roles').select('role').eq('user_id',uid()).maybeSingle()]);if(p.error)toast(p.error.message,true);profile=p.data;if(r.error)toast('Не удалось проверить роль пользователя',true);role=r.error?'unknown':r.data?.role||'participant'}render()}
function render(){view=(location.hash||'#overview').slice(1).split('?')[0]||'overview';const allowed=new Set(['overview','login','register','reset','dashboard','teams','builder','submit','applications','review','admin','archive','profile']);if(!allowed.has(view))view='overview';if(!user&&['dashboard','teams','builder','submit','applications','review','admin','archive','profile'].includes(view))view='login';if(user&&['login','register'].includes(view))view='profile';if(role!=='participant'&&['teams','builder','submit','applications'].includes(view))view='overview';if(role!=='admin'&&['admin','archive'].includes(view))view='overview';if(role!=='expert'&&view==='review')view='overview';nav();({overview,login,register,reset,dashboard,teams,builder:()=>teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast}),submit,applications,review,admin,archive,profile:profileView})[view]();applyTranslations()}
function overview(){screen.innerHTML=`<div class="hero"><div><span class="eyebrow">INNOFEST Kazakhstan · платформа проектов</span><h1>Технологии начинаются <em>с вашей идеи</em></h1><p>Соберите команду, представьте проект и получите экспертную оценку. Платформа поможет сравнить идею с архивом прошлых проектов.</p><div class="row"><button class="btn primary" data-go="${user?(role==='participant'?'submit':role==='expert'?'review':role==='admin'?'admin':'profile'):'register'}">${user?(role==='participant'?'Подать проект':role==='expert'?'Открыть экспертизу':role==='admin'?'Открыть админ-панель':'Профиль'):'Зарегистрироваться'}</button><button class="btn" data-go="${user?(role==='participant'?'applications':'dashboard'):'login'}">${user?(role==='participant'?'Мои заявки':'Дашборд'):'Войти в кабинет'}</button></div></div><div class="hero-aside"><div class="label">Путь проекта</div><div class="number">01—04</div><p>Команда · Заявка · Анализ · Экспертиза</p></div></div><div class="cards"><div class="card"><div class="label">Участникам</div><h3>Команда и заявка</h3><p>Создайте команду из 2–5 участников и подайте описание проекта с файлом PDF, DOCX, TXT или MD.</p></div><div class="card"><div class="label">Экспертам</div><h3>Объективная оценка</h3><p>Оценивайте содержание проекта по пяти критериям без сведений о составе команды.</p></div><div class="card"><div class="label">Организаторам</div><h3>Управление проектами</h3><p>Работайте с заявками, статистикой, экспертными ролями и архивом проектов.</p></div></div>`;screen.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>location.hash=b.dataset.go)}
function authShell(title,body){screen.innerHTML=`<section class="section auth-box"><div class="card"><span class="label">Аккаунт INNOFEST</span><h2>${title}</h2>${!configured?'<div class="notice error">Параметры Supabase не настроены.</div>':''}${body}</div></section>`}
function showEmailConfirmation(){
  const old=get('emailConfirmation');
  old?.remove();
  const overlay=document.createElement('div');
  overlay.id='emailConfirmation';
  overlay.className='dialog-overlay';
  overlay.innerHTML=`<div class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationText">
    <span class="dialog-icon" aria-hidden="true">✉</span>
    <h2 id="confirmationTitle">Подтвердите электронную почту</h2>
    <p id="confirmationText">Мы отправили письмо для подтверждения аккаунта. Откройте почту и перейдите по ссылке в письме. После этого войдите на сайт.</p>
    <p class="dialog-hint">Не видите письмо? Проверьте папку «Спам».</p>
    <button class="btn primary" type="button" id="closeConfirmation">Понятно</button>
  </div>`;
  document.getElementById('app').append(overlay);
  const close=()=>{overlay.remove();document.removeEventListener('keydown',onKey);get('email')?.focus()};
  const onKey=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',onKey);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('button').addEventListener('click',close);
  applyTranslations();
  overlay.querySelector('button').focus();
}
function login(){authShell('Вход',`<form id="authForm" class="form">${field('email','Электронная почта','email')}${field('password','Пароль','password')}<button class="btn primary" type="submit">Войти</button></form><p class="small">Нет аккаунта? <a href="#register">Зарегистрироваться</a> · <a href="#reset">Забыли пароль?</a></p>`);get('authForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{unwrap(await supabase.auth.signInWithPassword({email:get('email').value.trim(),password:get('password').value}));location.hash='overview';await refreshAuth()})}}
function register(){
  authShell('Регистрация',`<form id="authForm" class="form">
    ${field('full_name','Имя и фамилия')}
    ${field('email','Электронная почта','email')}
    ${field('password','Пароль (минимум 8 символов)','password',true,'minlength="8"')}
    ${field('passwordConfirm','Повторите пароль','password',true,'minlength="8"')}
    ${organizationField()}
    <button class="btn primary" type="submit">Зарегистрироваться</button></form>
    <p class="small">Уже зарегистрированы? <a href="#login">Войти</a></p>`);
  wireOrganization();
  get('authForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{
    if(get('password').value!==get('passwordConfirm').value)throw new Error('Пароли не совпадают');
    const data=unwrap(await supabase.auth.signUp({
      email:get('email').value.trim(),password:get('password').value,
      options:{emailRedirectTo:location.origin+'/#profile',data:{
        full_name:get('full_name').value.trim(),city:selectedCity(),
        organization:selectedOrganization()
      }}
    }));
    location.hash=data.session?'profile':'login';await refreshAuth();
    if(data.session)toast('Аккаунт создан');
    else showEmailConfirmation();
  })}
}
function reset(){authShell('Восстановление пароля',`<form id="authForm" class="form">${field('email','Электронная почта','email')}<button class="btn primary" type="submit">Отправить ссылку</button></form>`);get('authForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{unwrap(await supabase.auth.resetPasswordForEmail(get('email').value.trim(),{redirectTo:location.origin+'/#profile'}));toast('Если адрес зарегистрирован, письмо отправлено')})}}
function profileView(){
  screen.innerHTML=`<section class="section"><h2>Профиль</h2>
  <p class="lead">Ваш ID можно передать создателю команды для приглашения.</p>
  <div class="card form"><p><strong>${esc(profile?.full_name||user.email)}</strong></p>
  <p class="muted">${esc(user.email)} · ${esc(role==='admin'?'Администратор':role==='expert'?'Эксперт':'Участник')}</p>
  <div class="field"><label>ID аккаунта</label><input value="${esc(uid())}" readonly></div>
  <p class="small muted">${esc([profile?.city,profile?.organization].filter(Boolean).join(' · '))}</p>
  ${user.email_confirmed_at?'<div class="notice">Email подтверждён.</div>':'<div class="notice warn">Подтвердите email по ссылке из письма перед отправкой заявки.</div><button class="btn" id="resendEmail">Отправить письмо повторно</button>'}
  <button class="btn" id="changePassword">Сменить пароль</button></div></section>`;
  get('resendEmail')?.addEventListener('click',async()=>{try{unwrap(await supabase.auth.resend({type:'signup',email:user.email,options:{emailRedirectTo:location.origin+'/#profile'}}));toast('Письмо отправлено. Проверьте почту и папку «Спам».')}catch(e){toast(e.message,true)}});
  get('changePassword').onclick=async()=>{const password=prompt('Новый пароль (не менее 8 символов)');if(!password)return;if(password.length<8)return toast('Минимум 8 символов',true);try{unwrap(await supabase.auth.updateUser({password}));toast('Пароль изменён')}catch(e){toast(e.message,true)}}
}
async function dashboard(){
  screen.innerHTML='<section class="section"><h2>Дашборд</h2><p class="lead">Количество проектов, направления, статусы и описанные особенности.</p><div id="stats" class="list">Загрузка…</div></section>';
  const {data,error}=await supabase.rpc('get_dashboard_stats');
  if(error){get('stats').textContent=error.message;return}
  const statuses=data.by_status||[],categories=data.by_category||[];
  get('stats').innerHTML=`<div class="stats-grid"><div class="card"><div class="label">Проектов</div><div class="stat-value">${data.total||0}</div></div><div class="card"><div class="label">С особенностями</div><div class="stat-value">${data.with_features||0}</div></div></div>
    <div class="split"><div class="card"><h3>По статусам</h3>${statuses.length?statuses.map(x=>`<p>${esc(fmtStatus(x.status))}: <strong>${Number(x.count)||0}</strong></p>`).join(''):'<p>Пока нет данных</p>'}</div>
    <div class="card"><h3>По направлениям</h3>${categories.length?categories.map(x=>`<p>${esc(x.category)}: <strong>${Number(x.count)||0}</strong></p>`).join(''):'<p>Пока нет данных</p>'}</div></div>`;
}
async function teams(){
  if(role!=='participant'){location.hash='overview';render();return}
  screen.innerHTML=`<section class="section"><h2>Команды</h2><p class="lead">Создайте команду, пригласите участника по ID или войдите по коду. Для подачи проекта нужны 2–5 подтверждённых участников.</p>
  <div class="split"><form id="createTeam" class="card"><h3>Создать команду</h3>${field('teamName','Название команды','text',true,'minlength="2" maxlength="100"')}<button class="btn primary">Создать</button></form>
  <form id="joinTeam" class="card"><h3>Войти по коду</h3>${field('joinCode','Код команды','text',true,'maxlength="12"')}<button class="btn primary">Войти</button></form></div>
  <h3 class="menu-section-title">Мои команды и приглашения</h3><div id="teamItems" class="list">Загрузка…</div></section>`;
  get('createTeam').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{unwrap(await supabase.rpc('create_team',{p_name:get('teamName').value.trim()}));toast('Команда создана');teams()})};
  get('joinTeam').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{unwrap(await supabase.rpc('join_team_by_code',{p_code:get('joinCode').value.trim()}));toast('Вы вошли в команду');teams()})};
  try{
    const items=await myTeams();
    get('teamItems').innerHTML=items.length?items.map(t=>`<div class="project-card"><h3>${esc(t.team_name)}</h3>
      <p>${t.my_status==='invited'?'Приглашение ожидает вашего ответа':`Участников: ${t.member_count}/5`}</p>
      ${t.my_status==='invited'?`<button class="btn primary" data-accept="${t.team_id}">Принять приглашение</button>`:`<p>Код команды: <strong class="code">${esc(t.join_code)}</strong></p><div data-members="${t.team_id}" class="small muted">Загрузка участников…</div>`}
      ${t.owner_id===uid()&&t.my_status==='accepted'?`<form class="invite-form" data-team="${t.team_id}"><div class="field"><label>ID участника</label><input name="memberId" required placeholder="UUID аккаунта"></div><button class="btn small">Пригласить по ID</button></form>`:''}</div>`).join(''):'<div class="notice">Пока нет команд.</div>';
    get('teamItems').querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{try{unwrap(await supabase.rpc('accept_team_invite',{p_team_id:b.dataset.accept}));toast('Приглашение принято');teams()}catch(e){toast(e.message,true)}});
    get('teamItems').querySelectorAll('.invite-form').forEach(f=>f.onsubmit=e=>{e.preventDefault();run(f,async()=>{unwrap(await supabase.rpc('invite_team_member',{p_team_id:f.dataset.team,p_user_id:f.elements.memberId.value.trim()}));toast('Приглашение создано');teams()})});
    get('teamItems').querySelectorAll('[data-members]').forEach(async el=>{const {data,error}=await supabase.rpc('get_team_members',{p_team_id:el.dataset.members});el.textContent=error?error.message:(data||[]).map(m=>`${m.full_name||m.member_id.slice(0,8)} — ${m.status==='accepted'?'в команде':'приглашён'}`).join(' · ')});
  }catch(e){get('teamItems').textContent=e.message}
}
async function submit(){
  if(role!=='participant'){location.hash='overview';render();return}
  screen.innerHTML=`<section class="section"><h2>Подать проект</h2>
  <p class="lead">Проект подаёт команда из 2–5 подтверждённых участников. После отправки система сравнит его с архивом.</p>
  <form id="projectForm" class="card form"><div class="field"><label for="team">Команда</label><select id="team" required><option value="">Загрузка…</option></select><p class="small muted">Нет команды? <a href="#teams">Создайте её или войдите по коду</a>.</p></div>
  ${field('title','Название проекта','text',true,'minlength="3" maxlength="180"')}
  <div class="field"><label for="concept">Концепция проекта</label><textarea id="concept" required minlength="30" maxlength="12000" placeholder="Проблема, аудитория, решение и отличие от существующих проектов"></textarea></div>
  <div class="field"><label for="technical">Техническое описание</label><textarea id="technical" required minlength="30" maxlength="12000" placeholder="Технология, реализация, прототип и результат. Не указывайте имена участников или команды: эксперт увидит этот текст."></textarea></div>
  <div class="field"><label for="features">Особенности проекта</label><textarea id="features" required minlength="10" maxlength="4000" placeholder="Что отличает проект"></textarea></div>
  <div class="field"><label for="category">Направление</label><select id="category" required><option value="">Выберите направление</option><option value="Ai Software">Ai Software</option><option value="Ai Media">Ai Media</option><option value="Ai Hardware">Ai Hardware</option></select></div>
  ${field('file','Файл проекта — PDF, DOCX, TXT, MD','file',false,'accept=".pdf,.docx,.txt,.md"')}
  <div class="notice">Перед отправкой подтвердите email по ссылке из письма. Эксперт видит только название, концепцию, особенности и техническое описание проекта.</div>
  <button class="btn primary" type="submit">Отправить и проанализировать</button></form></section>`;
  let teamList=[];
  try{teamList=await myTeams();get('team').innerHTML='<option value="">Выберите команду</option>'+teamList.filter(t=>t.my_status==='accepted').map(t=>`<option value="${t.team_id}" ${t.member_count<2?'disabled':''}>${esc(t.team_name)} — ${t.member_count}/5 ${t.member_count<2?'(нужен ещё участник)':''}</option>`).join('')}catch(e){get('team').innerHTML='<option value="">Не удалось загрузить команды</option>';toast(e.message,true)}
  get('projectForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{
    await requireVerifiedEmail();
    const team=teamList.find(t=>t.team_id===get('team').value&&t.my_status==='accepted');
    if(!team||team.member_count<2||team.member_count>5)throw new Error('Для подачи нужна команда из 2–5 подтверждённых участников');
    const f=get('file').files[0],text=f?await fileText(f):'';
    let path=null;
    if(f){path=`${uid()}/${crypto.randomUUID()}/${f.name.replace(/[^\p{L}\p{N}_.-]/gu,'_')}`;unwrap(await supabase.storage.from('project-files').upload(path,f,{contentType:fileMime(f),upsert:false}))}
    const data=unwrap(await supabase.from('submissions').insert({
      owner_id:uid(),team_id:team.team_id,user_email:user.email,
      title:get('title').value.trim(),concept:get('concept').value.trim(),
      technical_description:get('technical').value.trim(),features:get('features').value.trim(),
      category:get('category').value.trim(),file_path:path,file_name:f?.name||null,file_text:text
    }).select('id').single());
    toast('Заявка сохранена. Выполняется анализ.');
    try{await functionCall('analyze',{submission_id:data.id});toast('Анализ готов')}catch(err){toast('Заявка сохранена; анализ ожидает настройки серверной функции: '+err.message,true)}
    location.hash='applications';render();
  })}
}
function analysisHtml(a){
  if(!a)return '<span class="muted">Анализ ещё не готов</span>';
  const high=a.level==='high';
  const level=high?'Этот проект уже делали':a.level==='review'?'Есть сходство — изучите совпадения':'Сильных совпадений не найдено';
  return `<div class="notice ${high?'warn':''}"><strong>${level}</strong><br>${high?'Найдено высокое сходство с архивной записью. Проверьте совпадение и отличия проекта. ':''}Сравнено записей: ${a.archive_count||0}. ${a.archive_complete?'':'Архив может быть неполным.'}<br>${esc(a.model_summary||'')}</div>
    <p class="small muted">${a.model_status==='ready'?'Анализ GPT OSS выполнен':'GPT OSS недоступна; использовано текстовое сравнение. '+esc(a.model_reason||'')}</p>
    ${(a.top||[]).map(x=>`<div class="match"><strong>${esc(x.title)}</strong> · ${Number(x.year)||''} · совпадение ${Number(x.score)||0}%<br><span class="small muted">Название ${Number(x.title_score)||0}%, концепция ${Number(x.concept_score)||0}%${x.semantic_score==null?'':`, смысл ${Number(x.semantic_score)||0}%`}</span>${x.reason?`<br><span class="small">${esc(x.reason)}</span>`:''}${x.source_url?`<br><a target="_blank" rel="noopener noreferrer" href="${sourceUrl(x.source_url)}">Источник проекта</a>`:''}</div>`).join('')}`;
}
async function applications(){
  screen.innerHTML='<section class="section"><h2>Мои заявки</h2><p class="lead">Проекты ваших команд и результаты сравнения.</p><div id="items" class="list">Загрузка…</div></section>';
  const {data,error}=await supabase.from('submissions').select('*').order('created_at',{ascending:false});
  if(error){get('items').textContent=error.message;return}
  const teams=await myTeams().catch(()=>[]);
  const myTeamIds=new Set(teams.filter(t=>t.my_status==='accepted').map(t=>t.team_id));
  const own=(data||[]).filter(p=>p.owner_id===uid()||myTeamIds.has(p.team_id));
  get('items').innerHTML=own.length?own.map(p=>`<article class="project-card"><span class="tag">${fmtStatus(p.status)}</span><span class="small muted">${date(p.created_at)}</span><h3>${esc(p.title)}</h3><p>${esc(p.concept).slice(0,600)}</p>${p.file_path&&p.owner_id===uid()?`<button class="btn small" data-file="${esc(p.file_path)}">Скачать файл</button>`:''}<details ${own.length===1?'open':''}><summary>Результат анализа</summary>${analysisHtml(p.analysis)}</details></article>`).join(''):'<div class="notice">Заявок пока нет. <a href="#submit">Подайте первый проект</a>.</div>';
  get('items').querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>downloadFile(b.dataset.file));
}
async function downloadFile(path){try{const data=unwrap(await supabase.storage.from('project-files').createSignedUrl(path,60));window.open(data.signedUrl,'_blank','noopener')}catch(e){toast(e.message,true)}}
const criteria=[['novelty','Новизна'],['relevance','Актуальность проблемы'],['feasibility','Реализуемость'],['impact','Потенциальный эффект'],['presentation','Качество описания']];
async function review(){
  screen.innerHTML='<section class="section"><h2>Экспертиза</h2><p class="lead">Здесь показываются только содержание и техническое описание проекта, без данных команды. Оцените пять критериев от 0 до 5.</p><div id="items" class="list">Загрузка…</div></section>';
  const [q,r]=await Promise.all([supabase.rpc('get_expert_submissions'),supabase.from('reviews').select('*').eq('expert_id',uid())]);
  if(q.error){get('items').textContent=q.error.message;return}
  const reviews=new Map((r.data||[]).map(x=>[x.submission_id,x]));
  get('items').innerHTML=q.data?.length?q.data.map(p=>{const old=reviews.get(p.id);return `<article class="project-card"><span class="tag">${fmtStatus(p.status)}</span> <span class="small muted">${date(p.created_at)}</span><h3>${esc(p.title)}</h3><p>${esc(p.concept)}</p><h4>Техническое описание</h4><p>${esc(p.technical_description||'Не заполнено')}</p><h4>Особенности</h4><p>${esc(p.features||'Не заполнены')}</p><details><summary>Результат анализа</summary>${analysisHtml(p.analysis)}</details><form class="review-form" data-id="${p.id}"><h4>Критерии оценки</h4><div class="review-grid">${criteria.map(([key,label])=>`<div class="field"><label>${label}</label><select name="${key}">${Array.from({length:6},(_,n)=>`<option value="${n}" ${old?.checklist?.[key]===n?'selected':''}>${n}</option>`).join('')}</select></div>`).join('')}</div><div class="field"><label>Комментарий</label><textarea name="comment" maxlength="2000">${esc(old?.comment||'')}</textarea></div><button class="btn primary" type="submit">${old?'Обновить оценку':'Сохранить оценку'}</button> ${old?`<span class="score">${old.score}/25</span>`:''}</form></article>`}).join(''):'<div class="notice">Заявок нет.</div>';
  get('items').querySelectorAll('.review-form').forEach(form=>form.onsubmit=e=>{e.preventDefault();run(form,async()=>{const values=Object.fromEntries(criteria.map(([key])=>[key,Number(form.elements[key].value)]));const score=Object.values(values).reduce((a,b)=>a+b,0);unwrap(await supabase.from('reviews').upsert({submission_id:form.dataset.id,expert_id:uid(),checklist:values,comment:form.elements.comment.value.trim(),score},{onConflict:'submission_id,expert_id'}));toast('Оценка сохранена: '+score+'/25');review()})});
}
async function admin(){screen.innerHTML=`<section class="section"><h2>Админ-панель</h2><p class="lead">Роли, статусы заявок и импорт из Google Sheets.</p><div class="split"><div class="card"><h3>Добавить эксперта</h3><form id="expertForm">${field('expertId','ID аккаунта (UUID)')}<button class="btn primary">Назначить экспертом</button></form><p class="small muted">Эксперт должен сначала зарегистрироваться. ID он видит в профиле.</p></div><div class="card"><h3>Импорт Google Sheets</h3><form id="sheetForm">${field('sheetUrl','Ссылка на таблицу','url')}<button class="btn primary">Импортировать</button></form><button class="btn" id="processSheet">Проанализировать ожидающие</button><p class="small muted">Таблица должна быть доступна по ссылке; нужны столбцы «Название» и «Описание».</p></div></div><h3 class="menu-section-title">Заявки</h3><div id="adminItems" class="list">Загрузка…</div><h3 class="menu-section-title">Пользователи</h3><div id="users" class="table-wrap">Загрузка…</div></section>`;get('expertForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{const id=get('expertId').value.trim();if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Неверный UUID');unwrap(await supabase.from('staff_roles').insert({user_id:id,role:'expert',added_by:uid()}));toast('Эксперт добавлен');admin()})};get('sheetForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{const x=await functionCall('sheet',{action:'import',url:get('sheetUrl').value.trim()});toast('Импортировано строк: '+x.imported);admin()})};get('processSheet').onclick=async()=>{const b=get('processSheet');b.disabled=true;let count=0;try{for(let i=0;i<500;i++){const x=await functionCall('sheet',{action:'process'});if(x.done)break;count++;b.textContent=`Обработано ${count}…`}toast('Обработано заявок: '+count);admin()}catch(e){toast(e.message,true)}finally{b.disabled=false}};const [q,p,r]=await Promise.all([supabase.from('submissions').select('id,title,status,source,created_at,analysis').order('created_at',{ascending:false}).limit(100),supabase.from('profiles').select('id,email,full_name,created_at').order('created_at',{ascending:false}).limit(100),supabase.from('staff_roles').select('user_id,role')]);get('adminItems').innerHTML=q.error?esc(q.error.message):q.data?.length?q.data.map(x=>`<div class="project-card"><strong>${esc(x.title)}</strong> <span class="tag">${esc(x.source)}</span><span class="small muted">${date(x.created_at)}</span><p>${fmtStatus(x.status)} · ${x.analysis?.top?.[0]?.score??'—'}% сходства</p><select data-status="${x.id}">${['pending','analyzed','needs_review','approved','rejected'].map(s=>`<option ${s===x.status?'selected':''} value="${s}">${fmtStatus(s)}</option>`).join('')}</select> <button class="btn small" data-analyze="${x.id}">Повторить анализ</button></div>`).join(''):'<div class="notice">Заявок нет.</div>';get('adminItems').querySelectorAll('[data-status]').forEach(s=>s.onchange=async()=>{try{unwrap(await supabase.from('submissions').update({status:s.value}).eq('id',s.dataset.status));toast('Статус обновлён')}catch(e){toast(e.message,true)}});get('adminItems').querySelectorAll('[data-analyze]').forEach(b=>b.onclick=async()=>{try{await functionCall('analyze',{submission_id:b.dataset.analyze});toast('Анализ обновлён');admin()}catch(e){toast(e.message,true)}});const roles=new Map((r.data||[]).map(x=>[x.user_id,x.role]));get('users').innerHTML=p.error?esc(p.error.message):r.error?esc(r.error.message):`<table><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>ID</th></tr></thead><tbody>${(p.data||[]).map(x=>{const assigned=roles.get(x.id)||'participant';return `<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${assigned==='admin'?'Администратор':`<select class="role-select" data-user-id="${x.id}" aria-label="Роль пользователя ${esc(x.full_name||x.email)}"><option value="participant" ${assigned==='participant'?'selected':''}>Участник</option><option value="expert" ${assigned==='expert'?'selected':''}>Эксперт</option></select>`}</td><td>${esc(x.id)}</td></tr>`}).join('')}</tbody></table>`;
  get('users').querySelectorAll('.role-select').forEach(select=>select.onchange=async()=>{
    const previous=select.value==='expert'?'participant':'expert';
    select.disabled=true;
    try{
      const result=select.value==='expert'
        ?await supabase.from('staff_roles').insert({user_id:select.dataset.userId,role:'expert',added_by:uid()})
        :await supabase.from('staff_roles').delete().eq('user_id',select.dataset.userId).eq('role','expert');
      unwrap(result);toast('Роль обновлена');await admin();
    }catch(e){select.value=previous;select.disabled=false;toast(e.message,true)}
  });
}
async function archive(){screen.innerHTML=`<section class="section"><h2>Архив проектов</h2><p class="lead">Доступен только администратору. Записи 2020–2026 добавляются по подтверждённым источникам.</p><form id="archiveForm" class="card form"><h3>Добавить проект</h3><div class="two">${field('year','Год','number',true,'min="2020" max="2026"')}${field('place','Место (1–3), если известно','number',false,'min="1" max="3"')}</div>${field('title','Название')}${field('category','Направление','text',false)}<div class="field"><label>Описание / концепция</label><textarea id="summary"></textarea></div>${field('source_url','Ссылка на источник','url',false)}<button class="btn primary">Добавить в архив</button></form><h3 class="menu-section-title">Архивные записи</h3><div id="archiveItems" class="list">Загрузка…</div></section>`;get('archiveForm').onsubmit=e=>{e.preventDefault();run(e.currentTarget,async()=>{const payload={year:Number(get('year').value),place:get('place').value?Number(get('place').value):null,title:get('title').value.trim(),category:get('category').value.trim(),summary:get('summary').value.trim(),source_url:get('source_url').value.trim()};unwrap(await supabase.from('archive_projects').insert(payload));toast('Запись добавлена');archive()})};const {data,error}=await supabase.from('archive_projects').select('*').order('year',{ascending:false}).order('title');get('archiveItems').innerHTML=error?esc(error.message):data?.length?data.map(x=>`<div class="project-card"><span class="tag">${x.year}</span>${x.place?`<span class="tag">${x.place} место</span>`:''}<h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p>${x.source_url?`<a href="${sourceUrl(x.source_url)}" target="_blank" rel="noopener noreferrer">Источник</a>`:''}<div class="row"><button class="btn small danger" data-delete="${x.id}">Удалить</button></div></div>`).join(''):'<div class="notice">Архив пуст. Выполните seed.sql или добавьте проект вручную.</div>';get('archiveItems').querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Удалить запись архива?'))return;try{unwrap(await supabase.from('archive_projects').delete().eq('id',b.dataset.delete));archive()}catch(e){toast(e.message,true)}})}
get('menuToggle').onclick=()=>{const open=menu.classList.toggle('open');get('menuToggle').setAttribute('aria-expanded',String(open))};initAppearance(render);window.addEventListener('hashchange',render);if(supabase)supabase.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0));window.addEventListener('focus',()=>{if(user)refreshAuth()});refreshAuth();
