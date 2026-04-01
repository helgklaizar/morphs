# Borsch Shop — Архитектурный Граф

В данном документе представлена наглядная архитектурная схема ядра `borsch-shop` в парадигме Offline-First.

## Схема взаимодействия компонентов

```mermaid
flowchart TD
    %% Define styles
    classDef tauri fill:#f97316,stroke:#ea580c,stroke-width:2px,color:white;
    classDef web fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:white;
    classDef cloud fill:#22c55e,stroke:#16a34a,stroke-width:2px,color:white;
    classDef db fill:#64748b,stroke:#475569,stroke-width:2px,color:white;

    %% Cloud Infrastructure
    subgraph Cloud["☁️ Облако (borsch.shop)"]
        PB["PocketBase (Source of Truth)"]:::cloud
        PBHooks["pb_hooks (JS)"]:::cloud
        cron["Cron Archive"]:::cloud
        TG["Telegram Bot API"]:::cloud
        
        PB --> |Triggers| PBHooks
        PBHooks --> |Sends Notifications| TG
        cron -.-> |Every 5 min archive| PB
    end

    %% Backoffice - Desktop
    subgraph Backoffice["🖥️ Backoffice (Offline-First Tauri App)"]
        ReactState["React + Zustand Store"]:::web
        SyncEngine["Rust SyncEngine"]:::tauri
        LocalDB[("Локальная SQLite")]:::db
        
        ReactState -->|Write 'pending_update'| LocalDB
        LocalDB -->|Read / Fetch| ReactState
        
        SyncEngine -->|Push/Pull (10s interval)| PB
        SyncEngine <-->|Read/Write| LocalDB
    end

    %% Web Storefront
    subgraph Storefront["📱 Landing / Storefront (Next.js)"]
        NextServer["Next.js Server-Side"]:::web
        NextClient["Next.js Client Components"]:::web
        
        NextClient -->|Triggers| NextServer
        NextServer <-->|REST API + SSR| PB
    end
    
    %% Connections between domains
    PB -.-> |Downloads/Updates| SyncEngine
    NextServer -.-> |Media Uploads| PB
```

## Ключевые принципы

1. **Оффлайн работа кухни**: Админка Backoffice пишет только в `LocalDB` (SQLite). Поварам не нужен интернет для пробивания чеков и изменения меню.
2. **Фоновая синхронизация**: Rust `SyncEngine` проверяет таблицу на записи с `sync_status != 'synced'` и обменивается ими с `PocketBase` в фоне. 
3. **Клиентская витрина**: Приложение на Next.js ходит напрямую в PocketBase.
4. **Уведомления**: Отправкой заказов в Telegram занимается PocketBase через серверные хуки, что гарантирует доставку уведомления независимо от точки создания (POS на Backoffice или клиент на Landing).
5. **ID-шники**: Используется строго 15-символьная генерация (`A-Za-z0-9`), совместимая с `PocketBase`.
