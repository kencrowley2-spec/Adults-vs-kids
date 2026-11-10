-- Transaction-only authority fixtures; no emails, actual payments or lasting test records.
begin;
create temporary table analytics_fixture as select gen_random_uuid() user_id,gen_random_uuid() match_id;
grant select on analytics_fixture to service_role;
insert into auth.users(id,role,aud,email_confirmed_at) select user_id,'authenticated','authenticated',now() from analytics_fixture;
insert into public.arcade_results(id,user_id,mode,game_ids,round_winners) select match_id,user_id,'single',array['memory'],array[0,0,0]::smallint[] from analytics_fixture;
set local role service_role;
do $$
declare v uuid:=gen_random_uuid(); a jsonb; b jsonb; c jsonb; qa jsonb; uid uuid; mid uuid; sid uuid; event_id uuid:=gen_random_uuid(); payload jsonb; n int; cid text:='cs_test_analyticsfixture'||replace(gen_random_uuid()::text,'-','');
begin
 select user_id,match_id into uid,mid from analytics_fixture;
 if has_function_privilege('anon','public.analytics_context(jsonb)','execute') or has_function_privilege('authenticated','public.platform_funnel()','execute') or has_table_privilege('authenticated','public.analytics_sessions','select') then raise exception 'Private analytics exposed'; end if;
 a:=public.analytics_context(jsonb_build_object('visitor',v,'path','/family-games','referrer','chatgpt.com','utm',jsonb_build_object('source','qa_fixture','medium','internal','campaign','avk_funnel_check')));sid:=(a->>'id')::uuid;
 b:=public.analytics_context(jsonb_build_object('visitor',v,'session',sid,'path','/downloads','referrer','adultsvskids.com','utm',jsonb_build_object('source','replacement')));
 if a->>'id'<>b->>'id' or b->>'source'<>'qa_fixture' or b->>'landing_path'<>'/family-games' or b->>'utm_campaign'<>'avk_funnel_check' then raise exception 'Active attribution overwritten'; end if;
 perform public.analytics_event(sid,'page_view',event_id,null,'','/family-games','Mobile','browser');
 perform public.analytics_event(sid,'page_view',event_id,null,'','/family-games','Mobile','browser');
 select count(*) into n from public.platform_events where analytics_session_id=sid and event_type='page_view';if n<>1 then raise exception 'Replay inflated landing views'; end if;
 perform public.analytics_event(sid,'game_start',mid,null,'memory','/arcade','Mobile','browser');
 perform public.analytics_event(sid,'game_complete',mid,null,'memory','/arcade','Mobile','browser');
 perform public.analytics_event(sid,'game_complete',mid,uid,'memory','/arcade','Mobile','saved_result');
 perform public.analytics_event(sid,'game_complete',mid,uid,'memory','/arcade','Mobile','saved_result');
 select count(*) into n from public.platform_events where analytics_session_id=sid and event_type='game_complete';if n<>1 then raise exception 'Completion replay inflated'; end if;
 select count(*) into n from public.platform_events where user_id=uid and event_type='first_completed_game';if n<>1 then raise exception 'First completion missing/duplicated'; end if;
 perform public.analytics_account(uid,sid,'intent');
 if exists(select 1 from public.platform_events where user_id=uid and event_type='signup') then raise exception 'Unverified intent counted';end if;
 perform public.analytics_account(uid,sid,'verified');perform public.analytics_account(uid,sid,'verified');
 select count(*) into n from public.platform_events where user_id=uid and event_type='signup';if n<>1 then raise exception 'Signup missing/duplicated';end if;
 insert into public.analytics_checkouts(checkout_id,session_id,user_id,livemode) values(cid,sid,uid,true);
 -- Unpaid/no-order checkout cannot become a purchase.
 perform public.analytics_purchase(cid);if exists(select 1 from public.platform_events where payment_session=cid) then raise exception 'Unpaid purchase counted';end if;
 insert into public.pdf_orders(session_id,user_id,product_ids,book_ids,amount_total,currency,status,payment_intent_id,paid_at) values(cid,uid,array['coloring'],array['book-1'],299,'usd','paid','pi_fixture',now());
 perform public.analytics_purchase(cid);perform public.analytics_purchase(cid);
 select count(*) into n from public.platform_events where payment_session=cid;if n<>1 then raise exception 'Purchase replay inflated';end if;
 payload:=public.platform_funnel();
 select (x->>'purchases')::int into n from jsonb_array_elements(payload->'sources') x where x->>'source'='qa_fixture' and x->>'n'='7';if n<>1 then raise exception 'Paid purchase missing from source report';end if;
 update public.pdf_orders set status='revoked' where session_id=cid;
 payload:=public.platform_funnel();select (x->>'purchases')::int into n from jsonb_array_elements(payload->'sources') x where x->>'source'='qa_fixture' and x->>'n'='7';if n<>0 then raise exception 'Refund still counted';end if;
 update public.analytics_sessions set last_seen_at=now()-interval '31 minutes' where id=sid;
 c:=public.analytics_context(jsonb_build_object('visitor',v,'session',sid,'path','/downloads','utm',jsonb_build_object('source','return_campaign')));
 if a->>'id'=c->>'id' or c->>'first_session_id'<>a->>'id' or c->>'source'<>'return_campaign' then raise exception '31-minute expiry/first touch failed';end if;
 -- Mark the visitor as internal, including its prior conversion session.
 b:=public.analytics_context(jsonb_build_object('visitor',v,'session',sid,'internal',true));
 update public.analytics_sessions set is_internal_test=true where visitor_id=v;
 payload:=public.platform_funnel();if exists(select 1 from jsonb_array_elements(payload->'sources') x where x->>'source'='qa_fixture') then raise exception 'QA leaked into growth';end if;
 qa:=public.analytics_context(jsonb_build_object('visitor',gen_random_uuid(),'path','/family-games','internal',true,'test_run',gen_random_uuid()));
 update public.analytics_sessions set last_seen_at=now()-interval '31 minutes' where id=(qa->>'id')::uuid;
 b:=public.analytics_context(jsonb_build_object('visitor',qa->>'visitor_id','session',qa->>'id'));
 if b->>'is_internal_test'<>'true' or b->>'test_run_id' is distinct from qa->>'test_run_id' then raise exception 'Excluded QA lost after session expiry';end if;
 perform public.platform_analytics();
end $$;
rollback;
