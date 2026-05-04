import PocketBase from 'pocketbase';

export const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://borsch.shop';
export const pb = new PocketBase(PB_URL);
// Disable auto-cancellation to allow concurrent requests from multiple stores
pb.autoCancellation(false);
// If needed, we can also use custom path mapping if it lives under /api/
// But usually PocketBase is under rms.shop/api/ by default in proxies
// Let's assume standard for now based on previous sync.rs findings
