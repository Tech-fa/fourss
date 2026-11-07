export const permissionsRoutes = [
    {
        path: '/admin/permissions/roles',
        name: 'Permissions Groups',
        component: () => import('./Groups.vue'),
        meta: {
            subject: 'permissions',
            actions: ['read'],
            purpose: 'List permission groups.'
        }
    },
    {
        path: '/admin/permissions/roles/add',
        name: 'Add Permission Group',
        component: () => import('./addGroup.vue'),
        meta: {
            subject: 'permissions',
            actions: ['create'],
            purpose: 'Create a permission group.'
        }
    },
    {
        path: '/admin/permissions/roles/:id/edit',
        name: 'Edit Permission Group',
        component: () => import('./addGroup.vue'),
        meta: {
            subject: 'permissions',
            actions: ['update'],
            purpose: 'Change a permission group.'
        }
    },
    {
        path: '/admin/permissions/roles/:id',
        name: 'Permission Group',
        component: () => import('./addGroup.vue'),
        meta: {
            subject: 'permissions',
            actions: ['read'],
            purpose: 'Read a permission group.'
        }
    }
]
