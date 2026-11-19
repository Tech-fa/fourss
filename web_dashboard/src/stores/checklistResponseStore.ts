import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Evidence {
    description: string
    evidenceType: string
    documentId?: string
    documentName?: string
    file?: File  // Add file support per evidence
}

interface Finding {
    id?: string  // Add ID field to track backend finding ID
    title: string
    description: string
    classification: string
    severity?: string | null
    raisedNc?: boolean
    linkedNcId?: string | null
    evidences?: Evidence[]
    files?: File[]
    questionId?: string
    auditInstanceId?: string  // Track which audit instance this finding belongs to
}

interface ChecklistResponse {
    id?: string
    responseAnswer?: string
    auditorObservation?: string
    auditInstanceId: string
    questionDefinitionId: string
    respondedByTeamMemberId?: string
    deletedFindings?: string[]
}

export const useChecklistResponseStore = defineStore('checklistResponse', () => {
    const findings = ref<Finding[]>([])
    const responses = ref<ChecklistResponse[]>([])
    const deletedFindings = ref<string[]>([])

    function addFinding(finding: Finding) {
        findings.value.push(finding)
    }


    function updateFinding(updatedFinding: Finding, originalTitle?: string, originalId?: string) {
        let index = -1
        
        // Try to find by ID first if available
        if (originalId || updatedFinding.id) {
            const searchId = originalId || updatedFinding.id
            index = findings.value.findIndex((f) => f.id === searchId)
        }
        
        // Fallback to finding by title if ID search failed
        if (index === -1) {
            const searchTitle = originalTitle || updatedFinding.title
            index = findings.value.findIndex((f) => f.title === searchTitle)
        }

        if (index !== -1) {
            findings.value[index] = updatedFinding
        } else {
            console.error('Finding not found for update. Search criteria:', { originalId, originalTitle, findingId: updatedFinding.id, findingTitle: updatedFinding.title })
        }
    }

   

    function findFindingById(id: string): Finding | undefined {
        return findings.value.find((f) => f.id === id)
    }

    function deleteFinding(id: string) {
        findings.value = findings.value.filter((f) => !(f.id === id))
        deletedFindings.value = [...deletedFindings.value, id]
    }

    function addResponse(response: ChecklistResponse) {
        responses.value.push(response);
    }

    function updateResponse(updatedResponse: ChecklistResponse, originalQuestionId?: string) {
        const searchQuestionId = originalQuestionId || updatedResponse.questionDefinitionId

        const index = responses.value.findIndex((r) => r.questionDefinitionId === searchQuestionId)

        if (index !== -1) {
            responses.value[index] = updatedResponse
        } else {
            console.error('Response not found for update. Search question id:', searchQuestionId)
        }
    }

    function findResponseByQuestionId(questionId: string, auditInstanceId?: string): ChecklistResponse | undefined {
        if (auditInstanceId) {
            return responses.value.find((r) => r.questionDefinitionId === questionId && r.auditInstanceId === auditInstanceId)
        }
        return responses.value.find((r) => r.questionDefinitionId === questionId)
    }

    function deleteResponse(questionId: string) {
        responses.value = responses.value.filter((r) => r.questionDefinitionId !== questionId)
    }
    function clearFindings() {
        findings.value = []
    }

    function clearResponsesForInstance(auditInstanceId: string) {
        responses.value = responses.value.filter((r) => r.auditInstanceId !== auditInstanceId)
    }

    function clearAllForInstance(auditInstanceId: string) {
        clearResponsesForInstance(auditInstanceId)
        // Clear findings for this instance
        findings.value = findings.value.filter((f) => f.auditInstanceId !== auditInstanceId)
    }

    function findFindingsByQuestionId(questionId: string, auditInstanceId?: string): Finding[] {
        if (auditInstanceId) {
            return findings.value.filter((f) => f.questionId === questionId && f.auditInstanceId === auditInstanceId)
        }
        return findings.value.filter((f) => f.questionId === questionId)
    }

    function hasDataForInstance(auditInstanceId: string): boolean {
        const hasResponses = responses.value.some((r) => r.auditInstanceId === auditInstanceId)
        const hasFindings = findings.value.some((f) => f.auditInstanceId === auditInstanceId)
        return hasResponses || hasFindings
    }

    return {
        findings,
        addFinding,
        updateFinding,
        findFindingById,
        deleteFinding,
        deletedFindings,
        responses,
        addResponse,
        updateResponse,
        findResponseByQuestionId,
        deleteResponse,
        clearFindings,
        clearResponsesForInstance,
        clearAllForInstance,
        findFindingsByQuestionId,
        hasDataForInstance
    }
})
