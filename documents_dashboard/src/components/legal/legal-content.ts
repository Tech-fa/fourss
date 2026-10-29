export type LegalDocumentType = 'terms' | 'privacy'

export interface LegalSection {
    title: string
    paragraphs: string[]
    items?: string[]
}

export interface LegalDocument {
    title: string
    effectiveDate: string
    introduction: string[]
    sections: LegalSection[]
}

type LegalContent = Record<'en' | 'fr', Record<LegalDocumentType, LegalDocument>>

export const legalContent: LegalContent = {
    en: {
        terms: {
            title: 'Terms and Conditions',
            effectiveDate: 'Effective date: August 11, 2026',
            introduction: [
                'These Terms and Conditions (the “Terms”) govern your access to and use of the 4ES platform, related applications, and services (collectively, the “Service”) operated by Afawaz Technologies Inc. (“Afawaz”, “we”, “us”, or “our”).',
                'By creating an account, accessing, or using the Service, you confirm that you are at least 18 years old and agree to these Terms. If you use the Service for an organization, you confirm that you are authorized to bind that organization to these Terms.'
            ],
            sections: [
                {
                    title: '1. The Service and trial access',
                    paragraphs: [
                        '4ES is a business platform that helps organizations manage workplace, operational, compliance, training, and related records. We may modify, improve, suspend, or discontinue any part of the Service when reasonably necessary.',
                        'Eligible organizations may receive a three-month trial. A trial does not automatically convert to a paid subscription, and we do not collect payment information through the Service at this time. Continuing access after a trial requires a separate subscription arrangement with Afawaz.'
                    ]
                },
                {
                    title: '2. Accounts and organization administrators',
                    paragraphs: [
                        'You must provide accurate, current information, protect your credentials, and promptly notify us of any suspected unauthorized use. You are responsible for activity performed through your account unless it results from our failure to protect the Service.',
                        'Your organization may appoint administrators who can manage users, permissions, and organization data. Administrators are responsible for ensuring that users they invite are authorized to access the information made available to them.'
                    ]
                },
                {
                    title: '3. Acceptable use',
                    paragraphs: ['You must not use the Service in a way that is unlawful, harmful, or interferes with the Service or other users.'],
                    items: [
                        'Access or attempt to access accounts, systems, or data without authorization.',
                        'Upload malware, malicious code, or content that infringes another person’s rights.',
                        'Probe, scan, reverse engineer, or disrupt the Service except where applicable law cannot prohibit that activity.',
                        'Use the Service to store or share content that is unlawful, defamatory, discriminatory, or otherwise inappropriate for a workplace platform.',
                        'Resell, sublicense, or make the Service available to third parties unless Afawaz agrees in writing.'
                    ]
                },
                {
                    title: '4. Organization data',
                    paragraphs: [
                        'You and your organization retain ownership of the records, files, and other content submitted to the Service (“Organization Data”). You grant Afawaz a limited right to host, process, transmit, back up, and display Organization Data only as needed to provide, secure, and support the Service and to meet legal obligations.',
                        'Your organization controls Organization Data and is responsible for obtaining the permissions, notices, and consents required to submit it. Afawaz processes Organization Data on the organization’s documented instructions and does not use it for unrelated purposes.'
                    ]
                },
                {
                    title: '5. Intellectual property',
                    paragraphs: [
                        'Afawaz and its licensors own the Service, including its software, design, documentation, branding, and other intellectual property. Subject to these Terms and any applicable subscription arrangement, Afawaz grants you a limited, non-exclusive, non-transferable, revocable right to use the Service for your organization’s internal business purposes.',
                        'Feedback you provide may be used by Afawaz without restriction or compensation, provided that we do not identify you or your organization as the source without permission.'
                    ]
                },
                {
                    title: '6. Suspension and termination',
                    paragraphs: [
                        'We may suspend or terminate access, including a trial, if we reasonably believe there is a security risk, misuse, a breach of these Terms, an unlawful activity, or an operational need. Where practical, we will provide notice and an opportunity to address the issue.',
                        'You or your organization may stop using the Service at any time. After account closure or trial expiry, we retain account and workspace data for six months to support recovery, conversion, and legal or security needs, then delete or anonymize it unless a longer period is required by law. See the Privacy Policy for further detail.'
                    ]
                },
                {
                    title: '7. Disclaimers',
                    paragraphs: [
                        'The Service supports organizational processes but does not provide legal, regulatory, safety, medical, financial, or professional advice. You are responsible for deciding how to use the Service and for verifying that its use meets your organization’s legal and operational requirements.',
                        'To the maximum extent permitted by law, the Service is provided “as is” and “as available.” Afawaz does not guarantee that the Service will be uninterrupted, error-free, or suitable for every purpose.'
                    ]
                },
                {
                    title: '8. Limitation of liability and indemnity',
                    paragraphs: [
                        'To the maximum extent permitted by law, Afawaz will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities. Afawaz’s total liability arising from the Service or these Terms will not exceed the amount paid by your organization to Afawaz for the Service in the twelve months before the event giving rise to the claim; if no amount was paid, it will not exceed CAD $100.',
                        'You and your organization will indemnify Afawaz against third-party claims arising from Organization Data, your unauthorized use of the Service, or your breach of these Terms, except to the extent caused by Afawaz’s negligence or wilful misconduct.'
                    ]
                },
                {
                    title: '9. Changes to these Terms',
                    paragraphs: [
                        'We may update these Terms to reflect changes to the Service, law, or our business practices. We will post the updated Terms with a new effective date and, for material changes, provide reasonable additional notice. Continued use after the effective date means you accept the updated Terms.'
                    ]
                },
                {
                    title: '10. Governing law and contact',
                    paragraphs: [
                        'These Terms are governed by the federal laws of Canada applicable in Ontario. Subject to any non-waivable rights that apply to you, the courts located in Ottawa, Ontario have exclusive jurisdiction over disputes arising from these Terms or the Service.',
                        'Questions about these Terms can be sent to Afawaz Technologies Inc., 2415 Holly Lane, Unit 205, Ottawa, Ontario, K1V 7P2, Canada, at afawaz@4eshub.com.'
                    ]
                }
            ]
        },
        privacy: {
            title: 'Privacy Policy',
            effectiveDate: 'Effective date: August 11, 2026',
            introduction: [
                'This Privacy Policy explains how Afawaz Technologies Inc. (“Afawaz”, “we”, “us”, or “our”) collects, uses, discloses, retains, and protects personal information when you use the 4ES platform and related services (the “Service”).',
                'Afawaz Technologies Inc. is located at 2415 Holly Lane, Unit 205, Ottawa, Ontario, K1V 7P2, Canada. For privacy questions or requests, contact afawaz@4eshub.com.'
            ],
            sections: [
                {
                    title: '1. Our role',
                    paragraphs: [
                        'Afawaz is generally responsible for personal information associated with your account, communications with us, platform administration, and Service security. When an organization uploads or enters workforce, incident, training, compliance, or similar records, that organization controls the data and Afawaz acts as its service provider, processing it on the organization’s documented instructions.',
                        'If you are an employee or other individual whose information was submitted by an organization, please first direct access, correction, or deletion requests to that organization. We will assist the organization as required by applicable law and our agreement with it.'
                    ]
                },
                {
                    title: '2. Information we collect',
                    paragraphs: ['We collect information needed to operate, secure, and support the Service, including:'],
                    items: [
                        'Account and organization information, such as your name, work email address, password, organization name, role, and profile details.',
                        'Organization Data, which may include workplace incident, training, compliance, operational, or employee records that an organization chooses to enter or upload.',
                        'Technical and usage information, such as IP address, browser and device details, log records, pages or features used, actions performed, dates, times, and audit information.',
                        'Communications and support information you send to us, including messages and attachments.',
                        'Authentication information stored in your browser using local storage so the Service can maintain your signed-in session.'
                    ]
                },
                {
                    title: '3. How we use information',
                    paragraphs: ['We use personal information to:'],
                    items: [
                        'Create and administer accounts, authenticate users, and provide the Service.',
                        'Host, secure, maintain, troubleshoot, and improve the Service.',
                        'Respond to support requests and send service-related emails, including verification and account notifications.',
                        'Monitor for security incidents, prevent misuse, enforce these Terms, and meet legal obligations.',
                        'Manage trials, subscriptions arranged separately with Afawaz, and our relationship with customer organizations.'
                    ]
                },
                {
                    title: '4. Service providers and international processing',
                    paragraphs: [
                        'We use Amazon Web Services (AWS) to host the Service and store its data in the United States. We use Twilio SendGrid to deliver transactional emails, such as verification and account notifications. These providers process personal information only to provide services to us and under contractual confidentiality and security obligations.',
                        'Personal information may therefore be processed in the United States and other jurisdictions where our service providers operate. It may be subject to the laws of those jurisdictions and available to government authorities under lawful orders. We use contractual, organizational, and technical measures intended to protect information during these transfers.'
                    ]
                },
                {
                    title: '5. Disclosure of information',
                    paragraphs: [
                        'We do not sell personal information. We disclose information to your organization and its authorized administrators, to AWS and SendGrid as described above, to professional advisers or authorities when legally required, and to a successor in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate safeguards.',
                        'We may also disclose information when reasonably necessary to protect the rights, safety, security, or property of Afawaz, our users, or others; to investigate fraud or misuse; or to comply with law.'
                    ]
                },
                {
                    title: '6. Local storage and similar technologies',
                    paragraphs: [
                        'The Service uses browser local storage to store authentication tokens and settings needed to maintain your session and preferences. Clearing local storage or using browser controls may sign you out or affect Service functionality. We do not currently use the Service for advertising or third-party behavioural analytics.'
                    ]
                },
                {
                    title: '7. Security',
                    paragraphs: [
                        'We use reasonable administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, loss, misuse, alteration, and disclosure. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. You must protect your credentials and use the Service only through trusted devices and networks.'
                    ]
                },
                {
                    title: '8. Retention',
                    paragraphs: [
                        'We retain account and workspace data for six months after an account is closed or a trial expires to support recovery, conversion, security, and legal needs. We then delete or anonymize the information unless we are required or permitted by law to retain it longer. We may retain limited information, such as security logs or records necessary to resolve disputes or meet legal obligations, for a longer period.'
                    ]
                },
                {
                    title: '9. Your privacy choices and rights',
                    paragraphs: [
                        'Subject to applicable law, you may request access to, correction of, or deletion of personal information that Afawaz controls, or ask questions about our handling of it. Send requests to afawaz@4eshub.com. We may need to verify your identity and may decline or limit a request where permitted or required by law.',
                        'If you are in Canada and are not satisfied with our response, you may have the right to complain to the Office of the Privacy Commissioner of Canada or the relevant provincial privacy regulator. We will not discriminate against you for exercising your privacy rights.'
                    ]
                },
                {
                    title: '10. Children and changes to this Policy',
                    paragraphs: [
                        'The Service is intended for adults and is not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided us personal information, contact us so we can take appropriate action.',
                        'We may update this Privacy Policy as our practices or legal obligations change. We will publish the updated version with a new effective date and provide additional notice for material changes when appropriate.'
                    ]
                }
            ]
        }
    },
    fr: {
        terms: {
            title: 'Conditions générales',
            effectiveDate: 'Date d’entrée en vigueur : 11 août 2026',
            introduction: [
                'Les présentes Conditions générales (« Conditions ») régissent votre accès à la plateforme 4ES, aux applications connexes et aux services associés (collectivement, le « Service ») exploités par Afawaz Technologies Inc. (« Afawaz », « nous », « notre » ou « nos »).',
                'En créant un compte, en accédant au Service ou en l’utilisant, vous confirmez avoir au moins 18 ans et acceptez les présentes Conditions. Si vous utilisez le Service pour le compte d’une organisation, vous confirmez être autorisé à l’engager par les présentes Conditions.'
            ],
            sections: [
                {
                    title: '1. Le Service et l’accès d’essai',
                    paragraphs: [
                        '4ES est une plateforme d’entreprise qui aide les organisations à gérer des dossiers liés au milieu de travail, aux opérations, à la conformité, à la formation et à des domaines connexes. Nous pouvons modifier, améliorer, suspendre ou interrompre une partie du Service lorsque cela est raisonnablement nécessaire.',
                        'Les organisations admissibles peuvent bénéficier d’un essai de trois mois. Un essai ne se transforme pas automatiquement en abonnement payant et nous ne recueillons actuellement aucune information de paiement par l’entremise du Service. La poursuite de l’accès après l’essai exige une entente d’abonnement distincte avec Afawaz.'
                    ]
                },
                {
                    title: '2. Comptes et administrateurs d’organisation',
                    paragraphs: [
                        'Vous devez fournir des renseignements exacts et à jour, protéger vos identifiants et nous aviser rapidement de toute utilisation non autorisée présumée. Vous êtes responsable des activités effectuées par votre compte, sauf lorsqu’elles découlent d’un manquement de notre part à protéger le Service.',
                        'Votre organisation peut désigner des administrateurs pouvant gérer les utilisateurs, les autorisations et les données de l’organisation. Les administrateurs doivent s’assurer que les utilisateurs qu’ils invitent sont autorisés à accéder aux renseignements mis à leur disposition.'
                    ]
                },
                {
                    title: '3. Utilisation acceptable',
                    paragraphs: ['Vous ne devez pas utiliser le Service d’une façon illégale ou préjudiciable, ni d’une manière qui perturbe le Service ou les autres utilisateurs.'],
                    items: [
                        'Accéder ou tenter d’accéder sans autorisation à des comptes, systèmes ou données.',
                        'Téléverser des logiciels malveillants, du code malicieux ou du contenu portant atteinte aux droits d’autrui.',
                        'Sonder, analyser, décompiler ou perturber le Service, sauf lorsque le droit applicable ne permet pas de l’interdire.',
                        'Utiliser le Service pour stocker ou partager du contenu illégal, diffamatoire, discriminatoire ou autrement inapproprié pour une plateforme de travail.',
                        'Revendre, concéder en sous-licence ou mettre le Service à la disposition de tiers sans l’accord écrit d’Afawaz.'
                    ]
                },
                {
                    title: '4. Données de l’organisation',
                    paragraphs: [
                        'Vous et votre organisation conservez la propriété des dossiers, fichiers et autres contenus transmis au Service (« Données de l’organisation »). Vous accordez à Afawaz un droit limité d’héberger, traiter, transmettre, sauvegarder et afficher les Données de l’organisation uniquement dans la mesure nécessaire à la fourniture, à la sécurité et au soutien du Service, ainsi qu’au respect de nos obligations légales.',
                        'Votre organisation contrôle les Données de l’organisation et doit obtenir les autorisations, avis et consentements nécessaires à leur transmission. Afawaz traite les Données de l’organisation selon les instructions documentées de l’organisation et ne les utilise pas à des fins non liées.'
                    ]
                },
                {
                    title: '5. Propriété intellectuelle',
                    paragraphs: [
                        'Afawaz et ses concédants détiennent le Service, notamment ses logiciels, sa conception, sa documentation, ses marques et les autres droits de propriété intellectuelle. Sous réserve des présentes Conditions et de toute entente d’abonnement applicable, Afawaz vous accorde un droit limité, non exclusif, non transférable et révocable d’utiliser le Service aux fins commerciales internes de votre organisation.',
                        'Nous pouvons utiliser sans restriction ni compensation les commentaires que vous nous fournissez, sans vous identifier ni identifier votre organisation comme source sans votre autorisation.'
                    ]
                },
                {
                    title: '6. Suspension et résiliation',
                    paragraphs: [
                        'Nous pouvons suspendre ou résilier l’accès, y compris un essai, si nous croyons raisonnablement qu’il existe un risque de sécurité, une utilisation abusive, une violation des présentes Conditions, une activité illégale ou un besoin opérationnel. Dans la mesure du possible, nous vous aviserons et vous offrirons l’occasion de corriger la situation.',
                        'Vous ou votre organisation pouvez cesser d’utiliser le Service à tout moment. Après la fermeture d’un compte ou l’expiration d’un essai, nous conservons les données de compte et d’espace de travail pendant six mois afin de soutenir la récupération, la conversion et les besoins juridiques ou de sécurité, puis nous les supprimons ou les anonymisons, sauf si la loi exige une conservation plus longue. Consultez la Politique de confidentialité pour plus de précisions.'
                    ]
                },
                {
                    title: '7. Exclusions de garantie',
                    paragraphs: [
                        'Le Service soutient les processus organisationnels, mais ne fournit pas de conseils juridiques, réglementaires, de sécurité, médicaux, financiers ou professionnels. Il vous incombe de décider comment utiliser le Service et de vérifier que son utilisation respecte les exigences juridiques et opérationnelles de votre organisation.',
                        'Dans la mesure maximale permise par la loi, le Service est fourni « tel quel » et « selon sa disponibilité ». Afawaz ne garantit pas que le Service sera ininterrompu, exempt d’erreurs ou adapté à tous les usages.'
                    ]
                },
                {
                    title: '8. Limitation de responsabilité et indemnisation',
                    paragraphs: [
                        'Dans la mesure maximale permise par la loi, Afawaz ne sera pas responsable des dommages indirects, accessoires, spéciaux, consécutifs, exemplaires ou punitifs, ni des pertes de profits, de revenus, de données, d’achalandage ou d’occasions d’affaires. La responsabilité totale d’Afawaz découlant du Service ou des présentes Conditions ne dépassera pas le montant payé par votre organisation à Afawaz pour le Service au cours des douze mois précédant l’événement à l’origine de la réclamation; si aucun montant n’a été payé, elle ne dépassera pas 100 $ CA.',
                        'Vous et votre organisation indemniserez Afawaz contre les réclamations de tiers découlant des Données de l’organisation, de votre utilisation non autorisée du Service ou de votre violation des présentes Conditions, sauf dans la mesure où elles sont causées par la négligence ou la faute intentionnelle d’Afawaz.'
                    ]
                },
                {
                    title: '9. Modifications des présentes Conditions',
                    paragraphs: [
                        'Nous pouvons mettre à jour les présentes Conditions pour refléter des changements au Service, à la loi ou à nos pratiques commerciales. Nous publierons les Conditions mises à jour avec une nouvelle date d’entrée en vigueur et, pour les changements importants, nous fournirons un avis supplémentaire raisonnable. L’utilisation continue du Service après la date d’entrée en vigueur signifie que vous acceptez les Conditions mises à jour.'
                    ]
                },
                {
                    title: '10. Droit applicable et coordonnées',
                    paragraphs: [
                        'Les présentes Conditions sont régies par les lois fédérales du Canada applicables en Ontario. Sous réserve des droits impératifs qui peuvent vous être applicables, les tribunaux situés à Ottawa, en Ontario, ont compétence exclusive pour les différends découlant des présentes Conditions ou du Service.',
                        'Pour toute question sur les présentes Conditions, communiquez avec Afawaz Technologies Inc., 2415 Holly Lane, unité 205, Ottawa (Ontario) K1V 7P2, Canada, à afawaz@4eshub.com.'
                    ]
                }
            ]
        },
        privacy: {
            title: 'Politique de confidentialité',
            effectiveDate: 'Date d’entrée en vigueur : 11 août 2026',
            introduction: [
                'La présente Politique de confidentialité explique comment Afawaz Technologies Inc. (« Afawaz », « nous », « notre » ou « nos ») recueille, utilise, communique, conserve et protège les renseignements personnels lorsque vous utilisez la plateforme 4ES et les services connexes (le « Service »).',
                'Afawaz Technologies Inc. est située au 2415 Holly Lane, unité 205, Ottawa (Ontario) K1V 7P2, Canada. Pour toute question ou demande relative à la vie privée, écrivez à afawaz@4eshub.com.'
            ],
            sections: [
                {
                    title: '1. Notre rôle',
                    paragraphs: [
                        'Afawaz est généralement responsable des renseignements personnels associés à votre compte, à vos communications avec nous, à l’administration de la plateforme et à la sécurité du Service. Lorsqu’une organisation téléverse ou saisit des dossiers liés à son personnel, à des incidents, à la formation, à la conformité ou à des sujets similaires, cette organisation contrôle les données et Afawaz agit comme son fournisseur de services en les traitant selon ses instructions documentées.',
                        'Si vous êtes un employé ou une autre personne dont les renseignements ont été transmis par une organisation, veuillez d’abord adresser vos demandes d’accès, de correction ou de suppression à cette organisation. Nous aiderons l’organisation lorsque la loi applicable et notre entente avec elle l’exigent.'
                    ]
                },
                {
                    title: '2. Renseignements que nous recueillons',
                    paragraphs: ['Nous recueillons les renseignements nécessaires au fonctionnement, à la sécurité et au soutien du Service, notamment :'],
                    items: [
                        'Les renseignements de compte et d’organisation, tels que votre nom, votre adresse courriel professionnelle, votre mot de passe, le nom de votre organisation, votre rôle et les détails de votre profil.',
                        'Les Données de l’organisation, qui peuvent comprendre des dossiers d’incidents en milieu de travail, de formation, de conformité, d’opérations ou d’employés qu’une organisation choisit de saisir ou de téléverser.',
                        'Les renseignements techniques et d’utilisation, tels que l’adresse IP, les détails du navigateur et de l’appareil, les journaux, les pages ou fonctionnalités utilisées, les actions effectuées, les dates, les heures et les renseignements d’audit.',
                        'Les communications et renseignements de soutien que vous nous envoyez, y compris les messages et pièces jointes.',
                        'Les renseignements d’authentification enregistrés dans le stockage local de votre navigateur afin de maintenir votre session ouverte.'
                    ]
                },
                {
                    title: '3. Comment nous utilisons les renseignements',
                    paragraphs: ['Nous utilisons les renseignements personnels pour :'],
                    items: [
                        'Créer et administrer les comptes, authentifier les utilisateurs et fournir le Service.',
                        'Héberger, sécuriser, maintenir, dépanner et améliorer le Service.',
                        'Répondre aux demandes de soutien et envoyer des courriels liés au Service, y compris les vérifications et avis de compte.',
                        'Surveiller les incidents de sécurité, prévenir les abus, appliquer les présentes Conditions et respecter les obligations légales.',
                        'Gérer les essais, les abonnements conclus séparément avec Afawaz et notre relation avec les organisations clientes.'
                    ]
                },
                {
                    title: '4. Fournisseurs de services et traitement international',
                    paragraphs: [
                        'Nous utilisons Amazon Web Services (AWS) pour héberger le Service et stocker ses données aux États-Unis. Nous utilisons Twilio SendGrid pour transmettre des courriels transactionnels, tels que les vérifications et avis de compte. Ces fournisseurs traitent les renseignements personnels uniquement pour nous fournir leurs services et sont soumis à des obligations contractuelles de confidentialité et de sécurité.',
                        'Les renseignements personnels peuvent donc être traités aux États-Unis et dans d’autres territoires où nos fournisseurs de services exercent leurs activités. Ils peuvent être assujettis aux lois de ces territoires et accessibles aux autorités gouvernementales sur présentation d’ordonnances légales. Nous utilisons des mesures contractuelles, organisationnelles et techniques visant à protéger les renseignements durant ces transferts.'
                    ]
                },
                {
                    title: '5. Communication des renseignements',
                    paragraphs: [
                        'Nous ne vendons pas les renseignements personnels. Nous communiquons des renseignements à votre organisation et à ses administrateurs autorisés, à AWS et à SendGrid comme décrit ci-dessus, à nos conseillers professionnels ou aux autorités lorsque la loi l’exige, ainsi qu’à un successeur dans le cadre d’une fusion, d’une acquisition, d’un financement ou d’une vente d’actifs, sous réserve de garanties appropriées.',
                        'Nous pouvons également communiquer des renseignements lorsqu’il est raisonnablement nécessaire de protéger les droits, la sécurité ou les biens d’Afawaz, de nos utilisateurs ou d’autres personnes; d’enquêter sur une fraude ou une utilisation abusive; ou de respecter la loi.'
                    ]
                },
                {
                    title: '6. Stockage local et technologies similaires',
                    paragraphs: [
                        'Le Service utilise le stockage local du navigateur pour enregistrer des jetons d’authentification et des paramètres nécessaires au maintien de votre session et de vos préférences. La suppression du stockage local ou l’utilisation des contrôles du navigateur peut vous déconnecter ou nuire au fonctionnement du Service. Nous n’utilisons actuellement pas le Service à des fins publicitaires ni d’analyse comportementale par des tiers.'
                    ]
                },
                {
                    title: '7. Sécurité',
                    paragraphs: [
                        'Nous utilisons des mesures de protection administratives, techniques et organisationnelles raisonnables visant à protéger les renseignements personnels contre l’accès, la perte, l’utilisation abusive, la modification et la communication non autorisés. Aucune méthode de transmission ou de stockage n’est entièrement sécurisée; nous ne pouvons donc pas garantir une sécurité absolue. Vous devez protéger vos identifiants et utiliser le Service uniquement à partir d’appareils et de réseaux fiables.'
                    ]
                },
                {
                    title: '8. Conservation',
                    paragraphs: [
                        'Nous conservons les données de compte et d’espace de travail pendant six mois après la fermeture d’un compte ou l’expiration d’un essai afin de soutenir la récupération, la conversion, la sécurité et les besoins juridiques. Nous supprimons ou anonymisons ensuite les renseignements, sauf si la loi nous permet ou nous oblige à les conserver plus longtemps. Nous pouvons conserver certains renseignements limités, tels que des journaux de sécurité ou des dossiers nécessaires pour régler des différends ou respecter des obligations légales, pendant une période plus longue.'
                    ]
                },
                {
                    title: '9. Vos choix et droits en matière de vie privée',
                    paragraphs: [
                        'Sous réserve de la loi applicable, vous pouvez demander l’accès aux renseignements personnels qu’Afawaz contrôle, leur correction ou leur suppression, ou poser des questions sur leur traitement. Envoyez vos demandes à afawaz@4eshub.com. Nous pourrions devoir vérifier votre identité et pouvons refuser ou limiter une demande lorsque la loi le permet ou l’exige.',
                        'Si vous êtes au Canada et n’êtes pas satisfait de notre réponse, vous pouvez avoir le droit de vous plaindre auprès du Commissariat à la protection de la vie privée du Canada ou de l’autorité provinciale compétente. Nous ne ferons aucune discrimination à votre égard parce que vous exercez vos droits en matière de vie privée.'
                    ]
                },
                {
                    title: '10. Enfants et modifications de la présente Politique',
                    paragraphs: [
                        'Le Service est destiné aux adultes et ne s’adresse pas aux personnes de moins de 18 ans. Nous ne recueillons pas sciemment de renseignements personnels auprès d’enfants. Si vous croyez qu’un enfant nous a fourni des renseignements personnels, communiquez avec nous afin que nous puissions prendre les mesures appropriées.',
                        'Nous pouvons mettre à jour la présente Politique de confidentialité lorsque nos pratiques ou obligations légales changent. Nous publierons la version mise à jour avec une nouvelle date d’entrée en vigueur et fournirons un avis supplémentaire pour les changements importants lorsque cela est approprié.'
                    ]
                }
            ]
        }
    }
}
