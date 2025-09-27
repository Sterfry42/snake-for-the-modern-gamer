import { defineConfig } from 'vite'

export default defineConfig({
  // ... other config
  server: {
    host: "127.0.0.1", // or '0.0.0.0'
    hmr: {
        overlay: false,
        clientPort: 5173, // The port the browser will connect to
    },
  },
})
