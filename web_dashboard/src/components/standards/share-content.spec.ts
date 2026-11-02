import { describe, expect, it } from 'vitest'
import { bytesFromBase64Url, revealChunk, type EncryptedPart } from './share-content'

describe('shared document assembly', () => {
    it('decodes base64url', () => {
        expect([...bytesFromBase64Url('aGk')]).toEqual([104, 105])
    })

    it('restores a chunk only after both encrypted halves are combined', async () => {
        const chunk = new TextEncoder().encode('policy-page')
        const mask = crypto.getRandomValues(new Uint8Array(chunk.length))
        const materialPlain = new Uint8Array(chunk.length)
        for (let index = 0; index < chunk.length; index += 1) {
            materialPlain[index] = chunk[index] ^ mask[index]
        }
        const materialKey = crypto.getRandomValues(new Uint8Array(32))
        const coverKey = crypto.getRandomValues(new Uint8Array(32))

        const restored = await revealChunk(
            await encryptPart(materialPlain, materialKey),
            await encryptPart(mask, coverKey),
            bytesToBase64Url(materialKey),
            bytesToBase64Url(coverKey)
        )

        expect([...restored]).toEqual([...chunk])
    })
})

async function encryptPart(plain: Uint8Array, key: Uint8Array): Promise<EncryptedPart> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cryptoKey = await crypto.subtle.importKey('raw', asBuffer(key), 'AES-GCM', false, ['encrypt'])
    const encrypted = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, cryptoKey, asBuffer(plain))
    )
    return {
        iv: bytesToBase64Url(iv),
        data: bytesToBase64Url(encrypted.slice(0, -16)),
        tag: bytesToBase64Url(encrypted.slice(-16))
    }
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
