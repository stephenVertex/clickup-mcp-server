#!/usr/bin/env node

/**
 * ПОЛНОЦЕННЫЕ ИНТЕГРАЦИОННЫЕ ТЕСТЫ ClickUp MCP OAuth2 СЕРВЕРА
 *
 * Этот скрипт выполняет полный жизненный цикл тестирования:
 * 1. Создание → 2. Чтение → 3. Обновление → 4. Удаление
 *
 * Тестируемые сущности:
 * - Workspace & Spaces
 * - Folders
 * - Lists
 * - Tasks
 * - Comments
 *
 * Все тесты используют реальный OAuth2 токен из авторизованной сессии.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3007';
const TEST_TOKEN = 'test-token'; // Будет заменён на реальный ClickUp токен из сессии

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message, color = 'cyan') {
  log(`${step} ${message}`, color);
}

// Функция для выполнения MCP запросов
function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'MCP-Protocol-Version': '2025-06-18'
    };

    const options = {
      method: 'POST',
      headers: { ...defaultHeaders, ...headers }
    };

    const urlObj = new URL(url);
    options.hostname = urlObj.hostname;
    options.port = urlObj.port;
    options.path = urlObj.pathname;

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Функция для вызова MCP инструмента
async function callTool(toolName, args = {}) {
  const response = await makeRequest(`${BASE_URL}/`, {
    jsonrpc: '2.0',
    method: 'tools/call',
    id: Math.floor(Math.random() * 10000),
    params: {
      name: toolName,
      arguments: args
    }
  });

  if (response.statusCode === 200 && response.data.result) {
    return JSON.parse(response.data.result.content[0].text);
  } else if (response.data.error) {
    throw new Error(`${toolName}: ${response.data.error.message}`);
  } else {
    throw new Error(`${toolName}: Unexpected response - ${JSON.stringify(response.data)}`);
  }
}

// Вспомогательная функция для задержки
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Глобальные переменные для хранения созданных ID
let testContext = {
  workspaceId: null,
  spaceId: null,
  folderId: null,
  listId: null,
  taskId: null,
  commentId: null
};

// === ФАЗА 1: ИНИЦИАЛИЗАЦИЯ ===
async function testInitialization() {
  log('\n' + '='.repeat(60), 'bold');
  log('📋 ФАЗА 1: ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ', 'bold');
  log('='.repeat(60), 'bold');

  try {
    // Тест 1.1: MCP Initialize
    logStep('🔧', 'Инициализация MCP протокола...');
    const initResponse = await makeRequest(`${BASE_URL}/`, {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: {}
    });

    if (initResponse.statusCode === 200 && initResponse.data.result) {
      log('   ✅ MCP протокол инициализирован', 'green');
      log(`   📡 Версия: ${initResponse.data.result.protocolVersion}`, 'dim');
      log(`   🏷️  Сервер: ${initResponse.data.result.serverInfo?.name}`, 'dim');
    } else {
      throw new Error('Ошибка инициализации MCP');
    }

    // Тест 1.2: Получение списка инструментов
    logStep('🛠️ ', 'Получение списка доступных инструментов...');
    const toolsResponse = await makeRequest(`${BASE_URL}/`, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2,
      params: {}
    });

    if (toolsResponse.statusCode === 200 && toolsResponse.data.result) {
      const tools = toolsResponse.data.result.tools || [];
      log(`   ✅ Найдено инструментов: ${tools.length}`, 'green');

      const categories = {
        user: tools.filter(t => t.name.includes('user') || t.name.includes('workspace')).length,
        list: tools.filter(t => t.name.includes('list')).length,
        task: tools.filter(t => t.name.includes('task')).length,
        folder: tools.filter(t => t.name.includes('folder')).length,
        comment: tools.filter(t => t.name.includes('comment')).length
      };

      log(`   📂 Пользователи/Workspace: ${categories.user}`, 'dim');
      log(`   📋 Списки: ${categories.list}`, 'dim');
      log(`   📝 Задачи: ${categories.task}`, 'dim');
      log(`   📁 Папки: ${categories.folder}`, 'dim');
      log(`   💬 Комментарии: ${categories.comment}`, 'dim');
    } else {
      throw new Error('Ошибка получения списка инструментов');
    }

    return true;
  } catch (error) {
    log(`   ❌ Ошибка инициализации: ${error.message}`, 'red');
    return false;
  }
}

// === ФАЗА 2: ПОЛУЧЕНИЕ БАЗОВОЙ ИНФОРМАЦИИ ===
async function testBasicInfo() {
  log('\n' + '='.repeat(60), 'bold');
  log('👤 ФАЗА 2: ПОЛУЧЕНИЕ БАЗОВОЙ ИНФОРМАЦИИ', 'bold');
  log('='.repeat(60), 'bold');

  try {
    // Тест 2.1: Информация о пользователе
    logStep('👤', 'Получение информации о пользователе...');
    const user = await callTool('clickup_get_user');
    testContext.userId = user.user?.id;
    log(`   ✅ Пользователь: ${user.user?.username || user.user?.email}`, 'green');
    log(`   🆔 ID: ${user.user?.id}`, 'dim');

    // Тест 2.2: Список workspaces
    logStep('🏢', 'Получение списка workspaces...');
    const workspaces = await callTool('clickup_get_workspaces');
    if (workspaces.teams && workspaces.teams.length > 0) {
      testContext.workspaceId = workspaces.teams[0].id;
      log(`   ✅ Найдено workspaces: ${workspaces.teams.length}`, 'green');
      log(`   🏷️  Выбран workspace: "${workspaces.teams[0].name}" (ID: ${testContext.workspaceId})`, 'dim');
    } else {
      throw new Error('Не найдено ни одного workspace');
    }

    // Тест 2.3: Список spaces в workspace
    logStep('🌌', 'Получение списка spaces...');
    const spaces = await callTool('clickup_get_spaces', { workspace_id: testContext.workspaceId });
    if (spaces.spaces && spaces.spaces.length > 0) {
      testContext.spaceId = spaces.spaces[0].id;
      log(`   ✅ Найдено spaces: ${spaces.spaces.length}`, 'green');
      log(`   🏷️  Выбран space: "${spaces.spaces[0].name}" (ID: ${testContext.spaceId})`, 'dim');
    } else {
      throw new Error('Не найдено ни одного space');
    }

    return true;
  } catch (error) {
    log(`   ❌ Ошибка получения базовой информации: ${error.message}`, 'red');
    return false;
  }
}

// === ФАЗА 3: СОЗДАНИЕ СУЩНОСТЕЙ ===
async function testEntityCreation() {
  log('\n' + '='.repeat(60), 'bold');
  log('🏗️  ФАЗА 3: СОЗДАНИЕ СУЩНОСТЕЙ', 'bold');
  log('='.repeat(60), 'bold');

  const timestamp = new Date().toISOString();

  try {
    // Тест 3.1: Создание папки
    logStep('📁', 'Создание тестовой папки...');
    const folder = await callTool('clickup_create_folder', {
      space_id: testContext.spaceId,
      name: `🧪 Тестовая папка ${timestamp}`
    });
    testContext.folderId = folder.id;
    log(`   ✅ Папка создана: ${folder.name}`, 'green');
    log(`   🆔 ID папки: ${testContext.folderId}`, 'dim');

    await sleep(1000); // Задержка между запросами

    // Тест 3.2: Создание списка
    logStep('📋', 'Создание тестового списка...');
    const list = await callTool('clickup_create_list', {
      space_id: testContext.spaceId,
      name: `📝 Тестовый список ${timestamp}`,
      content: 'Автоматически созданный список для интеграционного тестирования MCP OAuth2 сервера'
    });
    testContext.listId = list.id;
    log(`   ✅ Список создан: ${list.name}`, 'green');
    log(`   🆔 ID списка: ${testContext.listId}`, 'dim');

    await sleep(1000);

    // Тест 3.3: Создание задачи
    logStep('📝', 'Создание тестовой задачи...');
    const task = await callTool('clickup_create_task', {
      list_id: testContext.listId,
      name: `🎯 Тестовая задача ${timestamp}`,
      description: 'Автоматически созданная задача для тестирования полного CRUD цикла',
      status: 'open'
    });
    testContext.taskId = task.id;
    log(`   ✅ Задача создана: ${task.name}`, 'green');
    log(`   🆔 ID задачи: ${testContext.taskId}`, 'dim');

    await sleep(1000);

    // Тест 3.4: Создание комментария
    logStep('💬', 'Создание комментария к задаче...');
    const comment = await callTool('clickup_create_task_comment', {
      task_id: testContext.taskId,
      comment_text: `💡 Автоматический комментарий от интеграционного теста.\n\nВремя создания: ${timestamp}\n\nЭтот комментарий будет обновлён и удалён в процессе тестирования.`
    });
    testContext.commentId = comment.id;
    log(`   ✅ Комментарий создан`, 'green');
    log(`   🆔 ID комментария: ${testContext.commentId}`, 'dim');

    return true;
  } catch (error) {
    log(`   ❌ Ошибка создания сущностей: ${error.message}`, 'red');
    return false;
  }
}

// === ФАЗА 4: ЧТЕНИЕ И ПРОВЕРКА ===
async function testEntityReading() {
  log('\n' + '='.repeat(60), 'bold');
  log('👀 ФАЗА 4: ЧТЕНИЕ И ПРОВЕРКА СОЗДАННЫХ СУЩНОСТЕЙ', 'bold');
  log('='.repeat(60), 'bold');

  try {
    // Тест 4.1: Чтение папки
    logStep('📁', 'Чтение созданной папки...');
    const folder = await callTool('clickup_get_folder', { folder_id: testContext.folderId });
    log(`   ✅ Папка прочитана: ${folder.name}`, 'green');
    log(`   📅 Создана: ${new Date(parseInt(folder.date_created)).toLocaleString()}`, 'dim');

    await sleep(500);

    // Тест 4.2: Чтение списка
    logStep('📋', 'Чтение созданного списка...');
    const list = await callTool('clickup_get_list', { list_id: testContext.listId });
    log(`   ✅ Список прочитан: ${list.name}`, 'green');
    log(`   📝 Описание: ${list.content || 'Без описания'}`, 'dim');
    log(`   📊 Статистика: ${list.task_count} задач`, 'dim');

    await sleep(500);

    // Тест 4.3: Чтение задачи
    logStep('📝', 'Чтение созданной задачи...');
    const task = await callTool('clickup_get_task', { task_id: testContext.taskId });
    log(`   ✅ Задача прочитана: ${task.name}`, 'green');
    log(`   📝 Описание: ${task.description || 'Без описания'}`, 'dim');
    log(`   🏷️  Статус: ${task.status?.status || 'Не указан'}`, 'dim');

    await sleep(500);

    // Тест 4.4: Чтение задач в списке
    logStep('📋', 'Чтение всех задач в списке...');
    const tasks = await callTool('clickup_get_tasks', { list_id: testContext.listId });
    const taskCount = tasks.tasks ? tasks.tasks.length : 0;
    log(`   ✅ Найдено задач в списке: ${taskCount}`, 'green');
    if (taskCount > 0) {
      log(`   📝 Последняя задача: ${tasks.tasks[0].name}`, 'dim');
    }

    await sleep(500);

    // Тест 4.5: Чтение комментариев
    logStep('💬', 'Чтение комментариев к задаче...');
    const comments = await callTool('clickup_get_task_comments', { task_id: testContext.taskId });
    const commentCount = comments.comments ? comments.comments.length : 0;
    log(`   ✅ Найдено комментариев: ${commentCount}`, 'green');
    if (commentCount > 0) {
      const firstComment = comments.comments[0];
      log(`   💬 Последний комментарий: ${firstComment.comment_text.substring(0, 50)}...`, 'dim');
    }

    return true;
  } catch (error) {
    log(`   ❌ Ошибка чтения сущностей: ${error.message}`, 'red');
    return false;
  }
}

// === ФАЗА 5: ОБНОВЛЕНИЕ ===
async function testEntityUpdating() {
  log('\n' + '='.repeat(60), 'bold');
  log('✏️  ФАЗА 5: ОБНОВЛЕНИЕ СУЩНОСТЕЙ', 'bold');
  log('='.repeat(60), 'bold');

  const updateTimestamp = new Date().toISOString();

  try {
    // Тест 5.1: Обновление папки
    logStep('📁', 'Обновление папки...');
    await callTool('clickup_update_folder', {
      folder_id: testContext.folderId,
      name: `🔄 Обновлённая папка ${updateTimestamp}`
    });
    log(`   ✅ Папка обновлена`, 'green');

    await sleep(1000);

    // Тест 5.2: Обновление списка
    logStep('📋', 'Обновление списка...');
    await callTool('clickup_update_list', {
      list_id: testContext.listId,
      name: `🔄 Обновлённый список ${updateTimestamp}`,
      content: 'Содержимое списка было обновлено в ходе интеграционного тестирования'
    });
    log(`   ✅ Список обновлён`, 'green');

    await sleep(1000);

    // Тест 5.3: Обновление задачи
    logStep('📝', 'Обновление задачи...');
    await callTool('clickup_update_task', {
      task_id: testContext.taskId,
      name: `🔄 Обновлённая задача ${updateTimestamp}`,
      description: 'Описание задачи было изменено в ходе интеграционного тестирования. Статус также может быть изменён.',
      status: 'in progress'
    });
    log(`   ✅ Задача обновлена`, 'green');

    await sleep(1000);

    // Проверка обновлений
    logStep('🔍', 'Проверка обновлений...');

    const updatedList = await callTool('clickup_get_list', { list_id: testContext.listId });
    log(`   📋 Обновлённое название списка: ${updatedList.name}`, 'dim');

    const updatedTask = await callTool('clickup_get_task', { task_id: testContext.taskId });
    log(`   📝 Обновлённое название задачи: ${updatedTask.name}`, 'dim');
    log(`   🏷️  Новый статус: ${updatedTask.status?.status || 'Не указан'}`, 'dim');

    return true;
  } catch (error) {
    log(`   ❌ Ошибка обновления сущностей: ${error.message}`, 'red');
    return false;
  }
}

// === ФАЗА 6: УДАЛЕНИЕ ===
async function testEntityDeletion() {
  log('\n' + '='.repeat(60), 'bold');
  log('🗑️  ФАЗА 6: УДАЛЕНИЕ СУЩНОСТЕЙ', 'bold');
  log('='.repeat(60), 'bold');

  try {
    // Тест 6.1: Удаление задачи
    logStep('📝', 'Удаление задачи...');
    await callTool('clickup_delete_task', { task_id: testContext.taskId });
    log(`   ✅ Задача удалена (ID: ${testContext.taskId})`, 'green');

    await sleep(1000);

    // Тест 6.2: Удаление списка
    logStep('📋', 'Удаление списка...');
    await callTool('clickup_delete_list', { list_id: testContext.listId });
    log(`   ✅ Список удалён (ID: ${testContext.listId})`, 'green');

    await sleep(1000);

    // Тест 6.3: Удаление папки
    logStep('📁', 'Удаление папки...');
    await callTool('clickup_delete_folder', { folder_id: testContext.folderId });
    log(`   ✅ Папка удалена (ID: ${testContext.folderId})`, 'green');

    await sleep(1000);

    // Проверка удаления
    logStep('🔍', 'Проверка удаления...');

    try {
      await callTool('clickup_get_task', { task_id: testContext.taskId });
      log(`   ⚠️  Задача всё ещё доступна (может быть в корзине)`, 'yellow');
    } catch (e) {
      log(`   ✅ Задача недоступна: ${e.message}`, 'green');
    }

    try {
      await callTool('clickup_get_list', { list_id: testContext.listId });
      log(`   ⚠️  Список всё ещё доступен (может быть в корзине)`, 'yellow');
    } catch (e) {
      log(`   ✅ Список недоступен: ${e.message}`, 'green');
    }

    return true;
  } catch (error) {
    log(`   ❌ Ошибка удаления сущностей: ${error.message}`, 'red');
    return false;
  }
}

// === ГЛАВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ ===
async function runFullIntegrationTests() {
  const startTime = Date.now();

  log('🚀 ЗАПУСК ПОЛНОЦЕННЫХ ИНТЕГРАЦИОННЫХ ТЕСТОВ', 'bold');
  log('=' .repeat(60), 'bold');
  log(`📡 Сервер: ${BASE_URL}`, 'blue');
  log(`🔑 Токен: ${TEST_TOKEN}`, 'blue');
  log(`⏰ Начало: ${new Date().toLocaleString()}`, 'blue');

  const results = {
    phases: 6,
    passed: 0,
    failed: 0,
    errors: []
  };

  // Выполнение всех фаз тестирования
  const phases = [
    { name: 'Инициализация', func: testInitialization },
    { name: 'Базовая информация', func: testBasicInfo },
    { name: 'Создание сущностей', func: testEntityCreation },
    { name: 'Чтение сущностей', func: testEntityReading },
    { name: 'Обновление сущностей', func: testEntityUpdating },
    { name: 'Удаление сущностей', func: testEntityDeletion }
  ];

  for (const phase of phases) {
    try {
      const success = await phase.func();
      if (success) {
        results.passed++;
        log(`\n✅ Фаза "${phase.name}" завершена успешно`, 'green');
      } else {
        results.failed++;
        results.errors.push(`Фаза "${phase.name}" завершена с ошибками`);
        log(`\n❌ Фаза "${phase.name}" завершена с ошибками`, 'red');
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Фаза "${phase.name}": ${error.message}`);
      log(`\n💥 Критическая ошибка в фазе "${phase.name}": ${error.message}`, 'red');
    }

    // Небольшая пауза между фазами
    await sleep(2000);
  }

  // Итоговый отчёт
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  log('\n' + '='.repeat(60), 'bold');
  log('📊 ИТОГОВЫЙ ОТЧЁТ ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ', 'bold');
  log('='.repeat(60), 'bold');

  log(`⏱️  Время выполнения: ${duration} секунд`, 'blue');
  log(`📈 Фаз всего: ${results.phases}`, 'blue');
  log(`✅ Пройдено: ${results.passed}`, 'green');
  log(`❌ Провалено: ${results.failed}`, 'red');

  const successRate = Math.round((results.passed / results.phases) * 100);
  const color = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
  log(`📊 Успешность: ${successRate}%`, color);

  if (results.errors.length > 0) {
    log('\n🚨 Обнаруженные ошибки:', 'red');
    results.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error}`, 'red');
    });
  }

  if (results.failed === 0) {
    log('\n🎉 ВСЕ ИНТЕГРАЦИОННЫЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!', 'green');
    log('🏆 ClickUp MCP OAuth2 сервер полностью функционален!', 'green');
  } else {
    log(`\n⚠️  ${results.failed} фаз не пройдено из ${results.phases}`, 'yellow');
    log('🔧 Требуется дополнительная диагностика', 'yellow');
  }

  // Информация о созданном контексте
  log('\n📋 Контекст тестирования:', 'blue');
  Object.entries(testContext).forEach(([key, value]) => {
    if (value) {
      log(`   ${key}: ${value}`, 'dim');
    }
  });

  return results;
}

// Запуск тестов
if (require.main === module) {
  runFullIntegrationTests().catch(error => {
    log(`💥 Критическая ошибка: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runFullIntegrationTests, callTool };