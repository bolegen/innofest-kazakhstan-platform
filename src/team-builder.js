import {applyTranslations} from './appearance.js';

const skillOptions=['ML','Python','Frontend','Backend','3D-моделирование','Монтаж видео','Питчинг','Дизайн'];
const roleOptions=['ML-инженер','Python-разработчик','Frontend-разработчик','Backend-разработчик','3D-дизайнер','Видеомонтажёр','Питчинг','Дизайнер'];

const multiSelect=(name,selected=[])=>`<div class="skill-picker" data-skill-picker="${name}">
  ${skillOptions.map(skill=>`<label><input type="checkbox" value="${skill}" ${selected.includes(skill)?'checked':''}><span>${skill}</span></label>`).join('')}
</div>`;
const chosenSkills=(root,name)=>[...root.querySelectorAll(`[data-skill-picker="${name}"] input:checked`)].map(input=>input.value);
const options=(values,selected='')=>values.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${x}</option>`).join('');
const setText=(element,text)=>{element.textContent=text};
const applicationLabels={pending:'Ожидает ответа',accepted:'Отклик принят',declined:'Отклик отклонён'};

export async function teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast}){
  if(role!=='participant'){location.hash='overview';return}
  screen.innerHTML=`<section class="section team-builder"><span class="label">Team Builder</span><h2>Биржа талантов</h2>
    <p class="lead">Найдите команду по навыкам или откройте вакансию для своего проекта. Анкета видна только зарегистрированным участникам и скрывается, когда вы вступаете в команду.</p>
    <div id="builderStatus" role="status" class="notice">Загрузка…</div>
    <div id="builderContent" hidden>
      <div class="split builder-editor">
        <div class="card" id="candidateEditor"></div>
        <div class="card" id="openingEditor"></div>
      </div>
      <div class="card builder-filters"><h3>Быстрый подбор</h3>
        <div class="two"><div class="field"><label for="builderSkill">Навык</label><select id="builderSkill"><option value="">Все навыки</option>${options(skillOptions)}</select></div>
        <div class="field"><label for="builderRole">Роль</label><select id="builderRole"><option value="">Все роли</option>${options(roleOptions)}</select></div></div>
      </div>
      <div class="split builder-results"><div><h3>Ищу команду</h3><div id="candidateList" class="list"></div></div>
      <div><h3>Ищу разработчика</h3><div id="openingList" class="list"></div></div></div>
      <div id="openingApplications" class="list"></div>
    </div></section>`;
  const root=screen.querySelector('.team-builder');
  const status=root.querySelector('#builderStatus');
  const refreshIfActive=()=>{
    if(screen.contains(root))void teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast});
  };
  try{
    const [teamsResult,profilesResult,openingsResult,applicationsResult]=await Promise.all([
      myTeams(),
      supabase.from('team_builder_profiles').select('user_id,display_name,desired_role,skills,bio,visible').order('updated_at',{ascending:false}).limit(200),
      supabase.rpc('get_team_builder_openings'),
      supabase.rpc('get_team_opening_applications')
    ]);
    if(!screen.contains(root))return;
    if(profilesResult.error)throw profilesResult.error;
    if(openingsResult.error)throw openingsResult.error;
    const teams=teamsResult||[];
    const ownTeams=teams.filter(t=>t.owner_id===uid()&&t.my_status==='accepted'&&Number(t.member_count)<5);
    const hasTeam=teams.some(t=>t.my_status==='accepted');
    const myProfile=(profilesResult.data||[]).find(x=>x.user_id===uid());
    let candidates=(profilesResult.data||[]).filter(x=>x.visible&&x.user_id!==uid());
    let openings=openingsResult.data||[];
    const applications=applicationsResult.data||[];
    const personal=applications.filter(a=>!a.can_review);
    const incoming=applications.filter(a=>a.can_review);
    const appliedOpenings=new Set(personal.map(a=>a.opening_id));
    const applicationsSection=root.querySelector('#openingApplications');
    const applicationCards=(rows,review=false)=>rows.length
      ?rows.map(a=>`<article class="project-card">
        <span class="tag">${esc(applicationLabels[a.status]||'')}</span>
        ${a.opening_status==='closed'?'<span class="tag">Вакансия закрыта</span>':''}
        <h4>${esc(a.opening_title)}</h4><p class="small">${esc(a.team_name)}</p>
        ${review?`<p><strong>${esc(a.applicant_name||'Участник')}</strong></p>`:''}
        ${a.message?`<p>${esc(a.message)}</p>`:''}
        ${review&&a.status==='pending'?`<div class="row">
          ${a.opening_status==='open'?`<button class="btn primary small" type="button" data-decision="accept" data-application="${esc(a.id)}">Принять кандидата</button>`:''}
          <button class="btn small" type="button" data-decision="decline" data-application="${esc(a.id)}">Отклонить отклик</button>
        </div>`:''}</article>`).join('')
      :'<p class="muted">Откликов пока нет.</p>';
    if(applicationsResult.error){
      applicationsSection.innerHTML='<div class="notice">Отклики на вакансии временно недоступны.</div>';
    }else{
      applicationsSection.innerHTML=`<div class="split">
        <section><h3>Мои отклики</h3><div class="list">${applicationCards(personal)}</div></section>
        ${teams.some(t=>t.owner_id===uid())?`<section><h3>Отклики кандидатов</h3><div class="list">${applicationCards(incoming,true)}</div></section>`:''}
      </div>`;
    }
    const openingAction=o=>{
      if(teams.some(t=>t.team_id===o.team_id&&t.owner_id===uid())){
        return `<button class="btn small" type="button" data-close-opening="${esc(o.id)}">Закрыть вакансию</button>`;
      }
      if(appliedOpenings.has(o.id))return '<p class="muted small">Отклик отправлен</p>';
      if(hasTeam||applicationsResult.error)return '';
      return `<details><summary>Откликнуться</summary>
        <form class="form" data-apply-opening="${esc(o.id)}">
          <div class="field"><label>Сообщение капитану<textarea name="message" maxlength="400" placeholder="По желанию"></textarea></label></div>
          <p class="small muted">Ваше имя и сообщение увидит капитан команды.</p>
          <p class="small muted">Если капитан примет отклик, вы войдёте в команду.</p>
          <button class="btn primary small" type="submit">Отправить отклик</button>
        </form></details>`;
    };
    const candidateEditor=screen.querySelector('#candidateEditor');
    candidateEditor.innerHTML=hasTeam
      ?'<h3>Моя анкета</h3><p class="muted">Вы уже состоите в команде. Анкета скрыта из поиска.</p>'
      :`<h3>Моя анкета</h3><p class="small muted">Укажите только информацию, которую готовы показать другим участникам. Не добавляйте телефон или email в описание.</p>
        <form id="candidateForm"><div class="field"><label for="builderName">Имя для анкеты</label><input id="builderName" maxlength="80" minlength="2" required value="${esc(myProfile?.display_name||'')}"></div>
        <div class="field"><label for="candidateRole">Желаемая роль</label><select id="candidateRole">${options(roleOptions,myProfile?.desired_role)}</select></div>
        <div class="field"><label>Мои навыки (1–5)</label>${multiSelect('candidate',myProfile?.skills||[])}</div>
        <div class="field"><label for="candidateBio">О себе</label><textarea id="candidateBio" maxlength="400" placeholder="Опыт и интересы">${esc(myProfile?.bio||'')}</textarea></div>
        <div class="row"><button class="btn primary" type="submit">${myProfile?'Обновить анкету':'Опубликовать анкету'}</button>
        ${myProfile?.visible?'<button class="btn" type="button" id="hideCandidate">Скрыть анкету</button>':''}</div></form>`;
    const openingEditor=screen.querySelector('#openingEditor');
    openingEditor.innerHTML=ownTeams.length
      ?`<h3>Вакансия в команде</h3><form id="openingForm">
         <div class="field"><label for="openingTeam">Команда</label><select id="openingTeam">${teams.filter(t=>t.owner_id===uid()&&t.my_status==='accepted'&&Number(t.member_count)<5).map(t=>`<option value="${t.team_id}">${esc(t.team_name)} · ${t.member_count}/5</option>`).join('')}</select></div>
         <div class="field"><label for="openingTitle">Заголовок вакансии</label><input id="openingTitle" minlength="8" maxlength="100" required placeholder="Нужен Python-разработчик на хакатон"></div>
         <div class="field"><label for="openingRole">Ищем роль</label><select id="openingRole">${options(roleOptions)}</select></div>
         <div class="field"><label>Нужные навыки (1–5)</label>${multiSelect('opening')}</div>
         <div class="field"><label for="openingDescription">Описание задачи</label><textarea id="openingDescription" minlength="10" maxlength="350" required placeholder="Что предстоит сделать за 24 часа"></textarea></div>
         <button class="btn primary" type="submit">Опубликовать вакансию</button></form>`
      :'<h3>Вакансия в команде</h3><p class="muted">Открывать вакансии может капитан команды, в которой есть свободные места.</p>';

    const filter=()=>{
      const skill=screen.querySelector('#builderSkill').value;
      const desiredRole=screen.querySelector('#builderRole').value;
      const teamChoices=ownTeams.map(t=>`<option value="${t.team_id}">${esc(t.team_name)} · ${t.member_count}/5</option>`).join('');
      const matchingCandidates=candidates.filter(c=>(!skill||c.skills.includes(skill))&&(!desiredRole||c.desired_role===desiredRole));
      screen.querySelector('#candidateList').innerHTML=matchingCandidates.length
        ?matchingCandidates.map(c=>`<article class="project-card"><span class="tag">${esc(c.desired_role)}</span><h3>${esc(c.display_name)}</h3><p class="small">${c.skills.map(esc).join(' · ')}</p><p>${esc(c.bio||'Описание не добавлено')}</p>
          ${ownTeams.length?`<div class="row"><select class="candidate-team" aria-label="Команда для приглашения" data-team-for="${c.user_id}">${teamChoices}</select><button class="btn primary small" type="button" data-invite="${c.user_id}">Пригласить в команду</button></div>`:''}</article>`).join('')
        :'<div class="notice">Подходящих анкет пока нет.</div>';
      const matchingOpenings=openings.filter(o=>(!skill||o.skills.includes(skill))&&(!desiredRole||o.desired_role===desiredRole));
      screen.querySelector('#openingList').innerHTML=matchingOpenings.length
        ?matchingOpenings.map(o=>`<article class="project-card"><span class="tag">${esc(o.desired_role)}</span><h3>${esc(o.title)}</h3><p><strong>${esc(o.team_name)}</strong> · ${o.member_count}/5</p><p class="small">${o.skills.map(esc).join(' · ')}</p><p>${esc(o.description)}</p>
          ${openingAction(o)}</article>`).join('')
        :'<div class="notice">Подходящих вакансий пока нет.</div>';
      screen.querySelectorAll('[data-invite]').forEach(button=>button.onclick=async()=>{
        button.disabled=true;
        try{
          const teamId=screen.querySelector(`[data-team-for="${button.dataset.invite}"]`).value;
          unwrap(await supabase.rpc('invite_team_member',{p_team_id:teamId,p_user_id:button.dataset.invite}));
          toast('Приглашение отправлено. Участник увидит его в разделе «Команды».');
        }catch(error){toast(error.message,true)}finally{button.disabled=false}
      });
      screen.querySelectorAll('[data-close-opening]').forEach(button=>button.onclick=async()=>{
        button.disabled=true;
        try{
          unwrap(await supabase.from('team_openings').update({status:'closed'}).eq('id',button.dataset.closeOpening));
          openings=openings.filter(o=>o.id!==button.dataset.closeOpening);
          toast('Вакансия закрыта');refreshIfActive();
        }catch(error){toast(error.message,true);button.disabled=false}
      });
      root.querySelectorAll('[data-apply-opening]').forEach(form=>form.onsubmit=async event=>{
        event.preventDefault();
        const button=form.querySelector('[type=submit]');button.disabled=true;
        try{
          unwrap(await supabase.rpc('apply_to_team_opening',{
            p_opening_id:form.dataset.applyOpening,
            p_message:form.elements.message.value.trim()
          }));
          toast('Отклик отправлен');refreshIfActive();
        }catch(error){toast(error.message,true);button.disabled=false}
      });
      applyTranslations();
    };
    root.querySelectorAll('[data-application]').forEach(button=>button.onclick=async()=>{
      const accept=button.dataset.decision==='accept';
      const actions=button.closest('.row').querySelectorAll('button');
      actions.forEach(b=>b.disabled=true);
      try{
        unwrap(await supabase.rpc('decide_team_opening_application',{
          p_application_id:button.dataset.application,p_accept:accept
        }));
        toast(accept?'Отклик принят':'Отклик отклонён');refreshIfActive();
      }catch(error){toast(error.message,true);actions.forEach(b=>b.disabled=false)}
    });
    screen.querySelector('#builderSkill').onchange=filter;
    screen.querySelector('#builderRole').onchange=filter;
    screen.querySelector('#candidateForm')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget;
      const skills=chosenSkills(form,'candidate');
      if(skills.length<1||skills.length>5)return toast('Выберите от 1 до 5 навыков',true);
      const button=form.querySelector('[type=submit]');button.disabled=true;
      try{
        unwrap(await supabase.from('team_builder_profiles').upsert({
          user_id:uid(),display_name:form.querySelector('#builderName').value.trim(),
          desired_role:form.querySelector('#candidateRole').value,skills,
          bio:form.querySelector('#candidateBio').value.trim(),visible:true,updated_at:new Date().toISOString()
        }));
        toast('Анкета опубликована');teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast});
      }catch(error){toast(error.message,true);button.disabled=false}
    });
    screen.querySelector('#hideCandidate')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{unwrap(await supabase.from('team_builder_profiles').update({visible:false}).eq('user_id',uid()));toast('Анкета скрыта');teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast})}
      catch(error){toast(error.message,true);button.disabled=false}
    });
    screen.querySelector('#openingForm')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget;
      const skills=chosenSkills(form,'opening');
      if(skills.length<1||skills.length>5)return toast('Выберите от 1 до 5 навыков',true);
      const button=form.querySelector('[type=submit]');button.disabled=true;
      try{
        unwrap(await supabase.from('team_openings').insert({
          team_id:form.querySelector('#openingTeam').value,
          title:form.querySelector('#openingTitle').value.trim(),
          desired_role:form.querySelector('#openingRole').value,
          skills,description:form.querySelector('#openingDescription').value.trim()
        }));
        toast('Вакансия опубликована');teamBuilder({screen,supabase,uid,role,myTeams,esc,unwrap,toast});
      }catch(error){toast(error.message,true);button.disabled=false}
    });
    status.remove();
    screen.querySelector('#builderContent').hidden=false;
    filter();
  }catch(error){
    setText(status,error.code==='42P01'||error.code==='PGRST202'
      ?'Биржа талантов временно недоступна. Попробуйте позже.'
      :'Не удалось загрузить биржу талантов: '+error.message);
    status.classList.add('error');
  }
  applyTranslations();
}

