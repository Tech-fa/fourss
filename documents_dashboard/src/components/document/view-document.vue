<template>
    <div id="main-container" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crums" test-id="breadcrumbs">
            <div class="flex gap-2">
                <Can v-if="documentData && !editorVersionHasContent(documentData?.versions[documentData?.versions.length - 1] as DocumentVersion) && documentData?.contentType == ContentType.EDITOR && documentData?.createdBy?.id === authStore.state.userDetails.id"
                    subject="documents" :actions="['update']">
                    <IconTooltipButton buttonStyle="secondary" class="px-2 py-1 text-sm"
                        :href="`/plan/documents/${documentId}/new-version?fillPendingVersion=${documentData?.versions.find(v => v.versionNumber === currentVersion)?.id}&redirect=${encodeURIComponent(`/plan/documents/${documentId}`)}`"
                        :aria-label="t('document.view.add_content_aria')
                            " :title="t('document.view.add_content_title')" test-id="add-content-version-button"
                        icon-class="fa-solid fa-plus" :text="t('document.view.add_content')" tooltip-placement="left" />
                </Can>
                <Can v-if="documentData && !checklistVersionHasContent(documentData?.versions[documentData?.versions.length - 1] as DocumentVersion) && documentData?.contentType == ContentType.CHECKLIST && documentData?.createdBy?.id === authStore.state.userDetails.id"
                    subject="documents" :actions="['update']">
                    <IconTooltipButton buttonStyle="secondary" class="px-2 py-1 text-sm"
                        :href="checklistVersionUrl(documentData?.versions.find(v => v.versionNumber === currentVersion)?.id)"
                        :aria-label="t('document.view.add_content_aria')"
                        :title="t('document.view.add_content_title')"
                        test-id="add-checklist-content-button"
                        icon-class="fa-solid fa-plus" :text="t('document.view.add_content')" tooltip-placement="left" />
                </Can>
                <Can subject="documents" :actions="['update']">
                    <IconTooltipButton buttonStyle="secondary" test-id="edit-document-button"
                        icon-class="fa-solid fa-pen-to-square" :text="t('document.view.edit_document')"
                        :href="`/plan/documents/${documentId}/edit?redirect=/plan/documents/${documentId}`"
                        v-if="isDocumentCreator && showEditDocumentButton">

                    </IconTooltipButton>
                </Can>
                <Can subject="documents" :actions="['update']" v-if="
                    documentData?.createdBy?.id === authStore.state.userDetails.id &&
                    (documentData?.versions[documentData?.versions.length - 1].versionNumber !==
                        documentData?.currentVersion || (
                            documentData.contentType === ContentType.FILE && (
                                !documentData?.versions[documentData?.versions.length - 1].file ||
                                !String(documentData?.versions[documentData?.versions.length - 1].file).trim()))
                        || (documentData.contentType === ContentType.CHECKLIST &&
                            !checklistVersionHasContent(documentData?.versions[documentData?.versions.length - 1] as DocumentVersion))
                        || documentData.versions[documentData?.versions.length - 1].status === DocumentStatus.PENDING
                    )
                ">
                    <IconTooltipButton v-if="documentData?.contentType === ContentType.FILE" buttonStyle="secondary"
                        class="px-2 py-1 text-sm"
                        @click="uploadVersionFile(documentData?.versions[documentData?.versions.length - 1] as any)"
                        :aria-label="t('document.view.upload_version_aria', {
                            n: documentData?.versions[documentData?.versions.length - 1].versionNumber
                        })
                            " :title="t('document.view.upload_version_title', {
                                n: documentData?.versions[documentData?.versions.length - 1].versionNumber
                            })
                                " test-id="upload-version-file-button" icon-class="fa-solid fa-upload" :text="documentData?.versions[documentData?.versions.length - 1].file
                                    ? t('document.view.replace_file')
                                    : t('document.view.upload_file')" />

                    <IconTooltipButton v-else-if="documentData?.contentType === ContentType.CHECKLIST" buttonStyle="secondary"
                        test-id="edit-checklist-version-button"
                        icon-class="fa-solid fa-pen" :text="t('document.view.edit_version')"
                        :href="checklistVersionUrl(documentData?.versions[documentData?.versions.length - 1].id)" />

                    <IconTooltipButton v-else-if="documentData?.contentType === ContentType.EDITOR" buttonStyle="secondary" test-id="edit-document-button"
                        icon-class="fa-solid fa-pen" :text="t('document.view.edit_version')"
                        :href="`/plan/documents/${documentId}/edit-version?redirect=/plan/documents/${documentId}&fillPendingVersion=${documentData?.versions[documentData?.versions.length - 1].id}`" />

                </Can>

                <Can subject="documents" :actions="['update']">
                    <IconTooltipButton v-if="canCreateNewVersion" icon-class="fa-solid fa-plus"
                        :text="t('document.view.create_new_version')" buttonStyle="warning"
                        @click="createNewVersion" test-id="create-new-version-button">

                    </IconTooltipButton>
                </Can>
                <IconTooltipButton
                    v-if="showAcknowledgeControl"
                    :buttonStyle="hasAcknowledged ? 'success' : 'secondary'"
                    @click="!hasAcknowledged && acknowledgeDocument()"
                    :disabled="actionLoading || hasAcknowledged"
                    :loading="actionLoading"
                    icon-class="fa-solid fa-check"
                    :text="hasAcknowledged
                        ? t('document.view.acknowledged')
                        : t('document.view.acknowledge')"
                    :aria-label="hasAcknowledged
                        ? t('document.view.acknowledged_version_aria', {
                            n: latestVersion?.versionNumber ?? 0
                        })
                        : t('document.view.acknowledge_version_aria', {
                            n: latestVersion?.versionNumber ?? 0
                        })"
                    :title="hasAcknowledged
                        ? t('document.view.acknowledged_version_title', {
                            n: latestVersion?.versionNumber ?? 0
                        })
                        : t('document.view.acknowledge_version_title', {
                            n: latestVersion?.versionNumber ?? 0
                        })"
                    tooltip-placement="bottom"
                    test-id="acknowledge-document-button"
                />
                <Can subject="documents" :actions="['delete']">
                    <IconTooltipButton buttonStyle="danger" @click="deleteDocument" test-id="delete-document-button"
                        :warn-before="t('document.view.delete_confirm')" icon-class="fa-solid fa-trash"
                        :text="t('document.view.delete_document')">

                    </IconTooltipButton>
                </Can>
                <Can subject="change_requests" :actions="['read']">
                    <IconTooltipButton v-if="!!changeRequest" buttonStyle="secondary"
                        @click="() => viewChangeRequest(changeRequest as any)" test-id="view-change-request-button"
                        icon-class="fa-solid fa-file-circle-plus" :text="t('document.view.view_change_request')" />

                </Can>
            </div>
        </BreadCrums>
        <div v-if="isLoading" class="flex items-center justify-center h-screen">
            <Spinner width="5" />
        </div>
        <main id="main-content" class="p-6" v-else-if="documentData">
            <div class="space-y-6">
                <div id="document-content" class="space-y-6" test-id="document-details-view">
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)] lg:items-start">
                            <div v-if="showLatestVersionPreview"
                                class="overflow-x-auto flex max-h-[800px] min-h-0 min-w-0 flex-col rounded-lg border border-neutral-200 bg-white p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)]"
                                test-id="latest-version-preview-section">
                                <h2 class="shrink-0 text-lg mb-4 flex flex-wrap items-center justify-between gap-2"
                                    test-id="latest-version-preview-heading">
                                    <span>{{ t('document.view.latest_version_preview') }}</span>
                                    <span class="flex flex-wrap items-center gap-2">
                                        <span v-if="latestDocumentVersion" class="text-sm font-normal text-neutral-500"
                                            test-id="latest-version-preview-version-label">
                                            {{
                                                t('document.view.version_number', {
                                                    n: currentVersion
                                                })
                                            }}
                                        </span>
                                    </span>
                                </h2>
                                <Notice v-if="documentData.contentType === ContentType.EDITOR" :description="t('document.view.document_comment_notice')" level="info" class="mb-4"/>
                                <div class="h-[800px] overflow-y-auto overflow-x-auto 2xl:min-w-[1000px]">
                                    <div v-if="previewLoading" class="flex justify-center py-12">
                                        <Spinner width="5" />
                                    </div>
                                    <template v-else-if="documentData.contentType === ContentType.EDITOR">
                                        <div v-if="previewDocxUrl"
                                            class="h-[1200px] overflow-hidden rounded border border-neutral-100"
                                            test-id="latest-version-preview-docx">
                                            <SuperDocEditor
                                                ref="previewSuperDocRef"
                                                :document="previewDocxUrl"
                                                document-mode="viewing"
                                                :role="canCommentOnSuperdoc ? 'suggester' : 'viewer'"
                                                :can-comment="canCommentOnSuperdoc"
                                                :show-highlight-toolbar="canHighlightOnDocument"
                                                :user="superdocUser"
                                                :hide-toolbar="true"
                                                @ready="onPreviewSuperdocReady"
                                                @comment-selected="onPreviewCommentSelected"
                                                @comment-saved="schedulePreviewReviewDocSave"
                                                @highlight-saved="schedulePreviewReviewDocSave"
                                                @copy-comment-link="copyCommentLink"
                                                @copy-node-link="copyNodeLink"
                                            />
                                        </div>
                                        <template v-else-if="previewEditorContent">
                                            <DocumentContentBody :content="previewEditorContent" />
                                        </template>
                                        <div v-else
                                            class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
                                            test-id="latest-version-preview-empty">
                                            <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
                                            <p class="text-sm">
                                                {{
                                                    previewLoadError
                                                        ? t('document.view.preview_load_failed')
                                                        : t('document.view.preview_unavailable')
                                                }}
                                            </p>
                                        </div>
                                    </template>
                                    <template v-else-if="documentData.contentType === ContentType.CHECKLIST">
                                        <DocumentChecklistViewer
                                            :questions="selectedVersionChecklistQuestions"
                                            :empty-message="t('document.view.preview_unavailable')"
                                        />
                                    </template>
                                    <template v-else>
                                        <div style="height: min(70vh, 600px);">
                                            <DocumentFilePreview v-if="selectedVersionPreviewFileKey"
                                                :file-key="selectedVersionPreviewFileKey" />
                                            <div v-else
                                                class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
                                                test-id="latest-version-preview-empty">
                                                <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
                                                <p class="text-sm text-neutral-600">
                                                    {{ t('document.view.preview_no_file') }}
                                                </p>
                                                <Can
                                                    v-if="selectedVersion && canUploadSelectedVersionFile"
                                                    subject="documents"
                                                    :actions="['update']"
                                                >
                                                    <AppButton
                                                        type="button"
                                                        buttonStyle="primary"
                                                        @click="uploadVersionFile(selectedVersion)"
                                                        test-id="preview-upload-version-file-button"
                                                    >
                                                        <i class="fa-solid fa-upload me-2"></i>
                                                        {{ t('document.view.upload_file') }}
                                                    </AppButton>
                                                </Can>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>
                            <div :class="[
                                'flex min-w-0 flex-col gap-6',
                                !showLatestVersionPreview ? 'xl:col-span-2' : ''
                            ]">
                                <div class="rounded-lg border border-neutral-200 bg-white p-4" test-id="status-section">
                                    <div class="flex flex-col gap-3">
                                        <div class="flex min-w-0 flex-wrap items-center gap-3">
                                            <h2 class="shrink-0 text-lg" test-id="status-heading">
                                                {{ t('document.view.status_label') }}:
                                                <span :class="[
                                                    'rounded-full bg-neutral-100 px-2 py-1 text-sm'
                                                ]" test-id="status-badge">{{
                                                    documentStatusLabel(
                                                        documentData?.versions.find(
                                                            (v) =>
                                                                v.versionNumber === currentVersion
                                                        )?.status || ''
                                                    )
                                                }}</span>
                                            </h2>
                                            <div v-if="
                                                ['published', 'obsolete'].includes(
                                                    documentData?.versions.find(
                                                        (v) =>
                                                            v.versionNumber === currentVersion
                                                    )?.status || ''
                                                )
                                            " class="flex min-w-0 flex-wrap items-center gap-2"
                                                test-id="actions-done-section">
                                                <span v-for="(action, index) in actionsDone" :key="action.actionMessage"
                                                    class="flex items-center gap-2" :test-id="`action-item-${index}`">
                                                    <MemberIcon :member="{
                                                        fname: action.fname,
                                                        lname: action.lname,
                                                        image: '',
                                                        index
                                                    }" />
                                                    <span class="flex flex-col">
                                                        <span test-id="action-user-name">{{ action.fname }} {{
                                                            action.lname }}</span>
                                                        <span class="text-xs text-neutral-500"
                                                            test-id="action-message-time">{{ action.actionMessage
                                                            }} -
                                                            {{ action.time }}</span>
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div class="min-w-0 border-t border-neutral-100 pt-3">
                                            <DocumentStatusManager v-if="showDocumentStatusManager"
                                                :documentData="documentData" :actionLoading="actionLoading"
                                                :reviewers="reviewersWithStatus" :approvers="approversWithStatus"
                                                @postAction="postAction" @markObsolete="markObsolete"
                                                @overrideApprove="overrideApprove" :currentVersion="selectedVersion" />
                                            <span v-else class="text-sm text-neutral-600">{{
                                                statusReviewBlockedMessage
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-span-2 rounded-lg border border-neutral-200 bg-white p-3"
                                    test-id="document-information-section">
                                    <h2 class="mb-2 text-lg font-semibold text-neutral-900"
                                        test-id="document-information-heading">
                                        {{ t('document.view.document_information') }}
                                    </h2>
                                    <h2 v-if="documentStatus === 'obsolete'" class="mb-2 text-lg font-bold text-red-700"
                                        test-id="obsolete-warning">
                                        {{ t('document.view.obsolete_banner') }}
                                    </h2>
                                    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
                                        <div test-id="document-title-field" class="min-w-0">
                                            <h3 class="text-sm text-neutral-500" test-id="document-title-label">
                                                {{ t('document.view.label_title') }}
                                            </h3>
                                            <p class="text-sm leading-snug text-neutral-900 wrap-break-word"
                                                test-id="document-title-value">
                                                {{ documentData?.title }}
                                            </p>
                                        </div>
                                        <div test-id="document-code-field" class="min-w-0">
                                            <h3 class="text-sm text-neutral-500" test-id="document-code-label">
                                                {{ t('document.view.label_code') }}
                                            </h3>
                                            <p class="text-sm leading-snug text-neutral-900 wrap-break-word"
                                                test-id="document-code-value">
                                                {{ documentData?.documentCode }}
                                            </p>
                                        </div>

                                        <div test-id="document-last-modified-field" class="min-w-0">
                                            <h3 class="text-sm text-neutral-500" test-id="document-last-modified-label">
                                                {{ t('document.view.label_last_modified') }}
                                            </h3>
                                            <p class="text-sm leading-snug text-neutral-900 wrap-break-word"
                                                test-id="document-last-modified-value">
                                                {{ documentData?.updatedAt ? formatLocalDate(documentData.updatedAt) : '' }}
                                            </p>
                                        </div>
                                        <div test-id="document-version-field" class="min-w-0">
                                            <h3 class="text-sm text-neutral-500" test-id="document-version-label">
                                                {{ t('document.view.label_version') }}
                                            </h3>
                                            <p class="text-sm leading-snug text-neutral-900 wrap-break-word"
                                                test-id="document-version-value">
                                                {{ documentData?.currentVersion }}
                                            </p>
                                        </div>
                                        <AppButton v-if="
                                            (documentData?.contentType === ContentType.EDITOR &&
                                                canViewOrDownloadEditorContent) ||
                                            (documentData?.contentType === ContentType.CHECKLIST &&
                                                canViewChecklistContent)
                                        " buttonStyle="secondary"
                                            class="col-span-full mt-1 flex w-full items-center justify-center gap-2 py-2"
                                            @click="viewContent" test-id="view-content-button">
                                            <i class="fa-solid fa-file-lines"></i>
                                            {{ t('document.view.view_content') }}
                                        </AppButton>
                                        <AppButton v-if="
                                            documentData?.contentType === ContentType.FILE ||
                                            (documentData?.contentType === ContentType.EDITOR &&
                                                canViewOrDownloadEditorContent)
                                        " buttonStyle="primary"
                                            class="col-span-full flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
                                            :loading="downloadLoading" @click="downloadDocument()"
                                            test-id="download-document-button">
                                            <i class="fa-solid fa-download"></i>
                                            {{ t('document.view.download_document') }}
                                        </AppButton>
                                    </div>
                                </div>

                                <!-- People -->
                                <div class="bg-white border border-neutral-200 rounded-lg p-4 col-span-2 max-h-[5000px] overflow-y-auto"
                                    test-id="people-section">
                                    <h2 class="text-lg mb-4" test-id="people-heading">
                                        {{ t('document.view.people_heading') }}
                                    </h2>
                                    <div class="space-y-4">
                                        <div test-id="owner-field">
                                            <h3 class="text-sm text-neutral-500 mb-2" test-id="owner-label">
                                                {{ t('document.view.label_owner') }}
                                            </h3>
                                            <div class="flex items-center gap-2" test-id="owner-value">
                                                <MemberIcon :member="{
                                                    fname: documentData?.createdBy?.fname || '',
                                                    lname: documentData?.createdBy?.lname || '',
                                                    image: '',
                                                    index: 0
                                                }" />
                                                <span>{{ documentData?.createdBy?.fname }}
                                                    {{ documentData?.createdBy?.lname }}</span>
                                            </div>
                                        </div>

                                        <div v-if="reviewersWithStatus?.length" test-id="reviewers-field">
                                            <h3 class="text-sm text-neutral-500 mb-2" test-id="reviewers-label">
                                                {{ t('document.view.label_reviewers') }}
                                            </h3>
                                            <div class="space-y-2" test-id="reviewers-list">
                                                <div v-for="(reviewer, index) in reviewersWithStatus" :key="reviewer.id"
                                                    class="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-neutral-50"
                                                    :test-id="`reviewer-item-${reviewer.id}`">
                                                    <div class="flex items-center gap-2">
                                                        <MemberIcon :member="{
                                                            fname: reviewer.fname || '',
                                                            lname: reviewer.lname || '',
                                                            image: '',
                                                            index: index
                                                        }" />
                                                        <div class="flex flex-col">
                                                            <span class="text-sm font-medium">
                                                                {{ reviewer.fname }} {{ reviewer.lname }}
                                                            </span>
                                                            <span
                                                                v-if="
                                                                    documentData?.approvalStrategy
                                                                        ?.allowOrdering &&
                                                                    !documentData?.approvalStrategy
                                                                        ?.allReviewers
                                                                "
                                                                class="text-xs text-neutral-500"
                                                            >
                                                                {{
                                                                    t('document.view.approval_order', {
                                                                        order: reviewer.order ?? 1
                                                                    })
                                                                }}
                                                            </span>
                                                            <span :class="[
                                                                'text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit',
                                                                reviewer.action === 'reviewed'
                                                                    ? 'text-green-600 bg-green-50'
                                                                    : reviewer.action ===
                                                                        'reviewed_rejected'
                                                                        ? 'text-red-600 bg-red-50'
                                                                        : 'text-gray-600 bg-gray-50'
                                                            ]">
                                                                <i :class="[
                                                                    reviewer.action === 'reviewed'
                                                                        ? 'fa-solid fa-check'
                                                                        : reviewer.action ===
                                                                            'reviewed_rejected'
                                                                            ? 'fa-solid fa-times'
                                                                            : reviewer.versionStatus == DocumentStatus.PENDING
                                                                                ? 'fa-solid fa-clock'
                                                                                : 'fa-solid fa-exclamation-circle'
                                                                ]"></i>
                                                                {{ reviewer.actionMessage }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span class="text-xs text-neutral-400">
                                                        {{ reviewer.time || '' }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mt-4" v-if="approversWithStatus?.length" test-id="approvers-field">
                                            <h3 class="text-sm text-neutral-500 mb-2" test-id="approvers-label">
                                                {{ t('document.view.label_approvers') }}
                                            </h3>
                                            <div class="space-y-2" test-id="approvers-list">
                                                <div v-for="(approver, index) in approversWithStatus" :key="approver.id"
                                                    class="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-neutral-50"
                                                    :test-id="`approver-item-${approver.id}`">
                                                    <div class="flex items-center gap-2">
                                                        <MemberIcon :member="{
                                                            fname: approver.fname || '',
                                                            lname: approver.lname || '',
                                                            image: '',
                                                            index: index
                                                        }" />
                                                        <div class="flex flex-col">
                                                            <span class="text-sm font-medium">
                                                                {{ approver.fname }} {{ approver.lname }}
                                                            </span>
                                                            <span
                                                                v-if="
                                                                    documentData?.approvalStrategy
                                                                        ?.allowOrdering &&
                                                                    !documentData?.approvalStrategy
                                                                        ?.allApprovers
                                                                "
                                                                class="text-xs text-neutral-500"
                                                            >
                                                                {{
                                                                    t('document.view.approval_order', {
                                                                        order: approver.order ?? 1
                                                                    })
                                                                }}
                                                            </span>
                                                            <span :class="[
                                                                'text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit',
                                                                approver.action === 'approved'
                                                                    ? 'text-green-600 bg-green-50'
                                                                    : approver.action === 'rejected'
                                                                        ? 'text-red-600 bg-red-50'
                                                                        : 'text-gray-600 bg-gray-50'
                                                            ]">
                                                                <i :class="[
                                                                    approver.action === 'approved'
                                                                        ? 'fa-solid fa-check'
                                                                        : approver.action === 'rejected'
                                                                            ? 'fa-solid fa-times'
                                                                            : [DocumentStatus.READY_FOR_APPROVAL, DocumentStatus.PENDING].includes(approver.versionStatus || DocumentStatus.READY_FOR_APPROVAL)
                                                                                ? 'fa-solid fa-clock'
                                                                                : 'fa-solid fa-exclamation-circle'
                                                                ]"></i>
                                                                {{ approver.actionMessage }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span class="text-xs text-neutral-400">
                                                        {{ approver.time || '' }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-white border border-neutral-200 rounded-lg p-4 col-span-2 max-h-[500px] overflow-y-auto"
                                    test-id="version-history-section">
                                    <h2 class="text-lg mb-4 flex justify-between items-center flex-wrap"
                                        test-id="version-history-heading">
                                        {{ t('document.view.version_history') }}
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <Can subject="documents" :actions="['update']">
                                                <span v-if="
                                                    changeRequest &&
                                                    ['published', 'obsolete'].includes(
                                                        documentStatus || ''
                                                    ) &&
                                                    documentData?.currentVersion ==
                                                    documentData?.versions[
                                                        documentData?.versions.length - 1
                                                    ].versionNumber &&
                                                    documentStatus !== 'obsolete'
                                                " class="text-sm text-neutral-500">
                                                    {{ t('document.view.review_change_request') }}
                                                </span>
                                            </Can>
                                            <Can subject="documents" :actions="['read']">
                                                <IconTooltipButton v-if="
                                                    documentData?.contentType === ContentType.EDITOR &&
                                                    (documentData?.versions?.length ?? 0) > 1
                                                " buttonStyle="primary" test-id="compare-versions-button"
                                                    @click="goToCompareVersions"
                                                    icon-class="fa-solid fa-arrows-left-right"
                                                    :text="t('document.view.compare')" />
                                            </Can>
                                        </div>
                                    </h2>
                                    <div class="space-y-3" test-id="version-history-list">
                                        <div v-for="(version, index) in [
                                            ...(documentData?.versions || [])
                                        ].reverse()" :key="version.id"
                                            @click="() => (currentVersion = version.versionNumber)"
                                            class="flex flex-col items-start gap-2 hover:bg-neutral-50 p-2 rounded transition-colors"
                                            :class="{
                                                'text-neutral-500': index !== 0,
                                                'bg-neutral-100': currentVersion == version.versionNumber
                                            }" :test-id="`version-item-${version.versionNumber}`" tabindex="0">
                                            <div class="flex flex-col items-start gap-2">
                                                <div class="flex items-center gap-2">
                                                    <span>{{
                                                        t('document.view.version_number', {
                                                            n: version.versionNumber
                                                        })
                                                    }}</span>
                                                    <span class="text-xs px-2 py-1 rounded-full capitalize"
                                                        :class="versionStatusBadgeClass(version.status)">
                                                        {{ documentStatusLabel(version.status) }}
                                                    </span>
                                                    <span v-if="
                                                        documentData?.currentVersion ===
                                                        version.versionNumber
                                                    " class="text-sm text-neutral-500">{{
                                                        t('document.view.current_version_badge')
                                                        }}</span>
                                                    <span v-else-if="
                                                        documentData?.currentVersion <
                                                        version.versionNumber
                                                    " class="text-sm text-neutral-500">{{
                                                        t('document.view.version_under_review') }}</span>
                                                </div>
                                                <div class="flex flex-row justify-between w-full gap-2">
                                                    <div class="flex flex-col gap-2">
                                                        <span v-if="version.changes"
                                                            class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full cursor-pointer"
                                                            @click="showVersionChanges(version)"
                                                            :title="t('document.view.has_changes_tooltip')">
                                                            <i class="fa-solid fa-info-circle mr-1"></i>
                                                            {{ t('document.view.has_changes') }}
                                                        </span>
                                                        <span @click="
                                                            viewChangeRequest(version.changeRequest!)
                                                            " v-if="version.changeRequest"
                                                            class="text-xs text-neutral-500 text-underline bg-blue-100 px-2 py-1 rounded-full cursor-pointer">
                                                            {{ t('document.view.from_change_request') }}
                                                        </span>
                                                        <span v-if="version.createdBy"
                                                            class="text-xs text-neutral-500 text-underline bg-blue-100 px-2 py-1 rounded-full cursor-pointer">
                                                            {{
                                                                t('document.view.version_by', {
                                                                    fname: version.createdBy.fname,
                                                                    lname: version.createdBy.lname
                                                                })
                                                            }}
                                                        </span>
                                                    </div>

                                                    <span class="text-sm">{{
                                                        version.createdAt ? formatLocalDate(version.createdAt) : ''
                                                    }}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2" @click.stop>
                                                <IconTooltipButton
                                                    v-if="version.status === DocumentStatus.PUBLISHED"
                                                    buttonStyle="secondary"
                                                    class="px-2 py-1 text-sm"
                                                    @click="showVersionAcknowledgements(version)"
                                                    :aria-label="t('document.view.view_acknowledgements_aria', {
                                                        n: version.versionNumber
                                                    })"
                                                    :title="t('document.view.view_acknowledgements_title', {
                                                        n: version.versionNumber
                                                    })"
                                                    test-id="view-version-acknowledgements-button"
                                                    icon-class="fa-solid fa-check-double"
                                                    :text="t('document.view.view_acknowledgements')"
                                                    tooltip-placement="right"
                                                />
                                                <template v-if="documentData?.contentType === ContentType.EDITOR">
                                                    <Can v-if="!editorVersionHasContent(version)" subject="documents"
                                                        :actions="['update']">
                                                        <IconTooltipButton buttonStyle="primary"
                                                            class="px-2 py-1 text-sm"
                                                            :href="`/plan/documents/${documentId}/new-version?fillPendingVersion=${version.id}&redirect=${encodeURIComponent(`/plan/documents/${documentId}`)}`"
                                                            :aria-label="t('document.view.add_content_aria')
                                                                " :title="t('document.view.add_content_title')"
                                                            test-id="add-content-version-button"
                                                            icon-class="fa-solid fa-plus"
                                                            :text="t('document.view.add_content')"
                                                            tooltip-placement="right" />
                                                    </Can>
                                                    <template v-else>
                                                        <IconTooltipButton buttonStyle="secondary"
                                                            class="px-2 py-1 text-sm"
                                                            :href="`/plan/documents/${documentId}/content?version=${version.id}`"
                                                            :aria-label="t(
                                                                'document.view.view_content_version_aria',
                                                                {
                                                                    n: version.versionNumber
                                                                }
                                                            )
                                                                " :title="t(
                                                                    'document.view.view_content_version_title',
                                                                    {
                                                                        n: version.versionNumber
                                                                    }
                                                                )
                                                                    " icon-class="fa-solid fa-file-lines"
                                                            :text="t('document.view.view_content')"
                                                            tooltip-placement="right" />
                                                        <IconTooltipButton v-if="
                                                            version.versionNumber !==
                                                            documentData?.currentVersion
                                                        " buttonStyle="secondary" class="px-2 py-1 text-sm"
                                                            :loading="downloadingVersionId === version.id" :aria-label="t('document.view.download_version_aria', {
                                                                n: version.versionNumber
                                                            })
                                                                " :title="t('document.view.download_version_title', {
                                                                    n: version.versionNumber
                                                                })
                                                                    " @click="() => downloadVersionPdf(version)"
                                                            icon-class="fa-solid fa-download"
                                                            :text="t('document.view.download_short')"
                                                            tooltip-placement="right" />
                                                        <Can v-if="canRestoreFromVersion(version)" subject="documents"
                                                            :actions="['update']">
                                                            <IconTooltipButton buttonStyle="secondary"
                                                                class="px-2 py-1 text-sm"
                                                                :href="restoreFromVersionUrl(version)"
                                                                :aria-label="t('document.view.restore_version_aria', {
                                                                    n: version.versionNumber
                                                                })"
                                                                :title="t('document.view.restore_version_title', {
                                                                    n: version.versionNumber
                                                                })"
                                                                test-id="restore-version-button"
                                                                icon-class="fa-solid fa-clock-rotate-left"
                                                                :text="t('document.view.restore_as_new_version')"
                                                                tooltip-placement="right" />
                                                        </Can>
                                                    </template>
                                                </template>
                                                <template v-else-if="documentData?.contentType === ContentType.CHECKLIST">
                                                    <Can v-if="!checklistVersionHasContent(version)" subject="documents"
                                                        :actions="['update']">
                                                        <IconTooltipButton buttonStyle="primary"
                                                            class="px-2 py-1 text-sm"
                                                            :href="checklistVersionUrl(version.id)"
                                                            :aria-label="t('document.view.add_content_aria')"
                                                            :title="t('document.view.add_content_title')"
                                                            test-id="add-checklist-version-content-button"
                                                            icon-class="fa-solid fa-plus"
                                                            :text="t('document.view.add_content')"
                                                            tooltip-placement="right" />
                                                    </Can>
                                                    <template v-else>
                                                        <IconTooltipButton buttonStyle="secondary"
                                                            class="px-2 py-1 text-sm"
                                                            :href="`/plan/documents/${documentId}/checklist?version=${version.id}`"
                                                            :aria-label="t(
                                                                'document.view.view_content_version_aria',
                                                                { n: version.versionNumber }
                                                            )"
                                                            :title="t(
                                                                'document.view.view_content_version_title',
                                                                { n: version.versionNumber }
                                                            )"
                                                            icon-class="fa-solid fa-list-check"
                                                            :text="t('document.view.view_content')"
                                                            tooltip-placement="right" />
                                                        <Can v-if="canRestoreChecklistFromVersion(version)"
                                                            subject="documents" :actions="['update']">
                                                            <IconTooltipButton buttonStyle="secondary"
                                                                class="px-2 py-1 text-sm"
                                                                :href="restoreChecklistFromVersionUrl(version)"
                                                                :aria-label="t('document.view.restore_version_aria', {
                                                                    n: version.versionNumber
                                                                })"
                                                                :title="t('document.view.restore_version_title', {
                                                                    n: version.versionNumber
                                                                })"
                                                                test-id="restore-checklist-version-button"
                                                                icon-class="fa-solid fa-clock-rotate-left"
                                                                :text="t('document.view.restore_as_new_version')"
                                                                tooltip-placement="right" />
                                                        </Can>
                                                    </template>
                                                </template>
                                                <IconTooltipButton v-if="
                                                    documentData?.contentType === ContentType.FILE &&
                                                    version.versionNumber !==
                                                    documentData?.currentVersion &&
                                                    version.file &&
                                                    String(version.file).trim()
                                                " buttonStyle="secondary" class="px-2 py-1 text-sm"
                                                    :download="version.file"
                                                    :loading="downloadingVersionId === version.id" :aria-label="t('document.view.download_version_aria', {
                                                        n: version.versionNumber
                                                    })
                                                        " :title="t('document.view.download_version_title', {
                                                            n: version.versionNumber
                                                        })
                                                            " icon-class="fa-solid fa-download"
                                                    :text="t('document.view.download_short')"
                                                    tooltip-placement="right" />
                                                <Can subject="documents" :actions="['update']" v-if="
                                                    documentData?.contentType === ContentType.FILE &&
                                                    (!version.file ||
                                                        !String(version.file).trim() ||
                                                        (version.status ===
                                                            DocumentStatus.PENDING &&
                                                            version.file &&
                                                            String(version.file).trim() &&
                                                            version.versionNumber !==
                                                            documentData?.currentVersion))
                                                ">
                                                    <IconTooltipButton buttonStyle="primary" class="px-2 py-1 text-sm"
                                                        @click="uploadVersionFile(version)" :aria-label="t('document.view.upload_version_aria', {
                                                            n: version.versionNumber
                                                        })
                                                            " :title="t('document.view.upload_version_title', {
                                                                n: version.versionNumber
                                                            })
                                                                " test-id="upload-version-file-button"
                                                        icon-class="fa-solid fa-upload" :text="version.file &&
                                                            String(version.file).trim() &&
                                                            version.status ===
                                                            DocumentStatus.PUBLISHED &&
                                                            version.versionNumber !==
                                                            documentData?.currentVersion
                                                            ? t('document.view.replace_file')
                                                            : t('document.view.upload_file')"
                                                        tooltip-placement="right" />

                                                </Can>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Comments Section -->
                        <div class="2xl:col-span-8 col-span-4" test-id="comments-section">
                            <Comments :comments="comments" :loading="actionLoading" @post-comment="
                                (comment) => postAction({ type: 'commented', comment })
                            " @on-delete="deleteComment" />
                        </div>
                        <div class="2xl:col-span-8 col-span-4" test-id="history-section">
                            <HistoryView :entityType="'documents'" :entityId="`${documentId}`"
                                :refreshTrigger="historyRefreshTrigger" />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '@/components/breadCrums.vue'
import AppButton from '../AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiDelete, apiGet, apiPost, apiPut, apiPutFormData, renewToken } from '@/util/api'
import type { Document, ChangeRequest, DocumentVersion } from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'
import { useToast } from '@/stores/notification'
import router from '@/router'
import MemberIcon from '@/components/memberIcon.vue'
import Spinner from '../Spinner.vue'
import Can from '../Can.vue'
import Comments from '../knowledge/Comments.vue'
import {
    formatLocalDate,
    snakeToCamelCase,
    generatePdfFromHtml,
    formatApiErrorMessage,
    getSuperdocUserFromAuth
} from '@/util/util'
import HistoryView from '../history-view.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import VersionChangesDialog from './VersionChangesDialog.vue'
import VersionAcknowledgementsDialog from './VersionAcknowledgementsDialog.vue'
import type { VersionAcknowledgement } from './VersionAcknowledgementsDialog.vue'
import DocumentStatusManager from './DocumentStatusManager.vue'
import UploadVersionFileDialog from './UploadVersionFileDialog.vue'
import CreateNewVersionDialog from './CreateNewVersion.vue'
import DocumentContentBody from './DocumentContentBody.vue'
import DocumentFilePreview from './DocumentFilePreview.vue'
import DocumentChecklistViewer from './DocumentChecklistViewer.vue'
import SuperDocEditor from '../SuperDocEditor.vue'
import IconTooltipButton from '../IconTooltipButton.vue'
import Notice from '../Notice.vue'

const { t, locale } = useI18n()
const route = useRoute()
const documentId = route.params.id
const documentData = ref<Document>()
const isLoading = ref(true)
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const comment = ref('')
const actionLoading = ref(false)
const downloadLoading = ref(false)
const downloadingVersionId = ref<number | null>(null)

const historyRefreshTrigger = ref(0)

const changeRequest = ref<ChangeRequest | null>(null)

const DOCUMENT_STATUS_I18N: Record<string, string> = {
    pending: 'document.main.status_labels.pending',
    ready_for_approval: 'document.main.status_labels.ready_for_approval',
    published: 'document.main.status_labels.published',
    in_review: 'document.main.status_labels.in_review',
    valid: 'document.main.status_labels.valid',
    invalid: 'document.main.status_labels.invalid',
    obsolete: 'document.main.status_labels.obsolete'
}

const documentStatusLabel = (status: string) =>
    DOCUMENT_STATUS_I18N[status] ? t(DOCUMENT_STATUS_I18N[status]) : status

const WORKFLOW_ACTION_I18N: Record<string, string> = {
    reviewed: 'document.view.activity_reviewed',
    reviewed_rejected: 'document.view.activity_reviewed_rejected',
    approved: 'document.view.activity_approved',
    rejected: 'document.view.activity_rejected',
    send_for_review: 'document.view.activity_send_for_review',
    published: 'document.view.activity_published',
    obsolete: 'document.view.activity_obsolete',
    marked_obsolete: 'document.view.activity_marked_obsolete',
    ready_for_approval: 'document.view.activity_ready_for_approval',
    contributed: 'document.view.activity_contributed',
    override_approved: 'document.view.activity_override_approved',
    acknowledged: 'document.view.activity_acknowledged'
}

const workflowActionLabel = (actionType: string) =>
    WORKFLOW_ACTION_I18N[actionType]
        ? t(WORKFLOW_ACTION_I18N[actionType])
        : snakeToCamelCase(actionType)

const comments = computed(() => {
    return documentData.value?.contributors
        .filter((contributor) => contributor.actions.some((action) => action.type === 'commented'))
        .map((contributor) =>
            contributor.actions
                .filter((action) => action.type === 'commented')
                .map((action) => ({
                    fname: contributor.user.fname,
                    lname: contributor.user.lname,
                    comment: action.comment.text,
                    createdDate: action.createdDate,
                    id: action.id
                }))
        )
        .flat()
        .sort((a, b) => b.createdDate - a.createdDate)
})

const versionStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-700'
        case 'ready_for_approval':
            return 'bg-indigo-100 text-indigo-700'
        case 'published':
            return 'bg-green-100 text-green-700'
        case 'in_review':
            return 'bg-blue-100 text-blue-700'
        case 'valid':
            return 'bg-green-50 text-green-700'
        case 'invalid':
            return 'bg-red-100 text-red-700'
        case 'obsolete':
            return 'bg-neutral-200 text-neutral-700'
        default:
            return 'bg-neutral-100 text-neutral-600'
    }
}

const goToCompareVersions = () => {
    router.push(`/plan/documents/${documentId}/compare`)
}

const createNewVersion = () => {
    if (documentData.value?.contentType === ContentType.EDITOR) {
        router.push(`/plan/documents/${documentId}/new-version`)
        return
    }
    if (documentData.value?.contentType === ContentType.CHECKLIST) {
        router.push(
            `/plan/documents/${documentId}/checklist-version?redirect=${encodeURIComponent(`/plan/documents/${documentId}`)}`
        )
        return
    }
    dialogStore.openDialog(CreateNewVersionDialog, {
        documentId: String(documentId),
        dueDate: documentData.value?.dueDate,
        onConfirm: async () => {
            dialogStore.closeDialog()
            toast.showToast(t('common.success'), t('document.view.toast_new_version_ok'), 'success')
            await fetchDocument(true)
        },
        onCancel: dialogStore.closeDialog
    })
}

function editorVersionHasContent(version: Document['versions'][number]) {
    return Boolean(version.content && String(version.content).trim())
}

function checklistVersionHasContent(version?: Document['versions'][number] | null) {
    if (!version?.checklist?.questions?.length) return false
    return version.checklist.questions.some(
        (q: any) => !!(q.question || q.questionText || '').toString().trim()
    )
}

function checklistVersionUrl(versionId?: number) {
    const redirect = encodeURIComponent(`/plan/documents/${documentId}`)
    const base = `/plan/documents/${documentId}/checklist-version?redirect=${redirect}`
    return versionId != null ? `${base}&fillPendingVersion=${versionId}` : base
}

const canCreateNewVersion = computed(() => {
    const doc = documentData.value
    if (!doc || !isDocumentCreator.value) return false
    if (changeRequest.value) return false
    if (!['published', 'obsolete'].includes(documentStatus.value || '')) return false
    if (doc.currentVersion !== doc.versions[doc.versions.length - 1].versionNumber) return false
    return true
})

function canRestoreFromVersion(version: Document['versions'][number]) {
    const doc = documentData.value
    if (!canCreateNewVersion.value) return false
    if (doc?.contentType !== ContentType.EDITOR) return false
    if (version.status !== DocumentStatus.PUBLISHED) return false
    if (version.versionNumber >= (doc?.currentVersion ?? 0)) return false
    return editorVersionHasContent(version)
}

function canRestoreChecklistFromVersion(version: Document['versions'][number]) {
    const doc = documentData.value
    if (!canCreateNewVersion.value) return false
    if (doc?.contentType !== ContentType.CHECKLIST) return false
    if (version.status !== DocumentStatus.PUBLISHED) return false
    if (version.versionNumber >= (doc?.currentVersion ?? 0)) return false
    return checklistVersionHasContent(version)
}

function restoreFromVersionUrl(version: Document['versions'][number]) {
    const redirect = encodeURIComponent(`/plan/documents/${documentId}`)
    return `/plan/documents/${documentId}/new-version?fromVersion=${version.id}&redirect=${redirect}`
}

function restoreChecklistFromVersionUrl(version: Document['versions'][number]) {
    const redirect = encodeURIComponent(`/plan/documents/${documentId}`)
    return `/plan/documents/${documentId}/checklist-version?fromVersion=${version.id}&redirect=${redirect}`
}

const latestDocumentVersion = computed(() => {
    const list = documentData.value?.versions
    if (!list?.length) return undefined
    return [...list].reduce((a, b) => (b.versionNumber > a.versionNumber ? b : a))
})

const showLatestVersionPreview = computed(() => {
    const latest = latestDocumentVersion.value
    return Boolean(latest?.id)
})

const previewEditorContent = ref<string | null>(null)
const previewDocxUrl = ref<string | null>(null)
const previewLoading = ref(false)
const previewLoadError = ref(false)
const previewSuperDocRef = ref<InstanceType<typeof SuperDocEditor> | null>(null)
const commentSaveTimer = ref<number | null>(null)
const commentSaveInFlight = ref(false)
const previewCommentsHydrating = ref(true)
let previewCommentsHydrationTimer: number | null = null

const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))

const canCommentOnDocument = computed(() => {
    const userId = authStore.state.userDetails.id
    const doc = documentData.value
    if (!userId || !doc) return false
    if (doc.createdBy?.id === userId) return true
    if (doc.reviewers?.some((reviewer) => reviewer.id === userId)) return true
    if (doc.approvers?.some((approver) => approver.id === userId)) return true
    if (doc.acknowledgers?.some((acknowledger) => acknowledger.id === userId)) return true
    return false
})

const canHighlightOnDocument = computed(() => {
    const userId = authStore.state.userDetails.id
    const doc = documentData.value
    if (!userId || !doc) return false
    if (doc.createdBy?.id === userId) return true
    if (doc.reviewers?.some((reviewer) => reviewer.id === userId)) return true
    if (doc.approvers?.some((approver) => approver.id === userId)) return true
    if (doc.acknowledgers?.some((acknowledger) => acknowledger.id === userId)) return true
    return false
})

const routeCommentId = computed(() => {
    const id = route.query.commentId
    return typeof id === 'string' && id.trim() ? id.trim() : null
})

const routeNodeId = computed(() => {
    const id = route.query.nodeId
    return typeof id === 'string' && id.trim() ? id.trim() : null
})

const routeNodeOffset = computed(() => {
    const raw = route.query.nodeOffset
    if (typeof raw !== 'string' || !raw.trim()) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
})

async function onPreviewSuperdocReady() {
    previewCommentsHydrating.value = true
    if (previewCommentsHydrationTimer != null) {
        window.clearTimeout(previewCommentsHydrationTimer)
    }
    previewCommentsHydrationTimer = window.setTimeout(() => {
        previewCommentsHydrating.value = false
        previewCommentsHydrationTimer = null
    }, 1500)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    await scrollPreviewToNode()
    await scrollPreviewToComment()
}

async function scrollPreviewToComment(commentId?: string | null) {
    const id = commentId ?? routeCommentId.value
    if (!id || !previewSuperDocRef.value) return
    await previewSuperDocRef.value.scrollToComment(id)
}

async function scrollPreviewToNode(nodeId?: string | null, offset?: number | null) {
    const id = nodeId ?? routeNodeId.value
    if (!id || !previewSuperDocRef.value) return
    const scrollOffset = offset ?? routeNodeOffset.value ?? undefined

    for (let attempt = 0; attempt < 20; attempt++) {
        if (await previewSuperDocRef.value.scrollToElement(id, scrollOffset)) return
        await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
}

function onPreviewCommentSelected(commentId: string) {
    router.replace({
        path: route.path,
        query: { ...route.query, commentId, version: String(currentVersion.value) }
    })
}

async function savePreviewReviewComments() {
    if (!canSaveDocumentAnnotations.value || !previewSuperDocRef.value || commentSaveInFlight.value) {
        return
    }
    const version = selectedVersion.value
    if (!version?.id) return

    commentSaveInFlight.value = true
    previewCommentsHydrating.value = true
    try {
        const file = await previewSuperDocRef.value.exportDocx(
            `${documentData.value?.title || 'document'}.docx`
        )
        const uploadForm = new FormData()
        uploadForm.append('file', file)
        await apiPutFormData(
            `/documents/${documentId}/versions/${version.id}/review-comments`,
            uploadForm,
            authStore
        )
    } catch (error: unknown) {
        console.error('Save review comments failed', error)
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.document'
        )
        toast.showToast(
            t('common.error'),
            raw || t('document.form.toast_save_version_content_failed'),
            'error'
        )
    } finally {
        commentSaveInFlight.value = false
        if (previewCommentsHydrationTimer != null) {
            window.clearTimeout(previewCommentsHydrationTimer)
        }
        previewCommentsHydrationTimer = window.setTimeout(() => {
            previewCommentsHydrating.value = false
            previewCommentsHydrationTimer = null
        }, 1500)
    }
}

function schedulePreviewReviewDocSave() {
    if (!canSaveDocumentAnnotations.value || previewCommentsHydrating.value) return
    if (commentSaveTimer.value != null) {
        window.clearTimeout(commentSaveTimer.value)
    }
    commentSaveTimer.value = window.setTimeout(() => {
        commentSaveTimer.value = null
        void savePreviewReviewComments()
    }, 500)
}

async function copyCommentLink(commentId?: string) {
    const id = commentId ?? routeCommentId.value
    if (!id) return
    try {
        const url = new URL(window.location.href)
        url.searchParams.set('commentId', id)
        url.searchParams.set('version', String(currentVersion.value))
        await navigator.clipboard.writeText(url.toString())
        toast.showToast(t('common.success'), t('document.view.comment_link_copied'), 'success')
    } catch (error) {
        console.error('Copy comment link failed', error)
        toast.showToast(t('common.error'), t('document.view.comment_link_copy_failed'), 'error')
    }
}

async function copyNodeLink(payload: { nodeId: string; offset?: number }) {
    const { nodeId, offset } = payload
    if (!nodeId) return
    try {
        const url = new URL(window.location.href)
        url.searchParams.set('nodeId', nodeId)
        if (typeof offset === 'number' && Number.isFinite(offset) && offset > 0) {
            url.searchParams.set('nodeOffset', String(Math.floor(offset)))
        } else {
            url.searchParams.delete('nodeOffset')
        }
        url.searchParams.set('version', String(currentVersion.value))
        await navigator.clipboard.writeText(url.toString())
        toast.showToast(t('common.success'), t('document.view.paragraph_link_copied'), 'success')
    } catch (error) {
        console.error('Copy paragraph link failed', error)
        toast.showToast(t('common.error'), t('document.view.paragraph_link_copy_failed'), 'error')
    }
}

async function loadVersionPreview(versionId: number) {
    previewEditorContent.value = null
    previewDocxUrl.value = null
    previewLoadError.value = false
    previewCommentsHydrating.value = true
    if (previewCommentsHydrationTimer != null) {
        window.clearTimeout(previewCommentsHydrationTimer)
        previewCommentsHydrationTimer = null
    }
    const doc = documentData.value
    if (!doc?.contentType || !versionId) return
    if (doc.contentType !== ContentType.EDITOR) return

    previewLoading.value = true
    try {
        const data = await apiGet<{ content: string | null; contentUrl?: string }>(
            `/documents/${documentId}/versions/${versionId}/content`,
            authStore
        )
        if (data.contentUrl) {
            previewDocxUrl.value = data.contentUrl
        } else if (data.content?.trim()) {
            previewEditorContent.value = data.content
        } else {
            const version = doc.versions?.find((v) => v.id === versionId)
            const key = version?.content?.trim()
            if (key?.toLowerCase().endsWith('.docx')) {
                previewDocxUrl.value = await apiGet<string>(
                    `/files/${encodeURIComponent(key)}`,
                    authStore
                )
            }
        }
    } catch (err) {
        console.error('Latest version preview failed', err)
        previewLoadError.value = true
    } finally {
        previewLoading.value = false
    }
}


const currentVersion = ref(-1)

watch(currentVersion, () => {
    const version = documentData.value?.versions.find(
        (v) => v.versionNumber === currentVersion.value
    )
    if (!version?.id) return
    void loadVersionPreview(version.id)
})

watch(routeCommentId, (commentId) => {
    if (commentId) void scrollPreviewToComment(commentId)
})

watch([routeNodeId, routeNodeOffset], ([nodeId]) => {
    if (nodeId) void scrollPreviewToNode(nodeId)
}, { immediate: true })

const isDocumentCreator = computed(
    () => documentData.value?.createdBy?.id === authStore.state.userDetails.id
)

const showEditDocumentButton = computed(() => {
    const doc = documentData.value
    const list = doc?.versions ?? []
    const latest = latestDocumentVersion.value
    if (!doc || !latest || list.length <= 1) return true
    if (doc.contentType === ContentType.EDITOR) {
        return editorVersionHasContent(latest)
    }
    if (doc.contentType === ContentType.CHECKLIST) {
        return checklistVersionHasContent(latest)
    }
    return Boolean(latest.file && String(latest.file).trim())
})

/** Reviewer/approver actions only make sense when this version has file (FILE) or S3 content key (EDITOR). */
const STATUSES_NEEDING_REVIEW_PAYLOAD: DocumentStatus[] = [
    DocumentStatus.PENDING,
    DocumentStatus.READY_FOR_APPROVAL,
    DocumentStatus.IN_REVIEW
]

const selectedVersion = computed(() =>
    documentData.value?.versions.find((v) => v.versionNumber === currentVersion.value)
)

const selectedVersionChecklistQuestions = computed(() => {
    const raw = selectedVersion.value?.checklist?.questions ?? []
    return raw.map((q: any, index: number) => ({
        question: q.question || q.questionText || '',
        questionType: q.questionType,
        required: !!q.required,
        orderIndex: q.orderIndex ?? index
    }))
})

const canCommentOnSuperdoc = computed(() => {
    if (!selectedVersion.value || !documentData.value) return false
    if (documentData.value.contentType !== ContentType.EDITOR) return false
    return canCommentOnDocument.value
})

const canSaveDocumentAnnotations = computed(() => {
    const version = selectedVersion.value
    const doc = documentData.value
    if (!version || !doc || doc.contentType !== ContentType.EDITOR) return false
    return canHighlightOnDocument.value
})

/** S3 key for FILE-mode preview (version.file, or version.content when it points at a file). */
const selectedVersionPreviewFileKey = computed(() => {
    const v = selectedVersion.value
    if (!v) return ''
    const file = v.file?.trim()
    if (file) return file
    return ''
})

/** Same upload eligibility as the version-history upload action for FILE documents. */
const canUploadSelectedVersionFile = computed(() => {
    const version = selectedVersion.value
    const doc = documentData.value
    if (!version || !doc || doc.contentType !== ContentType.FILE) return false
    return (
        !version.file ||
        !String(version.file).trim() ||
        (version.status === DocumentStatus.PENDING &&
            !!version.file &&
            !!String(version.file).trim() &&
            version.versionNumber !== doc.currentVersion)
    )
})

const versionHasReviewPayload = computed(() => {
    const v = selectedVersion.value
    const doc = documentData.value
    if (!v || !doc) return false
    if (doc.contentType === ContentType.EDITOR) {
        return Boolean(v.content && String(v.content).trim())
    }
    if (doc.contentType === ContentType.CHECKLIST) {
        return checklistVersionHasContent(v)
    }
    return Boolean(v.file && String(v.file).trim())
})

const showDocumentStatusManager = computed(() => {
    const v = selectedVersion.value
    if (!v || !documentData.value) return false
    if (STATUSES_NEEDING_REVIEW_PAYLOAD.includes(v.status)) {
        return versionHasReviewPayload.value
    }
    return true
})

const latestVersion = computed(() => {
    const versions = documentData.value?.versions ?? []
    if (!versions.length) {
        return undefined
    }
    return versions.reduce((max, version) =>
        version.versionNumber > max.versionNumber ? version : max
    )
})

const isAcknowledger = computed(() => {
    const userId = authStore.state.userDetails.id
    return !!documentData.value?.acknowledgers?.some(
        (acknowledger) => acknowledger.id === userId
    )
})

const showAcknowledgeControl = computed(() => {
    const latest = latestVersion.value
    if (!latest || !isAcknowledger.value) {
        return false
    }
    return ['published', 'obsolete'].includes(latest.status)
})

const hasAcknowledged = computed(() => {
    const latest = latestVersion.value
    const userId = authStore.state.userDetails.id
    if (!latest) {
        return false
    }
    return (
        documentData.value?.contributors
            ?.filter(
                (contributor) =>
                    contributor.version === latest.versionNumber &&
                    contributor.user.id === userId
            )
            .some((contributor) =>
                contributor.actions.some((action) => action.type === 'acknowledged')
            ) ?? false
    )
})

const acknowledgeDocument = () => {
    const latest = latestVersion.value
    if (!latest || hasAcknowledged.value) {
        return
    }
    postAction({ type: 'acknowledged', versionNumber: latest.versionNumber })
}

const statusReviewBlockedMessage = computed(() => {
    void locale.value
    const v = selectedVersion.value
    const doc = documentData.value
    if (!doc || !v) return t('document.view.status_load_error')
    if (STATUSES_NEEDING_REVIEW_PAYLOAD.includes(v.status) && !versionHasReviewPayload.value) {
        if (doc.contentType === ContentType.EDITOR) {
            return t('document.view.status_blocked_editor')
        }
        return t('document.view.status_blocked_file')
    }
    return ''
})

const reviewersWithStatus = computed(() => {
    void locale.value
    if (!documentData.value?.reviewers) return []

    return documentData.value.reviewers.map((reviewer) => {
        // Find the contributor record for this reviewer
        const contributor = documentData.value?.contributors
            .filter((c) => c.version === currentVersion.value)
            .find((c) => c.user.id === reviewer.id)
        const versionStatus = documentData.value?.versions.find(
            (v) => v.versionNumber === currentVersion.value
        )?.status
        // Find the most recent review action
        const reviewAction = contributor?.actions
            .filter((action) => action.type === 'reviewed' || action.type === 'reviewed_rejected')
            .sort((a, b) => b.createdDate - a.createdDate)[0]

        return {
            fname: reviewer.fname,
            lname: reviewer.lname,
            id: reviewer.id,
            order: reviewer.order,
            action: reviewAction?.type || null,
            actionMessage: reviewAction
                ? workflowActionLabel(reviewAction.type)
                : versionStatus == DocumentStatus.PENDING ? t('document.view.no_action_taken') : t('document.view.no_action'),
            time: reviewAction ? formatLocalDate(reviewAction.createdDate) : null,
            createdDate: reviewAction?.createdDate || 0,
            versionStatus: versionStatus
        }
    }).sort((left, right) => {
        const strategy = documentData.value?.approvalStrategy
        if (!strategy?.allowOrdering || strategy.allReviewers) return 0
        return (left.order ?? 1) - (right.order ?? 1)
    })
})

const actionsDone = computed(() => {
    void locale.value
    return documentData.value?.contributors
        .filter((c) => c.version === currentVersion.value)

        .map((contributor) =>
            contributor.actions
                .filter(
                    (action) =>
                        ![
                            'approved',
                            'rejected',
                            'commented',
                            'reviewed',
                            'reviewed_rejected',
                            'acknowledged'
                        ].includes(action.type)
                )
                .map((action) => ({
                    fname: contributor.user.fname,
                    lname: contributor.user.lname,
                    actionMessage: workflowActionLabel(action.type),
                    time: action.createdDate ? formatLocalDate(action.createdDate) : null
                }))
        )
        .flat()
})
const approversWithStatus = computed(() => {
    void locale.value
    if (!documentData.value?.approvers) return []

    return documentData.value.approvers.map((approver) => {
        // Find the contributor record for this approver
        const contributor = documentData.value?.contributors
            .filter((c) => c.version === currentVersion.value)
            .find((c) => c.user.id === approver.id)

        const versionStatus = documentData.value?.versions.find(
            (v) => v.versionNumber === currentVersion.value
        )?.status
        // Find the most recent approval action
        const approvalAction = contributor?.actions
            .filter((action) => action.type === 'approved' || action.type === 'rejected')
            .sort((a, b) => b.createdDate - a.createdDate)[0]

        return {
            fname: approver.fname,
            lname: approver.lname,
            id: approver.id,
            order: approver.order,
            action: approvalAction?.type || null,
            actionMessage: approvalAction
                ? workflowActionLabel(approvalAction.type)
                :[DocumentStatus.READY_FOR_APPROVAL,DocumentStatus.PENDING].includes(versionStatus || DocumentStatus.READY_FOR_APPROVAL) ? t('document.view.no_action_taken') : t('document.view.no_action'),
            time: approvalAction ? formatLocalDate(approvalAction.createdDate) : null,
            createdDate: approvalAction?.createdDate || 0,
            versionStatus: versionStatus
        }
    }).sort((left, right) => {
        const strategy = documentData.value?.approvalStrategy
        if (!strategy?.allowOrdering || strategy.allApprovers) return 0
        return (left.order ?? 1) - (right.order ?? 1)
    })
})

const documentStatus = computed(() => {
    return documentData.value?.versions[documentData.value?.versions.length - 1].status
})

const hasPublishedEditorVersion = computed(() =>
    documentData.value?.versions?.some((v) => v.status === DocumentStatus.PUBLISHED)
)

const canViewOrDownloadEditorContent = computed(() => {
    if (documentData.value?.contentType !== ContentType.EDITOR) return true
    const n = documentData.value?.versions?.length ?? 0
    return n <= 1 || hasPublishedEditorVersion.value
})

const canViewChecklistContent = computed(() => {
    if (documentData.value?.contentType !== ContentType.CHECKLIST) return false
    const versions = documentData.value?.versions ?? []
    if (versions.length <= 1) return checklistVersionHasContent(versions[0])
    return versions.some(
        (v) => v.status === DocumentStatus.PUBLISHED && checklistVersionHasContent(v)
    )
})

const markObsolete = () => {
    actionLoading.value = true
    apiPut(`/documents/${documentId}/mark-obsolete`, {}, authStore)
        .then(() => {
            fetchDocument(true, () => {
                actionLoading.value = false
                toast.showToast(
                    t('common.success'),
                    t('document.view.toast_obsolete_ok'),
                    'success'
                )
            })
        })
        .catch((error: any) => {
            console.error('Error marking document as obsolete:', error)
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                raw || t('document.view.toast_obsolete_failed'),
                'error'
            )
            actionLoading.value = false
        })
}

const fetchDocument = async (skipLoading = false, callback = () => { }) => {
    try {
        if (!skipLoading) {
            isLoading.value = true
        }
        const data = await apiGet<Document>(`/documents/${documentId}`, authStore)
        documentData.value = data
        const queryVersion = Number(
            Array.isArray(route.query.version) ? route.query.version[0] : route.query.version
        )
        currentVersion.value =
            Number.isFinite(queryVersion) &&
            data.versions.some((version) => version.versionNumber === queryVersion)
                ? queryVersion
                : data.versions[data.versions.length - 1].versionNumber
        changeRequest.value = data.changeRequest as ChangeRequest
        // Fetch change request for this document
    } catch (error: any) {
        console.error('Error fetching document:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.view.toast_fetch_failed'), 'error')
        router.replace('/plan/documents')
    } finally {
        isLoading.value = false
        callback()
    }
}

const crums = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines'
    },
    {
        name: documentData.value?.title || t('document.view.breadcrumb_fallback'),
        path: '',
        icon: ''
    }
])

function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

const downloadDocument = async () => {
    downloadLoading.value = true
    try {
        const latestVersion = documentData.value?.versions.find(
            (v) => v.versionNumber === documentData.value?.currentVersion
        )

        if (documentData.value?.contentType === ContentType.EDITOR) {
            if (!latestVersion?.id) return
            const { contentUrl } = await apiGet<{ content: string | null; contentUrl?: string }>(
                `/documents/${documentId}/versions/${latestVersion.id}/content`,
                authStore
            )
            if (contentUrl) {
                saveBlob(
                    await fetch(contentUrl).then((r) => r.blob()),
                    `${documentData.value?.title || 'document'}.docx`
                )
                return
            }
            await downloadEditorPdf()
            return
        }

        if (!latestVersion?.file) {
            toast.showToast(t('common.error'), t('document.view.toast_no_file_download'), 'error')
            return
        }
        const response = await apiGet<string>(
            `/files/${encodeURIComponent(latestVersion?.file)}`,
            authStore
        )
        const link = document.createElement('a')
        link.href = response
        link.download = documentData.value?.title || 'document'
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error: any) {
        console.error('Error downloading document:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.view.toast_download_failed'), 'error')
    } finally {
        downloadLoading.value = false
    }
}

const downloadEditorPdf = async () => {
    downloadLoading.value = true
    try {
        const data = await apiGet<Document>(
            `/documents/${documentId}?includeLatestPublishedContent=true`,
            authStore
        )
        let html = data.latestPublishedVersionContent
        const multiVersion = (data.versions?.length ?? 0) > 1
        if (
            !html &&
            data.contentType === ContentType.EDITOR &&
            data.versions?.length &&
            !multiVersion
        ) {
            const version =
                data.versions.find((v) => v.versionNumber === data.currentVersion) ||
                [...data.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
            if (version?.id) {
                const contentRes = await apiGet<{ content: string }>(
                    `/documents/${documentId}/versions/${version.id}/content`,
                    authStore
                )
                html = contentRes.content
            }
        }
        if (!html) {
            toast.showToast(
                t('common.error'),
                multiVersion
                    ? t('document.main.toast_no_published_pdf')
                    : t('document.main.toast_no_content_document'),
                'error'
            )
            return
        }
        await generatePdfFromHtml(html, documentData.value?.title || 'document')
    } catch (error: any) {
        console.error('Error generating PDF:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.view.toast_pdf_failed'), 'error')
    } finally {
        downloadLoading.value = false
    }
}

const downloadVersionPdf = async (version: Document['versions'][number]) => {
    downloadingVersionId.value = version.id
    try {
        const data = await apiGet<{ contentUrl: string }>(
            `/documents/${documentId}/versions/${version.id}/content`,
            authStore
        );
        if (!data.contentUrl) {
            toast.showToast(t('common.error'), t('document.view.toast_version_no_content'), 'error')
            return
        }
        saveBlob(
            await fetch(data.contentUrl).then((r) => r.blob()),
            `${documentData.value?.title || 'document'}.docx`
        )

    } catch (error: any) {
        console.error('Error generating version PDF:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.view.toast_pdf_failed'), 'error')
    } finally {
        downloadingVersionId.value = null
    }
}

const postAction = async (action: {
    type: string
    comment?: string
    versionNumber?: number
}) => {
    actionLoading.value = true
    try {
        await apiPost(`/documents/${documentId}/actions`, { ...action }, authStore)
        comment.value = ''
        fetchDocument(true, () => {
            toast.showToast(t('common.success'), t('document.view.toast_action_ok'), 'success')
            actionLoading.value = false
            historyRefreshTrigger.value = historyRefreshTrigger.value + 1
        })
    } catch (error: any) {
        console.error('Error posting action:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.view.toast_post_action_failed'),
            'error'
        )
        actionLoading.value = false
    }
}

const overrideApprove = () => {
    actionLoading.value = true
    apiPut(`/documents/${documentId}/override-approve`, {}, authStore)
        .then(() => {
            fetchDocument(true, () => {
                actionLoading.value = false
                toast.showToast(
                    t('common.success'),
                    t('document.view.toast_override_ok'),
                    'success'
                )
            })
        })
        .catch((error: any) => {
            console.error('Error overriding approval:', error)
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                raw || t('document.view.toast_override_failed'),
                'error'
            )
            actionLoading.value = false
        })
}

const deleteDocument = () => {
    apiDelete(`/documents/${documentId}`, authStore)
        .then(() => {
            toast.showToast(t('common.success'), t('document.view.toast_deleted_ok'), 'success')
            router.replace('/plan/documents')
        })
        .catch((error: any) => {
            console.error('Error deleting document:', error)
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                raw || t('document.view.toast_delete_failed'),
                'error'
            )
        })
}

const deleteComment = async (commentId: number | string) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.view.delete_comment_confirm'),
        onConfirm: async () => {
            try {
                actionLoading.value = true
                await apiDelete(`/documents/${documentId}/actions/${commentId}`, authStore)
                fetchDocument(true, () => {
                    toast.showToast(
                        t('common.success'),
                        t('document.view.toast_comment_deleted'),
                        'success'
                    )
                    actionLoading.value = false
                    historyRefreshTrigger.value = historyRefreshTrigger.value + 1
                })
            } catch (error: any) {
                console.error('Error deleting comment:', error)
                const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    raw || t('document.view.toast_comment_delete_failed'),
                    'error'
                )
                actionLoading.value = false
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const showVersionChanges = (version: Document['versions'][number]) => {
    dialogStore.openDialog(VersionChangesDialog, {
        version: version,
        onCancel: dialogStore.closeDialog
    })
}

const getVersionAcknowledgements = (versionNumber: number): VersionAcknowledgement[] => {
    const acknowledgedByUserId = new Map<string, number>()

    for (const contributor of documentData.value?.contributors ?? []) {
        if (contributor.version !== versionNumber) {
            continue
        }
        for (const action of contributor.actions) {
            if (action.type !== 'acknowledged') {
                continue
            }
            const existing = acknowledgedByUserId.get(contributor.user.id)
            if (!existing || action.createdDate > existing) {
                acknowledgedByUserId.set(contributor.user.id, action.createdDate)
            }
        }
    }

    return (documentData.value?.acknowledgers ?? []).map((acknowledger) => ({
        fname: acknowledger.fname,
        lname: acknowledger.lname,
        userId: acknowledger.id,
        acknowledgedAt: acknowledgedByUserId.get(acknowledger.id) ?? null
    }))
}

const showVersionAcknowledgements = (version: Document['versions'][number]) => {
    dialogStore.openDialog(VersionAcknowledgementsDialog, {
        versionNumber: version.versionNumber,
        acknowledgements: getVersionAcknowledgements(version.versionNumber),
        onCancel: dialogStore.closeDialog
    })
}

const viewChangeRequest = (changeRequest: { id: number }) => {
    router.push({
        path: `/plan/documents/change-requests/${changeRequest.id}`,
        query: { returnTo: route.fullPath }
    })
}

const viewContent = () => {
    const versions = documentData.value?.versions
    const isChecklist = documentData.value?.contentType === ContentType.CHECKLIST
    const contentBase = isChecklist
        ? `/plan/documents/${documentId}/checklist`
        : `/plan/documents/${documentId}/content`

    if (!versions?.length) {
        router.push(contentBase)
        return
    }
    if (versions.length === 1) {
        const v = versions[0]
        router.push(v?.id ? `${contentBase}?version=${v.id}` : contentBase)
        return
    }
    const published = [...versions]
        .filter((v) => v.status === DocumentStatus.PUBLISHED)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0]
    if (published?.id) {
        router.push(`${contentBase}?version=${published.id}`)
    } else {
        toast.showToast(t('common.info'), t('document.view.toast_no_published_view'), 'info')
    }
}

const uploadVersionFile = (version: Document['versions'][number]) => {
    dialogStore.openDialog(UploadVersionFileDialog, {
        version: {
            id: version.id,
            versionNumber: version.versionNumber
        },
        documentId: String(documentId),
        onConfirm: async () => {
            dialogStore.closeDialog()
            toast.showToast(t('common.success'), t('document.view.toast_file_uploaded'), 'success')
            await fetchDocument(true)
        },
        onCancel: dialogStore.closeDialog
    })
}

onMounted(async () => {
    if (!authStore.state.userDetails.fname) {
        await renewToken(authStore, true)
    }
    fetchDocument()
})
</script>
