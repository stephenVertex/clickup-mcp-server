# Подключение ClickUp MCP Server к Claude Code

## Проверка работы сервера

Убедитесь, что сервер запущен:
```bash
cd C:\clickup-mcp-oauth
npm start
```

Сервер должен быть доступен на `http://localhost:3005`

## Настройка Claude Code

### Вариант 1: На уровне проекта (рекомендуется)

1. Откройте ваш проект в Claude Code
2. Создайте файл `.claude/claude_project.json` в корне проекта со следующим содержимым:

```json
{
  "mcpServers": {
    "clickup": {
      "url": "http://localhost:3005"
    }
  }
}
```

3. Перезапустите Claude Code

### Вариант 2: Глобальная настройка

1. Откройте настройки MCP в Claude Code:
   - Нажмите `/mcp` в чате
   - Выберите "Manage MCP servers"

2. Добавьте новый сервер:
   - Name: `clickup`
   - URL: `http://localhost:3005`

## OAuth2 авторизация

1. После добавления сервера, Claude Code должен показать кнопку "Authenticate"
2. Нажмите на неё для авторизации через ClickUp
3. После успешной авторизации статус изменится на "connected"

## Проверка подключения

После авторизации используйте команды:

```
/mcp clickup
```

Или вызовите инструменты напрямую:
- `clickup_get_user` - получить информацию о пользователе
- `clickup_get_workspaces` - список рабочих пространств
- `clickup_get_tasks` - получить задачи из списка
- `clickup_create_task` - создать новую задачу

## Проблемы и решения

### "Authentication failed"
- Убедитесь, что сервер запущен на порту 3005
- Проверьте, что у вас есть доступ к ClickUp API

### "Server reconnection failed"
- Перезапустите сервер
- Перезапустите Claude Code
- Проверьте логи сервера

### Порт уже занят
```bash
# Windows
netstat -ano | findstr :3005
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3005
kill -9 <PID>
```

## Структура OAuth2

Сервер поддерживает полный OAuth2 flow:
- `/register` - динамическая регистрация клиента
- `/authorize` - авторизация пользователя
- `/token` - обмен кода на токен
- `/.well-known/mcp_oauth_metadata` - метаданные OAuth2

Токены сохраняются в сессии и используются для всех запросов к ClickUp API.