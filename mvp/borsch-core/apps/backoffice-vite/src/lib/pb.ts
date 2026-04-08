// Временный мок PocketBase для сборки UI до перевода всех модалок на Node-Prisma
export const pb = {
  collection: (name: string) => ({
    getFullList: async () => [],
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  }),
  authStore: {
    clear: () => {}
  }
};
