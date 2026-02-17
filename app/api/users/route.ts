import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/users - Fetch all users for reviewer dropdown
export async function GET() {
    try {
        const { data: users, error } = await supabase
            .from('User')
            .select('id, name, email, avatarUrl, role')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: users || [] });
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
