begin;
create temporary table gallery_test_ids as select gen_random_uuid() as family_a,gen_random_uuid() as family_b;
grant select on gallery_test_ids to authenticated,anon;
insert into auth.users(id,email,role,aud,email_confirmed_at)
select family_a,'gallery-a@example.invalid','authenticated','authenticated',now() from gallery_test_ids
union all select family_b,'gallery-b@example.invalid','authenticated','authenticated',now() from gallery_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select family_a::text from gallery_test_ids),true);
insert into public.club_gallery(user_id,title,image_data,image_hash) select family_a,'Private memory','data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAA=',repeat('a',64) from gallery_test_ids;
do $$ begin
 if (select count(*) from public.club_gallery)<>1 then raise exception 'Own memory unavailable';end if;
end $$;
select set_config('request.jwt.claim.sub',(select family_b::text from gallery_test_ids),true);
do $$ begin
 if exists(select 1 from public.club_gallery) then raise exception 'Other family can read gallery';end if;
 begin insert into public.club_gallery(user_id,title,image_data,image_hash) select family_a,'Intruder','data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAA=',repeat('b',64) from gallery_test_ids;raise exception 'Cross-family write accepted';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.club_gallery;raise exception 'Anonymous gallery read accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: family can save and read own memories; other families and anonymous users cannot access them; fixtures rolled back' as validation;
rollback;
