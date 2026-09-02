import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Comma separated list of extra hostnames that are allowed to load the dev
// server. Useful when the app is opened through a tunnel or from another
// device on the network (Termux, LAN, Cloudflare Tunnel, ngrok, ...).
//   ALLOWED_HOSTS="my-tunnel.trycloudflare.com,192.168.1.20:3000"
// Set ALLOW_ALL_HOSTS=true to accept any hostname (quickest for local
// tinkering, but keep it off on anything publicly reachable).
const extraHosts = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const allowedHosts: string[] | true | undefined = extraHosts.length > 0
  ? extraHosts
  : (process.env.ALLOW_ALL_HOSTS === 'true' ? true : undefined);

// Android/Termux (and some containers) ship a very low inotify watch limit,
// which makes Vite crash with ENOSPC. Opt into polling there.
const usePolling = process.env.VITE_USE_POLLING === 'true';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { usePolling },
      ...(allowedHosts ? { allowedHosts } : {}),
    },
  };
});
