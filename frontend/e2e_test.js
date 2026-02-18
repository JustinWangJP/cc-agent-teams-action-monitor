const { chromium } = require('playwright');

(async () => {
    console.log('Starting E2E test for Chat Timeline UI...');
    
    // Launch browser
    const browser = await chromium.launch({
        headless: true
    });
    
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });
    
    const page = await context.newPage();
    
    // Test results
    const results = [];
    
    function recordTest(tcId, name, passed, details = '') {
        results.push({ tcId, name, passed, details });
        console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tcId}: ${name} - ${details}`);
    }
    
    try {
        // TC-001: Navigate to page
        console.log('\n=== TC-001: Page Load ===');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const title = await page.title();
        recordTest('TC-001', 'ページ読み込み', 
            title === 'Agent Teams Dashboard',
            `Title: ${title}`
        );
        
        // TC-002: Check tabs exist
        console.log('\n=== TC-002: Tab Elements ===');
        const tabs = await page.$$('button[role="tab"]');
        recordTest('TC-002', 'タブボタンが存在する',
            tabs.length >= 5,
            `Found ${tabs.length} tabs`
        );
        
        // Get tab names
        const tabNames = [];
        for (const tab of tabs) {
            const text = await tab.textContent();
            if (text) tabNames.push(text.trim());
        }
        console.log('Tab names:', tabNames);
        
        // TC-003: Timeline tab exists
        console.log('\n=== TC-003: Timeline Tab ===');
        const hasTimelineTab = tabNames.some(name => name.includes('タイムライン'));
        recordTest('TC-003', 'タイムラインタブが存在する',
            hasTimelineTab,
            `Tab names: ${tabNames.join(', ')}`
        );
        
        // TC-004: Click timeline tab
        console.log('\n=== TC-004: Click Timeline Tab ===');
        let timelineTab = null;
        for (const tab of tabs) {
            const text = await tab.textContent();
            if (text && text.includes('タイムライン')) {
                timelineTab = tab;
                break;
            }
        }
        
        if (timelineTab) {
            await timelineTab.click();
            await page.waitForTimeout(2000);
            recordTest('TC-004', 'タイムラインタブをクリック',
                true,
                'Clicked successfully'
            );
        } else {
            recordTest('TC-004', 'タイムラインタブをクリック',
                false,
                'Timeline tab not found'
            );
        }
        
        // TC-005: Check team selector
        console.log('\n=== TC-005: Team Selector ===');
        const teamSelector = await page.$('select');
        const hasTeamSelector = teamSelector !== null;
        recordTest('TC-005', 'チームセレクターが表示される',
            hasTeamSelector,
            hasTeamSelector ? 'Team selector found' : 'Team selector not found'
        );
        
        // TC-006: Get team options
        console.log('\n=== TC-006: Team Options ===');
        let teamOptions = [];
        if (hasTeamSelector) {
            const options = await page.$$('select option');
            for (const opt of options) {
                const text = await opt.textContent();
                const value = await opt.getAttribute('value');
                if (text && value) {
                    teamOptions.push({ text: text.trim(), value });
                }
            }
            console.log('Team options:', teamOptions.map(o => o.text).join(', '));
        }
        
        recordTest('TC-006', 'チーム選択肢が存在する',
            teamOptions.length > 1,
            `Found ${teamOptions.length} teams`
        );
        
        // TC-007: Select a team
        console.log('\n=== TC-007: Select Team ===');
        let selectedTeam = null;
        if (teamOptions.length > 1) {
            // Select the first non-empty team
            for (const opt of teamOptions) {
                if (opt.value && opt.value !== '') {
                    await page.select('select', opt.value);
                    selectedTeam = opt.value;
                    await page.waitForTimeout(3000);
                    break;
                }
            }
        }
        
        recordTest('TC-007', 'チームを選択できる',
            selectedTeam !== null,
            `Selected: ${selectedTeam || 'None'}`
        );
        
        // TC-008: Check for messages/timeline content
        console.log('\n=== TC-008: Message Display ===');
        const pageText = await page.textContent('body');
        const hasMessages = pageText && (
            pageText.includes('メッセージタイムライン') ||
            pageText.includes('Message Timeline') ||
            pageText.includes('タイムラインを表示')
        );
        
        recordTest('TC-008', 'タイムラインコンテンツが表示される',
            hasMessages,
            hasMessages ? 'Timeline content found' : 'No timeline content'
        );
        
        // TC-009: Check for search box
        console.log('\n=== TC-009: Search Box ===');
        const searchInput = await page.$('input[type="text"]');
        recordTest('TC-009', '検索ボックスが存在する',
            searchInput !== null,
            searchInput ? 'Search input found' : 'Search input not found'
        );
        
        // TC-010: Check for PollingIntervalSelector
        console.log('\n=== TC-010: Polling Control ===');
        const hasPollingControl = pageText && pageText.includes('更新間隔');
        recordTest('TC-010', '更新間隔コントロールが存在する',
            hasPollingControl,
            hasPollingControl ? 'Polling control found' : 'Not found'
        );
        
        // Take final screenshot
        await page.screenshot({ 
            path: '/tmp/e2e_final.png', 
            fullPage: true 
        });
        console.log('\nScreenshot saved: /tmp/e2e_final.png');
        
    } catch (error) {
        console.error('Error during test:', error);
        recordTest('ERROR', 'Test execution', false, error.message);
    }
    
    // Print summary
    console.log('\n=== Test Summary ===');
    const pass = results.filter(r => r.passed).length;
    const fail = results.filter(r => !r.passed).length;
    console.log(`Pass: ${pass}/${results.length}`);
    console.log(`Fail: ${fail}/${results.length}`);
    console.log(`Rate: ${(pass * 100 / results.length).toFixed(1)}%`);
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('/tmp/e2e_results.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        pass,
        fail,
        total: results.length,
        passRate: (pass * 100 / results.length).toFixed(1),
        results
    }, null, 2));
    
    console.log('\nResults saved to /tmp/e2e_results.json');
    
    await browser.close();
    
    // Exit with appropriate code
    process.exit(fail > 0 ? 1 : 0);
})();
