<template>
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div class="max-w-2xl w-full text-center">
            <!-- Animated 404 Number -->
            <div class="mb-8">
                <h1 class="text-9xl font-bold text-primary-600 mb-4 opacity-90 animate-bounce">
                    404
                </h1>
                <div class="w-24 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 mx-auto rounded-full"></div>
            </div>

            <!-- Error Message -->
            <div class="mb-12">
                <h2 class="text-3xl font-semibold text-neutral-800 mb-4">
                    Oops! Page Not Found
                </h2>
                <p class="text-lg text-neutral-600 leading-relaxed max-w-lg mx-auto">
                    The page you're looking for doesn't exist or has been moved. 
                    Don't worry, it happens to the best of us!
                </p>
            </div>

            <!-- Illustration/Icon -->
            <div class="mb-12 flex justify-center">
                <img src="@/assets/img/4ss-logo.png?url" alt="4SS" class="w-64 h-64"></img>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                    @click="goHome"
                    class="px-8 py-3 bg-primary-600 text-black rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go to Dashboard
                </button>
                
                <button 
                    @click="goBack"
                    class="px-8 py-3 bg-white text-neutral-700 border-2 border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Go Back
                </button>
            </div>

       
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
    router.push('/')
}

const goBack = () => {
    if (window.history.length > 1) {
        router.go(-1)
    } else {
        router.push('/')
    }
}
</script>

<style scoped>
/* Custom animation for the 404 number */
@keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
    }
    40%, 43% {
        transform: translate3d(0, -30px, 0);
    }
    70% {
        transform: translate3d(0, -15px, 0);
    }
    90% {
        transform: translate3d(0, -4px, 0);
    }
}

.animate-bounce {
    animation: bounce 2s infinite;
}

/* Subtle hover effects for the illustration */
.group:hover .group-hover\:scale-105 {
    transform: scale(1.05);
}
</style>

