import fs from 'fs';
import path from 'path';

const FORBIDDEN_STRINGS = ['ClaimSync OS', 'ClaimSync CRM', 'claimsync-os', 'ClaimSync OS AI'];

console.log('--- Running Platform Identity Guard ---');
console.log('Scanning for forbidden platform identity strings...\n');

let violationCount = 0;

function scanFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;

    if (filePath.endsWith('.ico') || filePath.endsWith('.png') || filePath.endsWith('.svg') || filePath.endsWith('.sqlite')) {
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let lines = content.split('\n');

        FORBIDDEN_STRINGS.forEach(forbidden => {
            lines.forEach((line, index) => {
                if (line.includes(forbidden)) {
                    // Ignore instances where it was explicitly discussed as historical in comments, 
                    // though for strictness we might log it all anyway.
                    console.error(`[Violation] Found "${forbidden}" in ${filePath} (line ${index + 1})`);
                    console.error(`   > ${line.trim()}`);
                    violationCount++;
                }
            });
        });
    } catch (err) {
        // Skip files that can't be read as utf-8 easily
    }
}

function scanDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;

    // Do not scan node_modules, dist, release, database, .git
    if (dirPath.includes('node_modules') || dirPath.includes('dist') || dirPath.includes('release') || dirPath.includes('.git')) {
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else {
            scanFile(fullPath);
        }
    }
}

// Scan important root dirs
scanDir(path.resolve(process.cwd(), 'src'));
scanDir(path.resolve(process.cwd(), 'public'));
scanFile(path.resolve(process.cwd(), 'package.json'));
scanFile(path.resolve(process.cwd(), 'index.html'));
scanFile(path.resolve(process.cwd(), 'vite.config.ts'));

if (violationCount > 0) {
    console.error(`\n❌ [Identity Guard FAILED] Found ${violationCount} identity string violations.`);
    console.error(`TaskPro must remain the canonical platform. ClaimSync is only a subsystem pillar.`);
    process.exit(1); // Fail the build
} else {
    console.log(`\n✅ [Identity Guard PASSED] No forbidden platform strings found.`);
    process.exit(0);
}
