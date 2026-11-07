export const AUTH_ERROR_I18N_PREFIX = 'errors.auth' as const

export const AuthRoutes = [
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('@/components/auth/resetPasword.vue'),
        meta: { purpose: 'Set a new password from a reset link.' }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/components/auth/forgotPassword.vue'),
        meta: { purpose: 'Request a password reset email.' }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/components/auth/LoginPage.vue'),
        meta: { purpose: 'Sign in to the organization.' }
    },
    {
        path: '/terms-and-conditions',
        name: 'TermsAndConditions',
        component: () => import('@/components/legal/LegalDocumentPage.vue'),
        props: { documentType: 'terms' },
        meta: { purpose: 'Read the terms and conditions.' }
    },
    {
        path: '/privacy-policy',
        name: 'PrivacyPolicy',
        component: () => import('@/components/legal/LegalDocumentPage.vue'),
        props: { documentType: 'privacy' },
        meta: { purpose: 'Read the privacy policy.' }
    },
    {
        path: '/activate',
        name: 'Activate',
        component: () => import('../../components/auth/activate.vue'),
        meta: { purpose: 'Activate an account from an invitation.' }
    }
]
