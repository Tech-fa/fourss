import type { RequiredDocumentDefinition } from "./standards.config";
import { RequiredDocumentKind } from "./standards.enums";

/**
 * Annex A controls that require documented information.
 * Included when the ISO/IEC 27002:2022 control statement, or its guidance,
 * requires a policy, procedure, rule, plan, inventory, agreement, or record.
 * A.5.1 is already listed with the ISMS clause documents.
 */
export const ISO_27001_ANNEX_A_DOCUMENTS: RequiredDocumentDefinition[] = [
  {
    key: "a-5-2-roles",
    title: "Information security roles and responsibilities",
    clause: "A.5.2",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Defined information security roles, responsibilities, and authorization levels.",
  },
  {
    key: "a-5-9-asset-inventory",
    title: "Inventory of information and other associated assets",
    clause: "A.5.9",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Inventory of information and other associated assets, including owners.",
  },
  {
    key: "a-5-10-acceptable-use",
    title: "Acceptable use and asset handling rules",
    clause: "A.5.10",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented rules for acceptable use and procedures for handling information and other associated assets.",
  },
  {
    key: "a-5-11-return-of-assets",
    title: "Return of assets",
    clause: "A.5.11",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedure for the return of assets, including the assets that must be returned when employment or a contract ends.",
  },
  {
    key: "a-5-12-classification",
    title: "Information classification scheme",
    clause: "A.5.12",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Classification scheme for information, based on confidentiality, integrity, availability, and interested-party requirements.",
  },
  {
    key: "a-5-13-labelling",
    title: "Information labelling procedures",
    clause: "A.5.13",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for labelling information in line with the organization's classification scheme.",
  },
  {
    key: "a-5-14-information-transfer",
    title: "Information transfer rules, procedures and agreements",
    clause: "A.5.14",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Rules, procedures, or agreements for transferring information inside the organization and with other parties.",
  },
  {
    key: "a-5-15-access-control",
    title: "Access control rules",
    clause: "A.5.15",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Rules for physical and logical access to information and other associated assets.",
  },
  {
    key: "a-5-18-access-rights",
    title: "Access rights records",
    clause: "A.5.18",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of access rights granted, reviewed, changed, and removed.",
  },
  {
    key: "a-5-19-supplier-processes",
    title: "Supplier information security processes and procedures",
    clause: "A.5.19",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Processes and procedures for managing information security risks from supplier products and services.",
  },
  {
    key: "a-5-20-supplier-agreements",
    title: "Supplier information security agreements",
    clause: "A.5.20",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Agreements that set the information security requirements for each supplier relationship.",
  },
  {
    key: "a-5-21-ict-supply-chain",
    title: "ICT supply chain security processes and procedures",
    clause: "A.5.21",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Processes and procedures for managing information security risks in the ICT supply chain.",
  },
  {
    key: "a-5-23-cloud-services",
    title: "Cloud services security processes",
    clause: "A.5.23",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Processes for acquiring, using, managing, and exiting cloud services.",
  },
  {
    key: "a-5-24-incident-management",
    title: "Information security incident management plan",
    clause: "A.5.24",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Incident management processes, roles, and responsibilities for preparing for information security incidents.",
  },
  {
    key: "a-5-26-incident-response",
    title: "Information security incident response procedures",
    clause: "A.5.26",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented procedures for responding to information security incidents.",
  },
  {
    key: "a-5-27-incident-lessons",
    title: "Lessons learned from information security incidents",
    clause: "A.5.27",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of knowledge gained from information security incidents and the control improvements that followed.",
  },
  {
    key: "a-5-28-evidence",
    title: "Evidence collection and preservation procedures",
    clause: "A.5.28",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for identifying, collecting, acquiring, and preserving evidence related to information security events.",
  },
  {
    key: "a-5-29-disruption",
    title: "Information security during disruption",
    clause: "A.5.29",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Plan for maintaining information security at an appropriate level during disruption.",
  },
  {
    key: "a-5-30-ict-readiness",
    title: "ICT readiness for business continuity",
    clause: "A.5.30",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "ICT readiness plan based on business continuity objectives and ICT continuity requirements, including evidence that it is maintained and tested.",
  },
  {
    key: "a-5-31-legal-requirements",
    title: "Legal, statutory, regulatory and contractual requirements",
    clause: "A.5.31",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented legal, statutory, regulatory, and contractual requirements relevant to information security, and how the organization meets them.",
  },
  {
    key: "a-5-32-intellectual-property",
    title: "Intellectual property rights procedures",
    clause: "A.5.32",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures to protect intellectual property rights.",
  },
  {
    key: "a-5-33-records",
    title: "Records retention and protection",
    clause: "A.5.33",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Records retention schedule and rules for protecting records from loss, destruction, falsification, and unauthorized access or release.",
  },
  {
    key: "a-5-34-privacy",
    title: "Privacy and protection of PII",
    clause: "A.5.34",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Policy and procedures for preserving privacy and protecting personally identifiable information.",
  },
  {
    key: "a-5-35-independent-review",
    title: "Independent information security review results",
    clause: "A.5.35",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of independent reviews of the organization's approach to information security and its implementation.",
  },
  {
    key: "a-5-36-compliance-review",
    title: "Information security compliance review results",
    clause: "A.5.36",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of reviews of compliance with the information security policy, topic-specific policies, rules, and standards, and of corrective actions taken.",
  },
  {
    key: "a-5-37-operating-procedures",
    title: "Documented operating procedures",
    clause: "A.5.37",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Operating procedures for information processing facilities, available to the personnel who need them.",
  },
  {
    key: "a-6-1-screening",
    title: "Personnel screening procedure",
    clause: "A.6.1",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedure defining criteria and limitations for background verification checks.",
  },
  {
    key: "a-6-2-employment-terms",
    title: "Employment information security terms",
    clause: "A.6.2",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Employment agreements that state the personnel's and the organization's information security responsibilities.",
  },
  {
    key: "a-6-3-awareness",
    title: "Information security awareness, education and training programme",
    clause: "A.6.3",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Programme for information security awareness, education, and training, including updates of relevant policies and procedures.",
  },
  {
    key: "a-6-4-disciplinary-process",
    title: "Information security disciplinary process",
    clause: "A.6.4",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Formal disciplinary process for information security policy violations.",
  },
  {
    key: "a-6-5-post-employment",
    title: "Information security responsibilities after employment ends",
    clause: "A.6.5",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Information security responsibilities and duties that remain valid after termination or change of employment.",
  },
  {
    key: "a-6-6-confidentiality-agreements",
    title: "Confidentiality or non-disclosure agreements",
    clause: "A.6.6",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Confidentiality or non-disclosure agreements for personnel and other relevant interested parties.",
  },
  {
    key: "a-6-7-remote-working",
    title: "Remote working policy",
    clause: "A.6.7",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Topic-specific policy defining conditions and restrictions for remote working.",
  },
  {
    key: "a-7-2-physical-entry",
    title: "Physical entry records",
    clause: "A.7.2",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of visitor entry and departure, and of access to secure areas.",
  },
  {
    key: "a-7-7-clear-desk",
    title: "Clear desk and clear screen rules",
    clause: "A.7.7",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Clear desk rules for papers and removable storage media, and clear screen rules for information processing facilities.",
  },
  {
    key: "a-7-10-storage-media",
    title: "Storage media handling procedures",
    clause: "A.7.10",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for managing storage media through acquisition, use, transportation, reuse, and disposal.",
  },
  {
    key: "a-7-13-equipment-maintenance",
    title: "Equipment maintenance records",
    clause: "A.7.13",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of suspected or actual faults and of preventive and corrective maintenance.",
  },
  {
    key: "a-8-1-endpoint-devices",
    title: "User endpoint device policy",
    clause: "A.8.1",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Topic-specific policy on secure configuration and handling of user endpoint devices.",
  },
  {
    key: "a-8-2-privileged-access",
    title: "Privileged access rights records",
    clause: "A.8.2",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of privileged access rights allocated and used.",
  },
  {
    key: "a-8-5-authentication",
    title: "Secure authentication procedures",
    clause: "A.8.5",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for secure authentication, based on access restrictions and the access control policy.",
  },
  {
    key: "a-8-8-technical-vulnerabilities",
    title: "Technical vulnerability management procedure",
    clause: "A.8.8",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for obtaining vulnerability information, evaluating exposure, and taking measures, including vulnerability reporting.",
  },
  {
    key: "a-8-9-configuration",
    title: "Documented security configurations",
    clause: "A.8.9",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented configurations, including security configurations, of hardware, software, services, and networks.",
  },
  {
    key: "a-8-10-information-deletion",
    title: "Information deletion procedure",
    clause: "A.8.10",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedure for deleting information when it is no longer required, in line with the retention rules.",
  },
  {
    key: "a-8-13-backup",
    title: "Backup policy and restoration procedures",
    clause: "A.8.13",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Topic-specific backup policy, backup plans, and documented restoration procedures.",
  },
  {
    key: "a-8-14-redundancy",
    title: "Redundancy activation procedures",
    clause: "A.8.14",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for activating redundant components and information processing facilities.",
  },
  {
    key: "a-8-15-logging",
    title: "Logging policy",
    clause: "A.8.15",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Topic-specific policy on logging, including which events are recorded and how logs are stored, protected, and analysed.",
  },
  {
    key: "a-8-16-monitoring",
    title: "Monitoring records",
    clause: "A.8.16",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Records of monitoring networks, systems, and applications for anomalous behaviour, retained for the defined period.",
  },
  {
    key: "a-8-17-clock-synchronization",
    title: "Clock synchronization requirements",
    clause: "A.8.17",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented requirements for time representation, synchronization, and accuracy.",
  },
  {
    key: "a-8-19-software-installation",
    title: "Software installation procedures",
    clause: "A.8.19",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Procedures for securely managing software installation on operational systems.",
  },
  {
    key: "a-8-21-network-services",
    title: "Network service rules",
    clause: "A.8.21",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Rules for the use of networks and network services, including allowed services and authentication requirements.",
  },
  {
    key: "a-8-24-cryptography",
    title: "Cryptography and key management rules",
    clause: "A.8.24",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Rules for the use of cryptography, including cryptographic key management.",
  },
  {
    key: "a-8-25-secure-development",
    title: "Secure development rules",
    clause: "A.8.25",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Rules for the secure development of software and systems.",
  },
  {
    key: "a-8-26-application-security",
    title: "Application security requirements",
    clause: "A.8.26",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Information security requirements identified, specified, and approved when developing or acquiring applications.",
  },
  {
    key: "a-8-27-secure-engineering",
    title: "Secure system engineering principles",
    clause: "A.8.27",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented principles for engineering secure systems, applied to information system development.",
  },
  {
    key: "a-8-28-secure-coding",
    title: "Secure coding principles",
    clause: "A.8.28",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Approved secure coding principles for in-house and outsourced software development.",
  },
  {
    key: "a-8-29-security-testing",
    title: "Security testing processes",
    clause: "A.8.29",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Security testing processes defined for the development life cycle.",
  },
  {
    key: "a-8-32-change-management",
    title: "Change management procedures",
    clause: "A.8.32",
    kind: RequiredDocumentKind.MAINTAIN,
    description:
      "Documented change management procedures for information processing facilities and information systems.",
  },
  {
    key: "a-8-34-audit-testing",
    title: "Agreed audit testing plans",
    clause: "A.8.34",
    kind: RequiredDocumentKind.RETAIN,
    description:
      "Plans and agreements for audit tests and other assurance activities that assess operational systems.",
  },
];
