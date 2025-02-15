-- Create new tables for test reporting
CREATE TABLE IF NOT EXISTS public.test_sessions
(
    id uuid default gen_random_uuid() not null primary key,
    commit_id text not null,
    environment text not null,
    meta JSONB default '{}'::jsonb not null,
    "timestamp" timestamp default now() not null
);

CREATE TABLE IF NOT EXISTS public.test_results
(
    test_session_id uuid not null references public.test_sessions(id),
    test_name text not null,
    timestamp timestamp default now() not null,
    duration interval,
    status varchar(50) not null
        constraint test_results_status_check
            check (status IN ('passed', 'failed', 'timedOut', 'interrupted', 'skipped')),
    report jsonb default '{}'::jsonb not null,

    constraint test_result_pk primary key (test_session_id, test_name)
);

-- grant permissions to new tables
grant delete, insert, references, select, trigger, truncate, update on public.test_sessions to grafana;
grant delete, insert, references, select, trigger, truncate, update on public.test_results to grafana;
