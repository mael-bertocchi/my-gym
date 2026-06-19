import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            { find: /^prisma\/generated\/(.*)$/, replacement: path.resolve(import.meta.dirname, 'prisma/generated/$1') },
            { find: /^src\/(.*)$/, replacement: path.resolve(import.meta.dirname, 'src/$1') }
        ]
    },
    test: {
        environment: 'node',
        globals: false,
        include: ['tests/**/*.test.ts']
    }
});
