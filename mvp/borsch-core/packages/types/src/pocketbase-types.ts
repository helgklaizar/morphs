// Auto-generated using pocketbase-typegen
// Placeholder until pb_schema.json is properly exported and filled with collections.

export type BaseSystemFields<T = never> = {
    id: string
    created: string
    updated: string
    collectionId: string
    collectionName: Collections
    expand?: T
}

export enum Collections {
    Users = "users",
    Tables = "tables",
    Orders = "orders"
}

export type UsersRecord = {
    name?: string
    avatar?: string
}

export type TablesRecord = {
    number: number
    status: "free" | "occupied" | "reserved"
}

export type OrdersRecord = {
    details: string
    total: number
}

// Map generic collection names to types
export type CollectionRecords = {
    users: UsersRecord
    tables: TablesRecord
    orders: OrdersRecord
}

// Stubs for migrated DDD types to avoid circular DB dependencies
export type StocktakeItemRecord = Record<string, any>;
export type StocktakeRecord = Record<string, any>;
export type SupplierProductRecord = Record<string, any>;
export type SupplierOrderRecord = Record<string, any>;
export type AssemblyRecord = Record<string, any>;
export type AssemblyItemRecord = Record<string, any>;
export type ShiftRecord = Record<string, any>;
export type SupplierRecord = Record<string, any>;
export type ClientRecord = Record<string, any>;
export type DocumentRecord = Record<string, any>;

