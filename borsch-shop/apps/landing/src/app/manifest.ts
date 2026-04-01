import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Borsch Shop',
    short_name: 'Borsch Shop',
    description: 'Вкусная домашняя еда с быстрой доставкой',
    start_url: '/',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#f43f5e', // rose-500
    icons: [
      {
        src: '/file.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/file.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  }
}
