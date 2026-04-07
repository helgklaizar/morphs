// Online-only db-local
export const initLocalDb = async () => {
    // No-op for online mode
    console.log("Online mode: no local DB initialized");
};
export const getDb = async () => {
    throw new Error("Local DB is disabled in online-only mode");
};

export * from './pocketbase';
