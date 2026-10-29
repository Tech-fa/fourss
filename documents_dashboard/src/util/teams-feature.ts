/**
 * Teams / organization-unit management.
 * When false: hide admin teams UI, hide team pickers, always use the first available team.
 */
export const TEAMS_FEATURE_ENABLED = true

export const showTeamPicker = (teamCount: number) =>
    TEAMS_FEATURE_ENABLED && teamCount > 1

/** Always pick the first team while the feature is disabled. */
export const resolveSelectedTeams = <T>(teams: T[], preferred?: T[]): T[] => {
    if (!teams.length) return []
    if (!TEAMS_FEATURE_ENABLED) return [teams[0]]
    if (preferred?.length) return preferred
    if (teams.length === 1) return [teams[0]]
    return preferred || []
}

export const resolveSelectedTeam = <T>(teams: T[], preferred?: T | null): T | null => {
    if (!teams.length) return null
    if (!TEAMS_FEATURE_ENABLED) return teams[0]
    if (preferred) return preferred
    if (teams.length === 1) return teams[0]
    return preferred ?? null
}
