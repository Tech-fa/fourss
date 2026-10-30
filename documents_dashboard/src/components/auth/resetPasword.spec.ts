import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import ResetPassword from './resetPasword.vue'
import { apiPostPublic } from '@/util/api'

const routeQuery: { code?: string } = {}

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ query: routeQuery }),
}))

vi.mock('@/util/api', () => ({
    apiPostPublic: vi.fn().mockResolvedValue('done'),
    apiGetPublic: vi.fn().mockResolvedValue('done'),
}))

const password = 'Password1!'

function mountForm() {
    window.localStorage.setItem('reset_email', 'user@example.com')
    return mount(ResetPassword, {
        global: {
            plugins: [createPinia(), i18n],
        },
    })
}

async function fillPasswords(wrapper: ReturnType<typeof mountForm>) {
    await wrapper.get('#new-password').setValue(password)
    await wrapper.get('#confirm-password').setValue(password)
}

describe('reset password', () => {
    beforeEach(() => {
        delete routeQuery.code
        vi.mocked(apiPostPublic).mockClear()
        window.localStorage.clear()
    })

    it('sends the verification code typed into the form', async () => {
        const wrapper = mountForm()
        const boxes = wrapper.findAll('input[maxlength="1"]')
        for (let index = 0; index < 6; index += 1) {
            await boxes[index].setValue(String(index + 1))
        }
        await fillPasswords(wrapper)

        await wrapper.get('#reset-code-form').trigger('submit')
        await flushPromises()

        expect(apiPostPublic).toHaveBeenCalledWith(
            '/auth/password/reset?code=123456',
            expect.objectContaining({
                email: 'user@example.com',
                password,
            })
        )
    })

    it('does not call the backend when the verification code is missing', async () => {
        const wrapper = mountForm()
        await fillPasswords(wrapper)

        await wrapper.get('#reset-code-form').trigger('submit')
        await flushPromises()

        expect(apiPostPublic).not.toHaveBeenCalled()
    })

    it('sends the verification code from the reset link', async () => {
        routeQuery.code = '654321'
        const wrapper = mountForm()
        await fillPasswords(wrapper)

        await wrapper.get('#reset-code-form').trigger('submit')
        await flushPromises()

        expect(apiPostPublic).toHaveBeenCalledWith(
            '/auth/password/reset?code=654321',
            expect.objectContaining({
                email: 'user@example.com',
                password,
            })
        )
    })
})
