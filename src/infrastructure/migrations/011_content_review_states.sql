-- Forward-only extension: keep historical pending/appeal rows and evidence.
begin;
alter table wordpairs.moderation_cases
  drop constraint moderation_cases_status_check;
alter table wordpairs.moderation_cases
  add constraint moderation_cases_status_check check (
    status in ('collecting', 'pending', 'pending_review', 'changes_requested',
               'on_hold', 'approved', 'rejected', 'appealed')
  );
drop index wordpairs.one_open_suggestion;
create unique index one_open_suggestion
  on wordpairs.moderation_cases(proposer_id)
  where kind = 'suggestion' and
    status in ('collecting', 'pending', 'pending_review', 'changes_requested', 'appealed');
commit;
