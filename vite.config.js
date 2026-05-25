import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, '.', '')
    const backendTarget = env.VITE_PRESTASHOP_BACKEND_TARGET

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api': {
                    target: backendTarget,
                    changeOrigin: true,
                },
            },
        },
    }
})
