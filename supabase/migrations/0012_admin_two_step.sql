-- Two-step sign-in for admins (optional per admin, enforced once switched on).
-- An admin who has a verified authenticator-app factor only counts as admin for row-level security when the session
-- has passed the code check (JWT claim aal = 'aal2'). An admin with no factor is unchanged, so nobody is locked out
-- by this migration. Every admin policy and function already goes through is_admin(), so this is the only change.
-- Re-runnable. No data change.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin'
            and (
              coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
              or not exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified')
            )
       from public.profiles p
      where p.id = auth.uid() and p.active),
    false)
$$;
