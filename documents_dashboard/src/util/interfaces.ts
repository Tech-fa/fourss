export interface OrganizationUnit {
    id: number
    name: string
    members: {
        id: number
        user: User
        roleId?: number
        role?: PermissionGroup
    }[]
}

export interface TableEntity {
    id: number | string
}
export interface UnitType {
    id: number
    name: string
    deleted: boolean
    parent: UnitType
    children: UnitType[]
}

export interface CalendarLegend {
    id: number
    name: string
    color: string
}
export interface CalendarEvent {
    id: number
    title: string
    description: string
    startDate: number
    endDate: number
    eventType: {
        id: number
        name: string
        color: string
    }
    attendees: User[]
}
export interface User {
    id: string
    fname: string
    lname: string
    email: string
    createdAt: string
    updatedAt: string
    phone: string
    isActive: boolean
    isTopManagement: boolean
    order?: number
    createdBy: {
        id: number
        fname: string
        lname: string
    }
    verifiedAt: number | null
    teamMemberships?: {
        id: number
        teamId?: number
        team?: OrganizationUnit
        roleId?: number
        role?: PermissionGroup
    }[]
}
export interface EventType {
    id: number
    name: string
    color: string
}
export interface PaginatedResponse<T> {
    data: T[]
    currentPage: number
    totalCount: number
    perPage: number
}

export interface PermissionGroup {
    id: number
    name: string
    permissions: PermissionDTO[]
    members?: number
    userPermissionGroups?: UserPermissionGroup[]
    description?: string
    custom?: boolean
}
export interface UserPermissionGroup {
    id: number
    user: User
    permissionGroup: PermissionGroup
}
export interface PermissionDTO {
    subject: string
    action: string
}
export interface Participant {
    id: number
    user: User
}

export interface KnowledgeCategory {
    id: number
    name: string
    description: string
}
export interface KnowledgeGroupCategory {
    id: number
    category: KnowledgeCategory
}

export interface KnowledgeGroup {
    id: number
    name: string
    categories: KnowledgeGroupCategory[]
    autoApproved: boolean
    participants: User[]
    createdAt: number
    createdBy: User
    allMembers: boolean
    organizationUnits: OrganizationUnit[]
    includeChildren: boolean
    minimumApprovals: number
}

export enum ContentStatus {
    PUBLISHED = 'published',
    PENDING = 'pending'
}

export interface KnowledgeContent {
    id: number
    content: string
    title: string
    description: string
    status: ContentStatus
    isPublic: boolean
    files: string[]
    createdAt: number
    updatedAt: number
    createdBy: User
    group: KnowledgeGroup
    category: KnowledgeCategory
    views: number
    likes: number
    comments: number
    contributors: ContentContributor[]
}
export interface ContentAction {
    id: number
    type: string
    createdDate: number
    comment: Comment
}
export interface KnowledgeContentComment {
    id: number
    createdAt: number
    contributor: ContentContributor
    comment: Comment
}
export interface Comment {
    id: number
    text: string
    createdAt: number
    createdBy: User
}
export interface ContentContributor {
    id: number
    user: User
    actions: ContentAction[]
    version: number
}

export interface FilterParams {
    categoryId?: string
    groupId?: string
    contributorId?: string
    status?: ContentStatus
}

export interface FilterData {
    groups: KnowledgeGroup[]
    categories: KnowledgeCategory[]
    contributors: User[]
}

export interface NotificationConfig {
    id: number
    subject: string
    action: string
    recipient: string
    isEnabled: boolean
    createdAt: string
    updatedAt: string
    recipients: User[]
    label: string
    excludeAppAdmins?: boolean
}

export interface DocumentType {
    id: number
    name: string
    description: string
    categoryCode: string
    createdAt: number
    updatedAt: number
    createdBy: User
    documentsCount: number
}

export enum ContentType {
    FILE = 'FILE',
    EDITOR = 'EDITOR',
    CHECKLIST = 'CHECKLIST'
}

export enum DocumentChecklistQuestionType {
    YES_NO = 'YES_NO',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    TEXTAREA = 'TEXTAREA',
    IMAGE = 'IMAGE',
    FILE = 'FILE'
}

export interface DocumentChecklistQuestion {
    id?: string
    question: string
    questionText?: string
    questionType: DocumentChecklistQuestionType
    required: boolean
    orderIndex?: number
}

export interface DocumentChecklist {
    title?: string
    description?: string
    questions: DocumentChecklistQuestion[]
}

export interface Document {
    id: string
    title: string
    description: string
    dueDate: number
    documentCode: string
    contentType?: ContentType | null
    isPublic: boolean
    isAiAccessible?: boolean
    isObsolete: boolean
    createdAt: number
    updatedAt: number
    currentVersion: number
    approvalDate: number
    approvalDueDate: number
    obsoleteDate: number
    deleted: boolean
    activeChangeRequests?: number
    totalChangeRequests?: number
    changeRequest?: { id: number }

    documentType: DocumentType

    team: OrganizationUnit

    versions: DocumentVersion[]

    createdBy: User

    approvers: User[]

    reviewers: User[]

    acknowledgers?: User[]

    contributors: ContentContributor[]

    contentContributors?: Array<Pick<User, 'id' | 'fname' | 'lname' | 'email'>>

    approvalStrategy: ApprovalStrategy

    latestPublishedVersionContent?: string
    /** Presigned URL for docx EDITOR content (binary; not decodable as HTML). */
    latestPublishedVersionContentUrl?: string

    pendingVersionContent?: string
    /** Presigned URL for docx EDITOR pending version content. */
    pendingVersionContentUrl?: string

    documentTemplate?: { id: string } | null
    processes?: { id: string; name: string; code?: string | null }[]
}
export interface DocumentVersion {
    id: number
    versionNumber: number
    content: string
    createdAt: number
    file: string
    changes?: string
    changeRequest?: ChangeRequest
    status: DocumentStatus
    createdBy: User
    checklist?: DocumentChecklist | null
}

export interface OrganizationUnitSettings {
    maxOwnerLevels: number
    levelNames: string[]
}

export interface ApprovalStrategy {
    id: number
    name: string
    requiredReviews: number
    maxReviewDuration: number
    requiredApprovals: number
    maxApprovalDuration: number
    organizationUnits: OrganizationUnit[]
    documentType?: DocumentType | null
    documentTypeId?: number
    documentApprovers: DocumentApprover[]
    allReviewers: boolean
    allApprovers: boolean
    allowOrdering?: boolean
    includeChildren: boolean
    noReview: boolean
    noApprove: boolean
    isDefault?: boolean
}

export interface DocumentAcknowledgement {
    id: number
    name: string
    description?: string
    organizationUnits: OrganizationUnit[]
    documentType?: DocumentType | null
    documentTypeId?: number
    allUsers: boolean
    includeChildren: boolean
}
export interface DocumentApprover {
    id: number
    user: User
    roleType: string
    order?: number
}
export interface DocumentVersion {
    id: number
    versionNumber: number
    createdAt: number
    content: string
    file: string
    document: Document
    changes?: string
    status: DocumentStatus
}

export enum DocumentStatus {
    PENDING = 'pending',
    READY_FOR_APPROVAL = 'ready_for_approval',
    PUBLISHED = 'published',
    IN_REVIEW = 'in_review',
    OBSOLETE = 'obsolete'
}

export enum ChangeRequestStatus {
    ACTIVE = 'active',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected'
}

export interface ChangeRequest {
    id: number
    title?: string
    reason?: string
    justification?: string
    riskIdentified?: string
    status: ChangeRequestStatus
    documentId?: string
    documentIds?: string[]
    documents?: ChangeRequestDocument[]
    organizationUnit?: OrganizationUnit
    organizationUnitId?: number
    requestedBy: User
    reviewedBy?: User
    reviewedAt?: number
    reviewComment?: string
    createdAt: number
    updatedAt: number
}
export interface ChangeRequestDocument {
    id: string
    title: string
}

export interface DocumentDraftCreatedBy {
    id: string
    fname?: string
    lname?: string
}

export interface DocumentDraftListItem {
    id: string
    title: string
    documentId: string | null
    documentVersionId: number | null
    document?: { id: string; title: string } | null
    documentVersion?: { id: number; versionNumber: number } | null
    createdBy?: DocumentDraftCreatedBy
    updatedAt: number
    createdAt: number
}

export interface DocumentDraftDetail {
    id: string
    title: string
    documentId: string | null
    documentVersionId: number | null
    createdBy?: DocumentDraftCreatedBy
    /** Signed URL for draft docx content (SuperDoc). */
    contentUrl?: string
}
export interface UserNotification {
    id: number
    createdAt: number
    viewed: boolean
    data: {
        id: number
        title: string
        message: string
        link: string
    }
}

export interface UserTaskCreatedBy {
    id: string
    fname: string
    lname: string
}

export interface UserTask {
    id: string
    entityName: string
    module?: string
    originModule?: string
    createdBy?: UserTaskCreatedBy
    entityId: string
    createdAt: number
    updatedAt: number
    deleted: boolean
    isCompleted: boolean
    completedAt: number
    forUserId: string
    dueDate: number
    message: string
    route: string
}

export interface Event {
    id: string
    entityId: string
    entityName: string
    startDate: number
    endDate: number
    eventType: string
    createdAt: number
    updatedAt: number
    route: string
}

export interface RiskFactorValue {
    label: string
    score: number
}

export interface RiskFactor {
    id: number
    title?: string
    scales: RiskFactorScale[]
}

export interface RiskRange {
    id: number
    title?: string
    color: string
}

export interface RiskType {
    id: string
    name: string
    description?: string | null
}

export interface RiskRangeSetting {
    id?: number
    range: RiskRange
    min: number
    max: number
}

export interface RiskSetting {
    id: number
    title?: string
    riskFactorScales: RiskSettingFactorScale[]
    riskRanges: RiskRangeSetting[]
    operationThreshold: number
    organizationUnits: OrganizationUnit[]
    review: ReviewPeriod
    includeChildren: boolean
}
export enum ReviewPeriod {
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly'
}
export interface RiskSettingFactorScale {
    id?: number
    riskFactorScale: RiskFactorScale
    weight?: number
}

export interface RiskFactorScale {
    id?: number
    scale: number
    scaleName?: string
    factor?: RiskFactor
}

export interface RiskAssessment {
    id: number
    name: string
    activity: Activity
    assessmentDate: number
    riskSetting: RiskSetting
    riskType?: RiskType | null
    issueId?: string | null
    issue?: { id: string; name: string } | null
    siteId?: string | null
    site?: {
        id: string
        name: string
        code?: string | null
        status?: string
    } | null
    process?: {
        id: string
        name: string
        code?: string | null
        organizationUnits?: Array<{
            id?: number
            name?: string
            organizationUnit?: { id?: number; name?: string | null }
        }>
    } | null
    hazardLinks?: {
        id: string
        hazardId: string
        hazard: { id: string; name: string }
    }[]
    createdAt: number
    createdBy: User
}

export interface Activity {
    id: number
    name: string
}

export enum RiskStatus {
    OPEN = 'open',
    MONITORED = 'monitored'
}

export interface RiskUniversalControlLink {
    id: string
    riskId: number
    universalControlId: string
    createdAt: number
    universalControl: {
        id: string
        name: string
        status: string
        monitoringFrequency: string
        customFrequencyMonths?: number
        assignee?: User
        deleted?: boolean
    }
}

export interface Risk {
    id: number
    name: string
    causes: string[]
    effects: string[]
    preRpn: Rpn
    postRpn: Rpn
    status: RiskStatus
    createdBy: User
    immediateActions: RiskImmediateAction[]
    universalControlLinks?: RiskUniversalControlLink[]
    createdAt: number
    assessment: RiskAssessment
    sourceId?: string | null
    sourceType?: string | null
}

export interface Rpn {
    id?: number
    score: number
    factorIds: number[]
    scaleIds?: number[]
    createdBy?: {
        id: string
        fname: string
        lname: string
        email: string
    }
    createdAt?: number
}

export interface RiskImmediateAction {
    id: string
    description: string
    status: ImmediateActionStatus
    dueDate?: number
    assignedTo?: User
    createdBy?: User
    evidence?: ImmediateActionEvidenceResponseDTO[]
}

export interface ScaleInfo {
    factorTitle: string
    scale: number
    scaleName: string
}
export interface Control {
    id: number
    name: string
}

export interface RiskActivity {
    id: number
    name: string
    createdBy: User
    createdAt: number
    activityOrganizationUnits: { id: number; organizationUnit: OrganizationUnit }[]
    includeChildren: boolean
}
export interface Competency {
    id?: number
    name: string
    description: string
    competencyLevels: CompetencyLevel[]
    deleteCompetencyLevels?: number[]
}
export interface CompetencyCertification {
    id?: number
    name: string
    periodDays?: number | null
}

export interface UserCompetencyCertification {
    id?: number
    competencyCertificationId: number
    issuedAt: number
    fileUrl?: string
    uploadedAt?: number
    competencyCertification?: CompetencyCertification
}

export interface CompetencyLevel {
    id?: number | string
    name: string
    description: string
    order: number
    /** Optional duration in days a user should remain at this level. */
    duration?: number | null
    certifications?: CompetencyCertification[]
}

export interface CompetencyUserAssignment {
    id: number
    inCompetencySince?: number | null
    certifications?: UserCompetencyCertification[]
    user: {
        id: string
        fname: string
        lname: string
        email: string
    }
    competencyLevel: {
        id: number
        name: string
        description: string
        order: number
        duration?: number | null
        certifications?: CompetencyCertification[]
    }
}

export interface UserCompetencyEntry {
    id: number
    inCompetencySince?: number | null
    certifications?: UserCompetencyCertification[]
    competency: {
        id: number
        name: string
        description: string
    }
    competencyLevel: {
        id: number
        name: string
        description: string
        order: number
        duration?: number | null
        certifications?: CompetencyCertification[]
    }
}

export type UserLinkedRelation =
    | 'created'
    | 'owner'
    | 'assigned'
    | 'responsible'
    | 'contributor'
    | 'attendee'
    | 'enrolled'
    | 'trainer'
    | 'assignee'
    | 'internal_representative'
    | 'scheduled'
    | 'team_member'
    | 'participant'

export interface UserLinkedRecord {
    id: string
    type: string
    title: string
    relations: UserLinkedRelation[]
    createdAt: number | null
    route: string | null
}

export interface UserLinkedRecordsGroup {
    type: string
    count: number
    items: UserLinkedRecord[]
}

export interface UserLinkedRecordsResponse {
    groups: UserLinkedRecordsGroup[]
}

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'FAULTY'

export type CalibrationStatus =
    | 'NOT_REQUIRED'
    | 'CURRENT'
    | 'DUE_SOON'
    | 'EXPIRED'
    | 'OUT_OF_TOLERANCE'

export type AssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type CalibrationResult = 'PASS' | 'FAIL' | 'ADJUSTED' | 'INCONCLUSIVE'

export type ReadingSchedule =
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'HALF_YEARLY'
    | 'YEARLY'

export interface Asset {
    id: string
    name: string
    description?: string | null
    status: AssetStatus
    link?: string | null
    assetTag?: string | null
    serialNumber?: string | null
    manufacturer?: string | null
    model?: string | null
    location?: string | null
    responsibleUserId?: string | null
    intendedUse?: string | null
    criticality?: AssetCriticality | null
    calibrationRequired?: boolean
    calibrationMeasurementUnit?: string | null
    calibrationReadingSchedule?: ReadingSchedule | null
    calibrationMethod?: string | null
    acceptanceCriteria?: string | null
    toleranceMin?: number | null
    toleranceMax?: number | null
    calibrationVendor?: string | null
    certificateNumber?: string | null
    lastCalibrationReadingAt?: number | null
    lastCalibrationAt?: number | null
    nextCalibrationDueAt?: number | null
    lastCalibrationResult?: CalibrationResult | null
    calibrationStatus?: CalibrationStatus
    createdAt?: number
    updatedAt?: number
}

export interface StatusOption {
    id: string | number
    name: string
    i18nKey?: string
}

export function labelForStatusOption(
    opt: StatusOption | null | undefined,
    t: (key: string) => string
): string {
    if (opt == null) return ''
    if (opt.i18nKey) return t(opt.i18nKey)
    return String(opt.name)
}

export const STATUS_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Status', i18nKey: 'audit.personnel.filter_all_status' },
    { id: 'Active', name: 'Active', i18nKey: 'statuses.active' },
    { id: 'Inactive', name: 'Inactive', i18nKey: 'statuses.inactive' }
]

export interface Training {
    id: number
    title: string
    description: string
    competency: Competency
    competencyLevel: CompetencyLevel
    budget: number
    organizationUnits?: OrganizationUnit[]
    includeChildren?: boolean
    trainingMaterial?: string[]
    deliveryType?: 'SCHEDULED' | 'SELF_PACED'
    dueDate?: number | null
}

export enum TrainingStatus {
    CREATED = 'CREATED',
    SCHEDULED = 'SCHEDULED',
    PARTIALLY_EXECUTED = 'PARTIALLY_EXECUTED',
    FULLY_EXECUTED = 'FULLY_EXECUTED'
}

export type MandatoryTrainingProgressStatus =
    | 'TAKEN'
    | 'SCHEDULED'
    | 'NOT_SCHEDULED'
    | 'NOT_TAKEN'

export interface MandatoryTraining {
    trainingId: string
    title: string
    deliveryType: 'SCHEDULED' | 'SELF_PACED'
    source: 'SCHEDULED_INSTANCE' | 'COMPETENCY_REQUIRED'
    dueDate?: number | null
    instanceId?: string | null
    instanceName?: string | null
    status?: TrainingStatus | null
    progressStatus: MandatoryTrainingProgressStatus
    startDate?: number | null
    endDate?: number | null
    competency?: { id: number; name: string } | null
    competencyLevel?: { id: number; name: string } | null
}
export interface RiskAssessment {
    id: number
    name: string
    activity: Activity
    assessmentDate: number
    riskSetting: RiskSetting
    riskType?: RiskType | null
    issueId?: string | null
    issue?: { id: string; name: string } | null
    siteId?: string | null
    site?: {
        id: string
        name: string
        code?: string | null
        status?: string
    } | null
    process?: {
        id: string
        name: string
        code?: string | null
        organizationUnits?: Array<{
            id?: number
            name?: string
            organizationUnit?: { id?: number; name?: string | null }
        }>
    } | null
    hazardLinks?: {
        id: string
        hazardId: string
        hazard: { id: string; name: string }
    }[]
    createdAt: number
    createdBy: User
}

export interface TrainingInstance {
    id: string
    name: string
    evaluationType: {
        id: string
        name: string
    }
    training: {
        id: string
        title: string
        competency: Competency
        competencyLevel: CompetencyLevel
        deliveryType?: 'SCHEDULED' | 'SELF_PACED'
        trainingDocuments: {
            id: string
            title: string
        }[]
        trainingMaterial: string[]
    }
    organizationUnit?: OrganizationUnit

    trainer: {
        id: string
        fname: string
        lname: string
    }
    location: string
    onlineMeetingLink: string
    startDate: number | null
    endDate: number | null
    status: string
    createdAt: string
    createdBy: {
        id: string
        fname: string
        lname: string
    }
    updatedAt: string
    roster: Array<{
        id: string
        trainingInstance: {
            id: string
        }
        trainingUser: {
            id: string
            fname: string
            lname: string
        }
        enrollmentDate: string
        enrollmentStatus: string
    }>
    postEvaluationActions: Array<{
        id: string
        trainingInstance: {
            id: string
        }
        type: string
        status: string
        note: string
        roster: {
            id: string
            trainingUser: {
                id: string
                fname: string
                lname: string
            }
        }
    }>
    effectiveness: {
        id: string
        result: string
        notes: string
        evidenceFiles: string[]
    }
}

export interface TrainingUser {
    id: string
    fname: string
    lname: string
    email: string
    phone: string
    address: string
    trainingUserTypeName: string
}
export interface Activity {
    id: number
    name: string
}

export interface Rpn {
    id?: number
    score: number
    factorIds: number[]
    scaleIds?: number[]
    createdBy?: {
        id: string
        fname: string
        lname: string
        email: string
    }
    createdAt?: number
}
export interface Control {
    id: number
    name: string
}

export interface RiskActivity {
    id: number
    name: string
    createdBy: User
    createdAt: number
    activityOrganizationUnits: { id: number; organizationUnit: OrganizationUnit }[]
    includeChildren: boolean
}

export interface ListItem {
    id?: number | string
    name: string
    description?: string
    isActive?: boolean
    isDefault?: boolean
}
export interface Trainer {
    id: string
    fname: string
    lname: string
}

export interface AuditPersonnel {
    id: number | string
    firstName: string
    lastName: string
    email?: string
    employeeId?: string
    isExternal?: boolean
    isActive?: boolean
    userId?: string | null
    user?: User | null
    createdBy?: User
    deleted?: boolean
}

// API response structure that matches backend format
export interface AuditPersonnelResponse {
    id: number
    fname: string
    lname: string
    email?: string
    employeeId?: string
    isExternal?: boolean
    isActive?: boolean
    createdBy?: User
    deleted?: boolean
}

export interface AuditRole {
    id: string
    name: string
    description?: string
    isDefault?: boolean
    createdBy?: User
    createdAt?: number
    updatedAt?: number
}

export interface AuditTeamMember {
    id: string
    auditPersonnel: AuditPersonnel
    auditRole: AuditRole
    assignedAt?: number
    assignedBy?: User
}

// API response structure that matches backend format
export interface AuditTeamMemberResponse {
    id: string
    auditPersonnel: AuditPersonnelResponse
    auditRole: AuditRole
    assignedAt?: number
    assignedBy?: User
}

// Type alias for compatibility with existing code
export type TeamMember = AuditTeamMember

export interface AuditActivityType extends ListItem {
    organizationUnit?: {
        id: number
        name: string
    }
}

export interface AuditCriteriaDto {
    id: string
    name: string
    description: string
    isDefault?: boolean
    standardId?: string
    standard?: StandardDto
}

export interface StandardDto {
    id: string
    name: string
    description?: string
    isDefault?: boolean
}

export interface AddStandardDto {
    name: string
    description?: string
}

export interface AddAuditCriteriaDto {
    name: string
    description?: string
    standardId?: string
}

export enum AuditProgramStatus {
    DRAFT = 'DRAFT',
    PLANNED = 'PLANNED',
    SCHEDULED = 'SCHEDULED',
    CANCELLED = 'CANCELLED_PLAN'
}

export enum AuditInstanceStatus {
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    ON_HOLD = 'ON_HOLD',
    DRAFT = 'DRAFT'
}

export const AUDIT_INSTANCE_STATUS_OPTIONS: StatusOption[] = [
    { id: AuditInstanceStatus.SCHEDULED, name: 'Scheduled' },
    { id: AuditInstanceStatus.IN_PROGRESS, name: 'In Progress' },
    { id: AuditInstanceStatus.COMPLETED, name: 'Completed' },
    { id: AuditInstanceStatus.CANCELLED, name: 'Cancelled' },
    { id: AuditInstanceStatus.ON_HOLD, name: 'On Hold' }
]

export interface AuditInstance {
    id: string
    auditId?: string
    auditProgram: AuditProgram
    auditProgramId: string
    auditDocumentId?: string
    startDate?: number
    endDate?: number
    ChecklistDefinitions?: {
        id: string
        title: string
    }[]
    checklistDefinitionVersionId?: string
    status: AuditInstanceStatus
    scheduledBy: User
    scheduledByUserId: string
    location?: string
    scope?: string
    objective?: string
    auditCriteria: AuditCriteriaDto
    auditCriteriaId?: string
    auditSummary?: string
    createdAt: number
    updatedAt: number
    teamMembers?: AuditTeamMemberResponse[]
    scheduleEntry?: AuditProgramScheduleEntry
}

export interface AuditInstanceResponse {
    id: string
    auditId: string
    auditProgram: {
        id: string
        title: string
        expectedDate: number
        objective?: string
        scope?: string
        auditActivityType?: {
            id: string
            name: string
        }
        organizationUnits?: Array<{
            id: number
            name?: string
            title?: any
            members?: Array<{
                id: number
                role: string
                user?: {
                    id: string
                    fname: string
                    lname: string
                    email: string
                }
            }>
        }>
    }
    auditDocumentId?: string
    startDate?: number
    endDate?: number
    scope?: string
    objective?: string
    ChecklistDefinitions?: { id: string; title: string }[]
    status: AuditInstanceStatus
    scheduledBy: {
        id: string
        fname: string
        lname: string
    }
    location?: string
    auditSummary?: string
    createdAt: number
    updatedAt: number
    teamMembers?: AuditTeamMemberResponse[]
    scheduleEntry?: AuditProgramScheduleEntry
    auditChecklistResponses?: Array<{
        id: string
        responseAnswer?: string
        auditorObservation?: string
        questionDefinition?: {
            id: string
            questionText: string
            orderIndex: number
            sectionDefinition?: {
                id: string
                title: string
                orderIndex: number
                checklistDefinition?: {
                    id: string
                    title: string
                }
            }
        }
        auditFindings?: Array<{
            id: string
            title: string
            description?: string
            classification?: string
            severity?: string
            raisedNc: boolean
            nonConformity?: {
                id: string
                problemStatement?: string
                dueDate?: number
            }
            auditFindingEvidences?: Array<{
                id: string
                description?: string
                evidenceType?: string
                documentId?: string
                documentName?: string
                fileName?: string
            }>
        }>
    }>
}
export interface ChecklistDefinition {
    id: number
    title: string
    description?: string
    version: number
    isDraft?: boolean
    activityType: AuditActivityType
    organizationUnits?: OrganizationUnit[]
    createdAt: number
    updatedAt: number
    createdBy: User
    sectionsCount?: number
    questionsCount?: number
}

export interface ChecklistSectionDefinition {
    id: number
    name: string
    description?: string
    orderIndex: number
    checklistDefinitionId: number
    checklistDefinition?: ChecklistDefinition
    isActive?: boolean
    createdAt: number
    updatedAt: number
    createdBy: User
    questionsCount?: number
}

export interface ChecklistQuestionDefinition {
    id: number
    question: string
    description?: string
    orderIndex: number
    sectionDefinitionId: number
    sectionDefinition?: ChecklistSectionDefinition
    isRequired: boolean
    questionType: string
    isActive?: boolean
    createdAt: number
    updatedAt: number
    createdBy: User
}

export interface AuditProgram {
    id: string
    title: string
    scope?: string
    objective?: string
    expectedDate: number
    targetYear?: number
    status: AuditProgramStatus
    includeChildren?: boolean
    duration?: number
    standards?: StandardDto[]
    organizationUnits?: {
        id: number
        name: string
        title?: string
    }[]
    auditActivityType: AuditActivityType
    auditInstances?: {
        id: string
        startDate?: number
        endDate?: number
        scope?: string
        objective?: string
        criteria?: {
            id: string
            name: string
        }
    }[]
    scheduleEntries?: AuditProgramScheduleEntry[]
}

export interface AuditProgramScheduleEntry {
    id?: string
    month: number
    processId: string
    process?: {
        id: string
        name: string
        code?: string | null
    }
    notes?: string
    isUnplanned?: boolean
    amendmentReason?: string
    auditInstanceId?: string
    auditInstance?: {
        id: string
        auditId?: string
        startDate?: number
        endDate?: number
        status?: AuditInstanceStatus
    }
}

export enum AuditReportType {
    GENERATED = 'GENERATED',
    UPLOADED = 'UPLOADED'
}

export interface AuditReport {
    id: string
    auditInstanceId: string
    filePath: string
    type: AuditReportType
    title: string
    description?: string
    notes?: string
    originalDate?: number
    createdBy: {
        id: string
        fname: string
        lname: string
    }
    createdAt: number
    updatedAt: number
}

export const AUDIT_STATUS_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Status' },
    { id: AuditProgramStatus.DRAFT, name: 'Draft' },
    { id: AuditProgramStatus.PLANNED, name: 'Planned' },
    { id: AuditProgramStatus.SCHEDULED, name: 'Scheduled' },
    { id: AuditProgramStatus.CANCELLED, name: 'Cancelled Plan' }
]

export enum AuditFindingClassification {
    NON_CONFORMITY = 'NON_CONFORMITY',
    OBSERVATION = 'OBSERVATION',
    OPPORTUNITY = 'OPPORTUNITY_FOR_IMPROVEMENT'
}

export enum AuditFindingSeverity {
    MAJOR = 'MAJOR',
    MINOR = 'MINOR'
}

export const AUDIT_FINDING_CLASSIFICATION_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Classification' },
    { id: AuditFindingClassification.NON_CONFORMITY, name: 'Non-Conformity' },
    { id: AuditFindingClassification.OBSERVATION, name: 'Observation' },
    { id: AuditFindingClassification.OPPORTUNITY, name: 'Opportunity for Improvement' }
]

export const AUDIT_FINDING_SEVERITY_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Severity' },
    { id: AuditFindingSeverity.MAJOR, name: 'Major' },
    { id: AuditFindingSeverity.MINOR, name: 'Minor' }
]

export enum AuditFindingEvidenceType {
    DOCUMENT = 'DOCUMENT',
    AUDIT_EVIDENCE_FILE = 'AUDIT_EVIDENCE_FILE'
}

export const AUDIT_FINDING_EVIDENCE_TYPE_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Type' },
    { id: AuditFindingEvidenceType.DOCUMENT, name: 'Link Internal Document' },
    { id: AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE, name: 'Upload New File' }
]

export interface Evidence {
    description: string
    evidenceType: string
    documentId?: string
    documentName?: string
}

export interface Finding {
    title: string
    description: string
    classification: string
    severity?: string | null
    evidences?: Evidence[]
    files?: File[]
}

export interface AuditFindingDetailResponseDTO {
    id: string
    title: string
    description: string
    classification: AuditFindingClassification
    severity?: AuditFindingSeverity | null
    linkedNcId?: string | null
    ncName?: string | null
    raisedNc: boolean
    createdAt: number
    auditTeamMember?: AuditTeamMemberResponse | null
    auditChecklistResponse?: any
    evidences?: {
        id?: string
        description?: string
        documentName?: string | null
        evidenceType?: string
        documentId?: string | null
        fileName?: string | null
    }[]
}

export interface AuditFindingResponseDTO {
    id: string
    title: string
    questionText: string | null
    classification: AuditFindingClassification
    severity?: AuditFindingSeverity | null
    numberOfEvidences: number
    auditTeamMember: {
        id: string
        fname: string | null
        lname: string | null
    } | null
    raisedNc?: boolean
    nonConformity?: {
        id?: string
        name?: string
        problemStatement?: string
        dueDate?: number
    } | null
    evidences?: string[]
    recommendations?: string | null
}

// Audit Report Data Interfaces
export interface AuditReportRecord {
    questionNumber: number
    questionText: string
    responseAnswer?: string
    auditorObservation?: string
    findings: string
    findingClassification?: string
    evidences: string
    evidenceSourceType?: string
}

export interface AuditReportNonConformity {
    question: string
    findings: string
    evidences: string
    recommendations: string
    ncr: string
    dueDate: number
}

export interface AuditReportChecklist {
    id: string
    title: string
    records: AuditReportRecord[]
    nonConformities: AuditReportNonConformity[]
}

export interface AuditReportData {
    // Header Section
    auditProgramTitle: string
    auditProgramExpectedDate: number
    auditInstanceId: string
    auditId: string
    auditInstanceStatus: AuditInstanceStatus
    auditProgramOrgUnit: string

    // Objective & Scope Section
    objective: string
    scope: string

    // Details Section
    startDate: number
    endDate: number
    startTime: number
    auditType: string
    processOwners: string
    auditMembers: string

    // Checklists & Findings Section
    checklists: AuditReportChecklist[]

    // All Findings Section (all findings of the audit instance)
    allFindings: AuditFindingResponseDTO[]

    // All NCs (all non-conformities of the audit instance, including from findings without checklist response)
    allNonConformities: AuditReportNonConformity[]

    // Audit Summary Section
    auditSummary: string
}

export enum QuestionType {
    TEXT = 'TEXT',
    BOOLEAN = 'BOOLEAN',
    SINGLE_CHOICE = 'SINGLE_CHOICE',
    SCALE = 'SCALE'
}

export const QUESTION_TYPE_OPTIONS: StatusOption[] = [
    { id: QuestionType.TEXT, name: 'Text' },
    { id: QuestionType.BOOLEAN, name: 'Yes/No' },
    { id: QuestionType.SINGLE_CHOICE, name: 'Single Choice' },
    { id: QuestionType.SCALE, name: 'Scale' }
]

export interface SurveyQuestionChoice {
    id?: string
    choiceText: string
    orderIndex?: number
}

export interface SurveyTemplateResponse {
    id: string
    title: string
    description: string
    categoryName: string
    numberOfQuestions: number
    updatedAt: number
}

export interface SurveyQuestionChoiceResponse {
    id: string
    choiceText: string
    orderIndex: number
}

export interface SurveyQuestionScaleResponse {
    id: string
    minValue: number
    maxValue: number
    minLabel: string
    maxLabel: string
}

export interface SurveyTemplateQuestion {
    id: string
    orderIndex: number
    isRequired: boolean
    questionText: string
    questionType: string
    surveyQuestionScale?: SurveyQuestionScaleResponse
    surveyQuestionChoices?: SurveyQuestionChoiceResponse[]
}

export interface SurveyTemplate {
    id: string
    title: string
    description: string
    surveyCategory: StatusOption
    surveyTemplateQuestions: SurveyTemplateQuestion[]
}

export interface SurveyRecipient {
    id: string
    email: string
    name: string
    phone?: string
    companyName?: string
    deleted: boolean
}
export interface SessionData {
    companyName: string
    client: string
    questions: SurveyTemplateQuestion[]
    existingAnswers?: Array<{
        questionId: string
        answerText?: string | null
        answerBoolean?: boolean | null
        answerChoiceId?: string | null
        answerScaleValue?: number | null
    }>
    currentQuestionIndex?: number | null
}

export interface SurveyQuestionChoiceAnalyticsDTO {
    id: string
    choiceText: string
    orderIndex: number
    responseCount: number
}

export interface SurveyQuestionScaleAnalyticsDTO {
    id: string
    minValue: number
    maxValue: number
    minLabel: string
    maxLabel: string
    averageValue: number
    valueCounts?: Record<string, number>
}

export interface SurveyQuestionBooleanAnalyticsDTO {
    yesCount: number
    yesPercentage: number
    noCount: number
    noPercentage: number
}

export interface QuestionBlock {
    id: string
    orderIndex: number
    isRequired: boolean
    questionText: string
    questionType: string
    totalResponses: number
    surveyQuestionScale?: SurveyQuestionScaleAnalyticsDTO
    surveyQuestionChoices?: SurveyQuestionChoiceAnalyticsDTO[]
    booleanAnalytics?: SurveyQuestionBooleanAnalyticsDTO
}

export interface TextAnswer {
    questionId: string
    questionText: string
    answerText: string
    recipientName: string
    date: number
}
export interface NonConformityRiskLevelResponseDTO {
    id?: string
    name: string
    description: string
    order: number
}

export interface NonConformityType {
    id: string
    name: string
    description: string
}

export interface NonConformityRepresentative {
    id: string
    firstName: string
    lastName: string
    email: string
}

export interface NonConformityProcessOwner {
    id: string
    fname: string
    lname: string
}

export interface NonConformityProcessSummary {
    id: string
    name: string
    code?: string | null
}

export interface NonConformityResponseDTO {
    id: string
    name: string
    organizationUnitId: number
    siteId?: string | null
    site?: {
        id: string
        name: string
        code?: string | null
        status?: string
    } | null
    representativeId?: string
    representativeType?: string
    internalRepresentativeId?: string | null
    nonConformityRiskLevelId: string
    nonConformityTypeId: string
    createdAt: number
    categoryId: string
    dateReported: number
    dueDate: number
    problemStatement: string
    performanceIndicatorId?: string | null
    objectiveEvidence: string
    requirements: string
    evidenceFiles: string[]
    organizationUnit: OrganizationUnit
    nonConformityType: NonConformityType
    nonConformityRiskLevel: NonConformityRiskLevel
    representative: NonConformityRepresentative | null
    internalRepresentative?: {
        id: string
        fname: string
        lname: string
        email?: string
    } | null
    status: NCStatus
    customFieldValues?: Array<{
        id: string
        value: any
        customField?: {
            id: string
            label?: string
            fieldType?: string
            isRequired?: boolean
            options?: any
            acceptedFiles?: any
        }
    }>
    correctiveActions?: Array<{
        id: string
        title: string
        description: string
        priority: NCCorrectiveActionPriority
        dueDate: number
        status: NCCorrectiveActionStatus
        deleted: boolean
        createdById: string
        assignedTo: {
            id: string
            fname: string
            lname: string
        }
        createdBy: {
            id: string
            fname: string
            lname: string
        }
    }>
    closingComment?: string
    processes?: NonConformityProcessSummary[]
    processOwners?: NonConformityProcessOwner[]
    responsibleUserId?: string | null
    responsibleUser?: {
        id: string
        fname: string
        lname: string
        email?: string
    }
    isOverdue?: boolean
    dueDateAmendments?: NcDueDateAmendment[]
}

export interface NonConformityRiskLevel extends NonConformityType {
    displayOrder: number
}


// Non-conformity interfaces
export interface NonConformityCategory {
    id: string
    name: string
    parentId?: string
    parent?: NonConformityCategory
    children?: NonConformityCategory[]
    customFields?: NonConformityCategoryCustomField[]
}

export interface NonConformityCategoryCustomField {
    id: string
    categoryId: string
    label: string
    fieldType: CustomFieldType
    isRequired: boolean
    options?: string[]
    acceptedFiles?: string[]
    category?: NonConformityCategory
}

export interface CreateCategoryDto {
    name: string
    parentId?: string
}

export interface CreateCategoryCustomFieldDto {
    categoryId: string
    label: string
    fieldType: CustomFieldType
    isRequired?: boolean
    options?: string[]
    acceptedFiles?: string[]
}

export interface CreateCategoryWithCustomFieldsDto {
    name: string
    parentId?: string
    customFields?: Omit<CreateCategoryCustomFieldDto, 'categoryId'>[]
}

export interface UpdateCategoryWithCustomFieldsDto {
    name?: string
    parentId?: string
    customFields?: Omit<CreateCategoryCustomFieldDto, 'categoryId'>[]
}

export interface CustomFieldFormType {
    label: string
    fieldType: any
    isRequired: boolean
    options: string[]
    acceptedFiles: string[]
}

export enum NCStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED'
}

export const NC_STATUS: StatusOption[] = [
    { id: '', name: 'All Status', i18nKey: 'nc.enum.ncStatus.all' },
    { id: 'OPEN', name: 'Open', i18nKey: 'nc.enum.ncStatus.open' },
    { id: 'OVERDUE', name: 'Overdue', i18nKey: 'nc.enum.ncStatus.overdue' },
    { id: 'CLOSED', name: 'Closed', i18nKey: 'nc.enum.ncStatus.closed' }
] as const

export interface NcDueDateAmendment {
    id: string
    previousDueDate: number
    newDueDate: number
    amendedAt: number
    amendedBy?: {
        id: string
        fname: string
        lname: string
        email?: string
    }
}

export function labelForNcListStatus(
    status: string | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (!status) return ''
    const key = `nc.enum.ncStatus.${status.toLowerCase()}`
    return te(key) ? t(key) : status
}

export interface NonConformityType {
    id: string
    name: string
    description: string
}

export interface NonConformityRepresentative {
    id: string
    firstName: string
    lastName: string
    email: string
}
export interface NonConformityResponseDTO {
    id: string
    organizationUnitId: number
    siteId?: string | null
    site?: {
        id: string
        name: string
        code?: string | null
        status?: string
    } | null
    representative: NonConformityRepresentative | null
    nonConformityRiskLevel: NonConformityRiskLevel
    nonConformityType: NonConformityType
    createdBy?: User
    dateReported: number
    dueDate: number
    problemStatement: string
    performanceIndicatorId?: string | null
    objectiveEvidence: string
    requirements: string
    evidenceFiles: string[]
    status: NCStatus
    isOverdue?: boolean
    dueDateAmendments?: NcDueDateAmendment[]
}

export interface NonConformityRiskLevel extends NonConformityType {
    displayOrder: number
}

export interface NonConformity {
    id: string
    name?: string
    dueDate: number
    problemStatement: string
    performanceIndicatorId?: string | null
    status: NCStatus
    isOverdue?: boolean
    organizationUnit: OrganizationUnit
    nonConformityRiskLevel: NonConformityRiskLevel
    nonConformityType: NonConformityType
    category?: NonConformityCategory
    createdBy?: User
    responsibleUserId?: string | null
    responsibleUser?: {
        id: string
        fname: string
        lname: string
    } | null
    siteId?: string | null
    site?: {
        id: string
        name: string
        code?: string | null
        status?: string
    } | null
}

export const PERSONNEL_TYPE_OPTIONS: StatusOption[] = [
    { id: '', name: 'All Types', i18nKey: 'nc.enum.personnelType.all' },
    { id: 'Internal', name: 'Internal', i18nKey: 'nc.enum.personnelType.internal' },
    { id: 'External', name: 'External', i18nKey: 'nc.enum.personnelType.external' }
] as const
// Non-conformity interfaces
export enum CustomFieldType {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    DROPDOWN = 'dropdown',
    FILE_UPLOAD = 'fileUpload',
    MULTI_SELECT = 'multiSelect'
}

export const CustomFieldTypeI18nKey: Record<CustomFieldType, string> = {
    [CustomFieldType.TEXT]: 'nc.enum.customFieldType.text',
    [CustomFieldType.NUMBER]: 'nc.enum.customFieldType.number',
    [CustomFieldType.DATE]: 'nc.enum.customFieldType.date',
    [CustomFieldType.DROPDOWN]: 'nc.enum.customFieldType.dropdown',
    [CustomFieldType.FILE_UPLOAD]: 'nc.enum.customFieldType.fileUpload',
    [CustomFieldType.MULTI_SELECT]: 'nc.enum.customFieldType.multiSelect'
}

export function labelForNcCustomFieldType(
    fieldType: string | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (!fieldType) return ''
    const enumKey = (CustomFieldTypeI18nKey as Record<string, string | undefined>)[fieldType]
    if (enumKey) return t(enumKey)
    const extKey = `nc.enum.customFieldType.${fieldType}`
    return te(extKey) ? t(extKey) : fieldType
}

export interface NonConformityCategory {
    id: string
    name: string
    parentId?: string
    parent?: NonConformityCategory
    children?: NonConformityCategory[]
    customFields?: NonConformityCategoryCustomField[]
}

export interface NonConformityCategoryCustomField {
    id: string
    categoryId: string
    label: string
    fieldType: CustomFieldType
    isRequired: boolean
    options?: string[]
    acceptedFiles?: string[]
    category?: NonConformityCategory
}

export interface CreateCategoryDto {
    name: string
    parentId?: string
}

export interface CreateCategoryCustomFieldDto {
    categoryId: string
    label: string
    fieldType: CustomFieldType
    isRequired?: boolean
    options?: string[]
    acceptedFiles?: string[]
}

export interface CreateCategoryWithCustomFieldsDto {
    name: string
    parentId?: string
    customFields?: Omit<CreateCategoryCustomFieldDto, 'categoryId'>[]
}

export interface UpdateCategoryWithCustomFieldsDto {
    name?: string
    parentId?: string
    customFields?: Omit<CreateCategoryCustomFieldDto, 'categoryId'>[]
}

export interface CustomFieldFormType {
    label: string
    fieldType: any
    isRequired: boolean
    options: string[]
    acceptedFiles: string[]
}
export enum NCCorrectiveActionPriority {
    HIGH = 1,
    MEDIUM = 2,
    LOW = 3
}

export const NCCorrectiveActionPriorityOptions: StatusOption[] = [
    { id: '', name: 'All Priorities', i18nKey: 'nc.enum.caPriority.all' },
    {
        id: NCCorrectiveActionPriority.HIGH,
        name: 'High',
        i18nKey: 'nc.enum.caPriority.high'
    },
    {
        id: NCCorrectiveActionPriority.MEDIUM,
        name: 'Medium',
        i18nKey: 'nc.enum.caPriority.medium'
    },
    { id: NCCorrectiveActionPriority.LOW, name: 'Low', i18nKey: 'nc.enum.caPriority.low' }
]

export enum NCCorrectiveActionStatus {
    OPEN = 'OPEN',
    APPLIED = 'APPLIED',
    VERIFIED = 'VERIFIED',
    CLOSED = 'CLOSED'
}

export const NCCorrectiveActionStatusOptions: StatusOption[] = [
    { id: '', name: 'All Statuses', i18nKey: 'nc.enum.caStatus.all' },
    {
        id: NCCorrectiveActionStatus.OPEN,
        name: 'Open',
        i18nKey: 'nc.enum.caStatus.open'
    },
    {
        id: NCCorrectiveActionStatus.APPLIED,
        name: 'Applied',
        i18nKey: 'nc.enum.caStatus.applied'
    },
    {
        id: NCCorrectiveActionStatus.VERIFIED,
        name: 'Verified',
        i18nKey: 'nc.enum.caStatus.verified'
    },
    {
        id: NCCorrectiveActionStatus.CLOSED,
        name: 'Closed',
        i18nKey: 'nc.enum.caStatus.closed'
    }
]

export enum CaChangeRequestType {
    DUE_DATE_CHANGE = 'DUE_DATE_CHANGE',
    ASSIGNEE_CHANGE = 'ASSIGNEE_CHANGE'
}

export const CaChangeRequestTypeOptions: StatusOption[] = [
    { id: '', name: 'All Types', i18nKey: 'nc.enum.crType.all' },
    {
        id: CaChangeRequestType.DUE_DATE_CHANGE,
        name: 'Due Date Change',
        i18nKey: 'nc.enum.crType.dueDateChange'
    },
    {
        id: CaChangeRequestType.ASSIGNEE_CHANGE,
        name: 'Assignee Change',
        i18nKey: 'nc.enum.crType.assigneeChange'
    }
]

export enum CaChangeRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export const CaChangeRequestStatusOptions: StatusOption[] = [
    { id: '', name: 'All Statuses', i18nKey: 'nc.enum.crStatus.all' },
    {
        id: CaChangeRequestStatus.PENDING,
        name: 'Pending',
        i18nKey: 'nc.enum.crStatus.pending'
    },
    {
        id: CaChangeRequestStatus.APPROVED,
        name: 'Approved',
        i18nKey: 'nc.enum.crStatus.approved'
    },
    {
        id: CaChangeRequestStatus.REJECTED,
        name: 'Rejected',
        i18nKey: 'nc.enum.crStatus.rejected'
    }
]

export interface CaEffectivenessEvidence {
    caId: string
    clientId: string
    deleted: boolean
    fileUrl: string
    id: string
    uploadedAt: number
    uploadedById: string
    uploadedBy: User
}

export interface CorrectiveAction {
    id: string
    title: string
    createdById: string
    createdBy: User
    createdAt?: number
    description: string
    expectedOutcome: string
    priority: NCCorrectiveActionPriority
    dueDate: number
    assignedTo: User
    verifiedBy?: User
    verifiedAt?: number
    closedAt?: number
    status: NCCorrectiveActionStatus
    changeRequests: CaChangeRequest[]
    effectivenessEvidences: CaEffectivenessEvidence[]
    rejectionExplanation?: string
    appliedAt?: number
    nonConformityId?: string
    ncCorrectiveActionCauses: {
        clientId: string
        id: string
        rcaCause: RCACeCause
        rcaFiveWhyStep: RCAFiveWhyStep
    }[]
}
export interface CaChangeRequest {
    caId: string
    clientId: string
    deleted: boolean
    id: string
    newAssignee: User
    newAssigneeId: string
    newDueDate: number
    reason: string
    requestedById: string
    reviewedAt: number
    reviewedById: string
    status: CaChangeRequestStatus
    title: string
    type: CaChangeRequestType
}
// Investigation and Root Cause Analysis interfaces
export interface RootCauseAnalysisResponseDTO {
    id: string
    nc_id: string
    nc?: {
        id: string
        problemStatement: string
        status: string
    }
    method: RCAMethod
    performed_by: User[]
    performed_at: number | null
    problem_statement: string
    description?: string
    created_at: number
    rcaCeCategories?: RCACeCategory[]
    fiveWhySteps?: RCAFiveWhyStep[]
    rcaFishbone?: FishboneResponseDTO
}

export interface FishboneResponseDTO {
    id: string
    rootCauseAnalysisId?: string
    effectStatement: string
    categories: FishboneCategoryDto[]
    // categories?: RCACeCategory[]
}

export interface FishboneCauseDto {
    text: string
    children?: FishboneCauseDto[]
}

export interface FishboneCategoryDto {
    name: string
    causes: FishboneCauseDto[]
}

export interface CreateFishboneDto {
    effectStatement?: string
    categories?: FishboneCategoryDto[]
}

export interface UpdateFishboneDto {
    effectStatement?: string
    categories?: FishboneCategoryDto[]
}

export interface InvestigationEvidenceResponseDTO {
    id: string
    investigation_id: string
    investigation?: {
        id: string
        action: string
        nc_id: string
    }
    file_url: string
    uploaded_by: {
        id: string
        fname: string
        lname: string
        email: string
    }
    uploaded_at: number
}

export interface RCAFiveWhyStep {
    id: string
    whyQuestion: string
    becauseAnswer: string
    rcaId?: string
    stepNumber?: number
}

export interface CreateRootCauseAnalysisDto {
    nc_id: string
    method: string
    performed_by_ids?: string[]
    performed_at?: number
    problem_statement: string
    description?: string
}

export interface UpdateRootCauseAnalysisDto {
    method?: string
    performed_by_ids?: string[]
    performed_at?: number
    problem_statement?: string
    description?: string
}

export interface InvestigationResponseDTO {
    id: string
    nc_id: string
    nc?: {
        id: string
        problemStatement: string
        status: string
    }
    action: string
    root_ca?: {
        id: string
        method: string
        problem_statement: string
    }
    created_at: number
}

export interface CreateInvestigationDto {
    nc_id: string
    action: string
    root_ca_id?: string
}

export interface UpdateInvestigationDto {
    action?: string
    root_ca_id?: string
}

export interface ImmediateActionResponseDTO {
    id: string
    ncId: string
    nc?: {
        id: string
        problemStatement: string
        status: string
    }
    action: string
    status: string
    evidenceType?: ImmediateActionEvidenceType
    assignedTo?: User
    dueDate?: number
    createdAt: number
    description: string
    evidences: ImmediateActionEvidenceResponseDTO[]
    createdBy: User
    verifiedBy?: User
    verifiedAt?: number
    closedAt?: number
    appliedAt?: number
    rejectionExplanation?: string
    completionNotes?: string
    comments?: ImmediateActionCommentResponseDTO[]
    checklistDocumentId?: string
    checklistDocument?: { id: string; title: string; documentCode?: string }
    checklistSignedAt?: number
    checklistSignedBy?: User
    checklistSignatureName?: string
    checklistSignatureImage?: string
}

export enum ImmediateActionCommentType {
    USER = 'user',
    REJECTION = 'rejection'
}

export interface ImmediateActionCommentResponseDTO {
    id: string
    text: string
    type: ImmediateActionCommentType
    createdBy: User
    createdAt: number
}

export interface ImmediateActionChecklistQuestionResponse {
    id: string
    questionText: string
    questionType: DocumentChecklistQuestionType
    required: boolean
    orderIndex: number
    answer?: string
}

export interface ImmediateActionChecklistResponse {
    documentId?: string
    documentTitle?: string
    questions: ImmediateActionChecklistQuestionResponse[]
    signedAt?: number
    signedBy?: User
    signatureName?: string
    signatureImage?: string
}
export interface ImmediateActionEvidenceResponseDTO {
    id: string
    filename: string
    createdBy: User
    createdAt: number
}

export interface CreateImmediateActionDto {
    nc_id: string
    action: string
    assigned_to_id?: string
    due_date?: number
}

export interface UpdateImmediateActionDto {
    action?: string
    assigned_to_id?: string
    due_date?: number
    status?: string
}

export enum RCAMethod {
    FISHBONE = 'Fishbone',
    CAUSE_EFFECT = 'CauseEffect',
    FIVE_WHYS = 'FiveWhys'
}

export const RCAMethodI18nKey: Record<RCAMethod, string> = {
    [RCAMethod.FISHBONE]: 'nc.rca.methodFishbone',
    [RCAMethod.CAUSE_EFFECT]: 'nc.rca.methodCauseEffect',
    [RCAMethod.FIVE_WHYS]: 'nc.rca.methodFiveWhys'
}

export enum InvestigationAction {
    CLOSE = 'close',
    OPEN_CA = 'openCA',
    OPEN_RCA = 'openRCA'
}

export interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

export interface CreateOpportunitiesForImprovementDto {
    organizationUnitId: number
    // ofiPriorityId: string;
    improvementStatement: string
    reason: string
}

export interface OpportunitiesForImprovementResponsDto {
    id: string
    organizationUnitId: number
    organizationUnit: OrganizationUnit
    ofiPriority: Priority
    improvementStatement: string
    reason: string
    status: string
    createdAt: number
    issueId?: string | null
    issue?: { id: string; name: string } | null
    process?: { id: string; name: string; code?: string | null } | null
    ofiSupports: {
        id: string
        filePath: string
        uploadedAt: number
    }[]
}

export enum OFIStatus {
    OPEN = 'OPEN',
    ACTIONS_PENDING = 'ACTIONS_PENDING',
    CLOSED = 'CLOSED'
}

export const OFI_STATUS: StatusOption[] = [
    { id: '', name: 'All Status', i18nKey: 'ofi.status.all' },
    { id: OFIStatus.OPEN, name: 'Open', i18nKey: 'ofi.status.open' },
    {
        id: OFIStatus.ACTIONS_PENDING,
        name: 'Actions Pending',
        i18nKey: 'ofi.status.actions_pending'
    },
    { id: OFIStatus.CLOSED, name: 'Closed', i18nKey: 'ofi.status.closed' }
]
export interface RCACeCause {
    id?: string
    text: string
}
export interface RCACeCategory {
    id?: string
    name: string
    causes: RCACeCause[]
}
export interface Priority {
    id?: string
    name: string
    description: string
    order: number
    clientId?: string
}

export enum ImmediateActionStatus {
    OPEN = 'open',
    READY_FOR_VERIFICATION = 'ready_for_verification',
    VERIFIED = 'verified',
    REJECTED = 'rejected'
}

export enum ImmediateActionEvidenceType {
    FILE = 'file',
    CHECKLIST = 'checklist'
}

export interface OFIImmediateAction {
    id: string
    ofiId: string
    description: string
    assigneeUserId: string
    assignedTo?: User
    dueDate: string
    status: ImmediateActionStatus
    completionDate: number | null
    verificationNotes: string | null
    verifiedByUserId: string | null
    verifiedByName?: string | null
    verifiedAt: number | null
    createdAt: number
    updatedAt: number
}

export interface CreateOFIImmediateActionDto {
    ofiId: string
    description: string
    assigneeUserId: string
    dueDate: number
}

export interface UpdateOFIImmediateActionDto {
    actionId: string
    description?: string
    assigneeUserId?: string
    dueDate?: number
    completionDate?: number
    verificationNotes?: string
}

export interface CompleteOFIImmediateActionDto {
    actionId: string
    completionNotes?: string
}

// Management Review interfaces
export interface AgendaItem {
    id?: number | string
    title: string
    order?: number
}

export interface ManagementReviewModule {
    id: string
    moduleName: string
}

export interface ManagementReviewAttendee {
    userId: string
    user?: User
}

export interface ManagementReviewModuleConfig {
    moduleName: string
}

export interface ManagementReviewAgendaItem {
    id?: string
    itemText: string
    orderIndex: number
}

export interface ManagementReviewMeetingPayload {
    id?: string
    title: string
    meetingDate: number
    status?: string
    dataStartDate: number
    dataEndDate: number
    createdByUserId?: string
    attendees: {
        userId: string
    }[]
    modules: ManagementReviewModuleConfig[]
    agendaItems: ManagementReviewAgendaItem[]
    meetingMinutes?: string
}

export interface ManagementReviewMeetingEditPayload extends ManagementReviewMeetingPayload {
    id: string
}

export interface AttendeeOption {
    id: string
    label: string
}
export interface ManagementReviewMeetingListItem {
    id: string
    title: string
    meetingDate: number
    status: string
    dataStartDate: number
    dataEndDate: number
    createdByUserId: string
    createdAt: number
    updatedAt: number
    attendees: ManagementReviewAttendee[]
    modules: ManagementReviewModule[]
    agendaItems: ManagementReviewAgendaItem[]
    meetingMinutes?: string
    actionItemsCount: number
}

export interface DashboardConfig {
    id: string
    name: string
    description: string
    module: string
    isReport: boolean
    displayType: DashboardDisplayType
    query: string
    question?: string
    variables?: string[]
}

export interface CreateDashboardDto {
    configs: {
        configId: string
        draggableConfig: any
        answers?: Record<string, string>
    }[]
}
export interface Dashboard {
    id: string
    clientId: string
    displays: DashboardDisplay[]
}

export interface DashboardDisplay {
    id: string
    config: DashboardConfig
    draggableConfig: any
    answers?: Record<string, string>
}

export enum DashboardDisplayType {
    TABLE = 'table',
    BAR = 'bar',
    PIE = 'pie',
    LINE = 'line',
    SINGLE_VALUE = 'single_value'
}

// Management Review status values and options
export enum MeetingStatus {
    PLANNED = 'Planned',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed'
}

export const MeetingStatusOptions: StatusOption[] = [
    { id: MeetingStatus.PLANNED, name: 'Planned', i18nKey: 'managementReview.planned' },
    { id: MeetingStatus.IN_PROGRESS, name: 'In Progress', i18nKey: 'managementReview.inProgress' },
    { id: MeetingStatus.COMPLETED, name: 'Completed', i18nKey: 'managementReview.completed' }
]

export interface MeetingDataReviewTabDto {
    dataStartDate: number
    dataEndDate: number
    modules: {
        id: string
        moduleName: string
    }[]
    page?: number
    perPage?: number
}
export interface DataReviewDto {
    id: string | number
    name: string
    description?: string
    status?: string
    createdAt?: number
    createdBy?: User
    updatedAt?: number
    link?: string
}

export interface DataReviewSection {
    meetingModuleSelectionId: string
    meetingModuleSelectionLabel: string
    data: DataReviewDto[]
}

export interface PaginatedDataReviewSection extends DataReviewSection {
    currentPage: number
    totalCount: number
    perPage: number
}

export interface ManagementReviewMeetingResponseDTO {
    id: string
    title: string
    meetingDate: number
    status: string
    dataStartDate: number
    dataEndDate: number
    createdByUserId: string
    createdAt: number
    agendaItems: ManagementReviewAgendaItem[]
    modules: ManagementReviewModule[]
    attendees: ManagementReviewAttendee[]
}

export interface PiRawData {
    id: string
    name: string
}

export enum PIFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly'
}

export enum PiDataImportLogType {
    MANUAL = 'manual',
    FILE_UPLOAD = 'file_upload'
}

export const PIDataImportLogTypeOptions: StatusOption[] = [
    {
        id: PiDataImportLogType.MANUAL,
        name: 'Manual Entry',
        i18nKey: 'pi.dataEntry.method.manual'
    },
    {
        id: PiDataImportLogType.FILE_UPLOAD,
        name: 'File Upload',
        i18nKey: 'pi.dataEntry.method.file_upload'
    }
]

export interface PiGroup {
    id: string
    name: string
    frequency: PIFrequency
    rawData?: PiRawDataGroup[]
}

export interface PiRawDataGroup {
    id: string
    piGroupId: string
    piRawDataId: string
    piGroup?: PiGroup
    piRawData?: PiRawData
}

export interface CreatePiRawDataGroupDto {
    piGroupId: string
    piRawDataId: string
}

export interface UpdatePiRawDataGroupDto {
    id?: string
    piGroupId?: string
    piRawDataId?: string
}

export interface CreatePIGroupWithRawDataDto {
    name: string
    frequency?: PIFrequency
    piRawDataIds: string[]
}

export interface UpdatePIGroupWithRawDataDto {
    id: string
    name?: string
    frequency?: PIFrequency
    piRawDataIds: string[]
}
export interface CreatePiRawDataDto {
    name: string
}

export interface UpdatePiRawDataDto {
    name?: string
}
export interface CreatePiDataImportLogDto {
    piGroupId: String
    type: PiDataImportLogType
    data?: {
        date: string
        entries: {
            piRawDataGroupId: string
            value: number
        }[]
    }[]
}

export interface EventReminderConfigResponseDto {
    id: string
    eventType: string
    days: number
    direction: 'before' | 'after'
    field: 'startDate' | 'endDate'
    recepientType: RecipientType
    recipients: ReminderRecipientResponseDto[]
    createdAt: number
    updatedAt: number
}

export interface ReminderRecipientResponseDto {
    id: number
    user: {
        id: string
        fname: string
        lname: string
    }
}

export interface SelectOption {
    value: string
    label: string
}

export type RecipientType =
    | 'all_users_with_permission'
    | 'selected_users'

export interface CreateEventReminderConfigDto {
    eventType: string
    days: number
    direction: 'before' | 'after' | SelectOption
    field: 'startDate' | 'endDate' | SelectOption
    recepientType: RecipientType | SelectOption
    selectedUsers: User[]
}

export enum CalculationFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly'
}

export enum ComponentType {
    FUNCTION = 'function',
    RAW_VALUE = 'raw_value',
    NUMBER = 'number',
    OPERATOR = 'operator',
    PARENTHESIS = 'parenthesis'
}

export enum FunctionValue {
    SUM = 'SUM',
    AVG = 'AVG',
    COUNT = 'COUNT',
    MAX = 'MAX',
    MIN = 'MIN'
}

export enum OperatorValue {
    PLUS = '+',
    MINUS = '-',
    MULTIPLY = '*',
    DIVIDE = '/'
}

export enum ParenthesisValue {
    OPEN = '(',
    CLOSE = ')'
}

export interface FormulaComponent {
    id?: string
    type: ComponentType
    functionValue?: FunctionValue
    operatorValue?: OperatorValue
    parenthesisValue?: ParenthesisValue
    numberValue?: number
    piRawDataId?: string
    order: number
}

export enum TargetDirection {
    INCREASE = 'increase',
    DECREASE = 'decrease',
    MAINTAIN = 'maintain'
}

export enum TriggerCondition {
    EXCEEDS = 'value_exceeds_target',
    LESS_THAN = 'value_is_less_than_action_threshold',
    DROPS = 'value_drops_below_target',
    CROSSES = 'value_crosses_baseline'
}

export enum NotificationFrequency {
    NONE = 'none',
    DAILY = 'daily_until_resolved',
    WEEKLY = 'weekly_until_resolved',
    ONCE = 'once_per_event'
}

export enum ActionType {
    Raise_Non_Conformity = 'raise_non_conformity'
}

export enum PiStatus {
    PENDING = 'pending',
    BELOW_TARGET = 'below_target',
    ON_TARGET = 'on_target',
    EXCEEDS_THRESHOLD = 'exceeds_threshold'
}

export interface PerformanceIndicatorResponse {
    id: string
    displayId?: string
    name: string
    description: string
    calculationFrequency: string
    targetDirection: string
    targetValue: number
    actionThreshold: number
    baselineValue: number
    process?: {
        id?: string
        name?: string
        organizationUnits?: Array<{
            id?: number
            name?: string
            organizationUnit?: { id?: number; name?: string }
        }>
    } | null
    piGroup?: { id: string; name?: string }
    formulaComponents?: Array<any>
    piNotificationConfigs?: Array<{
        id?: string
        triggerCondition: string
        notificationFrequency: string
        actionType: string
        nonConformityTypeId?: string | null
        nonConformityRiskLevelId?: string | null
        categoryId?: string | null
        createNC?: boolean
        nonConformityType?: NonConformityType | null
        nonConformityRiskLevel?: NonConformityRiskLevel | null
        category?: { id: string; name: string } | null
        piNotificationConfigRecipients?: Array<{ user: { id: string } }>
    }>
    piRiskControlLinks?: Array<{ immediateAction: RiskImmediateAction }>
    updatedAt: string
    piCalculatedValue: Array<PiCalculatedValue>
}

export interface CreatePerformanceIndicatorPayload {
    name: string
    description: string
    piGroupId: string
    calculationFrequency: string
    formulaComponents: Array<{
        type: string
        functionValue?: string
        operatorValue?: string
        parenthesisValue?: string
        numberValue?: number
        piRawDataId?: string
        order: number
    }>
    targetDirection: string
    targetValue: number
    actionThreshold: number
    baselineValue: number
    piNotificationConfigs?: Array<{
        triggerCondition: string
        notificationFrequency: string
        actionType: string
        createNC?: boolean
        notificationConfigRecipientsIds: string[]
        nonConformityTypeId?: string
        nonConformityRiskLevelId?: string
        categoryId?: string
    }>
    riskControlIds?: number[] | string[]
    processId: string
}

export enum PiDataImportLogStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed'
}

export interface PiDataImportLog {
    id: string
    piGroupId: string
    piGroup?: PiGroup
    importById: string
    importBy?: User
    importTimestamp: number
    fileName?: string | null
    status: PiDataImportLogStatus
    type: PiDataImportLogType
    rowCount: number
}

export interface PiCalculatedValue {
    id: string
    calculatedValue: number
    calculationTimestamp: number
}

export interface FilterOption {
    value: string
    label: string
}

export interface FilterFetchConfig {
    endpoint: string
    method?: 'GET' | 'POST'
    body?: any
    valueField?: string
    labelField?: string
    transform?: 'flatten_tree' | 'direct'
    filterByPermission?: boolean
    permissionSubject?: string
}

export interface ReportFilter {
    key: string
    type: 'org_unit' | 'status' | 'type' | 'category' | 'text' | 'number'
    label: string
    placeholder?: string
    queryParam?: string
    options?: FilterOption[]
    fetchConfig?: FilterFetchConfig
}

export interface ReportConfig {
    id: string
    name: string
    description: string
    module: string
    query?: string
    filters?: ReportFilter[]
}

export interface ReportResponse {
    reportName: string
    columns: string[]
    rows: any[]
    errorMessage: string | null
    filters?: ReportFilter[]
    sortableColumns?: string[]
}

export enum DocumentTemplateType {
    DEFAULT = 'default',
    CUSTOM = 'custom'
}

export const DOCUMENT_TEMPLATE_TYPE_OPTIONS: SelectOption[] = [
    { value: DocumentTemplateType.DEFAULT, label: 'Default' },
    { value: DocumentTemplateType.CUSTOM, label: 'Custom' }
] as const

export interface DocumentTemplate {
    id: string
    title: string
    description: string
    content: string
    isDefault: boolean
    createdAt: number
}

export interface ProviderType {
    id: string
    name: string
    description?: string | null
}

export type SelectionCriteriaInputType =
    | 'Yes/No'
    | 'Score'
    | 'text'
    | 'number'
    | 'date'
    | 'fileAttachment'

export type SelectionCriteriaRiskLevel = 'Critical' | 'Moderate' | 'Minor'

export interface CriteriaInput {
    id: string
    inputText: string
    inputType: string
    weight?: number | null
    isRequired?: boolean
    responseValue?: string | null
}

export function resolveCriteriaInputs(item: {
    inputs?: Array<Omit<CriteriaInput, 'id'> & { id?: string }>
    inputText?: string
    inputType?: string
    weight?: number | null
    isRequired?: boolean
    responseValue?: string | null
    selectionCriteriaVersionId?: string
    evaluationCriteriaVersionId?: string
}): CriteriaInput[] {
    if (item.inputs?.length) {
        const fallbackId =
            item.selectionCriteriaVersionId || item.evaluationCriteriaVersionId || 'legacy'
        const inputs = item.inputs.map((input, index) => ({
            ...input,
            id: input.id || `${fallbackId}-${index}`,
            isRequired: Boolean(input.isRequired)
        }))
        if (item.isRequired && !inputs.some((input) => input.isRequired)) {
            inputs[0] = { ...inputs[0], isRequired: true }
        }
        return inputs
    }
    if (!item.inputText || !item.inputType) {
        return []
    }
    return [
        {
            id:
                item.selectionCriteriaVersionId ||
                item.evaluationCriteriaVersionId ||
                'legacy',
            inputText: item.inputText,
            inputType: item.inputType,
            weight: item.weight ?? null,
            isRequired: Boolean(item.isRequired),
            responseValue: item.responseValue ?? null
        }
    ]
}

export interface SelectionCriteria {
    id: string
    name: string
    description?: string | null
    inputText?: string
    inputType?: SelectionCriteriaInputType
    inputs?: CriteriaInput[]
    providerTypeIds: string[]
    riskLevel: SelectionCriteriaRiskLevel
    isRequired?: boolean
    version?: number
    selectionCriteriaVersionId?: string
    responseValue?: string | null
}

export interface SelectionCriteriaFilters {
    search?: string
    providerTypeId?: string
    riskLevel?: SelectionCriteriaRiskLevel
    inputType?: SelectionCriteriaInputType
    isRequired?: boolean
    externalProviderId?: string
}

export interface CriteriaInputPayload {
    id?: string
    inputText: string
    inputType: string
    weight?: number
    isRequired?: boolean
}

export interface CreateSelectionCriteriaPayload {
    name: string
    description?: string
    inputText?: string
    inputType?: SelectionCriteriaInputType
    inputs: CriteriaInputPayload[]
    providerTypeIds: string[]
    riskLevel: SelectionCriteriaRiskLevel
    isRequired?: boolean
}

export interface UpdateSelectionCriteriaPayload {
    name?: string
    description?: string
    inputText?: string
    inputType?: SelectionCriteriaInputType
    inputs?: CriteriaInputPayload[]
    providerTypeIds?: string[]
    riskLevel?: SelectionCriteriaRiskLevel
    isRequired?: boolean
}

export const SELECTION_CRITERIA_INPUT_TYPES: SelectionCriteriaInputType[] = [
    'Yes/No',
    'Score',
    'text',
    'number',
    'date',
    'fileAttachment'
]

export const SELECTION_CRITERIA_RISK_LEVELS: SelectionCriteriaRiskLevel[] = [
    'Critical',
    'Moderate',
    'Minor'
]

export const selectionCriteriaInputTypeLocaleKey = (type: SelectionCriteriaInputType) => {
    const map: Record<SelectionCriteriaInputType, string> = {
        'Yes/No': 'yes_no',
        Score: 'score',
        text: 'text',
        number: 'number',
        date: 'date',
        fileAttachment: 'file_attachment'
    }
    return `externalProvider.selection_criterias.input_types.${map[type]}`
}

export const selectionCriteriaRiskLevelLocaleKey = (level: SelectionCriteriaRiskLevel) =>
    `externalProvider.selection_criterias.risk_levels.${level.toLowerCase()}`

export type EvaluationCriteriaInputType = 'Score' | 'checkbox'

export interface EvaluationCriteria {
    id: string
    name: string
    description?: string | null
    inputText?: string
    inputType?: EvaluationCriteriaInputType
    inputs?: CriteriaInput[]
    providerTypeIds: string[]
    riskLevel: SelectionCriteriaRiskLevel
    version?: number
    isRequired?: boolean
    weight?: number | null
    evaluationCriteriaVersionId?: string
    responseValue?: string | null
}

export interface EvaluationCriteriaFilters {
    search?: string
    providerTypeId?: string
    riskLevel?: SelectionCriteriaRiskLevel
    inputType?: EvaluationCriteriaInputType
    version?: number
    isRequired?: boolean
}

export interface CreateEvaluationCriteriaPayload {
    name: string
    description?: string
    inputText?: string
    inputType?: EvaluationCriteriaInputType
    inputs: CriteriaInputPayload[]
    providerTypeIds: string[]
    riskLevel: SelectionCriteriaRiskLevel
    isRequired?: boolean
    weight?: number
}

export interface UpdateEvaluationCriteriaPayload {
    name?: string
    description?: string
    inputText?: string
    inputType?: EvaluationCriteriaInputType
    inputs?: CriteriaInputPayload[]
    providerTypeIds?: string[]
    riskLevel?: SelectionCriteriaRiskLevel
    isRequired?: boolean
    weight?: number
}

export const EVALUATION_CRITERIA_INPUT_TYPES: EvaluationCriteriaInputType[] = ['Score', 'checkbox']

export const evaluationCriteriaInputTypeLocaleKey = (type: EvaluationCriteriaInputType) =>
    `externalProvider.evaluation_criterias.input_types.${type === 'checkbox' ? 'checkbox' : 'score'}`

export type SupportingDocumentRiskLevel = 'Critical' | 'Moderate' | 'Minor'

export type RenewalPeriodUnit = 'month' | 'year'

export interface SupportingDocument {
    id: string
    name: string
    description?: string | null
    providerTypeIds: string[]
    riskLevel?: SupportingDocumentRiskLevel | null
    hasExpirationDate: boolean
    renewalPeriodValue?: number | null
    renewalPeriodUnit?: RenewalPeriodUnit | null
    providerDocument?: {
        id: string
        fileUrl: string
        documentDate: number
        createdAt: number
    } | null
}

export interface SupportingDocumentFilters {
    search?: string
    providerTypeId?: string
    riskLevel?: SupportingDocumentRiskLevel
    externalProviderId?: string
}

export interface CreateSupportingDocumentPayload {
    name: string
    description?: string
    providerTypeIds: string[]
    riskLevel?: SupportingDocumentRiskLevel
    hasExpirationDate: boolean
    renewalPeriodValue?: number
    renewalPeriodUnit?: RenewalPeriodUnit
}

export interface UpdateSupportingDocumentPayload {
    name?: string
    description?: string
    providerTypeIds?: string[]
    riskLevel?: SupportingDocumentRiskLevel
    hasExpirationDate?: boolean
    renewalPeriodValue?: number
    renewalPeriodUnit?: RenewalPeriodUnit
}

export const SUPPORTING_DOCUMENT_RISK_LEVELS: SupportingDocumentRiskLevel[] = [
    'Critical',
    'Moderate',
    'Minor'
]

export const SUPPORTING_DOCUMENT_RENEWAL_UNITS: RenewalPeriodUnit[] = ['month', 'year']

export const supportingDocumentRiskLevelLocaleKey = (level: SupportingDocumentRiskLevel) =>
    `externalProvider.supporting_documents.risk_levels.${level.toLowerCase()}`

export const supportingDocumentRenewalUnitLocaleKey = (unit: RenewalPeriodUnit) =>
    `externalProvider.supporting_documents.renewal_units.${unit}`

export const formatSupportingDocumentRenewal = (
    doc: Pick<
        SupportingDocument,
        'hasExpirationDate' | 'renewalPeriodValue' | 'renewalPeriodUnit'
    >,
    t: (key: string, count?: number) => string
) => {
    if (!doc.hasExpirationDate) {
        return t('externalProvider.supporting_documents.no_expiration')
    }
    if (!doc.renewalPeriodValue || !doc.renewalPeriodUnit) {
        return t('externalProvider.supporting_documents.na')
    }
    if (doc.renewalPeriodUnit === 'month') {
        return t('externalProvider.supporting_documents.renewal_period_months', doc.renewalPeriodValue)
    }
    return t('externalProvider.supporting_documents.renewal_period_years', doc.renewalPeriodValue)
}

export type SupportingDocumentDateValidationError = 'future' | 'expired'

type SupportingDocumentExpirationConfig = Pick<
    SupportingDocument,
    'hasExpirationDate' | 'renewalPeriodValue' | 'renewalPeriodUnit'
>

const startOfUtcDay = (timestamp: number) => {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const addUtcMonths = (timestamp: number, months: number) => {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
}

const addUtcYears = (timestamp: number, years: number) => {
    const date = new Date(timestamp)
    return Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate())
}

export const computeSupportingDocumentExpiryDate = (
    documentDateMs: number,
    renewalPeriodValue: number,
    renewalPeriodUnit: RenewalPeriodUnit
): number => {
    const start = startOfUtcDay(documentDateMs)
    return renewalPeriodUnit === 'month'
        ? addUtcMonths(start, renewalPeriodValue)
        : addUtcYears(start, renewalPeriodValue)
}

export const validateSupportingDocumentDate = (
    doc: SupportingDocumentExpirationConfig,
    documentDateMs: number,
    todayMs = Date.now()
): SupportingDocumentDateValidationError | null => {
    const documentDay = startOfUtcDay(documentDateMs)
    const today = startOfUtcDay(todayMs)

    if (documentDay > today) {
        return 'future'
    }

    if (doc.hasExpirationDate && doc.renewalPeriodValue && doc.renewalPeriodUnit) {
        const expiryDay = computeSupportingDocumentExpiryDate(
            documentDateMs,
            doc.renewalPeriodValue,
            doc.renewalPeriodUnit
        )
        if (today >= expiryDay) {
            return 'expired'
        }
    }

    return null
}

export type ExternalProviderRiskLevel = 'Critical' | 'Moderate' | 'Minor'

export type ExternalProviderStatus = 'Pending' | 'Archived' | 'Approved' | 'Rejected'

export type ExternalProviderEvaluationFrequencyType =
    | 'monthly'
    | 'quarterly'
    | 'semi_annually'
    | 'annually'
    | 'custom_interval'

export interface ExternalProvider {
    id: string
    name: string
    scope?: string | null
    contactInformation?: string | null
    providerTypeId: string
    providerType?: ProviderType
    riskLevel?: ExternalProviderRiskLevel | null
    status: ExternalProviderStatus
    evaluationFrequencyType: ExternalProviderEvaluationFrequencyType
    customIntervalMonths?: number | null
    lastEvaluationDate?: number | null
    nextEvaluationDate?: number | null
    selectedDate?: number | null
    createdAt?: number
}

export interface ProviderStatusChangeLog {
    id: string
    previousStatus: ExternalProviderStatus | null
    newStatus: ExternalProviderStatus
    reason: string
    createdAt: number
    createdByName?: string
}

export type ProviderEvaluationResult = 'Approved' | 'Rejected'

export interface ProviderEvaluation {
    id: string
    evaluationDueDate: number
    evaluatorId: string
    evaluatorName: string
    result: ProviderEvaluationResult | null
    comment: string | null
    isOverdue: boolean
    createdAt: number
    updatedAt: number
}

export interface ProviderEvaluationFilters {
    result?: ProviderEvaluationResult
    evaluatorId?: string
    isOverdue?: boolean
}

export interface CreateProviderEvaluationPayload {
    evaluatorId: string
    evaluationDueDate: number
}

export type UpdateProviderEvaluationPayload = CreateProviderEvaluationPayload

export interface ProviderEvaluationCriteriaItem {
    evaluationCriteriaId: string
    evaluationCriteriaVersionId: string
    version: number
    name: string
    description?: string | null
    inputText: string
    inputType: EvaluationCriteriaInputType
    inputs?: CriteriaInput[]
    isRequired: boolean
    responseValue?: string | null
}

export interface ProviderEvaluationDetail {
    id: string
    externalProviderId: string
    externalProviderName: string
    evaluationDueDate: number
    evaluatorId: string
    evaluatorName: string
    result: ProviderEvaluationResult | null
    comment: string | null
    files: string[]
    isOverdue: boolean
    criteria: ProviderEvaluationCriteriaItem[]
}

export interface ProviderEvaluationResponsePayload {
    evaluationCriteriaVersionId: string
    inputId?: string
    value?: string
}

export interface SubmitProviderEvaluationPayload {
    result: ProviderEvaluationResult
    comment?: string
    responses: ProviderEvaluationResponsePayload[]
    retainedFiles?: string[]
}

export const PROVIDER_EVALUATION_RESULTS: ProviderEvaluationResult[] = [
    'Approved',
    'Rejected'
]

export const providerEvaluationResultLocaleKey = (result: ProviderEvaluationResult) => {
    const key = result.toLowerCase().replace(/\s+/g, '_')
    return `externalProvider.providers.evaluation_results.${key}`
}

export interface ExternalProviderFilters {
    search?: string
    providerTypeId?: string
    riskLevel?: ExternalProviderRiskLevel
    evaluationFrequencyType?: ExternalProviderEvaluationFrequencyType
    status?: ExternalProviderStatus
}

export interface CreateExternalProviderPayload {
    name: string
    scope?: string
    contactInformation?: string
    providerTypeId: string
    riskLevel?: ExternalProviderRiskLevel
    evaluationFrequencyType: ExternalProviderEvaluationFrequencyType
    customIntervalMonths?: number
}

export interface UpdateExternalProviderPayload {
    name?: string
    scope?: string
    contactInformation?: string
    providerTypeId?: string
    riskLevel?: ExternalProviderRiskLevel
    evaluationFrequencyType?: ExternalProviderEvaluationFrequencyType
    customIntervalMonths?: number
    status?: ExternalProviderStatus
    statusChangeReason?: string
}

export const EXTERNAL_PROVIDER_RISK_LEVELS: ExternalProviderRiskLevel[] = [
    'Critical',
    'Moderate',
    'Minor'
]

export const EXTERNAL_PROVIDER_STATUSES: ExternalProviderStatus[] = [
    'Pending',
    'Archived',
    'Approved',
    'Rejected'
]

export const EXTERNAL_PROVIDER_EVALUATION_FREQUENCY_TYPES: ExternalProviderEvaluationFrequencyType[] =
    ['monthly', 'quarterly', 'semi_annually', 'annually', 'custom_interval']

export const externalProviderRiskLevelLocaleKey = (level: ExternalProviderRiskLevel) =>
    `externalProvider.providers.risk_levels.${level.toLowerCase()}`

export const externalProviderStatusLocaleKey = (status: ExternalProviderStatus) =>
    `externalProvider.providers.statuses.${status.toLowerCase()}`

export const externalProviderEvaluationFrequencyLocaleKey = (
    type: ExternalProviderEvaluationFrequencyType
) => `externalProvider.providers.frequency_types.${type}`

export interface ProviderSelectionCriteriaItem {
    selectionCriteriaId: string
    selectionCriteriaVersionId: string
    version: number
    name: string
    description?: string | null
    inputText: string
    inputType: SelectionCriteriaInputType
    inputs?: CriteriaInput[]
    isRequired: boolean
    responseValue?: string | null
}

export const hasCriteriaResponse = (value?: string | null) =>
    value != null && String(value).trim() !== ''

export function isSelectionCriteriaFilled(
    items: ProviderSelectionCriteriaItem[] | null | undefined
): boolean {
    if (!items?.length) {
        return false
    }

    const requiredInputs = items.flatMap((item) =>
        resolveCriteriaInputs(item).filter((input) => input.isRequired)
    )

    if (!requiredInputs.length) {
        return false
    }

    return requiredInputs.every((input) => hasCriteriaResponse(input.responseValue))
}

export interface ProviderSupportingDocumentItem {
    supportingDocumentId: string
    name: string
    description?: string | null
    hasExpirationDate: boolean
    renewalPeriodValue?: number | null
    renewalPeriodUnit?: RenewalPeriodUnit | null
    providerDocument?: {
        id: string
        fileUrl: string
        documentDate: number
        createdAt: number
    } | null
}

export interface ProviderReviewSelectionResponsePayload {
    selectionCriteriaVersionId: string
    inputId?: string
    value?: string
}

export interface BulkSelectionCriteriaResponsesPayload {
    responses: ProviderReviewSelectionResponsePayload[]
}

export interface BulkProviderDocumentPayload {
    supportingDocumentId: string
    documentDate?: number
}
