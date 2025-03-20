import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env
config({ path: resolve(__dirname, '.env') })

// Check if integration tests should be included
const skipIntegration = process.env.RUN_INTEGRATION_TESTS !== 'true'

// Create default include patterns
const includePatterns = ['src/**/*.test.ts']

// Include integration tests only if explicitly enabled
if (!skipIntegration) {
  includePatterns.push('tests/integration/**/*.test.ts')
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: includePatterns,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/scripts/**',
      ]
    }
  }
}) 