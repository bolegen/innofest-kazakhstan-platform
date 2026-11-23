-- Five named projects reported for InnoFest Qyzylorda 2022.
-- Run manually in the project's Supabase SQL Editor after schema.sql.
-- No competition place is assigned without an explicit ranking in the source.
insert into public.archive_projects
  (year, title, summary, category, place, source_url)
values
  (2022, 'Cyber City хикаялары',
   'Комикс Софии Темірболат о безопасности детей в интернете; победитель секции «Контент&Медиа». Позднее проект получил патент и вышел в печати.',
   'Контент&Медиа', null,
   'https://www.gov.kz/org/kyzylorda/press/news/details/533089?lang=kk'),
  (2022, 'Очки для контроля сна',
   'Упомянуты среди проектов фестиваля; устройство и авторы в источнике не описаны.',
   'Не указано', null,
   'https://kzvesti.kz/newspaper-articles/smelym-idejam-vsestoronnjaja-podderzhka-77876/'),
  (2022, 'Внедорожник на солнечных батареях',
   'Упомянут среди проектов фестиваля; конструкция и авторы в источнике не описаны.',
   'Не указано', null,
   'https://kzvesti.kz/newspaper-articles/smelym-idejam-vsestoronnjaja-podderzhka-77876/'),
  (2022, 'Умный дом',
   'Упомянут среди проектов фестиваля; функции и авторы в источнике не описаны.',
   'Не указано', null,
   'https://kzvesti.kz/newspaper-articles/smelym-idejam-vsestoronnjaja-podderzhka-77876/'),
  (2022, 'Умный мусорный бак',
   'Упомянут среди проектов фестиваля; характеристики и авторы в источнике не описаны.',
   'Не указано', null,
   'https://kzvesti.kz/newspaper-articles/smelym-idejam-vsestoronnjaja-podderzhka-77876/')
on conflict (year, title) do nothing;
