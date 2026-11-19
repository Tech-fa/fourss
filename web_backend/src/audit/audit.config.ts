export interface DefaultAuditConfigItem {
  name: string;
  description: string;
}

export type DefaultAuditType = DefaultAuditConfigItem;
export type DefaultAuditRole = DefaultAuditConfigItem;
export type DefaultAuditStandard = DefaultAuditConfigItem;

export const defaultAuditTypes: DefaultAuditType[] = [
  {
    name: 'Internal Audit',
    description:
      'Audits conducted by the organization\'s own audit function to evaluate conformity and effectiveness.',
  },
  {
    name: 'External Audit',
    description:
      'Audits conducted by external certification bodies, regulators, or third-party auditors.',
  },
  {
    name: 'Supplier Audit',
    description:
      'Audits of suppliers, contractors, and external partners to assess their processes and compliance.',
  },
];

export const defaultAuditRoles: DefaultAuditRole[] = [
  {
    name: 'Lead Auditor',
    description:
      'Leads the audit team and is responsible for planning and conducting the audit.',
  },
  {
    name: 'Auditor',
    description:
      'Conducts audit activities under the direction of the lead auditor.',
  },
  {
    name: 'Observer',
    description:
      'Observes the audit without conducting audit activities, often for training or witness purposes.',
  },
  {
    name: 'Technical Expert',
    description:
      'Provides specific knowledge or expertise to the audit team without acting as an auditor.',
  },
  {
    name: 'Guide',
    description:
      'Assists the audit team and facilitates access within the auditee organization.',
  },
];

export const defaultAuditStandards: DefaultAuditStandard[] = [
  {
    name: 'ISO 9001',
    description: 'Quality management systems requirements.',
  },
  {
    name: 'ISO 14001',
    description: 'Environmental management systems requirements.',
  },
  {
    name: 'ISO 45001',
    description: 'Occupational health and safety management systems requirements.',
  },
  {
    name: 'ISO/IEC 27001',
    description: 'Information security management systems requirements.',
  },
  {
    name: 'ISO 22000',
    description: 'Food safety management systems requirements.',
  },
  {
    name: 'ISO 13485',
    description: 'Quality management systems for medical devices.',
  },
  {
    name: 'ISO 50001',
    description: 'Energy management systems requirements.',
  },
  {
    name: 'ISO 22301',
    description: 'Business continuity management systems requirements.',
  },
  {
    name: 'ISO/IEC 20000-1',
    description: 'Service management system requirements.',
  },
  {
    name: 'ISO 37001',
    description: 'Anti-bribery management systems requirements.',
  },
  {
    name: 'ISO 37301',
    description: 'Compliance management systems requirements.',
  },
  {
    name: 'ISO 31000',
    description: 'Risk management guidelines.',
  },
  {
    name: 'ISO 26000',
    description: 'Social responsibility guidance.',
  },
  {
    name: 'ISO 10002',
    description: 'Customer satisfaction and complaints handling guidance.',
  },
  {
    name: 'ISO 19011',
    description: 'Guidelines for auditing management systems.',
  },
  {
    name: 'ISO/IEC 17025',
    description: 'General requirements for testing and calibration laboratories.',
  },
  {
    name: 'ISO 15189',
    description: 'Quality and competence requirements for medical laboratories.',
  },
  {
    name: 'ISO 28000',
    description: 'Security management systems for the supply chain.',
  },
  {
    name: 'ISO 39001',
    description: 'Road traffic safety management systems requirements.',
  },
  {
    name: 'ISO 55001',
    description: 'Asset management systems requirements.',
  },
  {
    name: 'ISO 20121',
    description: 'Event sustainability management systems requirements.',
  },
  {
    name: 'ISO 21001',
    description: 'Management systems for educational organizations.',
  },
  {
    name: 'ISO 30401',
    description: 'Knowledge management systems requirements.',
  },
  {
    name: 'ISO 41001',
    description: 'Facility management systems requirements.',
  },
  {
    name: 'ISO 44001',
    description: 'Collaborative business relationship management systems requirements.',
  },
  {
    name: 'ISO 37101',
    description: 'Sustainable development in communities management systems.',
  },
  {
    name: 'ISO 45003',
    description: 'Psychological health and safety at work guidance.',
  },
  {
    name: 'ISO/IEC 27017',
    description: 'Information security controls for cloud services.',
  },
  {
    name: 'ISO/IEC 27018',
    description: 'Protection of personally identifiable information in public clouds.',
  },
  {
    name: 'ISO/IEC 27701',
    description: 'Privacy information management system extension.',
  },
  {
    name: 'ISO/IEC 27005',
    description: 'Information security risk management guidance.',
  },
  {
    name: 'ISO/IEC 27032',
    description: 'Cybersecurity guidelines.',
  },
  {
    name: 'ISO/IEC 27035',
    description: 'Information security incident management guidance.',
  },
  {
    name: 'ISO/IEC 27031',
    description: 'ICT readiness for business continuity guidance.',
  },
  {
    name: 'ISO 20400',
    description: 'Sustainable procurement guidance.',
  },
];
