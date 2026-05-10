import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { serverOf } from '../src/server'
import * as TodoRepo from '../src/repo/todo'
import { FastifyInstance } from 'fastify'
import { Todo, TodoBody } from '../src/types/todo'

describe('Todo API Testing', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = serverOf()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('When receive a GET /api/v1/todos request, Then it should response an array of todos', async () => {
    // arrange: mock the repo function to return an array of todos
    const todos: Array<Todo> = [
      {
        id: '1',
        name: 'todo 1',
        description: 'description 1',
        status: false
      },
      {
        id: '2',
        name: 'todo 2',
        description: 'description 2',
        status: true
      }
    ]
    // Mock findAllTodos get all todos from database
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => todos)

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an array of todos
    const result = JSON.parse(response.body)['todos']
    expect(result).toStrictEqual(todos)
  })

  test('Given an empty array return from repo function, When receive a GET /api/v1/todos request, Then it should response an empty array', async () => {
    // arrange: mock the repo function to return an empty array
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => [])

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an empty array
    const todos = JSON.parse(response.body)['todos']
    expect(todos).toStrictEqual([])
  })

  // 測試成功更新的情況 (Happy Path)
  test('Given a valid ID and status, When receive a PUT /api/v1/todos/:id request, Then it should response the updated todo object', async () => {
    // arrange: mock the repo function to return an updated todo object
    const updatedTodo: Todo = {
      id: '1',
      name: 'todo 1',
      description: 'description 1',
      status: true
    }

    // 攔截 TodoRepo.updateTodoById 與資料庫溝通的函式
    // 並規定：只要被呼叫了，不要真的去查資料庫，直接回傳上面寫好的 updatedTodo
    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => updatedTodo)

    // act: receive a PUT /api/v1/todos/:id request
    // server.inject: 模擬一個 HTTP 請求到 server 上
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/1',
      payload: { status: true }
    })

    // assert: response should be the updated todo object
    // 驗證 1：HTTP 狀態碼必須是 200 (OK)
    expect(response.statusCode).toBe(200)
    const result = JSON.parse(response.body)['todo']
    // 驗證 2：回傳的 todo 物件必須與預期的 updatedTodo 相同
    expect(result).toStrictEqual(updatedTodo)
  })

  // 測試找不到資料的情況 (Edge Case)
  test('Given an invalid ID, When receive a PUT /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock the repo function to return null
    // 空資料
    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => null)

    // act: receive a PUT /api/v1/todos/:id request
    // 模擬發送請求，隨意將 URL 結尾塞入一個不存在的 ID '-1'
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/-1',
      payload: { status: true }
    })

    // assert: response should with status code 404
    // 404 (Not Found)
    expect(response.statusCode).toBe(404)
  })

  // case: POST 成功 
  test('Given a valid todo body, When receive a POST /api/v1/todos request, Then it should response the created todo object with status code 201', async () => {
    // arrange: mock the repo function to return a newly created todo object
    const newTodo: Todo = {
      id: '3',
      name: 'todo 3',
      description: 'description 3',
      status: false
    }
    vi.spyOn(TodoRepo, 'createTodo').mockImplementation(async () => newTodo)

    // act: receive a POST /api/v1/todos request
    // id 是資料庫（MongoDB）在 createTodo 時自動產生的，所以不需要在 payload 中帶入
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/todos',
      payload: { name: 'todo 3', description: 'description 3' }
    })

    // assert: response should be the created todo object with status code 201
    // 建立新資源時，最標準的回傳碼是 201
    expect(response.statusCode).toBe(201)
    const result = JSON.parse(response.body)['todo']
    expect(result).toStrictEqual(newTodo)
  })

  // DELETE 成功
  test('Given a valid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 204', async () => {
    // arrange: mock the repo function to return the deleted todo object (truthy)
    const deletedTodo: Todo = {
      id: '1',
      name: 'todo 1',
      description: 'description 1',
      status: false
    }
    // as any 是為了解決 TypeScript 型別檢查太嚴格的問題
    vi.spyOn(TodoRepo, 'deleteTodoById').mockImplementation(async () => deletedTodo as any)

    // act: receive a DELETE /api/v1/todos/:id request
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/v1/todos/1'
    })

    // assert: response should be status code 204 (No Content)
    // 204: 伺服器已經成功處理了請求，但不需要回傳任何實體內容
    expect(response.statusCode).toBe(204)
  })

  // DELETE 找不到資料
  test('Given an invalid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock the repo function to return null (todo not found)
    // 當 API 去資料庫找這筆資料準備刪除時，資料庫回傳 null
    vi.spyOn(TodoRepo, 'deleteTodoById').mockImplementation(async () => null as any)

    // act: receive a DELETE /api/v1/todos/:id request with a non-existent ID
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/v1/todos/-1'
    })

    // assert: response should with status code 404 (Not Found)
    expect(response.statusCode).toBe(404)
  })
})
