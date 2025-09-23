# 🔄 Auto Dependency Removal Feature

## Описание

Добавлена автоматическая функция удаления blocking dependencies при обновлении статуса задачи на "done", "closed" или "complete".

## Как работает

Когда задача обновляется через `update_task` и новый статус = "done"/"closed"/"complete":

1. ✅ Задача обновляется как обычно
2. 🔍 Проверяются зависимости задачи
3. 🚫 Фильтруются blocking dependencies (type=1)
4. 🗑️ Автоматически удаляются все blocking dependencies
5. 📝 Логируется процесс удаления

## Изменения в коде

### Файл: `src/services/clickup/task/task-core.ts`

Метод `updateTask` расширен логикой:

```typescript
// Auto-remove blocking dependencies when task is marked as done/closed
if (updateData.status) {
  const statusLower = updateData.status.toLowerCase();
  if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'complete') {
    // Get task dependencies
    const taskWithDeps = await this.getTask(taskId);

    // Filter blocking deps (type=1)
    const blockingDeps = (taskWithDeps.dependencies || []).filter((dep: any) => dep.type === 1);

    // Remove each blocking dependency
    for (const dep of blockingDeps) {
      await this.client.delete(`/task/${taskId}/dependency?...`);
    }
  }
}
```

## Тестирование

### Подготовка

Созданы тестовые задачи:
- **Task1** (ID: `86c5muhng`) - блокирующая задача
- **Task2** (ID: `86c5muhp2`) - заблокированная задача

### Шаги тестирования

1. **Добавить blocking dependency:**
   ```typescript
   // Task1 блокирует Task2
   await clickUpServices.task.addDependency('86c5muhng', '86c5muhp2', 1);
   ```

2. **Проверить зависимость:**
   ```typescript
   const task1 = await clickUpServices.task.getTask('86c5muhng');
   console.log('Dependencies:', task1.dependencies);
   // Должна быть зависимость: { type: 1, depends_on: '86c5muhp2' }
   ```

3. **Обновить Task1 на статус "done":**
   ```typescript
   await clickUpServices.task.updateTask('86c5muhng', { status: 'done' });
   ```

4. **Проверить автоматическое удаление:**
   ```typescript
   const task1Updated = await clickUpServices.task.getTask('86c5muhng');
   console.log('Dependencies after:', task1Updated.dependencies);
   // dependencies должен быть пустым []
   ```

### Альтернативный тест через MCP tools

```bash
# 1. Добавить dependency
add_task_dependency --task_id=86c5muhng --depends_on=86c5muhp2 --dependency_type=blocking

# 2. Обновить статус
update_task --taskId=86c5muhng --status=done

# 3. Проверить зависимости
get_task_dependencies --task_id=86c5muhng
```

## Логирование

При автоматическом удалении зависимостей логируются события:

- `auto-remove-dependencies` - начало процесса
- `removing-blocking-dependencies` - найдены blocking deps
- `removed-blocking-dependency` - успешное удаление
- `failed-to-remove-dependency` - ошибка при удалении (не блокирует update)
- `dependency-removal-error` - общая ошибка процесса

## Поддерживаемые статусы

Автоматическое удаление срабатывает при обновлении на следующие статусы (case-insensitive):

- `done`
- `closed`
- `complete`

## Важные замечания

1. ✅ **Удаляются только blocking dependencies (type=1)**
   - Waiting_on dependencies (type=0) НЕ удаляются

2. ✅ **Не блокирует основное обновление**
   - Если удаление dependency не удалось - update все равно проходит
   - Ошибки логируются, но не пробрасываются

3. ✅ **Работает для любого способа обновления**
   - `update_task` tool
   - `updateTask` метод сервиса
   - Bulk operations

## Пример использования

### До:
```
Task A (status: in progress) --[blocks]--> Task B
```

### После update Task A to "done":
```
Task A (status: done)     Task B
     (dependency removed automatically)
```

## Связанные файлы

- `src/services/clickup/task/task-core.ts` - основная логика
- `src/services/clickup/task/task-dependencies.ts` - API зависимостей
- `src/tools/dependency.ts` - MCP tools для зависимостей

## Changelog

- ✨ **NEW**: Auto-remove blocking dependencies on task completion
- 🔧 **MODIFIED**: `TaskServiceCore.updateTask()` method
- 📝 **ADDED**: Comprehensive logging for dependency operations