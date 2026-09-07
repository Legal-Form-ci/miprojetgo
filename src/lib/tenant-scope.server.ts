/**
 * Portée multi-tenant MiPROJET Go.
 * Un admin d'activité ne doit voir QUE son propre espace :
 * lui-même + les membres qu'il a créés (go_team_members).
 */
export async function resolveGoTeamScope(
  supabaseAdmin: any,
  userId: string,
): Promise<{ ownerId: string; userIds: string[] }> {
  // Si le compte est membre d'une équipe, le propriétaire est le responsable.
  const { data: membership } = await supabaseAdmin
    .from("go_team_members")
    .select("owner_id")
    .eq("member_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const ownerId: string = membership?.owner_id ?? userId;

  const { data: members } = await supabaseAdmin
    .from("go_team_members")
    .select("member_id")
    .eq("owner_id", ownerId)
    .eq("active", true);

  const ids = new Set<string>([ownerId, userId]);
  for (const row of members ?? []) if (row?.member_id) ids.add(row.member_id as string);

  return { ownerId, userIds: [...ids] };
}
