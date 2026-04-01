import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  
  if (phone) {
    return NextResponse.redirect(`tel:${phone}`);
  }
  
  return NextResponse.json({ error: 'No phone provided' }, { status: 400 });
}
