import { NextRequest, NextResponse } from 'next/server';
import { Campaign, CampaignStatus } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with Service Role Key for admin access (bypass RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as CampaignStatus | null;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabase
            .from('Campaign')
            .select('*')
            .order('createdAt', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching campaigns:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            campaigns: data,
            count: count || data?.length || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error in GET /api/campaigns:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            title,
            topic,
            scheduledDate,
            channels,
            products,
            contentFocus = 3,
            notes,
            generatedContent,
            docUrl,
            folderUrl,
            userEmail, // For activity tracking (pre-OAuth)
        } = body;

        // Validate required fields
        if (!title || !topic || !channels) {
            return NextResponse.json(
                { error: 'Missing required fields: title, topic, channels' },
                { status: 400 }
            );
        }

        // Create the campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('Campaign')
            .insert({
                title,
                topic,
                status: 'DRAFT' as CampaignStatus,
                scheduledDate,
                channels,
                products,
                contentFocus,
                notes,
                generatedContent,
                docUrl,
                folderUrl,
            })
            .select()
            .single();

        if (campaignError) {
            console.error('Error creating campaign:', campaignError);
            return NextResponse.json({ error: campaignError.message }, { status: 500 });
        }

        // Log the creation activity
        if (userEmail && campaign) {
            await supabase.from('CampaignActivity').insert({
                campaignId: campaign.id,
                userEmail,
                action: 'CREATED',
                details: { title, topic },
            });
        }

        return NextResponse.json({ campaign }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/campaigns:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
