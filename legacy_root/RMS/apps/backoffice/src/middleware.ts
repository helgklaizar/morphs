import { NextRequest, NextResponse } from 'next/server';

// TODO: Реализовать server-side auth через httpOnly cookie после рефакторинга login page.
// Сейчас PocketBase SDK хранит токен в localStorage (клиентская сторона),
// поэтому middleware не может проверить авторизацию на сервере.
// Текущая защита: pb.authStore.isValid проверяется в (protected)/layout.tsx на клиенте.

export function middleware(_request: NextRequest) {
  // Pass-through: auth check is done client-side in (protected)/layout.tsx
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

