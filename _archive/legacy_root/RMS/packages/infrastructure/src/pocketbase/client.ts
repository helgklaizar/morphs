import PocketBase from 'pocketbase';

export const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://borsch.shop';
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);
