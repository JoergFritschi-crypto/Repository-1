#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root directory
const PROJECT_ROOT = join(__dirname, '..');

// Translation key patterns to match
const TRANSLATION_PATTERNS = [
  // t("key") or t('key') or t(`key`)
  /t\(["'`]([^)"'`]+?)["'`]\)/g,
  
  // i18n.t("key") or i18n.t('key') or i18n.t(`key`)
  /i18n\.t\(["'`]([^)"'`]+?)["'`]\)/g,
  
  // <Trans i18nKey="key" or <Trans i18nKey='key' or <Trans i18nKey={`key`}
  /<Trans[^>]*i18nKey=["'`]([^"'`]+?)["'`][^>]*>/g,
  
  // {t("key")} in JSX or {t('key')} or {t(`key`)}
  /\{t\(["'`]([^)"'`]+?)["'`]\)\}/g,

  // useTranslation("namespace") - captures namespace for keyPrefix resolution
  /useTranslation\(["'`]([^)"'`]+?)["'`]\)/g,
];

// Patterns that indicate dynamic or runtime-generated keys
const DYNAMIC_KEY_PATTERNS = [
  // Variables: t(someVariable) or t(`${variable}`)
  /t\((?!["`'])([^)]+)\)/g,
  
  // Template literals with interpolation: t(`some.${var}.key`)
  /t\(["`][^"`]*\$\{[^}]+\}[^"`]*["`]\)/g,
  
  // i18n.t with variables
  /i18n\.t\((?!["`'])([^)]+)\)/g,
];

/**
 * Recursively find all TypeScript and TSX files
 */
function findSourceFiles(dir, extensions = ['.ts', '.tsx']) {
  let files = [];
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry)) {
        files = files.concat(findSourceFiles(fullPath, extensions));
      }
    } else if (stat.isFile()) {
      const hasValidExtension = extensions.some(ext => fullPath.endsWith(ext));
      if (hasValidExtension) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Extract translation keys from a single file
 */
function extractKeysFromFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const keys = new Set();
    const dynamicKeys = new Set();
    
    // Extract static translation keys
    for (const pattern of TRANSLATION_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        if (key && key.trim()) {
          // Skip if the key looks dynamic (contains variables)
          if (!key.includes('${') && !key.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
            keys.add(key.trim());
          }
        }
      }
    }
    
    // Extract potential dynamic keys for reporting
    for (const pattern of DYNAMIC_KEY_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1] || match[0];
        if (key && key.trim()) {
          dynamicKeys.add({
            file: filePath,
            pattern: key.trim(),
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
    
    return {
      staticKeys: Array.from(keys),
      dynamicKeys: Array.from(dynamicKeys)
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return { staticKeys: [], dynamicKeys: [] };
  }
}

/**
 * Extract all translation keys from the codebase
 */
function extractAllTranslationKeys() {
  const clientSrcDir = join(PROJECT_ROOT, 'client', 'src');
  
  console.log('🔍 Scanning for TypeScript/TSX files...');
  const sourceFiles = findSourceFiles(clientSrcDir);
  
  console.log(`📁 Found ${sourceFiles.length} source files to analyze`);
  
  const allStaticKeys = new Set();
  const allDynamicKeys = [];
  let processedFiles = 0;
  
  for (const filePath of sourceFiles) {
    const { staticKeys, dynamicKeys } = extractKeysFromFile(filePath);
    
    // Add static keys to the set
    staticKeys.forEach(key => allStaticKeys.add(key));
    
    // Add dynamic keys to the array
    allDynamicKeys.push(...dynamicKeys);
    
    processedFiles++;
    
    if (staticKeys.length > 0 || dynamicKeys.length > 0) {
      const relativePath = filePath.replace(PROJECT_ROOT, '.');
      console.log(`  📄 ${relativePath}: ${staticKeys.length} static, ${dynamicKeys.length} dynamic`);
    }
  }
  
  return {
    staticKeys: Array.from(allStaticKeys).sort(),
    dynamicKeys: allDynamicKeys,
    processedFiles
  };
}

/**
 * Generate a human-readable report
 */
function generateReport(extractedData) {
  const { staticKeys, dynamicKeys, processedFiles } = extractedData;
  
  const report = {
    summary: {
      totalFiles: processedFiles,
      staticKeysFound: staticKeys.length,
      dynamicKeysFound: dynamicKeys.length,
      timestamp: new Date().toISOString()
    },
    staticKeys: staticKeys,
    dynamicKeys: dynamicKeys
  };
  
  console.log('\n📊 EXTRACTION SUMMARY');
  console.log('===================');
  console.log(`Total files processed: ${processedFiles}`);
  console.log(`Static translation keys found: ${staticKeys.length}`);
  console.log(`Dynamic key patterns found: ${dynamicKeys.length}`);
  
  if (staticKeys.length > 0) {
    console.log('\n🔤 Sample static keys:');
    staticKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (staticKeys.length > 10) {
      console.log(`  ... and ${staticKeys.length - 10} more`);
    }
  }
  
  if (dynamicKeys.length > 0) {
    console.log('\n⚠️  Dynamic key patterns found:');
    dynamicKeys.slice(0, 5).forEach(item => {
      const relativePath = item.file.replace(PROJECT_ROOT, '.');
      console.log(`  - ${relativePath}:${item.line} → ${item.pattern}`);
    });
    if (dynamicKeys.length > 5) {
      console.log(`  ... and ${dynamicKeys.length - 5} more`);
    }
  }
  
  return report;
}

/**
 * Save results to files
 */
function saveResults(report) {
  const outputDir = join(PROJECT_ROOT, 'scripts');
  
  // Save extracted keys
  const keysPath = join(outputDir, 'extracted-keys.json');
  writeFileSync(keysPath, JSON.stringify(report.staticKeys, null, 2));
  console.log(`\n💾 Static keys saved to: ${keysPath}`);
  
  // Save dynamic key report
  const dynamicReportPath = join(outputDir, 'dynamic-keys-report.json');
  writeFileSync(dynamicReportPath, JSON.stringify({
    summary: report.summary,
    dynamicKeys: report.dynamicKeys
  }, null, 2));
  console.log(`💾 Dynamic keys report saved to: ${dynamicReportPath}`);
  
  // Save complete report
  const reportPath = join(outputDir, 'i18n-audit-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`💾 Complete report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting i18n translation key extraction...\n');
  
  try {
    const extractedData = extractAllTranslationKeys();
    const report = generateReport(extractedData);
    saveResults(report);
    
    console.log('\n✅ Translation key extraction completed successfully!');
    
    if (report.dynamicKeys.length > 0) {
      console.log('\n⚠️  Note: Dynamic key patterns were detected. Review the dynamic-keys-report.json');
      console.log('   to ensure these are handled properly in your application.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during extraction:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractAllTranslationKeys, findSourceFiles, extractKeysFromFile };