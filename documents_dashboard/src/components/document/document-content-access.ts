export function userCanEditDocumentContent(
    userId: string | undefined | null,
    document:
        | {
              createdBy?: { id?: string } | null
              contentContributors?: Array<{ id?: string } | null> | null
          }
        | null
        | undefined,
): boolean {
    if (!userId || !document) return false
    if (document.createdBy?.id === userId) return true
    return (document.contentContributors ?? []).some((person) => person?.id === userId)
}
