export interface CapacityFixtureIds {
  rooms: string[];
  profiles: string[];
}

interface ClosingPool {
  end(): Promise<void>;
}

interface CleanupPool extends ClosingPool {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

export async function cleanupCapacityFixture(
  admin: CleanupPool | null,
  service: ClosingPool | null,
  owned: CapacityFixtureIds,
) {
  const errors: unknown[] = [];
  try {
    if (admin) {
      await admin.query(
        "delete from wordpairs.profile_match_awards where match_id=any($1::text[])",
        [owned.rooms],
      );
      await admin.query(
        "delete from wordpairs.submissions where round_id in(select id from wordpairs.rounds where match_id=any($1::text[]))",
        [owned.rooms],
      );
      for (const table of ["rounds", "match_players"])
        await admin.query(
          `delete from wordpairs.${table} where match_id=any($1::text[])`,
          [owned.rooms],
        );
      await admin.query("delete from wordpairs.matches where id=any($1::text[])", [
        owned.rooms,
      ]);
      for (const table of [
        "deadline_jobs",
        "idempotency_records",
        "outbox_events",
      ])
        await admin.query(
          `delete from wordpairs.${table} where (aggregate_kind in ('room','match') and aggregate_id=any($1::text[])) or (aggregate_kind='profile' and aggregate_id=any($2::text[]))`,
          [owned.rooms, owned.profiles],
        );
      await admin.query(
        "delete from wordpairs.aggregates where (kind in ('room','match') and id=any($1::text[])) or (kind='profile' and id=any($2::text[]))",
        [owned.rooms, owned.profiles],
      );
      for (const table of [
        "room_invitations",
        "quick_assignments",
        "room_members",
      ])
        await admin.query(
          `delete from wordpairs.${table} where room_id=any($1::text[])`,
          [owned.rooms],
        );
      await admin.query("delete from wordpairs.rooms where id=any($1::text[])", [
        owned.rooms,
      ]);
      for (const table of ["sessions", "guest_credentials"])
        await admin.query(
          `delete from wordpairs.${table} where profile_id=any($1::text[])`,
          [owned.profiles],
        );
      await admin.query("delete from wordpairs.profiles where id=any($1::text[])", [
        owned.profiles,
      ]);
    }
  } catch (error) {
    errors.push(error);
  } finally {
    const closed = await Promise.allSettled([service?.end(), admin?.end()]);
    for (const result of closed)
      if (result.status === "rejected") errors.push(result.reason);
  }
  if (errors.length)
    throw new AggregateError(errors, "Capacity fixture cleanup failed");
}
