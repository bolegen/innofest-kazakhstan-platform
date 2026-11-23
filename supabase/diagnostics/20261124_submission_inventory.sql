-- Read-only inventory before deciding whether to remove production submissions.
-- Run in the intended Supabase project's SQL Editor; no rows are changed.
select 'submissions' as object_name, count(*)::bigint as row_count
from public.submissions
union all
select 'reviews', count(*)::bigint from public.reviews
union all
select 'project-files objects', count(*)::bigint
from storage.objects where bucket_id = 'project-files';

-- Check all rows that would be affected, including imported sheet submissions.
select source, status, count(*)::bigint as row_count
from public.submissions
group by source, status
order by source, status;
