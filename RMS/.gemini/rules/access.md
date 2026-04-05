# ESSENTIAL ACCESS (СЕРВЕР И БД) 
### **1. База Данных (Backend)**
- **Тип:** **PocketBase** (Self-hosted Go backend).
- **Хостинг:** Google Compute Engine (GCE) на Debian.
- **Адрес:** `https://borsch.shop/api/`
- **Admin:** (проверьте email в clean.js)
- **Как это работает:** Приложение общается с PB через официальный JS SDK. Все данные (заказы, меню, клиенты) живут там. Фотографии блюд хранятся во встроенном хранилище PB.

### **2. SSH / GCE Access**
- **Команда:** `gcloud compute ssh --zone "me-west1-b" "rms-ai-os"`
- **Локация PB на сервере:** `/home/klai/pocketbase/`
- **Бекапы на Маке:** `/Users/klai/Documents/rms-ai-os-backups/` (Делать через `gcloud scp`).
