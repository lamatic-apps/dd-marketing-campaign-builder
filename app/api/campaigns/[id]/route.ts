import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase, CampaignStatus } from '@/lib/supabase';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/campaigns/[id] - Get a single campaign with activities
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const { data: campaign, error } = await supabase
            .from('Campaign')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
            }
            console.error('Error fetching campaign:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Also fetch activities for this campaign
        const { data: activities } = await supabase
            .from('CampaignActivity')
            .select('*')
            .eq('campaignId', id)
            .order('createdAt', { ascending: false })
            .limit(50);

        return NextResponse.json({ campaign, activities: activities || [] });
    } catch (error) {
        console.error('Error in GET /api/campaigns/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/campaigns/[id] - Update a campaign
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { userEmail, ...updateData } = body;

        // Update the campaign
        const { data: campaign, error } = await supabase
            .from('Campaign')
            .update({
                ...updateData,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
            }
            console.error('Error updating campaign:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log the edit activity
        if (userEmail) {
            await supabase.from('CampaignActivity').insert({
                campaignId: id,
                userEmail,
                action: 'EDITED',
                details: { updatedFields: Object.keys(updateData) },
            });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error in PUT /api/campaigns/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/campaigns/[id] - Partial update (for status changes, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { userEmail, status, ...otherUpdates } = body;

        const updatePayload: Record<string, unknown> = {
            ...otherUpdates,
            updatedAt: new Date().toISOString(),
        };

        if (status) {
            updatePayload.status = status;
        }

        const { data: campaign, error } = await supabase
            .from('Campaign')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error patching campaign:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log activity based on what changed
        if (userEmail) {
            let action: string = 'EDITED';
            if (status === 'SCHEDULED') action = 'SCHEDULED';
            else if (status === 'PUBLISHED') action = 'PUBLISHED';
            else if (status === 'ARCHIVED') action = 'ARCHIVED';

            await supabase.from('CampaignActivity').insert({
                campaignId: id,
                userEmail,
                action,
                details: { status, ...otherUpdates },
            });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error in PATCH /api/campaigns/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('Campaign')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting campaign:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/campaigns/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
