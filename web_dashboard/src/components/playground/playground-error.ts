import { formatApiErrorMessage } from '@/util/util'

export function playgroundErrorMessage(
    error: unknown,
    t: (key: string, ...args: unknown[]) => string,
    fallback = ''
) {
    const data = (error as { response?: { data?: unknown } })?.response?.data
    return (
        formatApiErrorMessage(data, t, 'errors.playground') ||
        (error instanceof Error ? error.message : fallback)
    )
}
