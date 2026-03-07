const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../src/tests');
const list = fs.readdirSync(testDir);

list.forEach(file => {
    if (file.endsWith('.ts')) {
        let filePath = path.join(testDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Revert vitest imports to chai
        content = content.replace(/import\s+\{\s*expect[\s\S]*?\}\s*from\s*['"]vitest['"];?/g, "import { expect } from 'chai';");
        // Revert beforeAll to before
        content = content.replace(/\bbeforeAll\(/g, 'before(');

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Reverted ${file}`);
    }
});
