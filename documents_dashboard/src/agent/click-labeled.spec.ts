import { describe, expect, it } from 'vitest'
import { clickLabeled } from './click-labeled'

describe('clickLabeled', () => {
    it('clicks a list option whose text matches', () => {
        document.body.innerHTML = `
            <ul>
                <li>Policy</li>
                <li>Procedure</li>
            </ul>
        `
        const policy = document.querySelector('li') as HTMLLIElement
        let clicked = false
        policy.addEventListener('click', () => {
            clicked = true
        })

        expect(clickLabeled('Policy')).toBe('policy')
        expect(clicked).toBe(true)
    })

    it('clicks an icon control from its aria-label', () => {
        document.body.innerHTML = `<div role="button" aria-label="Write with AI"></div>`
        const button = document.querySelector('[role="button"]') as HTMLElement
        let clicked = false
        button.addEventListener('click', () => {
            clicked = true
        })

        expect(clickLabeled('Write with AI')).toBe('write with ai')
        expect(clicked).toBe(true)
    })

    it('returns null when nothing matches', () => {
        document.body.innerHTML = `<button>Save</button>`
        expect(clickLabeled('Policy')).toBeNull()
    })
})
