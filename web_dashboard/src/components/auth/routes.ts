export const AUTH_ERROR_I18N_PREFIX = 'errors.auth' as const

export const AuthRoutes = [
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('@/components/auth/resetPasword.vue')
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/components/auth/forgotPassword.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/components/auth/LoginPage.vue')
    },
    {
        path: '/terms-and-conditions',
        name: 'TermsAndConditions',
        component: () => import('@/components/legal/LegalDocumentPage.vue'),
        props: { documentType: 'terms' }
    },
    {
        path: '/privacy-policy',
        name: 'PrivacyPolicy',
        component: () => import('@/components/legal/LegalDocumentPage.vue'),
        props: { documentType: 'privacy' }
    },
    {
        path: '/activate',
        name: 'Activate',
        component: () => import('../../components/auth/activate.vue')
    }
]
