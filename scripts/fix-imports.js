const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const rootDir = path.join(__dirname, '../src');
const files = walk(rootDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Regex to match from './something.ts' or from "../something.ts" or import './something.ts'
    const updatedContent = content.replace(/(import|export)\s+([\s\S]*?)\s+from\s+(['"])(\.\/|\.\.\/)(.*?)(\.ts)\3/g, '$1 $2 from $3$4$5$3')
        .replace(/(import|export)\s+(['"])(\.\/|\.\.\/)(.*?)(\.ts)\2/g, '$1 $2$3$4$2');

    if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent, 'utf8');
    }
});

console.log('Stripped .ts from imports');
