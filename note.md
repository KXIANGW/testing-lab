# 軟體測試作業報告

---

## 一、後端測試（Backend Unit Tests）

### 測試環境

| 項目 | 版本 |
|------|------|
| Node.js | v20.20.2 |
| npm | 10.8.2 |
| Vitest | ^4.1.2 |
| TypeScript | ^5.8.2 |
| OS | Ubuntu 22.04 / Linux |

### 環境建置指令

```bash
# 切換 Node 版本（使用 nvm）
nvm use 20

# 進入後端目錄並安裝依賴
cd backend
npm install
```

### 測試指令

```bash
# 執行所有測試（含覆蓋率報告）
npm test
# 等同於：npx vitest run --coverage

# 執行測試並顯示每個 test case 的詳細結果
npx vitest run --reporter=verbose

# 開發時監聽模式（存檔即自動重跑）
npx vitest
```

### 使用的測試工具

**Vitest v4.1.2** + **@vitest/coverage-v8**

Vitest 是專為 Vite 生態系設計的測試框架，語法與 Jest 相容。搭配 `@vitest/coverage-v8` 可在測試完成後產生程式碼覆蓋率報告，以數值量化測試的涵蓋程度。`vi.spyOn` 是 Vitest 內建的 mock 工具，可攔截函式呼叫並控制回傳值，用於隔離外部依賴（如資料庫）。

---

### 測試一：數學工具函式測試（`test/utils.test.ts`）

#### 程式碼片段

```typescript
import { describe, test, expect, it } from 'vitest'
import { myCustomAdd, fabonacci } from '../src/utils/math'

describe('math utils testing', () => {
  describe('fabonacci testing', () => {
    it('should return 1 when n is 1', () => {
      // arrange
      const n = 1
      // act
      const actual = fabonacci(n)
      // assert
      expect(actual).toBe(1)
    })
    it('should return 1 when n is 2', () => {
      // arrange
      const n = 2
      // act
      const actual = fabonacci(n)
      // assert
      expect(actual).toBe(1)
    })
    it('should return 2 when n is 3', () => {
      // arrange
      const n = 3
      // act
      const actual = fabonacci(n)
      // assert
      expect(actual).toBe(2)
    })
  })
})
```

#### 測試策略

| 項目 | 說明 |
|------|------|
| **測試主體** | `src/utils/math.ts` 中的 `fabonacci(n)` 函式 |
| **測試場景** | 驗證費氏數列在邊界條件（n=1, n=2）與基本遞迴案例（n=3）的正確性 |
| **預期結果** | `fabonacci(1)=1`、`fabonacci(2)=1`、`fabonacci(3)=2` |
| **想驗證的事** | 遞迴實作是否符合費氏數列定義：`f(1)=f(2)=1`，`f(n)=f(n-1)+f(n-2)` |
| **測試策略** | 純函式單元測試，無外部依賴，採 Arrange-Act-Assert 三段式結構 |

---

### 測試二：Todo API 路由測試（`test/todo.spec.ts`）

原始檔案中已有 GET 的兩個測試骨架（無需修改）。此 commit 補實作了原本空白的 PUT 兩個骨架，並新增 POST 與 DELETE 共五個 test case。

#### 程式碼片段

```typescript
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { serverOf } from '../src/server'
import * as TodoRepo from '../src/repo/todo'
import { FastifyInstance } from 'fastify'
import { Todo } from '../src/types/todo'

describe('Todo API Testing', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = serverOf()
    await server.ready()
  })

  afterAll(async () => { await server.close() })
  afterEach(() => { vi.resetAllMocks() })

  // PUT 成功（Happy Path）— 原有骨架，本次補實作
  test('Given a valid ID and status, When receive a PUT /api/v1/todos/:id request, Then it should response the updated todo object', async () => {
    // arrange: mock repo 直接回傳預期物件，不真正連接資料庫
    const updatedTodo: Todo = { id: '1', name: 'todo 1', description: 'description 1', status: true }
    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => updatedTodo)

    // act: 用 server.inject 模擬 HTTP 請求
    const response = await server.inject({
      method: 'PUT', url: '/api/v1/todos/1', payload: { status: true }
    })

    // assert
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)['todo']).toStrictEqual(updatedTodo)
  })

  // PUT 找不到（Edge Case）— 原有骨架，本次補實作
  test('Given an invalid ID, When receive a PUT /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock 回傳 null，模擬資料庫找不到該筆記錄
    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => null)

    // act
    const response = await server.inject({
      method: 'PUT', url: '/api/v1/todos/-1', payload: { status: true }
    })

    // assert
    expect(response.statusCode).toBe(404)
  })

  // POST 新增成功（新增）
  test('Given a valid todo body, When receive a POST /api/v1/todos request, Then it should response the created todo object with status code 201', async () => {
    // arrange
    const newTodo: Todo = { id: '3', name: 'todo 3', description: 'description 3', status: false }
    vi.spyOn(TodoRepo, 'createTodo').mockImplementation(async () => newTodo)

    // act: id 由資料庫自動產生，payload 只帶 name 與 description
    const response = await server.inject({
      method: 'POST', url: '/api/v1/todos',
      payload: { name: 'todo 3', description: 'description 3' }
    })

    // assert
    expect(response.statusCode).toBe(201)
    expect(JSON.parse(response.body)['todo']).toStrictEqual(newTodo)
  })

  // DELETE 成功（新增）
  test('Given a valid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 204', async () => {
    // arrange
    const deletedTodo: Todo = { id: '1', name: 'todo 1', description: 'description 1', status: false }
    vi.spyOn(TodoRepo, 'deleteTodoById').mockImplementation(async () => deletedTodo as any)

    // act
    const response = await server.inject({ method: 'DELETE', url: '/api/v1/todos/1' })

    // assert: 204 No Content
    expect(response.statusCode).toBe(204)
  })

  // DELETE 找不到（新增）
  test('Given an invalid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock 回傳 null，模擬找不到資料
    vi.spyOn(TodoRepo, 'deleteTodoById').mockImplementation(async () => null as any)

    // act
    const response = await server.inject({ method: 'DELETE', url: '/api/v1/todos/-1' })

    // assert
    expect(response.statusCode).toBe(404)
  })
})
```

#### 測試策略

| 項目 | 說明 |
|------|------|
| **測試主體** | Fastify HTTP 路由層（`src/routes/todo.ts`）中的 PUT、POST、DELETE handler |
| **測試場景** | PUT（更新成功 / ID 不存在）、POST（新增成功）、DELETE（刪除成功 / ID 不存在），共 5 個 test case |
| **Mock 策略** | 用 `vi.spyOn` 攔截 `src/repo/todo.ts` 中對應的 repo 函式（`updateTodoById`、`createTodo`、`deleteTodoById`），讓測試不需要啟動 MongoDB |
| **預期結果** | 成功時回傳正確 HTTP 狀態碼（PUT:200、POST:201、DELETE:204）與對應 JSON body；找不到資源時回傳 404 |
| **想驗證的事** | 路由層在 repo 回傳正常值與 null 兩種情況下，是否給出正確的狀態碼與回應格式 |
| **隔離手段** | `afterEach` 呼叫 `vi.resetAllMocks()` 確保每個 test 的 mock 狀態不互相污染 |

#### 測試報告

```
 RUN  v4.1.2 /backend
      Coverage enabled with v8

 ✓ test/utils.test.ts > math utils testing > myCustomAdd testing > should return 3 when add 1 and 2
 ✓ test/utils.test.ts > math utils testing > myCustomAdd testing > should return 5 when add 2 and 3
 ✓ test/utils.test.ts > math utils testing > fabonacci testing > should return 1 when n is 1
 ✓ test/utils.test.ts > math utils testing > fabonacci testing > should return 1 when n is 2
 ✓ test/utils.test.ts > math utils testing > fabonacci testing > should return 2 when n is 3
 ✓ test/server.test.ts > Server Testing > Given a running server, When receive a GET /ping request, Then it should response with status code 200
 ✓ test/todo.spec.ts > Todo API Testing > When receive a GET /api/v1/todos request, Then it should response an array of todos
 ✓ test/todo.spec.ts > Todo API Testing > Given an empty array return from repo function, When receive a GET /api/v1/todos request, Then it should response an empty array
 ✓ test/todo.spec.ts > Todo API Testing > Given a valid ID and status, When receive a PUT /api/v1/todos/:id request, Then it should response the updated todo object
 ✓ test/todo.spec.ts > Todo API Testing > Given an invalid ID, When receive a PUT /api/v1/todos/:id request, Then it should response with status code 404
 ✓ test/todo.spec.ts > Todo API Testing > Given a valid todo body, When receive a POST /api/v1/todos request, Then it should response the created todo object with status code 201
 ✓ test/todo.spec.ts > Todo API Testing > Given a valid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 204
 ✓ test/todo.spec.ts > Todo API Testing > Given an invalid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 404

 Test Files  3 passed (3)
      Tests  13 passed (13)
   Duration  367ms

 % Coverage report from v8
--------------|---------|----------|---------|---------|------------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------|---------|----------|---------|---------|------------------------
All files     |   75.67 |      100 |      65 |   78.87 |
 src          |   58.33 |      100 |      50 |   58.33 | 19-26
  server.ts   |   58.33 |      100 |      50 |   58.33 |
 src/models   |     100 |      100 |     100 |     100 |
  todo.ts     |     100 |      100 |     100 |     100 |
 src/plugins  |      50 |      100 |       0 |     100 |
  mongodb.ts  |      50 |      100 |       0 |     100 |
 src/repo     |      50 |      100 |       0 |   66.66 | 11,14
  todo.ts     |      50 |      100 |       0 |   66.66 |
 src/routes   |   76.47 |      100 |     100 |   76.47 | 20,30-31,46-47,61-62
  todo.ts     |   76.47 |      100 |     100 |   76.47 |
 src/services |     100 |      100 |     100 |     100 |
  todo.ts     |     100 |      100 |     100 |     100 |
 src/utils    |     100 |      100 |     100 |     100 |
  math.ts     |     100 |      100 |     100 |     100 |
--------------|---------|----------|---------|---------|------------------------
```

> **覆蓋率說明**：`src/routes/todo.ts` 剩餘未覆蓋行（20, 30-31, 46-47, 61-62）均為各 route 的 `catch` 區塊（HTTP 500 錯誤情境），需要 mock 拋出 exception 才能觸發。`src/services` 與 `src/utils` 均達 100% 覆蓋率。

---

## 二、前端測試（Frontend E2E Tests）

### 測試環境

| 項目 | 版本 |
|------|------|
| Node.js | v20.20.2 |
| npm | 10.8.2 |
| Playwright | ^1.51.0 |
| Chromium | 145.0.7632.6 |
| OS | Ubuntu 22.04 / Linux |

### 環境建置指令

```bash
# 進入前端目錄並安裝依賴
cd frontend
npm install

# 安裝 Playwright 所需的瀏覽器（首次使用必須執行）
npx playwright install chromium
```

### 測試指令

```bash
# 執行所有 E2E 測試（headless，終端機看結果）
npm run test:e2e
# 等同於：npx playwright test

# 以 UI 介面執行（可視化 replay 每個操作步驟）
npm run test:ui
# 等同於：npx playwright test --ui

# 測試結束後開啟 HTML 報告
npx playwright show-report
```

### 使用的測試工具

**Playwright v1.51.0**

Playwright 是 Microsoft 開發的 End-to-End 測試框架，可控制真實瀏覽器（Chromium/Firefox/Safari）執行操作並驗證畫面結果。本專案使用 Chromium 引擎。`page.route()` 是 Playwright 的 Network Mock 機制，可攔截瀏覽器發出的 HTTP 請求並回傳預設資料，讓前端測試不依賴後端服務。

---

原始檔案中已有「新增 Todo」與「按鈕 disable 驗證」兩個測試（無需修改）。此 commit 新增了 **Complete** 與 **Delete** 兩個 test case。

### 測試程式碼片段（`frontend/tests/todo.spec.ts`）

```typescript
import { test, expect } from '@playwright/test';

test.describe('Todo Page', () => {
    const BASE_URL = 'http://localhost:5173';

    // 測試一：Complete 按鈕標記完成（出現刪除線）（新增）
    test('Given an existing todo, When click the Complete button, Then the todo name and description should have line-through style', async ({ page }) => {
        const existingTodo = { id: 'mock-id-1', name: 'Buy milk',
                               description: 'Go to the store and buy milk', status: false };

        // arrange: 初始 GET 回傳一筆未完成 todo
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET')
                await route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ todos: [existingTodo] }) });
        });
        await page.goto(BASE_URL);

        // mock PUT 回傳 status:true，後續 GET 回傳已完成狀態
        await page.route(`**/api/v1/todos/${existingTodo.id}`, async (route) => {
            if (route.request().method() === 'PUT')
                await route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ todo: { ...existingTodo, status: true } }) });
        });
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET')
                await route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ todos: [{ ...existingTodo, status: true }] }) });
        });

        // act
        await page.getByRole('button', { name: 'Complete' }).click();

        // assert: CSS class 包含 line-through
        await expect(page.getByRole('heading', { name: 'Buy milk' })).toHaveClass(/line-through/);
        await expect(page.getByText('Go to the store and buy milk')).toHaveClass(/line-through/);
    });

    // 測試二：Delete 按鈕刪除 todo（新增）
    test('Given an existing todo, When click the Delete button, Then the todo should be removed from the list', async ({ page }) => {
        const existingTodo = { id: 'mock-id-1', name: 'Buy milk',
                               description: 'Go to the store and buy milk', status: false };

        // arrange: 初始 GET 回傳一筆 todo
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET')
                await route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ todos: [existingTodo] }) });
        });
        await page.goto(BASE_URL);

        // mock DELETE 與後續 GET 回傳空列表
        await page.route(`**/api/v1/todos/${existingTodo.id}`, async (route) => {
            if (route.request().method() === 'DELETE')
                await route.fulfill({ status: 204 });
        });
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET')
                await route.fulfill({ status: 200, contentType: 'application/json',
                    body: JSON.stringify({ todos: [] }) });
        });

        // act
        await page.getByRole('button', { name: 'Delete' }).click();

        // assert: todo 從列表消失
        await expect(page.getByRole('heading', { name: 'Buy milk' })).not.toBeVisible();
    });
});
```

### 測試策略

| 項目 | 說明 |
|------|------|
| **測試主體** | `TodoItem` 元件的 Complete 與 Delete 按鈕互動行為 |
| **測試場景** | Complete：點擊後 todo 標題與描述出現刪除線；Delete：點擊後 todo 從列表消失 |
| **Mock 策略** | 使用 `page.route()` 分別攔截初始 GET、PUT/DELETE、後續 GET，控制每個階段的 API 回應 |
| **預期結果** | Complete 後元素 CSS class 包含 `line-through`；Delete 後對應元素 `not.toBeVisible()` |
| **想驗證的事** | `TodoItem` 元件在呼叫 API 並重新 fetch 後，是否正確更新畫面（刪除線 / 元素消失） |
| **驗證方式** | `toHaveClass(/line-through/)`、`not.toBeVisible()` |

### 測試報告

```
Running 4 tests using 4 workers

  ✓  [chromium] › tests/todo.spec.ts:64  › Todo Page › should disable Add Todo button
                                            until both name and description are provided  (361ms)
  ✓  [chromium] › tests/todo.spec.ts:6   › Todo Page › should add a new todo
                                            and append it to the list                    (449ms)
  ✓  [chromium] › tests/todo.spec.ts:139 › Todo Page › Given an existing todo,
                                            When click the Delete button,
                                            Then the todo should be removed from the list (446ms)
  ✓  [chromium] › tests/todo.spec.ts:91  › Todo Page › Given an existing todo,
                                            When click the Complete button,
                                            Then the todo name and description
                                            should have line-through style               (445ms)

  4 passed (1.6s)
```

---

## 三、CI/CD 自動化整合（GitHub Actions）

### CI 環境

| 項目 | 說明 |
|------|------|
| 平台 | GitHub Actions |
| Runner OS | `ubuntu-22.04` |
| Node.js | 20（由 `actions/setup-node@v4` 自動安裝） |
| 觸發條件 | push 或 PR 至 `main` / `software_testing` branch |

### 觸發方式

```bash
# 本地 push，自動觸發 CI
git push origin main

# 或開 PR 至 main / software_testing 時自動觸發
```

### CI Workflow 設定（`.github/workflows/ci.yml`）

```yaml
name: CI

on:
  push:
    branches: [main, software_testing]
  pull_request:
    branches: [main, software_testing]

jobs:
  backend-test:
    name: Backend Unit Test
    runs-on: ubuntu-22.04
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - name: Install dependencies
        working-directory: backend
        run: npm install
      - name: Run tests with coverage
        working-directory: backend
        run: npm test          # vitest run --coverage

  frontend-test:
    name: Frontend E2E Test
    runs-on: ubuntu-22.04
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        working-directory: frontend
        run: npm install
      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install chromium --with-deps
      - name: Run E2E tests
        working-directory: frontend
        run: npm run test:e2e   # playwright test
```

### CI 各步驟對應指令

```bash
# backend-test job 實際執行
npm install          # 安裝後端依賴
npm test             # vitest run --coverage

# frontend-test job 實際執行
npm install                                    # 安裝前端依賴
npx playwright install chromium --with-deps    # 安裝 Chromium + 系統依賴
npm run test:e2e                               # playwright test
```

### CI 架構說明

```
push / PR to main or software_testing
           │
           ├── backend-test（並行）          ├── frontend-test（並行）
           │   ├── Checkout                  │   ├── Checkout
           │   ├── Setup Node 20             │   ├── Setup Node 20
           │   ├── npm install               │   ├── npm install
           │   └── vitest run --coverage     │   ├── playwright install chromium
           │                                 │   └── playwright test
           │
           └── 兩個 job 同時觸發，互相獨立，任一失敗即標示 CI 未通過
```

| 設計決策 | 原因 |
|---------|------|
| 兩個 job 獨立並行 | 後端與前端測試無相依性，並行可節省執行時間 |
| `cache: 'npm'` | 快取 node_modules，避免每次重新下載套件 |
| `--with-deps` | 在 ubuntu 環境自動安裝 Chromium 所需的系統依賴 |
| `ubuntu-22.04` | 指定固定版本確保環境一致性 |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` | 解決 actions/checkout 與 actions/setup-node 使用 Node 20 的 deprecation warning |
