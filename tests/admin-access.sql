-- Run against the configured project. All fixtures are rolled back.
begin;
select set_config('request.jwt.claims',(select json_build_object('sub',id,'email',email,'role','authenticated')::text from auth.users where email='kencrowley2@gmail.com'),true);
set local role authenticated;
do $$
declare item uuid; n integer; founder_claims text;
begin
 founder_claims:=current_setting('request.jwt.claims');
 perform public.admin_overview();
 insert into public.admin_announcements(title,body,status,created_by) values('[transactional validation]','This fixture is rolled back.','draft',auth.uid()) returning id into item;
 select count(*) into n from public.admin_events where entity_id=item;if n<>1 then raise exception 'Audit trigger failed';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000019","email":"family@example.test","role":"authenticated","user_metadata":{"role":"admin"}}',true);
 select count(*) into n from public.admin_announcements where id=item;if n<>0 then raise exception 'Member can read a draft';end if;
 select count(*) into n from public.admin_message_reviews;if n<>0 then raise exception 'Member can read private reviews';end if;
 select count(*) into n from public.admin_events;if n<>0 then raise exception 'Member can read private audit events';end if;
 begin perform public.admin_overview();raise exception 'Member can read admin metrics';exception when insufficient_privilege then null;end;
 begin insert into public.admin_announcements(title,body,status,created_by) values('forged','forged','draft',auth.uid());raise exception 'Member can write announcement';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',founder_claims,true);
 update public.admin_announcements set status='published' where id=item;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000019","email":"family@example.test","role":"authenticated"}',true);
 select count(*) into n from public.admin_announcements where id=item;if n<>1 then raise exception 'Published announcement unavailable to family';end if;
 update public.admin_announcements set title='forged' where id=item;
 perform set_config('request.jwt.claims',founder_claims,true);
 if (select title from public.admin_announcements where id=item)='forged' then raise exception 'Family can modify announcement';end if;
 begin update public.admin_events set action='forged';raise exception 'Audit rows are mutable';exception when insufficient_privilege then null;end;
 raise notice 'PASS: founder access, member denial, draft privacy, published visibility, append-only audit, spoofed role denial';
end $$;
set local role anon;
do $$ begin
 begin perform public.admin_overview();raise exception 'Anonymous metrics exposed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.admin_announcements;raise exception 'Anonymous announcement access';exception when insufficient_privilege then null;end;
end $$;
rollback;
