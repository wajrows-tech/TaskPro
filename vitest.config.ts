import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
    },
    resolve: {
        alias: [
            {
                find: /^\.\.\/(.*)\.ts$/,
                replacement: path.resolve(__dirname, 'src/$1.ts')
            },
            {
                find: /^\.\/(.*)\.ts$/,
                replacement: path.resolve(__dirname, 'src/$1.ts')
            }
        ]
    }
});
 
