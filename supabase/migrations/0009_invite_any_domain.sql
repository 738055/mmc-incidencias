-- ============================================================================
-- Convites do admin podem usar QUALQUER domínio de e-mail.
-- A restrição de domínio (`app_config.allowed_email_domain`) passa a valer
-- SOMENTE para o autocadastro. Contas criadas pelo admin (provisioned=true) e o
-- primeiro usuário do sistema ficam isentos — permite convidar parceiros e
-- terceirizados de fora do domínio corporativo.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_email_domain text;
  v_is_first boolean;
  v_provisioned boolean;
  v_role public.user_role;
  v_status public.user_status;
  v_must boolean;
begin
  select not exists (select 1 from public.profiles) into v_is_first;
  v_provisioned := coalesce(new.raw_user_meta_data->>'provisioned', '') = 'true';

  -- Restrição de domínio: APENAS para autocadastro (nem o primeiro usuário, nem
  -- contas provisionadas pelo admin passam por este filtro).
  if not v_is_first and not v_provisioned then
    select allowed_email_domain into v_domain from public.app_config where id = true;
    v_email_domain := lower(split_part(new.email, '@', 2));
    if v_domain is not null and v_domain <> '' and v_email_domain <> lower(v_domain) then
      raise exception 'Domínio de e-mail não autorizado: %', v_email_domain
        using errcode = 'check_violation';
    end if;
  end if;

  if v_is_first then
    v_role := 'admin'; v_status := 'active'; v_must := false;
  elsif v_provisioned then
    v_role := coalesce(
      nullif(new.raw_user_meta_data->>'role', '')::public.user_role,
      'requester'::public.user_role
    );
    v_status := 'active';
    v_must := coalesce(new.raw_user_meta_data->>'must_change', '') = 'true';
  else
    v_role := 'requester'; v_status := 'pending'; v_must := false;
  end if;

  insert into public.profiles (id, email, full_name, role, status, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_status,
    v_must
  );

  return new;
end;
$$;

-- O trigger on_auth_user_created (0002/0006) continua apontando para esta função.
