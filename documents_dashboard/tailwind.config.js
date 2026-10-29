/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            boxShadow: {
                even: '0 0 16px rgba(0, 0, 0, 0.08)'
            },
            colors: {
                primary: {
                    DEFAULT: '#1c369a',
                    hover: '#363f61',
                    light: '#586692',
                    dark: '#2f364f'
                },
                secondary: {
                    DEFAULT: '#6d82b8',
                    hover: '#5c709f',
                    light: '#8fa0cb',
                    dark: '#566a94'
                },
                opposite: {
                    DEFAULT: '#ffffff',
                    hover: '#f4f6fa',
                    muted: '#e8ecf4'
                }
            }
        }
    },
    darkMode: 'selector',
    plugins: [require('@tailwindcss/forms')]
}
