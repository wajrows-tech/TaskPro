const fs = require('fs');

let content = fs.readFileSync('src/db/queries.ts', 'utf8');

// Replace standard single-line `db.prepare('...')`
content = content.replace(/db\.prepare\((['"].*?['"])\)/g, '$1');

// Replace multiline `db.prepare(\`...\`)`
content = content.replace(/db\.prepare\((`[\s\S]*?`)\)/g, '$1');

// Rename export const queries = { to const sqlStrings = {
content = content.replace('export const queries = {', 'const sqlStrings = {');

// Append the Proxy logic at the end
content += `
const cache: Record<string, any> = {};

export const queries = new Proxy(sqlStrings, {
    get(target: any, prop: string) {
        if (typeof prop === 'string' && target[prop]) {
            if (!cache[prop]) {
                cache[prop] = db.prepare(target[prop]);
            }
            return cache[prop];
        }
        return Reflect.get(target, prop);
    }
}) as { [K in keyof typeof sqlStrings]: import('better-sqlite3').Statement };
`;

fs.writeFileSync('src/db/queries.ts', content, 'utf8');
console.log('queries.ts refactored to use lazy Proxy compilation.');
