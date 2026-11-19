import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import DocumentDiagramDialog from './DocumentDiagramDialog.vue'

vi.mock('./diagram-image', () => ({
  svgToPng: vi.fn(async () => 'data:image/png;base64,abc'),
}))

describe('DocumentDiagramDialog', () => {
  it('inserts an organization chart as an image', async () => {
    i18n.global.locale.value = 'en'
    const insertImage = vi.fn(() => true)
    const wrapper = mount(DocumentDiagramDialog, {
      props: { insertImage },
      global: { plugins: [i18n], stubs: { teleport: true } },
    })

    expect(wrapper.text()).toContain('Director')
    await wrapper.get('[test-id="document-diagram-add-person"]').trigger('click')
    expect(wrapper.text()).toContain('New person')
    await wrapper.get('[test-id="document-diagram-insert"]').trigger('click')
    await flushPromises()

    expect(insertImage).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'data:image/png;base64,abc',
        alt: 'Organization chart',
      })
    )
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('switches to a process flow template', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(DocumentDiagramDialog, {
      props: { insertImage: () => true },
      global: { plugins: [i18n], stubs: { teleport: true } },
    })

    await wrapper.get('[test-id="document-diagram-process"]').trigger('click')
    expect(wrapper.text()).toContain('Start')
    expect(wrapper.text()).toContain('Approved?')
    expect(wrapper.get('[test-id="document-diagram-add-step"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
