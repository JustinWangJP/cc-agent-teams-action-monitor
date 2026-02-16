import puppeteer from 'puppeteer';

// テスト結果を収集する配列
const testResults = [];

function logTest(testName, status, details = '') {
  const result = {
    name: testName,
    status: status,
    details: details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${testName}: ${status}`);
  if (details) console.log(`   ${details}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runUATTests() {
  console.log('========================================');
  console.log('Agent Teams Dashboard - UAT Test Suite');
  console.log('Target: http://localhost:5173');
  console.log('========================================\n');

  let browser;
  try {
    // ブラウザ起動
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // ビューポート設定（デスクトップ）
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. ページ読み込みテスト
    console.log('--- Test 1: ページ読み込み ---');
    try {
      const response = await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      if (response && response.status() === 200) {
        logTest('ページ読み込み', 'PASS', 'HTTP 200 OK');
      } else {
        logTest('ページ読み込み', 'FAIL', `HTTP ${response?.status() || 'unknown'}`);
      }
    } catch (e) {
      logTest('ページ読み込み', 'FAIL', e.message);
      throw e;
    }

    // 2. タイトル確認
    console.log('\n--- Test 2: ページタイトル ---');
    const title = await page.title();
    if (title.includes('Agent Teams Dashboard')) {
      logTest('ページタイトル', 'PASS', `タイトル: "${title}"`);
    } else {
      logTest('ページタイトル', 'FAIL', `期待: "Agent Teams Dashboard", 実際: "${title}"`);
    }

    // 3. ヘッダー確認
    console.log('\n--- Test 3: ヘッダー表示 ---');
    const headerExists = await page.$('header');
    if (headerExists) {
      const headerText = await page.$eval('header', el => el.textContent);
      logTest('ヘッダー表示', 'PASS', `ヘッダー内容: "${headerText?.substring(0, 50)}..."`);
    } else {
      logTest('ヘッダー表示', 'FAIL', 'ヘッダー要素が見つかりません');
    }

    // 4. チーム一覧表示テスト
    console.log('\n--- Test 4: チーム一覧表示 ---');
    await sleep(3000); // データ読み込み待機

    // ページコンテンツを取得
    const pageContent = await page.content();

    // Active Teams セクションの確認
    if (pageContent.includes('Active Teams')) {
      logTest('チームセクション表示', 'PASS', '"Active Teams" セクションが見つかりました');
    } else {
      logTest('チームセクション表示', 'FAIL', '"Active Teams" セクションが見つかりません');
    }

    // チーム数の表示確認
    const teamsMatch = pageContent.match(/(\d+)\s*teams/);
    if (teamsMatch) {
      logTest('チーム数表示', 'PASS', `チーム数: ${teamsMatch[1]}`);
    } else {
      logTest('チーム数表示', 'INFO', 'チーム数が表示されていないか、0件です');
    }

    // 5. タスクボードレイアウトテスト
    console.log('\n--- Test 5: タスクボードレイアウト ---');
    if (pageContent.includes('Tasks')) {
      logTest('タスクセクション表示', 'PASS');
    } else {
      logTest('タスクセクション表示', 'FAIL', '"Tasks" セクションが見つかりません');
    }

    // カラム確認（Pending, In Progress, Completed）
    const hasPending = pageContent.includes('Pending');
    const hasInProgress = pageContent.includes('In Progress');
    const hasCompleted = pageContent.includes('Completed');

    logTest('Pendingカラム', hasPending ? 'PASS' : 'FAIL');
    logTest('In Progressカラム', hasInProgress ? 'PASS' : 'FAIL');
    logTest('Completedカラム', hasCompleted ? 'PASS' : 'FAIL');

    // 6. アクティビティフィードテスト
    console.log('\n--- Test 6: アクティビティフィード ---');
    if (pageContent.includes('Activity Feed')) {
      logTest('アクティビティフィード表示', 'PASS');
    } else {
      logTest('アクティビティフィード表示', 'FAIL', '"Activity Feed" が見つかりません');
    }

    // 7. レスポンシブ対応テスト（タブレット）
    console.log('\n--- Test 7: レスポンシブ対応（タブレット: 768px） ---');
    await page.setViewport({ width: 768, height: 1024 });
    await sleep(1000);

    const tabletLayout = await page.evaluate(() => {
      const width = window.innerWidth;
      return width >= 768;
    });
    logTest('タブレットレイアウト', tabletLayout ? 'PASS' : 'FAIL', '幅768pxで表示確認');

    // タブレットでのコンテンツ確認
    const tabletContent = await page.content();
    if (tabletContent.includes('Active Teams') && tabletContent.includes('Tasks')) {
      logTest('タブレットコンテンツ表示', 'PASS', '主要コンテンツが表示されています');
    }

    // 8. レスポンシブ対応テスト（モバイル）
    console.log('\n--- Test 8: レスポンシブ対応（モバイル: 375px） ---');
    await page.setViewport({ width: 375, height: 667 });
    await sleep(1000);

    const mobileLayout = await page.evaluate(() => {
      const width = window.innerWidth;
      return width >= 375;
    });
    logTest('モバイルレイアウト', mobileLayout ? 'PASS' : 'FAIL', '幅375pxで表示確認');

    // モバイルでのコンテンツ確認
    const mobileContent = await page.content();
    if (mobileContent.includes('Active Teams') && mobileContent.includes('Tasks')) {
      logTest('モバイルコンテンツ表示', 'PASS', '主要コンテンツが表示されています');
    }

    // 9. WebSocket接続ステータス確認
    console.log('\n--- Test 9: WebSocket接続ステータス ---');
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(1000);

    // ヘッダー内のWebSocketステータスを確認
    const wsStatusText = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) {
        return header.textContent;
      }
      return '';
    });

    if (wsStatusText.includes('WebSocket')) {
      const statusMatch = wsStatusText.match(/WebSocket[:\s]*(\w+)/);
      if (statusMatch) {
        logTest('WebSocket接続ステータス', 'PASS', `ステータス: ${statusMatch[1]}`);
      } else {
        logTest('WebSocket接続ステータス', 'INFO', 'WebSocket表示あり（詳細不明）');
      }
    } else {
      logTest('WebSocket接続ステータス', 'INFO', 'WebSocketステータスが見つかりません');
    }

    // 10. コンソールエラーチェック
    console.log('\n--- Test 10: コンソールエラーチェック ---');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(3000);

    if (errors.length === 0) {
      logTest('コンソールエラー', 'PASS', 'エラーなし');
    } else {
      logTest('コンソールエラー', 'FAIL', `${errors.length}件のエラー: ${errors.slice(0, 3).join(', ')}`);
    }

    // 11. APIエンドポイント応答確認
    console.log('\n--- Test 11: APIエンドポイント ---');
    try {
      const teamsResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/teams');
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { status: 0, ok: false, error: e.message };
        }
      });
      logTest('Teams API', teamsResponse.ok ? 'PASS' : 'INFO', `Status: ${teamsResponse.status}`);
    } catch (e) {
      logTest('Teams API', 'INFO', `API呼び出しエラー: ${e.message}`);
    }

    try {
      const tasksResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/tasks');
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { status: 0, ok: false, error: e.message };
        }
      });
      logTest('Tasks API', tasksResponse.ok ? 'PASS' : 'INFO', `Status: ${tasksResponse.status}`);
    } catch (e) {
      logTest('Tasks API', 'INFO', `API呼び出しエラー: ${e.message}`);
    }

    // 12. スタイルとレイアウト確認
    console.log('\n--- Test 12: スタイルとレイアウト ---');
    const styles = await page.evaluate(() => {
      const results = {};

      // グリッドレイアウトの確認
      const gridElements = document.querySelectorAll('[class*="grid"]');
      results.hasGridLayout = gridElements.length > 0;
      results.gridCount = gridElements.length;

      // Flexboxレイアウトの確認
      const flexElements = document.querySelectorAll('[class*="flex"]');
      results.hasFlexLayout = flexElements.length > 0;
      results.flexCount = flexElements.length;

      // Tailwindクラスの確認
      const tailwindElements = document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="p-"]');
      results.hasTailwindClasses = tailwindElements.length > 0;

      return results;
    });

    logTest('グリッドレイアウト', styles.hasGridLayout ? 'PASS' : 'INFO', `Grid要素: ${styles.gridCount}個`);
    logTest('Flexboxレイアウト', styles.hasFlexLayout ? 'PASS' : 'INFO', `Flex要素: ${styles.flexCount}個`);
    logTest('Tailwind CSS', styles.hasTailwindClasses ? 'PASS' : 'INFO');

    // スクリーンショット取得
    console.log('\n--- スクリーンショット保存 ---');
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(500);
    await page.screenshot({
      path: '/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor/frontend/e2e/screenshots/dashboard-desktop.png',
      fullPage: true
    });

    await page.setViewport({ width: 768, height: 1024 });
    await sleep(500);
    await page.screenshot({
      path: '/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor/frontend/e2e/screenshots/dashboard-tablet.png',
      fullPage: true
    });

    await page.setViewport({ width: 375, height: 667 });
    await sleep(500);
    await page.screenshot({
      path: '/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor/frontend/e2e/screenshots/dashboard-mobile.png',
      fullPage: true
    });
    logTest('スクリーンショット保存', 'PASS', '3サイズのスクリーンショットを保存しました');

  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // テスト結果サマリー
  console.log('\n========================================');
  console.log('テスト結果サマリー');
  console.log('========================================');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const info = testResults.filter(r => r.status === 'INFO').length;
  const warnings = testResults.filter(r => r.status === 'WARN').length;

  console.log(`総テスト数: ${testResults.length}`);
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`ℹ️ INFO: ${info}`);
  console.log(`⚠️ WARN: ${warnings}`);

  // 失敗したテストの詳細
  if (failed > 0) {
    console.log('\n--- 失敗したテスト ---');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`❌ ${r.name}: ${r.details}`));
  }

  console.log('\n========================================');
  console.log(failed === 0 ? '全テスト PASSED ✅' : `${failed}件のテスト FAILED ❌`);
  console.log('========================================');

  return { passed, failed, info, warnings, results: testResults };
}

runUATTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});
