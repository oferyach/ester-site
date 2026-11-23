import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },

    server: {
      allowedHosts: ['.trycloudflare.com'],
      ...(isCodexSeatbeltSandbox
        ? {
            watch: {
              useFsEvents: false,
              usePolling: true,
            },
          }
        : {}),
    },

    plugins: [
      vinext(),
      sites(),
      cloudflare({
        configPath: './wrangler.jsonc',
        viteEnvironment: {
          name: 'rsc',
          childEnvironments: ['ssr'],
        },
      }),
    ],
  };
});
