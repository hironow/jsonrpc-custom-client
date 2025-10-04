const path = require('node:path')

/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}

