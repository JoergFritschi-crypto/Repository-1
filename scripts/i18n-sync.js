#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root directory
const PROJECT_ROOT = join(__dirname, '..');

// Supported locales
const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'pl'];

// Path to translation files
const getTranslationPath = (locale) => 
  join(PROJECT_ROOT, 'client', 'src', 'locales', locale, 'translation.json');

// Path to extracted keys
const EXTRACTED_KEYS_PATH = join(PROJECT_ROOT, 'scripts', 'extracted-keys.json');

/**
 * Convert a dot-notation key to a humanized default value
 */
function humanizeKey(key) {
  // Split on dots and take the last part as the main term
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase/kebab-case/snake_case to words
  let words = lastPart
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
    .replace(/[-_]/g, ' ')              // kebab-case and snake_case
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0);
  
  // Capitalize first letter of each word
  words = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
  
  // Handle common patterns
  const humanized = words.join(' ');
  
  // Add context-based improvements
  if (key.includes('button') || key.includes('btn')) {
    return humanized.replace(/\b(Button|Btn)\b/gi, '').trim() || humanized;
  }
  
  if (key.includes('label')) {
    return humanized.replace(/\bLabel\b/gi, '').trim() || humanized;
  }
  
  if (key.includes('title')) {
    return humanized.replace(/\bTitle\b/gi, '').trim() || humanized;
  }
  
  if (key.includes('placeholder')) {
    return `Enter ${humanized.replace(/\bPlaceholder\b/gi, '').trim().toLowerCase()}`;
  }
  
  // Default case
  return humanized || key;
}

/**
 * Flatten a nested object to dot notation
 */
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, fullKey));
    } else {
      // Add leaf values
      flattened[fullKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Unflatten a dot notation object back to nested structure
 */
function unflattenObject(flatObj) {
  const unflattened = {};
  
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = unflattened;
    
    // Navigate/create the nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the value at the leaf
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }
  
  return unflattened;
}

/**
 * Load extracted translation keys
 */
function loadExtractedKeys() {
  if (!existsSync(EXTRACTED_KEYS_PATH)) {
    throw new Error(`Extracted keys file not found: ${EXTRACTED_KEYS_PATH}`);
  }
  
  try {
    const keysData = readFileSync(EXTRACTED_KEYS_PATH, 'utf-8');
    const keys = JSON.parse(keysData);
    
    if (!Array.isArray(keys)) {
      throw new Error('Extracted keys file should contain an array of keys');
    }
    
    return keys;
  } catch (error) {
    throw new Error(`Failed to load extracted keys: ${error.message}`);
  }
}

/**
 * Load existing translations for a locale
 */
function loadTranslations(locale) {
  const translationPath = getTranslationPath(locale);
  
  if (!existsSync(translationPath)) {
    console.warn(`Translation file not found for ${locale}: ${translationPath}`);
    return {};
  }
  
  try {
    const data = readFileSync(translationPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error.message);
    return {};
  }
}

/**
 * Save translations for a locale
 */
function saveTranslations(locale, translations) {
  const translationPath = getTranslationPath(locale);
  
  try {
    // Format JSON with proper indentation
    const jsonString = JSON.stringify(translations, null, 2) + '\n';
    writeFileSync(translationPath, jsonString);
    return true;
  } catch (error) {
    console.error(`Failed to save translations for ${locale}:`, error.message);
    return false;
  }
}

/**
 * Analyze missing keys across all locales
 */
function analyzeMissingKeys(extractedKeys) {
  const analysis = {
    extractedKeys: extractedKeys,
    localeAnalysis: {},
    missingKeys: new Set(),
    totalMissingKeys: 0
  };
  
  console.log('🔍 Analyzing translation coverage...\n');
  
  for (const locale of SUPPORTED_LOCALES) {
    console.log(`📋 Analyzing ${locale.toUpperCase()}...`);
    
    const translations = loadTranslations(locale);
    const flatTranslations = flattenObject(translations);
    const existingKeys = new Set(Object.keys(flatTranslations));
    
    const missingInLocale = extractedKeys.filter(key => !existingKeys.has(key));
    const extraInLocale = Array.from(existingKeys).filter(key => !extractedKeys.includes(key));
    
    analysis.localeAnalysis[locale] = {
      totalKeys: existingKeys.size,
      missingKeys: missingInLocale,
      extraKeys: extraInLocale,
      coveragePercent: ((existingKeys.size - missingInLocale.length) / extractedKeys.length * 100).toFixed(1)
    };
    
    // Add to global missing keys set
    missingInLocale.forEach(key => analysis.missingKeys.add(key));
    
    console.log(`  ✓ Existing keys: ${existingKeys.size}`);
    console.log(`  ❌ Missing keys: ${missingInLocale.length}`);
    console.log(`  📊 Coverage: ${analysis.localeAnalysis[locale].coveragePercent}%`);
    
    if (extraInLocale.length > 0) {
      console.log(`  ⚠️  Extra keys (not used): ${extraInLocale.length}`);
    }
    
    console.log('');
  }
  
  analysis.totalMissingKeys = analysis.missingKeys.size;
  analysis.missingKeys = Array.from(analysis.missingKeys).sort();
  
  return analysis;
}

/**
 * Sync missing keys to all translation files
 */
function syncTranslations(analysis) {
  console.log('🔄 Starting translation sync...\n');
  
  const { missingKeys } = analysis;
  let syncedLocales = 0;
  let totalKeysAdded = 0;
  
  // Load English translations as the primary source
  const enTranslations = loadTranslations('en');
  const flatEnTranslations = flattenObject(enTranslations);
  
  for (const locale of SUPPORTED_LOCALES) {
    console.log(`🌐 Syncing ${locale.toUpperCase()}...`);
    
    const currentTranslations = loadTranslations(locale);
    const flatCurrentTranslations = flattenObject(currentTranslations);
    
    let keysAddedToLocale = 0;
    
    // Add missing keys
    for (const missingKey of missingKeys) {
      if (!flatCurrentTranslations.hasOwnProperty(missingKey)) {
        let translationValue;
        
        if (locale === 'en') {
          // For English, create a humanized version
          translationValue = humanizeKey(missingKey);
        } else {
          // For other locales, use English fallback if available, otherwise humanize
          translationValue = flatEnTranslations[missingKey] || humanizeKey(missingKey);
        }
        
        flatCurrentTranslations[missingKey] = translationValue;
        keysAddedToLocale++;
      }
    }
    
    // Convert back to nested structure and save
    const nestedTranslations = unflattenObject(flatCurrentTranslations);
    const success = saveTranslations(locale, nestedTranslations);
    
    if (success) {
      syncedLocales++;
      totalKeysAdded += keysAddedToLocale;
      console.log(`  ✅ Added ${keysAddedToLocale} missing keys`);
    } else {
      console.log(`  ❌ Failed to sync translations`);
    }
  }
  
  console.log(`\n📊 SYNC SUMMARY:`);
  console.log(`  Locales synced: ${syncedLocales}/${SUPPORTED_LOCALES.length}`);
  console.log(`  Total keys added: ${totalKeysAdded}`);
  
  return {
    syncedLocales,
    totalKeysAdded,
    success: syncedLocales === SUPPORTED_LOCALES.length
  };
}

/**
 * Generate final report
 */
function generateSyncReport(analysis, syncResult) {
  const report = {
    timestamp: new Date().toISOString(),
    extractedKeysCount: analysis.extractedKeys.length,
    totalMissingKeys: analysis.totalMissingKeys,
    syncResult: syncResult,
    localeDetails: analysis.localeAnalysis,
    addedKeys: analysis.missingKeys
  };
  
  const reportPath = join(PROJECT_ROOT, 'scripts', 'i18n-sync-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Sync report saved to: ${reportPath}`);
  
  return report;
}

/**
 * Display final summary
 */
function displaySummary(analysis, syncResult) {
  console.log('\n🎉 I18N SYNC COMPLETED!');
  console.log('====================');
  
  if (analysis.totalMissingKeys === 0) {
    console.log('✅ Perfect! No missing translation keys found.');
  } else {
    console.log(`📈 Fixed ${analysis.totalMissingKeys} missing translation keys across all locales`);
  }
  
  console.log(`🌐 Supported locales: ${SUPPORTED_LOCALES.join(', ')}`);
  console.log(`📊 Total translation keys in codebase: ${analysis.extractedKeys.length}`);
  
  if (syncResult.success) {
    console.log('✅ All locale files updated successfully');
  } else {
    console.log('⚠️  Some locale files may have update issues - check the logs above');
  }
  
  console.log('\n🔍 Next steps:');
  console.log('  1. Review the added keys in your translation files');
  console.log('  2. Improve auto-generated translations as needed');
  console.log('  3. Test your application to ensure all keys display correctly');
  console.log('  4. Run the audit script again to verify 100% coverage');
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting i18n translation sync...\n');
  
  try {
    // Load extracted keys
    const extractedKeys = loadExtractedKeys();
    console.log(`📋 Loaded ${extractedKeys.length} extracted translation keys`);
    
    // Analyze current state
    const analysis = analyzeMissingKeys(extractedKeys);
    
    if (analysis.totalMissingKeys === 0) {
      console.log('🎉 Excellent! All translation keys are already present in all locales.');
      displaySummary(analysis, { success: true, totalKeysAdded: 0, syncedLocales: SUPPORTED_LOCALES.length });
      return;
    }
    
    console.log(`🔧 Found ${analysis.totalMissingKeys} missing keys to sync\n`);
    
    // Perform sync
    const syncResult = syncTranslations(analysis);
    
    // Generate report
    generateSyncReport(analysis, syncResult);
    
    // Display summary
    displaySummary(analysis, syncResult);
    
  } catch (error) {
    console.error('\n❌ Error during sync:', error.message);
    process.exit(1);
  }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeMissingKeys, syncTranslations, flattenObject, unflattenObject, humanizeKey };