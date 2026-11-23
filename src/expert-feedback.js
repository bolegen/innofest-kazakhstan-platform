import {supabase, esc, date, toast, unwrap} from './lib.js';

const unavailable = 'Не удалось загрузить обратную связь.';
const multiline = text => esc(text ?? '').replace(/\r?\n/g, '<br>');

export async function loadParticipantFeedback(submissions) {
  if (!submissions.length) return new Map();
  const ids = submissions.map(({id}) => id);
  const feedback = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const {data, error} = await supabase.from('submission_feedback')
      .select('submission_id,body,published_at').in('submission_id', ids.slice(i, i + 100));
    if (error) return null;
    for (const item of data || []) feedback.set(item.submission_id, item);
  }
  return feedback;
}

export function participantFeedbackHtml(item) {
  if (!item) return '';
  return `<section class="match"><h4>Обратная связь от организаторов</h4>
    <p>${multiline(item.body)}</p><time class="small muted" datetime="${esc(item.published_at)}">${esc(date(item.published_at))}</time></section>`;
}

export function participantFeedbackNotice() {
  return `<p class="notice error">${unavailable}</p>`;
}

function adminReviewHtml(review) {
  if (!review) return '<p class="small muted">Пока нет экспертных оценок.</p>';
  return `<p><span>Оценок</span>: <strong>${Number(review.review_count)}</strong> ·
    <span>Средний балл</span>: <strong>${Number(review.average_score)}/25</strong></p>
    <details><summary>Экспертные оценки</summary><ol>
      ${(review.evaluations || []).map(evaluation => `<li><strong>${Number(evaluation.score)}/25</strong>${evaluation.comment ? `<p>${multiline(evaluation.comment)}</p>` : ''}</li>`).join('')}
    </ol></details>`;
}

export async function mountAdminFeedback(root, submissions) {
  if (!root || !submissions.length) return;
  const ids = submissions.map(({id}) => id);
  const [summary, published] = await Promise.all([
    supabase.rpc('get_expert_review_summary', {p_submission_ids: ids}),
    supabase.from('submission_feedback').select('submission_id,body,published_at').in('submission_id', ids)
  ]);
  if (!root.isConnected) return;
  const summaries = new Map((summary.data || []).map(entry => [entry.submission_id, entry]));
  const publications = new Map((published.data || []).map(entry => [entry.submission_id, entry]));
  const projects = new Map(submissions.map(entry => [entry.id, entry]));

  for (const panel of root.querySelectorAll('[data-feedback-id]')) {
    const id = panel.dataset.feedbackId;
    const project = projects.get(id);
    if (!project) continue;
    const canPublish = project.source === 'platform' && (project.owner_id || project.team_id);
    const render = () => {
      const existing = publications.get(id);
      panel.innerHTML = `<div class="match"><h4>Сводка экспертизы</h4>
        ${summary.error ? '<p class="notice error">Не удалось загрузить сводку экспертизы.</p>' : adminReviewHtml(summaries.get(id))}
        </div>
        ${published.error ? participantFeedbackNotice() : !canPublish ? '<p class="small muted">У этой заявки нет кабинета участника.</p>' : `
        <form class="form">
          <div class="field"><label for="feedback-${esc(id)}">Обратная связь от организаторов</label>
            <textarea id="feedback-${esc(id)}" name="body" maxlength="3000" required>${existing ? esc(existing.body) : ''}</textarea>
            <p class="small muted">Участники увидят только этот текст. Не указывайте имена экспертов.</p>
          </div>
          <div class="row">
            <button type="submit" class="btn primary small">${existing ? 'Обновить обратную связь' : 'Опубликовать обратную связь'}</button>
            ${existing ? '<button type="button" class="btn small" data-withdraw-feedback>Снять с публикации</button>' : ''}
          </div>
        </form>`}`;
      const form = panel.querySelector('form');
      if (!form) return;
      const change = async body => {
        const buttons = [...form.querySelectorAll('button')];
        buttons.forEach(button => { button.disabled = true; });
        try {
          unwrap(await supabase.rpc('set_submission_feedback', {p_submission_id: id, p_body: body}));
          if (body === null) publications.delete(id);
          else publications.set(id, {submission_id: id, body});
          toast(body === null ? 'Обратная связь снята с публикации.' : 'Обратная связь опубликована.');
          if (panel.isConnected) render();
        } catch (error) {
          toast(error.message || unavailable, true);
        } finally {
          buttons.forEach(button => { button.disabled = false; });
        }
      };
      form.onsubmit = event => {
        event.preventDefault();
        const body = form.elements.body.value.trim();
        if (!body) { toast('Введите текст обратной связи.', true); return; }
        change(body);
      };
      const withdraw = form.querySelector('[data-withdraw-feedback]');
      if (withdraw) withdraw.onclick = () => change(null);
    };
    render();
  }
}
