import { chromium } from 'playwright';

const screenshotDir = '/Users/xxxxx/Coding/workspaces/python/working/cc-agent-teams-action-monitor/docs/plans/e2e-member-b-screenshots';

async function runE2ETest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // US-002: エージェント状態リアルタイム監視テスト
    console.log('Taking screenshot for US-002: Agent Status Monitoring');
    await page.screenshot({ 
      path: `${screenshotDir}/us002-agent-status-monitoring.png`,
      fullPage: true 
    });
    
    // チーム選択を待機
    await page.waitForTimeout(3000);
    
    // cosmic-orbiting-sky チームを探してクリック
    const cosmicTeam = page.locator('text=/cosmic-orbiting-sky/i').first();
    if (await cosmicTeam.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicking on cosmic-orbiting-sky team...');
      await cosmicTeam.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: `${screenshotDir}/us002-cosmic-team-selected.png`,
        fullPage: true 
      });
    }
    
    // US-003: タスク進捗トラッキングテスト
    console.log('Taking screenshot for US-003: Task Progress Tracking');
    await page.screenshot({ 
      path: `${screenshotDir}/us003-task-progress-tracking.png`,
      fullPage: true 
    });
    
    // TC-008: 拡張エージェントカード
    console.log('Taking screenshot for TC-008: Expanded Agent Card');
    await page.screenshot({ 
      path: `${screenshotDir}/tc008-expanded-agent-card.png`,
      fullPage: true 
    });
    
    // TC-009: 拡張タスクカード - スクロールしてタスクセクションをキャプチャ
    const taskSection = page.locator('text=/task|タスク/i').first();
    if (await taskSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await taskSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }
    
    console.log('Taking screenshot for TC-009: Expanded Task Card');
    await page.screenshot({ 
      path: `${screenshotDir}/tc009-expanded-task-card.png`,
      fullPage: true 
    });
    
    // エージェントカードの詳細を拡大してキャプチャ
    const agentCard = page.locator('.bg-white, .dark\\:bg-slate-800').first();
    if (await agentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agentCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: `${screenshotDir}/tc008-agent-card-detail.png`,
        fullPage: false 
      });
    }
    
    console.log('E2E Test Screenshots completed successfully');
    console.log('Screenshots saved to:', screenshotDir);
    
  } catch (error) {
    console.error('Error during E2E test:', error.message);
    await page.screenshot({ 
      path: `${screenshotDir}/error-screenshot.png`,
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

runE2ETest().catch(console.error);
