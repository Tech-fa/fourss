import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AuditFindingEvidenceDraft {
    description?: string
    evidenceType?: string
    documentId?: string | null
    documentName?: string | null
    fileName?: string | null
    file?: File | null
    id?: string
}

export interface AuditFindingDraft {
    title?: string
    description?: string
    classificationId?: string
    severityId?: string | null
    teamMemberId?: string | null
    isNCRaised?: boolean
    linkedNcId?: string | null
    linkedNcName?: string | null
    evidences?: AuditFindingEvidenceDraft[]
    updatedAt?: number
}

type DraftsMap = Record<string, AuditFindingDraft>

export const useAuditFindingStore = defineStore('auditFinding', () => {
    const drafts = ref<DraftsMap>({})

    function getDraft(key: string): AuditFindingDraft | undefined {
        return drafts.value[key]
    }

    function saveDraft(key: string, partial: Partial<AuditFindingDraft>) {
        
        const existing = drafts.value[key] || {}
        drafts.value[key] = {
            ...existing,
            ...partial,
            updatedAt: Date.now()
        }
    }

    function clearDraft(key: string) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete drafts.value[key]
    }

    function setLinkedNonConformityId(key: string, ncId: string, ncName?: string | null) {
        saveDraft(key, {
            linkedNcId: ncId,
            linkedNcName: ncName ?? null,
            isNCRaised: true
        })
    }

    return {
        drafts,
        getDraft,
        saveDraft,
        clearDraft,
        setLinkedNonConformityId
    }
})


