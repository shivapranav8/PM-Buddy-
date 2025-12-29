#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Checks for common deployment issues before deploying to Vercel
 */

const fs = require('fs');
const path = require('path');

const issues = [];
const warnings = [];

console.log('🔍 Validating deployment configuration...\n');

// 1. Check for localhost references
console.log('1. Checking for localhost/local IP references...');
const checkLocalhost = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip node_modules, dist, .git
            if (!['node_modules', 'dist', '.git', 'server'].includes(file)) {
                checkLocalhost(filePath, fileList);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const localhostPattern = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.\d+/i;
            if (localhostPattern.test(content) && !filePath.includes('node_modules')) {
                // Check if it's a false positive (like "localhost" in comments or package names)
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (localhostPattern.test(line) && 
                        !line.includes('//') && 
                        !line.includes('*') &&
                        !line.includes('package') &&
                        !line.includes('registry')) {
                        issues.push(`❌ Found localhost reference in ${filePath}:${index + 1}`);
                    }
                });
            }
        }
    });
};

try {
    checkLocalhost('./src');
    if (issues.length === 0) {
        console.log('   ✅ No localhost references found\n');
    } else {
        issues.forEach(issue => console.log(`   ${issue}`));
        console.log('');
    }
} catch (error) {
    warnings.push('⚠️  Could not check for localhost references');
}

// 2. Check Firebase emulator usage
console.log('2. Checking for Firebase emulator configuration...');
const firebaseFiles = [
    './src/firebase.ts',
    './src/lib/firestore.ts'
];

let emulatorFound = false;
firebaseFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (/connectFirestoreEmulator|connectAuthEmulator|useEmulator|emulator/i.test(content)) {
            emulatorFound = true;
            issues.push(`❌ Firebase emulator found in ${file}`);
        }
    }
});

if (!emulatorFound) {
    console.log('   ✅ No Firebase emulator configuration found\n');
} else {
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('');
}

// 3. Check Vercel configuration
console.log('3. Checking Vercel configuration...');
if (fs.existsSync('./vercel.json')) {
    const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
    if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
        console.log('   ✅ SPA routing configured\n');
    } else {
        warnings.push('⚠️  No SPA routing rewrite rules found in vercel.json');
    }
} else {
    warnings.push('⚠️  vercel.json not found');
}

// 4. Check build configuration
console.log('4. Checking build configuration...');
if (fs.existsSync('./package.json')) {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.build) {
        console.log(`   ✅ Build script: ${pkg.scripts.build}\n`);
    } else {
        issues.push('❌ No build script found in package.json');
    }
}

// 5. Check if Cloud Functions exist
console.log('5. Checking Cloud Functions setup...');
if (fs.existsSync('./functions/index.js')) {
    console.log('   ✅ Cloud Functions code found');
    console.log('   ⚠️  IMPORTANT: Make sure to deploy functions with: firebase deploy --only functions\n');
} else {
    warnings.push('⚠️  Cloud Functions not found. Backend functionality will not work.');
}

// 6. Check environment variables
console.log('6. Checking environment variable usage...');
const envVars = ['VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST'];
const envVarsFound = [];
const srcFiles = fs.readdirSync('./src', { recursive: true });
srcFiles.forEach(file => {
    if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const content = fs.readFileSync(path.join('./src', file), 'utf8');
        envVars.forEach(envVar => {
            if (content.includes(envVar) && !envVarsFound.includes(envVar)) {
                envVarsFound.push(envVar);
            }
        });
    }
});

if (envVarsFound.length > 0) {
    console.log(`   ⚠️  Found environment variables: ${envVarsFound.join(', ')}`);
    console.log('   ⚠️  Make sure to add these to Vercel → Settings → Environment Variables\n');
} else {
    console.log('   ✅ No environment variables required\n');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(50));

if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! Ready for deployment.\n');
    console.log('📋 Next steps:');
    console.log('   1. Deploy Cloud Functions: firebase deploy --only functions');
    console.log('   2. Deploy to Vercel: vercel --prod');
    process.exit(0);
} else {
    if (issues.length > 0) {
        console.log('\n❌ CRITICAL ISSUES (must fix before deployment):');
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (review before deployment):');
        warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log('\n');
    process.exit(issues.length > 0 ? 1 : 0);
}

