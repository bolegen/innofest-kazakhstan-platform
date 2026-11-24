export const START_ISO = '2026-12-04T09:00:00+05:00';
export const OFFICIAL_URL = 'https://www.innofest.kz/';
export const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Центр искусств Өнер орталығы, Кызылорда, Султана Бейбарса 10А');

export function countdownAt(now = Date.now()) {
  const remaining = Date.parse(START_ISO) - now;
  if (remaining <= 0) return null;
  const seconds = Math.ceil(remaining / 1000);
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
}

export const topics = {
  dates: {
    ru: ['Когда фестиваль?', 'Фестиваль пройдёт 4–5 декабря 2026 года. 4 декабря регистрация на площадке начнётся в 09:00, церемония открытия — в 11:00. Время Кызылорды (UTC+5).'],
    kk: ['Фестиваль қашан өтеді?', 'Фестиваль 2026 жылғы 4–5 желтоқсанда өтеді. 4 желтоқсанда қатысушыларды тіркеу 09:00-де, ашылу салтанаты 11:00-де басталады. Қызылорда уақыты (UTC+5).'],
    en: ['When is the festival?', 'The festival runs on December 4–5, 2026. On December 4, on-site check-in starts at 09:00 and the opening ceremony starts at 11:00, Kyzylorda time (UTC+5).'],
    cues: /\b(?:when|schedule|timing|december|date|start|time|opening|ceremony|program)\b|когда|во сколько|дек\p{L}*|числ|програм|расписан|церемон|открыти|начал|начн|начина|старт|врем|дат|қашан|желтоқсан|бастал|уақыт|кесте|ашыл/iu,
    url: OFFICIAL_URL,
  },
  venue: {
    ru: ['Где проходит фестиваль?', 'г. Кызылорда, Центр искусств (Өнер орталығы).'],
    kk: ['Фестиваль қай жерде өтеді?', 'Қызылорда қаласы, Өнер орталығы.'],
    en: ['Where is the festival?', 'Center for the Arts (Өнер орталығы), Kyzylorda.'],
    cues: /\b(?:where|address|location|venue|directions|map)\b|где|куда|адрес|добра|доех|площадк|место|карт|қайда|қай жерде|қалай бар|мекенжай|өтетін жер|қай қала/iu,
    url: MAP_URL,
  },
  tracks: {
    ru: ['Какие направления?', 'Три направления: AI Software (программные решения), AI Hardware (устройства) и AI Media (медиапроекты с ИИ).'],
    kk: ['Қандай бағыттар бар?', 'Үш бағыт бар: AI Software (бағдарламалық шешімдер), AI Hardware (құрылғылар) және AI Media (ЖИ көмегімен жасалған медиа жобалар).'],
    en: ['What are the tracks?', 'The three tracks are AI Software, AI Hardware, and AI Media.'],
    cues: /\b(?:tracks?|categories|software|hardware|media|video|streams?)\b|направлен|категор|трек|медиа|бағыт|санат|құрылғы/iu,
    url: OFFICIAL_URL,
  },
  signup: {
    ru: ['Как зарегистрироваться?', 'На этой платформе откройте «Регистрация», создайте аккаунт и подтвердите почту. Чтобы подать проект на фестиваль, проверьте условия и сроки на официальном сайте.'],
    kk: ['Қалай тіркелуге болады?', 'Осы платформада «Тіркелу» бөлімін ашып, аккаунт құрыңыз және поштаңызды растаңыз. Фестивальге жоба ұсыну үшін ресми сайттағы талаптар мен мерзімдерді тексеріңіз.'],
    en: ['How do I sign up?', 'On this platform, select Sign up, create an account and verify your email. For festival eligibility and deadlines, check the official website.'],
    cues: /\b(?:register|registration|sign\s?up|account|email|verify|deadline)\b|регистр|аккаунт|подтверд|почт|дедлайн|срок|тірке|раста|пошта|мерзім/iu,
    url: OFFICIAL_URL,
  },
  teams: {
    ru: ['Как найти команду?', 'На платформе откройте «Команды», чтобы создать команду или принять приглашение. Участники без команды могут откликаться на вакансии в «Бирже талантов».'],
    kk: ['Команданы қалай табамын?', 'Команда құру немесе шақыруды қабылдау үшін «Командалар» бөлімін ашыңыз. Командасы жоқ қатысушылар таланттар биржасындағы бос орындарға өтінім бере алады.'],
    en: ['How do I find a team?', 'Open Teams to create a team or accept an invitation. Participants without a team can apply for openings in the talent exchange.'],
    cues: /\b(?:teams?|members?|invite|teammates?|talent|vacancy)\b|команд|приглаш|ваканси|талант|топ|шақыру|бос орын/iu,
    url: '#teams',
  },
  projects: {
    ru: ['Как подать проект?', 'На этой платформе подтвердите почту и соберите команду из 2–5 подтверждённых участников. Затем откройте «Подать проект». Можно приложить файл PDF, DOCX, TXT или MD.'],
    kk: ['Жобаны қалай ұсынамын?', 'Осы платформада поштаңызды растаңыз және 2–5 расталған қатысушысы бар команда құрыңыз. Содан кейін «Жоба ұсыну» бөлімін ашыңыз. PDF, DOCX, TXT немесе MD файлын тіркей аласыз.'],
    en: ['How do I submit a project?', 'On this platform, verify your email and form a team of 2–5 confirmed members. Open Submit project. You can attach a PDF, DOCX, TXT or MD file.'],
    cues: /\b(?:submission|submit|upload|application|attach)\b|подать|заявк|отправить проект|прикреп|файл|өтінім|жоба ұсын|жүкте|тірке\p{L}* файл/iu,
    url: '#submit',
  },
  prizes: {
    ru: ['Какой призовой фонд?', 'Организаторы объявили призовой фонд 6 000 000 тенге и образовательные гранты.'],
    kk: ['Жүлде қоры қанша?', 'Ұйымдастырушылар 6 000 000 теңге жүлде қорын және білім гранттарын жариялады.'],
    en: ['What are the prizes?', 'The organizers announced a prize pool of KZT 6,000,000 and educational grants.'],
    cues: /\b(?:prizes?|award|grant|reward)\b|приз|грант|наград|жүлде|сыйлық/iu,
    url: OFFICIAL_URL,
  },
};

export function findTopics(question) {
  const query = question.normalize('NFKC').trim();
  const hits = Object.keys(topics).filter(id => topics[id].cues.test(query));
  // “When does registration start?” refers to the published schedule, not account creation.
  if (hits.includes('dates') && hits.includes('signup') && !/срок|дедлайн|deadline|мерзім/iu.test(query)) {
    return hits.filter(id => id !== 'signup').slice(0, 3);
  }
  return hits.slice(0, 3);
}

export function hasPersonalData(value) {
  const normalized = value.normalize('NFKC');
  return normalized.includes('@') || /(?:\+?\d[\s().-]*){10,}/u.test(normalized);
}
