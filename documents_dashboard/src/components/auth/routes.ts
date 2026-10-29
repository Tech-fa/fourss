import LoginView from '@/components/auth/LoginPage.vue'
import ResetPasswordView from '@/components/auth/resetPasword.vue'
import ForgotPasswordView from '@/components/auth/forgotPassword.vue'
import LegalDocumentPage from '@/components/legal/LegalDocumentPage.vue'

export const AUTH_ERROR_I18N_PREFIX = 'errors.auth' as const

export const AuthRoutes = [
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: ResetPasswordView
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: ForgotPasswordView
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginView
    },
    {
        path: '/terms-and-conditions',
        name: 'TermsAndConditions',
        component: LegalDocumentPage,
        props: { documentType: 'terms' }
    },
    {
        path: '/privacy-policy',
        name: 'PrivacyPolicy',
        component: LegalDocumentPage,
        props: { documentType: 'privacy' }
    },
    {
        path: '/activate',
        name: 'Activate',
        component: () => import('../../components/auth/activate.vue')
    }
]
