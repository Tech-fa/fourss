export const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type VersionContentResponse = {
    content: string | null
    contentUrl?: string
    contentBase64?: string
}

export function docxBlobFromBase64(base64: string): Blob {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: DOCX_MIME })
}

/** Prefer the redacted file. A signed URL is only present when the caller may edit the words. */
export function versionContentDocxSource(
    data: VersionContentResponse
): string | Blob | null {
    if (data.contentBase64) return docxBlobFromBase64(data.contentBase64)
    if (data.contentUrl) return data.contentUrl
    return null
}
