import { NextResponse } from 'next/server';
import { dashboardData } from '../data';

export async function GET() {
  // Simulate network delay to show "loading" functionality
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return NextResponse.json(dashboardData);
}
