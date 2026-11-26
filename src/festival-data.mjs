export const START_ISO = '2026-12-04T09:00:00+05:00';
export const OFFICIAL_URL = 'https://www.innofest.kz/';
export const ROADSHOW_NOTICE = "https://www.gov.kz/org/cifrovizaciya-kyzylorda/press/events/details/50030?lang=kk";
export const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Центр искусств Өнер орталығы, Кызылорда, Султана Бейбарса 10А');

export function countdownAt(now = Date.now()) {
  const remaining = Date.parse(START_ISO) - now;
  if (remaining <= 0) return null;
  const seconds = Math.ceil(remaining / 1000);
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
}

export const topics = {
  roadshow: {
    ru: ['Роудшоу InnoFest', 'Встреча роудшоу в Кызылорде: 25 ноября 2026 года в 17:00 (UTC+5), Kyzylorda Hub. Это отдельная встреча, не декабрьский фестиваль.'],
    kk: ['InnoFest роудшоуы', 'Қызылордадағы роудшоу кездесуі: 2026 жылғы 25 қараша, 17:00 (UTC+5), Kyzylorda Hub. Бұл желтоқсандағы фестивальден бөлек кездесу.'],
    en: ['InnoFest roadshow', 'The Kyzylorda roadshow meeting is listed for November 25, 2026 at 17:00 (UTC+5), at Kyzylorda Hub. It is separate from the December festival.'],
    cues: /road[\s-]*show|ро[уү](?:д|т)[\s-]*шоу/iu,
    url: ROADSHOW_NOTICE,
  },
  dates: {
    ru: ['Когда фестиваль?', 'Фестиваль пройдёт 4–5 декабря 2026 года. 4 декабря регистрация на площадке начнётся в 09:00, церемония открытия — в 11:00. Время Кызылорды (UTC+5).'],
    kk: ['Фестиваль қашан өтеді?', 'Фестиваль 2026 жылғы 4–5 желтоқсанда өтеді. 4 желтоқсанда қатысушыларды тіркеу 09:00-де, ашылу салтанаты 11:00-де басталады. Қызылорда уақыты (UTC+5).'],
    en: ['When is the festival?', 'The festival runs on December 4–5, 2026. On December 4, on-site check-in starts at 09:00 and the opening ceremony starts at 11:00, Kyzylorda time (UTC+5).'],
    cues: /\b(?:when|schedule|timing|december|date|start|time|opening|ceremony|program)\b|когда|во сколько|дек\p{L}*|числ|програм|расписан|церемон|открыти|начал|начн|начина|старт|врем|(?:^|[^\p{L}])дат(?:а|ы|у|е|ой|ами)?(?=$|[^\p{L}])|қашан|желтоқсан|бастал|уақыт|кесте|ашыл|қай күні|қай күнге/iu,
    url: OFFICIAL_URL,
  },
  venue: {
    ru: ['Где проходит фестиваль?', 'г. Кызылорда, Центр искусств (Өнер орталығы). Здесь 4 декабря проходят регистрация на площадке и церемония открытия.'],
    kk: ['Фестиваль қай жерде өтеді?', 'Қызылорда қаласы, Өнер орталығы. 4 желтоқсанда қатысушыларды тіркеу мен ашылу салтанаты осы жерде өтеді.'],
    en: ['Where is the festival?', 'Center for the Arts (Өнер орталығы), Kyzylorda. On-site check-in and the opening ceremony take place here on December 4.'],
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
    cues: /\b(?:register|registration|sign\s?up|account|email|verify|deadline)\b|регистр|аккаунт|подтверд|почт|дедлайн|срок|тірке|раста|пошта|мерзім|қатысу үшін|қалай қатыс/iu,
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
  deadline: {
    ru: ['До какого числа принимают заявки?', 'У меня нет подтверждённого срока подачи заявок на фестиваль. Проверьте сроки на официальном сайте InnoFest. Регистрация на площадке 4 декабря в 09:00 не означает, что до этого времени принимают заявки.'],
    kk: ['Өтінімдер қашанға дейін қабылданады?', 'Фестивальге өтінім қабылдаудың нақты мерзімі расталмаған. Мерзімді InnoFest ресми сайтынан тексеріңіз. 4 желтоқсан күні сағат 09:00-де өтетін тіркеу өтінім қабылдау мерзімі емес.'],
    en: ['When is the application deadline?', 'I don’t have a confirmed festival application deadline. Check the official InnoFest website. On-site check-in at 09:00 on December 4 is not an application cutoff.'],
    url: OFFICIAL_URL,
  },
  trackVenue: {
    ru: ['Где проходит мой трек?', '4 декабря регистрация на площадке и открытие проходят в Центре искусств (Өнер орталығы). Это не подтверждает место проведения отдельного трека. Проверьте площадки и обновления в программе организатора.'],
    kk: ['Бағытым қай жерде өтеді?', '4 желтоқсанда қатысушыларды тіркеу мен ашылу салтанаты Өнер орталығында өтеді. Бұл әр бағыттың өтетін орны сол жерде дегенді білдірмейді. Өтетін орындар мен өзгерістерді ресми бағдарламадан тексеріңіз.'],
    en: ['Where is my track?', 'On December 4, on-site check-in and the opening ceremony are at the Center for the Arts (Өнер орталығы). That doesn’t confirm where each track meets. Check the organizer’s program for venue updates.'],
    url: OFFICIAL_URL,
  },
  admission: {
    ru: ['Вход бесплатный?', 'По объявлению управления цифровых технологий Кызылординской области, вход бесплатный. Если вы идёте как зритель, уточните у организаторов, нужна ли отдельная регистрация.'],
    kk: ['Кіру тегін бе?', 'Қызылорда облысының цифрлық технологиялар басқармасының хабарландыруына сәйкес, кіру тегін. Көрермен ретінде барсаңыз, бөлек тіркелу қажет пе екенін ұйымдастырушылардан нақтылаңыз.'],
    en: ['Is admission free?', 'The Kyzylorda regional digital technologies department lists free admission. If you’re attending as a spectator, check with the organizers about any separate registration.'],
    url: 'https://www.gov.kz/org/cifrovizaciya-kyzylorda/press/events/details/49761?lang=kk',
  },
  prizes: {
    ru: ['Какой призовой фонд?', 'Организаторы объявили призовой фонд 6 000 000 тенге и образовательные гранты.'],
    kk: ['Жүлде қоры қанша?', 'Ұйымдастырушылар 6 000 000 теңге жүлде қорын және білім гранттарын жариялады.'],
    en: ['What are the prizes?', 'The organizers announced a prize pool of KZT 6,000,000 and educational grants.'],
    cues: /\b(?:prizes?|award|grant|reward)\b|приз|грант|наград|жүлде|сыйлық/iu,
    url: OFFICIAL_URL,
  },
};

// Specific event logistics take precedence over generic platform instructions.
const deadlineCue = /\b(?:deadline|cut[ -]?off|by when|until when|last day|when does .{0,45} close)\b|до (?:какого|когда|какой даты)|крайний срок|дедлайн|срок.{0,30}(?:подач|заяв|регистр)|закроется|заканчива|аяқтал|соңғы (?:күн|мерзім)|қай күнге дейін|қашанға дейін/iu;
const applicationCue = /\b(?:applications?|apply|submission|submit|regist\w*|sign[ -]?up)\b|подач|подать|заявк|регистр|өтінім|тіркел|қатысу/iu;
const namedTrack = /\b(?:hardware|software|media|video|track)\b|трек|направлен|бағыт/iu;
const admissionCue = /\b(?:admission|entry fee|tickets?|free entry|entry free|free to attend|spectators?|observers?)\b|билет|вход|зрител|кіру|көрермен/iu;

export function priorityTopic(question) {
  if (topics.roadshow.cues.test(question)) return 'roadshow';
  if (!/\b(?:this platform|my account)\b|на этой платформе|в (?:личном )?кабинете|осы платформада|жеке кабинет/iu.test(question) && deadlineCue.test(question) && (applicationCue.test(question) || /deadline|дедлайн|соңғы мерзім/iu.test(question))) return 'deadline';
  if (topics.venue.cues.test(question) && namedTrack.test(question)) return 'trackVenue';
  if (admissionCue.test(question) && !/\b(?:account|log[ -]?in|sign[ -]?in)\b|вход в (?:аккаунт|кабинет|систему)|аккаунт|жеке кабинет/iu.test(question)) return 'admission';
  return null;
}

export function findTopics(question) {
  const query = question.normalize('NFKC').trim();
  const priority = priorityTopic(query);
  if (priority) return [priority];
  const hits = Object.keys(topics).filter(id => topics[id].cues?.test(query));
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
