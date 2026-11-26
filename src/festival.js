import './festival.css';
import { countdownAt, findTopics, hasPersonalData, priorityTopic, MAP_URL, OFFICIAL_URL, START_ISO, topics } from './festival-data.mjs';

const words = {
  ru: {
    event: 'INNOFEST KYZYLORDA 2026', until: 'До старта фестиваля', started: 'Фестиваль начался',
    units: ['дн.', 'ч.', 'мин.', 'сек.'], venue: 'Место проведения', map: 'Открыть карту',
    date: '4 декабря 2026 · 09:00 (UTC+5)', schedule: '09:00 — регистрация на площадке · 11:00 — церемония открытия',
    official: 'Официальный сайт', assistant: 'Помощник InnoFest',
    hint: 'Спросите о датах, площадке, регистрации, командах или подаче проекта.',
    question: 'Ваш вопрос', send: 'Спросить', sending: 'Ищем ответ…',
    faq: 'Ответы по справочнику', model: 'Темы определены ИИ, ответы из справочника',
    optIn: 'Разрешить ИИ (Groq) определить тему вопроса. Не вводите личные данные.',
    noAnswer: 'У меня нет подтверждённого ответа на этот вопрос. Попробуйте готовую тему или откройте официальный сайт.',
    private: 'Не добавляйте адрес электронной почты, телефон или другие личные данные. Напишите вопрос без них.',
    link: 'Подробнее', enter: 'Войти в кабинет',
  },
  kk: {
    event: 'INNOFEST KYZYLORDA 2026', until: 'Фестивальдің басталуына дейін', started: 'Фестиваль басталды',
    units: ['күн', 'сағ', 'мин', 'сек'], venue: 'Өтетін орны', map: 'Картадан ашу',
    date: '2026 жылғы 4 желтоқсан · 09:00 (UTC+5)', schedule: '09:00 — қатысушыларды тіркеу · 11:00 — ашылу салтанаты',
    official: 'Ресми сайт', assistant: 'InnoFest көмекшісі',
    hint: 'Фестивальдің күні, өтетін орны, тіркелу, команда немесе жоба ұсыну туралы сұраңыз.',
    question: 'Сұрағыңыз', send: 'Сұрау', sending: 'Жауап ізделіп жатыр…',
    faq: 'Анықтамалықтағы жауаптар', model: 'Тақырыпты ЖИ анықтады, жауаптар анықтамалықтан алынды',
    optIn: 'Сұрақтың тақырыбын ЖИ (Groq) арқылы анықтауға рұқсат беру. Жеке деректерді енгізбеңіз.',
    noAnswer: 'Бұл сұраққа расталған жауап жоқ. Дайын тақырыпты таңдаңыз немесе ресми сайтқа өтіңіз.',
    private: 'Электрондық пошта мекенжайын, телефон нөмірін және басқа жеке деректерді қоспай, сұрақты қайта жазыңыз.',
    link: 'Толығырақ', enter: 'Жеке кабинетке кіру',
  },
  en: {
    event: 'INNOFEST KYZYLORDA 2026', until: 'Until the festival starts', started: 'The festival has started',
    units: ['days', 'hrs', 'min', 'sec'], venue: 'Venue', map: 'Open map',
    date: 'December 4, 2026 · 09:00 (UTC+5)', schedule: '09:00 — on-site check-in · 11:00 — opening ceremony',
    official: 'Official website', assistant: 'InnoFest assistant',
    hint: 'Ask about dates, the venue, registration, teams or submitting a project.',
    question: 'Your question', send: 'Ask', sending: 'Looking up an answer…',
    faq: 'Answers from the FAQ', model: 'AI matched the topics; answers come from the FAQ',
    optIn: 'Let AI (Groq) identify the topic of your question. Do not include personal data.',
    noAnswer: 'I do not have a confirmed answer. Try a suggested topic or check the official website.',
    private: 'Leave out email addresses, phone numbers and other personal details, then ask again.',
    link: 'Learn more', enter: 'Sign in',
  },
};
const api = '/api/festival-assistant';

export function festivalHtml(language) {
  const l = words[language] ? language : 'ru', t = words[l];
  return `<section class="festival" aria-labelledby="festival-heading">
    <div class="festival-event card">
      <span class="label">${t.event}</span>
      <h2 id="festival-heading">${t.until}</h2>
      <div class="festival-clock" role="timer" aria-live="off">${t.units.map(unit => `<div class="festival-unit"><strong>00</strong><span>${unit}</span></div>`).join('')}</div>
      <p class="festival-started" role="status" hidden>${t.started}</p>
      <p><time datetime="${START_ISO}">${t.date}</time></p>
      <p class="small">${t.schedule}</p>
    </div>
    <div class="festival-venue card">
      <span class="label">${t.venue}</span>
      <h2>${topics.venue[l][1]}</h2>
      <div class="row festival-links">
        <a class="btn" href="${MAP_URL}" target="_blank" rel="noopener noreferrer">${t.map}</a>
        <a href="${OFFICIAL_URL}" target="_blank" rel="noopener noreferrer">${t.official}</a>
      </div>
    </div>
  </section>
  <details class="festival-assistant card">
    <summary>${t.assistant}</summary>
    <p>${t.hint}</p>
    <div class="row festival-topics">${Object.entries(topics).filter(([id]) => id !== 'roadshow').map(([id, topic]) => `<button class="btn small" type="button" data-topic="${id}">${topic[l][0]}</button>`).join('')}</div>
    <form class="festival-form">
      <div class="field"><label for="festival-question">${t.question}</label>
        <input id="festival-question" type="text" maxlength="300" required autocomplete="off">
      </div>
      <button class="btn primary" type="submit">${t.send}</button>
      <label class="festival-ai-opt-in small" hidden><input type="checkbox"> ${t.optIn}</label>
    </form>
    <div class="festival-answer" aria-live="polite" aria-atomic="true"></div>
  </details>`;
}

export function mountFestival(root, language, role) {
  const l = words[language] ? language : 'ru', t = words[l];
  const clock = root.querySelector('.festival-clock');
  const digits = clock.querySelectorAll('strong');
  const heading = root.querySelector('#festival-heading');
  const started = root.querySelector('.festival-started');
  let interval, stopped = false, checked = false, requestId = 0;
  const stop = new AbortController();
  const refresh = () => {
    const remaining = countdownAt();
    if (remaining) {
      remaining.forEach((value, i) => {
        const next = String(value).padStart(2, '0');
        if (digits[i].textContent !== next) digits[i].textContent = next;
      });
    } else {
      clock.hidden = true;
      heading.hidden = true;
      started.hidden = false;
      clearInterval(interval);
    }
  };
  refresh();
  if (!clock.hidden) interval = setInterval(refresh, 250);
  document.addEventListener('visibilitychange', refresh, { signal: stop.signal });

  const details = root.querySelector('.festival-assistant');
  const form = details.querySelector('form');
  const input = form.querySelector('#festival-question');
  const consentLabel = form.querySelector('.festival-ai-opt-in');
  const consent = consentLabel.querySelector('input');
  const answer = details.querySelector('.festival-answer');
  const submit = form.querySelector('[type=submit]');

  function addText(parent, tag, value) {
    const node = document.createElement(tag);
    node.textContent = value;
    parent.append(node);
    return node;
  }
  function show(ids, ai = false, message) {
    answer.replaceChildren();
    addText(answer, 'p', ai ? t.model : t.faq).classList.add('label');
    if (!ids.length) {
      addText(answer, 'p', message || t.noAnswer);
      if (!message) {
        const link = addText(answer, 'a', t.official);
        link.href = OFFICIAL_URL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      return;
    }
    for (const id of ids) {
      const topic = topics[id];
      const block = document.createElement('div');
      addText(block, 'strong', topic[l][0]);
      addText(block, 'p', topic[l][1]);
      const participantRoute = topic.url.startsWith('#');
      if (!participantRoute || role === 'guest' || role === 'participant') {
        const guestRoute = participantRoute && role === 'guest';
        const link = addText(block, 'a', id === 'venue' ? t.map : guestRoute ? t.enter : t.link);
        link.href = guestRoute ? '#login' : topic.url;
        if (!participantRoute) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      }
      answer.append(block);
    }
  }

  details.addEventListener('toggle', async () => {
    if (!details.open || checked) return;
    checked = true;
    try {
      const response = await fetch(api, { signal: AbortSignal.any([stop.signal, AbortSignal.timeout(2000)]) });
      if (response.ok && (await response.json()).available === true && !stopped) consentLabel.hidden = false;
    } catch { /* The built-in FAQ does not depend on this endpoint. */ }
  }, { signal: stop.signal });

  details.querySelector('.festival-topics').addEventListener('click', e => {
    const id = e.target.closest('[data-topic]')?.dataset.topic;
    if (!id || !Object.hasOwn(topics, id)) return;
    requestId++;
    submit.disabled = false;
    show([id]);
  }, { signal: stop.signal });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const question = input.value.normalize('NFKC').trim();
    if (!question) return;
    const id = ++requestId;
    if (hasPersonalData(question)) {
      show([], false, t.private);
      return;
    }
    const local = findTopics(question);
    if (priorityTopic(question) || consentLabel.hidden || !consent.checked) {
      show(local);
      return;
    }
    submit.disabled = true;
    answer.textContent = t.sending;
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: AbortSignal.any([stop.signal, AbortSignal.timeout(7000)]),
      });
      const result = response.ok ? await response.json() : null;
      const ids = Array.isArray(result?.topics) ? result.topics.filter(topic => Object.hasOwn(topics, topic)).slice(0, 3) : [];
      if (!stopped && id === requestId) show(ids.length ? ids : local, ids.length > 0);
    } catch {
      if (!stopped && id === requestId) show(local);
    } finally {
      if (!stopped && id === requestId) submit.disabled = false;
    }
  }, { signal: stop.signal });

  return () => {
    stopped = true;
    clearInterval(interval);
    stop.abort();
  };
}
