#!/usr/bin/env node
/**
 * Performance Audit Script
 * Runs Lighthouse audit and checks against optimization targets
 * 
 * Usage: node scripts/performance-audit.js [url]
 * Default URL: http://localhost:3000
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.argv[2] || 'http://localhost:3000';

// Performance targets from optimization plan
const TARGETS = {
    FCP: 1500,      // First Contentful Paint < 1.5s
    TTI: 3000,      // Time to Interactive < 3s
    LCP: 2500,      // Largest Contentful Paint < 2.5s
    CLS: 0.1,       // Cumulative Layout Shift < 0.1
    SCORE: 90       // Lighthouse Performance Score > 90
};

console.log('🚀 MambaX Performance Audit');
console.log('===========================\n');
console.log(`Target URL: ${TARGET_URL}`);
console.log(`\nTargets:`);
console.log(`  - FCP < ${TARGETS.FCP}ms`);
console.log(`  - TTI < ${TARGETS.TTI}ms`);
console.log(`  - LCP < ${TARGETS.LCP}ms`);
console.log(`  - CLS < ${TARGETS.CLS}`);
console.log(`  - Score > ${TARGETS.SCORE}\n`);

// Create reports directory
const reportsDir = path.join(__dirname, '..', 'lighthouse-reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportsDir, `report-${timestamp}.json`);
const htmlReportPath = path.join(reportsDir, `report-${timestamp}.html`);

try {
    console.log('Running Lighthouse audit...\n');
    
    // Run Lighthouse
    execSync(
        `npx lighthouse "${TARGET_URL}" --output=json,html --output-path="${reportPath.replace('.json', '')}" --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo`,
        { stdio: 'inherit' }
    );
    
    // Parse results
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const audits = report.audits;
    const categories = report.categories;
    
    console.log('\n📊 Results:');
    console.log('===========\n');
    
    // Extract metrics
    const fcp = audits['first-contentful-paint']?.numericValue || 0;
    const tti = audits['interactive']?.numericValue || 0;
    const lcp = audits['largest-contentful-paint']?.numericValue || 0;
    const cls = audits['cumulative-layout-shift']?.numericValue || 0;
    const perfScore = (categories.performance?.score || 0) * 100;
    
    // Check against targets
    const results = [
        { name: 'FCP', value: Math.round(fcp), target: TARGETS.FCP, unit: 'ms', pass: fcp < TARGETS.FCP },
        { name: 'TTI', value: Math.round(tti), target: TARGETS.TTI, unit: 'ms', pass: tti < TARGETS.TTI },
        { name: 'LCP', value: Math.round(lcp), target: TARGETS.LCP, unit: 'ms', pass: lcp < TARGETS.LCP },
        { name: 'CLS', value: cls.toFixed(3), target: TARGETS.CLS, unit: '', pass: cls < TARGETS.CLS },
        { name: 'Score', value: Math.round(perfScore), target: TARGETS.SCORE, unit: '', pass: perfScore >= TARGETS.SCORE },
    ];
    
    results.forEach(r => {
        const status = r.pass ? '✅' : '❌';
        const comparison = r.name === 'Score' ? '>=' : '<';
        console.log(`${status} ${r.name}: ${r.value}${r.unit} (target: ${comparison} ${r.target}${r.unit})`);
    });
    
    // Category scores
    console.log('\n📈 Category Scores:');
    console.log('-------------------');
    Object.entries(categories).forEach(([key, cat]) => {
        const score = Math.round((cat.score || 0) * 100);
        const status = score >= 90 ? '✅' : score >= 50 ? '⚠️' : '❌';
        console.log(`${status} ${cat.title}: ${score}`);
    });
    
    // Summary
    const passCount = results.filter(r => r.pass).length;
    const totalCount = results.length;
    
    console.log(`\n📋 Summary: ${passCount}/${totalCount} targets met`);
    console.log(`\n📁 Full report: ${htmlReportPath}`);
    
    if (passCount === totalCount) {
        console.log('\n🎉 All performance targets achieved!');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some targets not met. Review the full report for optimization suggestions.');
        process.exit(1);
    }
    
} catch (error) {
    console.error('❌ Audit failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. The target URL is accessible');
    console.log('2. Chrome/Chromium is installed');
    console.log('3. Run: npm install -g lighthouse');
    process.exit(1);
}
