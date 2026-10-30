export type DocumentContentActor = {
  createdBy?: { id?: string | null } | null;
  contentContributors?: Array<{
    id?: string | number | null;
    user?: { id?: string | null } | null;
  } | null> | null;
};

function contributorUserId(person: {
  id?: string | number | null;
  user?: { id?: string | null } | null;
}): string | undefined {
  if (person.user?.id) {
    return person.user.id;
  }
  return typeof person.id === "string" ? person.id : undefined;
}

export function userCanEditDocumentContent(
  userId: string | null | undefined,
  document: DocumentContentActor | null | undefined,
): boolean {
  if (!userId || !document) {
    return false;
  }
  if (document.createdBy?.id === userId) {
    return true;
  }
  return (document.contentContributors ?? []).some(
    (person) => !!person && contributorUserId(person) === userId,
  );
}

export type ContentContributorAddPlan =
  | { ok: true; userIds: string[] }
  | { ok: false; reason: "includes_owner" | "ineligible" };

export function planContentContributorAdd(input: {
  ownerId?: string | null;
  existingIds: string[];
  requestedIds: string[];
  eligibleIds: string[];
}): ContentContributorAddPlan {
  const requested = [
    ...new Set(input.requestedIds.filter((id) => !!id)),
  ];
  if (input.ownerId && requested.includes(input.ownerId)) {
    return { ok: false, reason: "includes_owner" };
  }
  const eligible = new Set(input.eligibleIds);
  if (requested.some((id) => !eligible.has(id))) {
    return { ok: false, reason: "ineligible" };
  }
  const existing = new Set(input.existingIds);
  return {
    ok: true,
    userIds: requested.filter((id) => !existing.has(id)),
  };
}
