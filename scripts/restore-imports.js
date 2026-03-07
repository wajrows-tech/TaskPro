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
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, '../src'));
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Fix imports that match: import { foo } from './bar'
    let updatedContent = content.replace(/(import|export)\s+([\s\S]*?)\s+from\s+(['"])(\.\/|\.\.\/)(.*?)(?<!\.ts|\.json|\.css)\3/g, (match, p1, p2, p3, p4, p5) => {
        const relativePath = p4 + p5 + '.ts';
        const absolutePath = path.resolve(path.dirname(file), relativePath);
        if (fs.existsSync(absolutePath)) {
            return `${p1} ${p2} from ${p3}${p4}${p5}.ts${p3}`;
        }
        return match;
    });

    // Fix imports that match: import './bar'
    updatedContent = updatedContent.replace(/(import|export)\s+(['"])(\.\/|\.\.\/)(.*?)(?<!\.ts|\.json|\.css)\2/g, (match, p1, p2, p3, p4) => {
        const relativePath = p3 + p4 + '.ts';
        const absolutePath = path.resolve(path.dirname(file), relativePath);
        if (fs.existsSync(absolutePath)) {
            return `${p1} ${p2}${p3}${p4}.ts${p2}`;
        }
        return match;
    });

    if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent, 'utf8');
        changedCount++;
    }
});

console.log(`Restored .ts extensions in ${changedCount} files.`);
