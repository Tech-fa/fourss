import AddCategory from './add-category.vue'
import Settings from './settings.vue'
import Main from './main.vue'
import AddNonConformities from './add-non-conformitites.vue'
import ViewNonConformities from './view-non-conformities.vue'
import AddCorrectiveActions from './add-corrective-actions.vue'
import AddInvestigation from './add-investigation.vue'
import RootCauseAnalysis from './root-cause-analysis.vue'
import ViewCorrectiveActions from './view-corrective-actions.vue'

export const nonConformityRoutes = [
    {
        path: '/act/non-conformities/add-category',
        component: AddCategory,
        meta: {
            subject: 'non_conformity_categories',
            actions: ['create']
        }
    },
    {
        path: '/act/non-conformities/add-category/:id',
        component: AddCategory,
        meta: {
            subject: 'non_conformity_categories',
            actions: ['update']
        }
    },
    {
        path: '/act/non-conformities/settings',
        component: Settings,
        meta: {
            subjects: [
                'non_conformity_categories', 
                'non_conformity_types',
                'non_conformity_risk_levels',
                'non_conformity_representatives'
            ],
            actions: ['read']
        }
    },
    {
        path: '/act/non-conformities',
        component: Main,
        meta: {
            subject: 'non_conformities',
            actions: ['read']
        }
    },
    {
        path: '/act/non-conformities/add',
        component: AddNonConformities,
        meta: {
            subject: 'non_conformities',
            actions: ['create']
        }
    },
    {
        path: '/act/non-conformities/:id/edit',
        component: AddNonConformities,
        meta: {
            subject: 'non_conformities',
            actions: ['update']
        }
    },
    {
        path: '/act/non-conformities/:id',
        component: ViewNonConformities,
        meta: {
            subjects: [
                'non_conformities',
                'immediate_actions',
                'corrective_actions',
            ],
            actions: ['read']
        }
    },
    {
        path: '/act/non-conformities/:ncId/add-corrective-actions',
        component: AddCorrectiveActions,
        meta: {
            subject: 'non_conformity_corrective_actions',
            actions: ['create']
        }
    },
    {
        path: '/act/non-conformities/:ncId/:id/edit',
        component: AddCorrectiveActions,
        meta: {
            subject: 'non_conformity_corrective_actions',
            actions: ['update']
        }
    },
    {
        path: '/act/non-conformities/add-investigation',
        component: AddInvestigation,
        meta: {
            subject: 'non_conformities',
            actions: ['create']
        }
    },
    {
        path: '/act/non-conformities/:id/root-cause-analysis',
        component: RootCauseAnalysis,
        meta: {
            subject: 'non_conformities',
            actions: ['create']
        }
    },
    {
        path: '/act/non-conformities/:ncId/corrective-actions/:id',
        component: ViewCorrectiveActions,
        meta: {
            subjects: [
                'non_conformity_corrective_actions',
                'ca_change_requests',
                'ca_effectiveness_evidences'
            ],
            actions: ['read']
        }
    }   
]
