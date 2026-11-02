export type EncryptedPart = {
    iv: string
    tag: string
    data: string
}

export function bytesFromBase64Url(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }
    return bytes
}

export async function revealChunk(
    material: EncryptedPart,
    cover: EncryptedPart,
    materialKey: string,
    coverKey: string
): Promise<Uint8Array> {
    const [left, right] = await Promise.all([
        decryptPart(material, materialKey),
        decryptPart(cover, coverKey)
    ])
    if (left.length !== right.length) {
        throw new Error('Chunk length mismatch')
    }
    const out = new Uint8Array(left.length)
    for (let index = 0; index < left.length; index += 1) {
        out[index] = left[index] ^ right[index]
    }
    return out
}

async function decryptPart(part: EncryptedPart, key: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        toArrayBuffer(bytesFromBase64Url(key)),
        'AES-GCM',
        false,
        ['decrypt']
    )
    const data = bytesFromBase64Url(part.data)
    const tag = bytesFromBase64Url(part.tag)
    const cipherBytes = new Uint8Array(data.length + tag.length)
    cipherBytes.set(data, 0)
    cipherBytes.set(tag, data.length)
    const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(bytesFromBase64Url(part.iv)) },
        cryptoKey,
        toArrayBuffer(cipherBytes)
    )
    return new Uint8Array(plain)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
