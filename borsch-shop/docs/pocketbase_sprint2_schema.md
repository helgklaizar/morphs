# Конфигурация новых таблиц в PocketBase (Спринт 2)

Чтобы наш Sync-Движок мог успешно отправлять и забирать локальные данные оффлайн-кассы в облако (`borsch.shop`), необходимо создать новые **Collections** через админ-панель PocketBase.

> **Важно**: Все поля должны быть точного типа, имена должны совпадать символ-в-символ. Обязательно в каждой таблице добавьте поле `sync_status` (Type: Text) и отметьте **API Rules** как открытые (нажать на шестеренку в каждой таблице и проставить зеленую галочку, либо настроить правила под админа).

---

## 1. Коллекция: `workers` (Сотрудники)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `name` | Text | Да |
| `role` | Text | Нет |
| `rate_per_hour` | Number | Нет |
| `phone` | Text | Нет |
| `status` | Text (default: 'активный') | Нет |
| `sync_status` | Text | Нет |

---

## 2. Коллекция: `shifts` (Смены)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `worker_id` | Text (или Relation к workers) | Да |
| `start_time` | Date | Да |
| `end_time` | Date | Нет |
| `status` | Text (default: 'открыта') | Нет |
| `total_hours` | Number | Нет |
| `total_pay` | Number | Нет |
| `sync_status` | Text | Нет |

---

## 3. Коллекция: `documents` (Документы)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `title` | Text | Да |
| `file_url` | Text (или File) | Нет |
| `entity_type` | Text | Нет |
| `entity_id` | Text | Нет |
| `sync_status` | Text | Нет |

---

## 4. Коллекция: `waste_logs` (Списания)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `item_id` | Text | Да |
| `item_type` | Text ('inventory' or 'menu') | Да |
| `quantity` | Number | Да |
| `reason` | Text | Нет |
| `sync_status` | Text | Нет |

---

## 5. Коллекция: `stocktakes` (Инвентаризации)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `status` | Text ('draft' or 'completed') | Нет |
| `notes` | Text | Нет |
| `sync_status` | Text | Нет |

---

## 6. Коллекция: `stocktake_items` (Элементы инвентаризации)
| Имя поля (Field Name) | Тип поля (Type) | Обязательное (Required) |
|---|---|---|
| `stocktake_id` | Text (Relation к stocktakes) | Да |
| `inventory_item_id` | Text (Relation к inventory_items)| Да |
| `expected_stock` | Number | Нет |
| `actual_stock` | Number | Нет |
| `difference` | Number | Нет |
| `sync_status` | Text | Нет |

---

✅ **После того как вы создадите эти 6 коллекций в облаке, наш локальный `SyncEngine` (`apps/backoffice/...`) сможет автоматически скидывать все локальные оффлайн-данные в общую базу без ошибок REST API.**
