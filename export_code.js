const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputFile = path.join(rootDir, 'TaskPro_Full_Context.txt');

const ignoreDirs = new Set(['node_modules', 'dist', 'extracted_asar', 'release', '.git', '.vscode']);
const allowedExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.env.example', '.cjs'
]);

function shouldInclude(filePath) {
    const stat = fs.statSync(filePath);
    const basename = path.basename(filePath);

    if (stat.isDirectory() && ignoreDirs.has(basename)) {
        return false;
    }

    if (stat.isFile()) {
        if (basename === 'package-lock.json') return false;
        if (basename.startsWith('.')) return false; // Ignore hidden files unless matched above
        if (basename === 'TaskPro_Full_Context.txt') return false;

        const ext = path.extname(basename).toLowerCase();
        if (allowedExtensions.has(ext) || basename === '.env.example' || basename === 'Dockerfile') {
            return true;
        }
        return false; // Ignore other files like images or binaries
    }

    return true;
}

function processDirectory(dir, outStream) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (!shouldInclude(fullPath)) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath, outStream);
        } else if (stat.isFile()) {
            const relPath = path.relative(rootDir, fullPath);
            console.log(`Adding ${relPath}`);
            const content = fs.readFileSync(fullPath, 'utf8');
            outStream.write(`\n\n================================================================================\n`);
            outStream.write(`FILE: ${relPath}\n`);
            outStream.write(`================================================================================\n\n`);
            outStream.write(content);
        }
    }
}

try {
    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
    }

    const outStream = fs.createWriteStream(outputFile, { flags: 'a' });
    console.log('Starting export...');
    processDirectory(rootDir, outStream);
    outStream.end();
    console.log('Export complete! Saved to TaskPro_Full_Context.txt');
} catch (err) {
    console.error('Failed to export:', err);
}
