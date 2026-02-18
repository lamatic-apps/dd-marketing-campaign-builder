import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase, ActivityAction } from '@/lib/supabase';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/campaigns/[id]/activity - Get activity log for a campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const { data: activities, error } = await supabase
            .from('CampaignActivity')
            .select('*')
            .eq('campaignId', id)
            .order('createdAt', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching activities:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ activities: activities || [] });
    } catch (error) {
        console.error('Error in GET /api/campaigns/[id]/activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/campaigns/[id]/activity - Log a new activity
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { userEmail, action, details } = body;

        if (!userEmail || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: userEmail, action' },
                { status: 400 }
            );
        }

        const { data: activity, error } = await supabase
            .from('CampaignActivity')
            .insert({
                campaignId: id,
                userEmail,
                action: action as ActivityAction,
                details,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating activity:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ activity }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/campaigns/[id]/activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
