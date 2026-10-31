import { ISO_27001_ANNEX_A_DOCUMENTS } from "./iso-27001-annex-a.documents";
import { RequiredDocumentKind } from "./standards.enums";

export type StandardKey =
  | "iso-9001-2015"
  | "iso-27001-2022"
  | "iso-45001-2018"
  | "iso-14001-2026";

export interface RequiredDocumentDefinition {
  key: string;
  title: string;
  clause: string;
  kind: RequiredDocumentKind;
  description: string;
}

export interface StandardDefinition {
  key: StandardKey;
  name: string;
  shortName: string;
  year: number;
  family: string;
  description: string;
  requiredDocuments: RequiredDocumentDefinition[];
}

export const STANDARDS: StandardDefinition[] = [
  {
    key: "iso-9001-2015",
    name: "ISO 9001:2015",
    shortName: "ISO 9001",
    year: 2015,
    family: "Quality management",
    description:
      "Quality management system requirements. Maintain the QMS documents and retain the records this standard requires.",
    requiredDocuments: [
      {
        key: "qms-scope",
        title: "Scope of the quality management system",
        clause: "4.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "The scope of the QMS, including boundaries, applicability, and any justified exclusions.",
      },
      {
        key: "qms-process-documentation",
        title: "Process operation documentation",
        clause: "4.4.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Documented information needed to support the operation of QMS processes.",
      },
      {
        key: "quality-policy",
        title: "Quality policy",
        clause: "5.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The quality policy established by top management.",
      },
      {
        key: "quality-objectives",
        title: "Quality objectives",
        clause: "6.2.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Quality objectives at relevant functions, levels, and processes.",
      },
      {
        key: "external-provider-criteria",
        title: "External provider evaluation criteria",
        clause: "8.4.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Criteria for the evaluation, selection, monitoring of performance, and re-evaluation of external providers.",
      },
      {
        key: "measuring-resources",
        title: "Monitoring and measuring resource records",
        clause: "7.1.5",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of fitness for purpose of monitoring and measuring resources, including calibration or verification.",
      },
      {
        key: "competence",
        title: "Competence records",
        clause: "7.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of competence of persons doing work under the organization's control.",
      },
      {
        key: "requirements-review",
        title: "Product and service requirements review",
        clause: "8.2.3",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Results of the review of requirements related to products and services, including any new requirements.",
      },
      {
        key: "design-and-development",
        title: "Design and development records",
        clause: "8.3",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Design and development planning, inputs, controls, outputs, and changes, where the organization performs design.",
      },
      {
        key: "external-provider-evaluation",
        title: "External provider evaluation records",
        clause: "8.4.1",
        kind: RequiredDocumentKind.RETAIN,
        description: "Records of the evaluation of external providers and any necessary actions arising.",
      },
      {
        key: "production-service-information",
        title: "Production and service provision information",
        clause: "8.5.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Documented information that defines the characteristics of the products and services to be provided, the activities to be performed, and the results to be achieved.",
      },
      {
        key: "identification-traceability",
        title: "Identification and traceability",
        clause: "8.5.2",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Unique identification of outputs when traceability is a requirement.",
      },
      {
        key: "customer-provider-property",
        title: "Customer or external provider property",
        clause: "8.5.3",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Records of what has occurred when customer or external provider property is lost, damaged, or otherwise found unsuitable.",
      },
      {
        key: "change-control",
        title: "Control of changes",
        clause: "8.5.6",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Results of the review of changes, the person(s) authorizing the change, and any necessary actions.",
      },
      {
        key: "release-of-products-services",
        title: "Release of products and services",
        clause: "8.6",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of conformity with acceptance criteria and traceability to the person(s) authorizing release.",
      },
      {
        key: "nonconforming-outputs",
        title: "Control of nonconforming outputs",
        clause: "8.7",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Description of the nonconformity, actions taken, concessions obtained, and the authority deciding the action.",
      },
      {
        key: "monitoring-results",
        title: "Monitoring, measurement, analysis and evaluation",
        clause: "9.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of the results of monitoring, measurement, analysis, and evaluation.",
      },
      {
        key: "internal-audit",
        title: "Internal audit programme and results",
        clause: "9.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the implementation of the audit programme and the audit results.",
      },
      {
        key: "management-review",
        title: "Management review results",
        clause: "9.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the results of management reviews.",
      },
      {
        key: "nonconformity-corrective-action",
        title: "Nonconformity and corrective action",
        clause: "10.2",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "The nature of nonconformities, subsequent actions taken, and the results of any corrective action.",
      },
    ],
  },
  {
    key: "iso-27001-2022",
    name: "ISO/IEC 27001:2022",
    shortName: "ISO 27001",
    year: 2022,
    family: "Information security",
    description:
      "Information security management system requirements. Maintain ISMS documents, Annex A controls that require documented information, and the evidence this standard requires.",
    requiredDocuments: [
      {
        key: "isms-scope",
        title: "Scope of the information security management system",
        clause: "4.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The scope of the ISMS, available as documented information.",
      },
      {
        key: "information-security-policy",
        title: "Information security policy",
        clause: "5.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The information security policy established by top management.",
      },
      {
        key: "statement-of-applicability",
        title: "Statement of Applicability",
        clause: "6.1.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "The Statement of Applicability, including necessary controls, justification, implementation status, and exclusions.",
      },
      {
        key: "information-security-objectives",
        title: "Information security objectives",
        clause: "6.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Information security objectives and documented information retained on those objectives.",
      },
      {
        key: "topic-specific-policies",
        title: "Topic-specific information security policies",
        clause: "A.5.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Information security policies required by the selected Annex A controls and the Statement of Applicability.",
      },
      {
        key: "risk-assessment-process",
        title: "Information security risk assessment process",
        clause: "6.1.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Documented information about the information security risk assessment process.",
      },
      {
        key: "risk-treatment-process",
        title: "Information security risk treatment process",
        clause: "6.1.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Documented information about the information security risk treatment process.",
      },
      {
        key: "competence",
        title: "Competence records",
        clause: "7.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of competence of persons doing work under the organization's control.",
      },
      {
        key: "operational-planning-control",
        title: "Operational planning and control records",
        clause: "8.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Documented information necessary to have confidence that processes are carried out as planned.",
      },
      {
        key: "risk-assessment-results",
        title: "Information security risk assessment results",
        clause: "8.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Results of information security risk assessments.",
      },
      {
        key: "risk-treatment-results",
        title: "Information security risk treatment results",
        clause: "8.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Results of information security risk treatment.",
      },
      {
        key: "monitoring-results",
        title: "Monitoring and measurement results",
        clause: "9.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of the results of monitoring, measurement, analysis, and evaluation of information security performance.",
      },
      {
        key: "internal-audit",
        title: "Internal audit programme and results",
        clause: "9.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the implementation of the audit programme and the audit results.",
      },
      {
        key: "management-review",
        title: "Management review results",
        clause: "9.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the results of management reviews.",
      },
      {
        key: "nonconformity-corrective-action",
        title: "Nonconformity and corrective action",
        clause: "10.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "The nature of nonconformities, subsequent actions taken, and the results of any corrective action.",
      },
      ...ISO_27001_ANNEX_A_DOCUMENTS,
    ],
  },
  {
    key: "iso-45001-2018",
    name: "ISO 45001:2018",
    shortName: "ISO 45001",
    year: 2018,
    family: "Occupational health and safety",
    description:
      "Occupational health and safety management system requirements. Maintain OH&S documents and retain the records this standard requires.",
    requiredDocuments: [
      {
        key: "ohs-scope",
        title: "Scope of the OH&S management system",
        clause: "4.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The scope of the OH&S management system, available as documented information.",
      },
      {
        key: "ohs-policy",
        title: "OH&S policy",
        clause: "5.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The OH&S policy established by top management.",
      },
      {
        key: "roles-responsibilities",
        title: "Roles, responsibilities and authorities",
        clause: "5.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Documented information on responsibilities, accountabilities, and authorities for relevant OH&S roles.",
      },
      {
        key: "risks-and-opportunities",
        title: "OH&S risks and opportunities",
        clause: "6.1.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Documented information on OH&S risks and opportunities, and the processes and actions needed to address them.",
      },
      {
        key: "risk-assessment-methodology",
        title: "OH&S risk assessment methodology",
        clause: "6.1.2.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Methodology and criteria for the assessment of OH&S risks, maintained as documented information.",
      },
      {
        key: "legal-other-requirements",
        title: "Legal requirements and other requirements",
        clause: "6.1.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Documented information on legal requirements and other requirements, and how they apply to the organization.",
      },
      {
        key: "ohs-objectives",
        title: "OH&S objectives and plans",
        clause: "6.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "OH&S objectives and plans to achieve them.",
      },
      {
        key: "operational-planning-control",
        title: "Operational planning and control processes",
        clause: "8.1.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Documented information to the extent necessary to have confidence that operational processes are carried out as planned.",
      },
      {
        key: "emergency-preparedness",
        title: "Emergency preparedness and response",
        clause: "8.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Processes needed to prepare for and respond to potential emergency situations.",
      },
      {
        key: "competence",
        title: "Competence records",
        clause: "7.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of competence of workers.",
      },
      {
        key: "communications",
        title: "Communication records",
        clause: "7.4",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of OH&S communications.",
      },
      {
        key: "monitoring-results",
        title: "Monitoring, measurement, analysis and performance evaluation",
        clause: "9.1.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of monitoring, measurement, analysis and performance evaluation, including calibration or verification of equipment.",
      },
      {
        key: "compliance-evaluation",
        title: "Compliance evaluation results",
        clause: "9.1.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Results of the evaluation of compliance with legal requirements and other requirements.",
      },
      {
        key: "internal-audit",
        title: "Internal audit programme and results",
        clause: "9.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the implementation of the audit programme and the audit results.",
      },
      {
        key: "management-review",
        title: "Management review results",
        clause: "9.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the results of management reviews.",
      },
      {
        key: "incidents-nonconformities",
        title: "Incidents, nonconformities and corrective actions",
        clause: "10.2",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "The nature of incidents or nonconformities, actions taken, and the results and effectiveness of corrective action.",
      },
      {
        key: "continual-improvement",
        title: "Continual improvement evidence",
        clause: "10.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of continual improvement of the OH&S management system.",
      },
    ],
  },
  {
    key: "iso-14001-2026",
    name: "ISO 14001:2026",
    shortName: "ISO 14001",
    year: 2026,
    family: "Environmental management",
    description:
      "Environmental management system requirements. Keep the EMS documented information this standard requires available.",
    requiredDocuments: [
      {
        key: "ems-scope",
        title: "Scope of the environmental management system",
        clause: "4.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "The scope of the EMS, available as documented information and available to interested parties.",
      },
      {
        key: "environmental-policy",
        title: "Environmental policy",
        clause: "5.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "The environmental policy, available as documented information.",
      },
      {
        key: "planning-processes",
        title: "Planning processes for aspects, obligations, and risks",
        clause: "6.1.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Processes needed to meet 6.1.2 to 6.1.5, available as documented information to the extent necessary.",
      },
      {
        key: "environmental-aspects",
        title: "Environmental aspects",
        clause: "6.1.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Environmental aspects and associated impacts, criteria used to determine significance, and significant aspects.",
      },
      {
        key: "compliance-obligations",
        title: "Compliance obligations",
        clause: "6.1.3",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Compliance obligations, available as documented information.",
      },
      {
        key: "risks-and-opportunities",
        title: "Risks and opportunities",
        clause: "6.1.4",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Risks and opportunities that need to be addressed.",
      },
      {
        key: "environmental-objectives",
        title: "Environmental objectives",
        clause: "6.2.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description: "Environmental objectives, available as documented information.",
      },
      {
        key: "operational-planning-control",
        title: "Operational planning and control processes",
        clause: "8.1",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Operational processes, available as documented information to the extent necessary to have confidence they are carried out as planned.",
      },
      {
        key: "emergency-preparedness",
        title: "Emergency preparedness and response",
        clause: "8.2",
        kind: RequiredDocumentKind.MAINTAIN,
        description:
          "Processes needed to prepare for and respond to potential emergency situations.",
      },
      {
        key: "competence",
        title: "Competence records",
        clause: "7.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of competence of persons doing work under the organization's control.",
      },
      {
        key: "communications",
        title: "Communication records",
        clause: "7.4",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the organization's EMS communications.",
      },
      {
        key: "monitoring-results",
        title: "Monitoring, measurement, analysis and evaluation",
        clause: "9.1.1",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "Evidence of the monitoring, measurement, analysis, and evaluation of environmental performance.",
      },
      {
        key: "compliance-evaluation",
        title: "Compliance evaluation results",
        clause: "9.1.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the compliance evaluation result(s).",
      },
      {
        key: "internal-audit",
        title: "Internal audit programme and results",
        clause: "9.2",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the implementation of the audit programme and the audit results.",
      },
      {
        key: "management-review",
        title: "Management review results",
        clause: "9.3",
        kind: RequiredDocumentKind.RETAIN,
        description: "Evidence of the results of management reviews.",
      },
      {
        key: "nonconformity-corrective-action",
        title: "Nonconformity and corrective action",
        clause: "10.2",
        kind: RequiredDocumentKind.RETAIN,
        description:
          "The nature of the nonconformities, subsequent actions taken, and the results of any corrective action.",
      },
    ],
  },
];

export const STANDARD_KEYS = STANDARDS.map((standard) => standard.key);
