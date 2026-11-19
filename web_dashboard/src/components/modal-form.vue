<template>
    <div class="bg-white rounded-lg w-[500px] shadow-lg" test-id="modal-form">
      <Form
          @submit="handleSubmit"
          id="add-category-modal"
          :initial-values="formData"
          
          >
      <div class="p-6 border-b border-neutral-200">
          <div class="flex items-center justify-between">
              <h2 class="text-lg">{{ modalTitle }}</h2>
              <button
                  type="button"
                  class="text-neutral-400 hover:text-neutral-600"
                  @click="props.onClose"
                  test-id="modal-close-button"
              >
                  <i class="fa-solid fa-xmark text-xl"></i>
              </button>
          </div>
      </div>
      
      <div class="p-6 space-y-4">
              <div class="space-y-4">
                  <AppInputForm
                      name="name"
                      :label="t('training.modal_form.label_title')"
                      type="text"
                      :placeholder="namePlaceholder"
                      :rules="(v: any) => !v ? t('training.modal_form.rule_name_required') : true"
                      :required="true"
                      :test-id="`${testIdSlug}-title-input`"
                  />
                  <AppTextareaForm
                      name="description"
                      :label="t('training.modal_form.label_description')"
                      :placeholder="descriptionPlaceholder"
                      :test-id="`${testIdSlug}-description-textarea`"
                  />
              </div>
      </div>
      
      <div class="p-6 border-t border-neutral-200 flex justify-end gap-3">
          <AppButton
              buttonStyle="secondary"
              type="button"
              @click="props.onClose"
              :test-id="`${testIdSlug}-cancel-button`"
          >
              {{ t('common.cancel') }}
          </AppButton>
          
          <AppButton 
              buttonStyle="primary"
              type="submit"
              :loading="loading"
              :test-id="`${testIdSlug}-submit-button`"
          >
              {{ submitButtonLabel }}
          </AppButton>
      </div>
      </Form>
    </div>
  </template>
  <script setup lang="ts">
  import { ref, watch, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Form } from 'vee-validate';
  import AppInputForm from '@/components/AppInputForm.vue';
  import AppTextareaForm from '@/components/AppTextareaForm.vue';
  import AppButton from './AppButton.vue';

  const { t } = useI18n();

  const props = defineProps<{
      isEditMode?: boolean;
      loading?: boolean;
      formType: string;
      /** Optional stable slug for test-id attributes when formType is localized */
      testIdPrefix?: string;
      name?: string;
      initialData?: any;
      onSubmit: (values: any) => Promise<void>
      onClose: () => void;
      namePlaceholder: string;
      descriptionPlaceholder: string;
  }>();

  const testIdSlug = computed(
      () =>
          props.testIdPrefix ??
          props.formType.toLowerCase().replace(/\s/g, '-')
  );

  const modalTitle = computed(() =>
      props.isEditMode
          ? t('training.modal_form.title_edit', { type: props.formType })
          : t('training.modal_form.title_add', { type: props.formType })
  );

  const submitButtonLabel = computed(() => {
      const verb = props.isEditMode
          ? t('training.modal_form.update')
          : t('training.modal_form.create');
      return `${verb} ${props.formType}`;
  });
  const formData = ref<any>({
      name: props.initialData?.name ,
      description: props.initialData?.description,
  });
  watch(() => props.initialData, (newData) => {
      if (newData) {
          formData.value = { ...newData };
      }
  }, { immediate: true });

  const handleSubmit = async (values: any) => {
      const data = {
          id: props.initialData?.id,
          name: values.name,
          description: values.description,
      }
    await props.onSubmit(data);
  };
</script>