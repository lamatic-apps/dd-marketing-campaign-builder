import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendNotificationEmail } from '@/lib/send-notification';

interface Recipient {
    id?: string;       // userId from User table (optional for custom emails)
    email: string;
    name?: string;
}

// POST /api/reviews - Create review requests for multiple recipients
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            campaignId,
            campaignTitle,
            recipients,     // Array of { id?, email, name? }
            senderName,
            senderEmail,
        } = body as {
            campaignId: string;
            campaignTitle: string;
            recipients: Recipient[];
            senderName: string;
            senderEmail: string;
        };

        if (!campaignId || !recipients || recipients.length === 0) {
            return NextResponse.json(
                { error: 'campaignId and at least one recipient are required' },
                { status: 400 }
            );
        }

        const campaignUrl = `https://dd-campaign-builder.app.lamatic.ai/campaigns/${campaignId}`;
        const reviews: any[] = [];

        // 1. Create CampaignReview records for each recipient
        for (const recipient of recipients) {
            const { data: review, error: reviewError } = await supabase
                .from('CampaignReview')
                .insert({
                    campaignId,
                    requestedByEmail: senderEmail || 'unknown',
                    reviewerId: recipient.id || null,
                    reviewerEmail: recipient.email,
                    status: 'PENDING',
                })
                .select()
                .single();

            if (reviewError) {
                console.error('Error creating review for', recipient.email, reviewError);
            } else {
                reviews.push(review);
            }
        }

        // 2. Update campaign status to PENDING_REVIEW
        const { error: campaignError } = await supabase
            .from('Campaign')
            .update({
                status: 'PENDING_REVIEW',
                updatedAt: new Date().toISOString(),
            })
            .eq('id', campaignId);

        if (campaignError) {
            console.error('Error updating campaign status:', campaignError);
        }

        // 3. Log SENT_FOR_REVIEW activity
        const recipientSummary = recipients.map(r => r.name || r.email).join(', ');
        await supabase.from('CampaignActivity').insert({
            campaignId,
            userEmail: senderEmail || 'unknown',
            action: 'SENT_FOR_REVIEW',
            details: {
                recipients: recipients.map(r => ({ email: r.email, name: r.name })),
            },
        });

        // 4. Trigger email notification for each recipient
        const emailResults: { email: string; success: boolean; error?: string }[] = [];
        for (const recipient of recipients) {
            console.log(`[Reviews API] Sending notification to ${recipient.email}...`);
            const result = await sendNotificationEmail({
                notificationType: 'review_request',
                campaignTitle: campaignTitle || 'Untitled Campaign',
                campaignUrl,
                recipientEmail: recipient.email,
                recipientName: recipient.name || recipient.email,
                senderName: senderName || 'A team member',
                senderEmail: senderEmail || '',
            });
            emailResults.push({ email: recipient.email, ...result });
            console.log(`[Reviews API] Notification to ${recipient.email}:`, result);
        }

        const allEmailsSent = emailResults.every(r => r.success);
        return NextResponse.json({ reviews, success: true, emailsSent: allEmailsSent, emailResults });
    } catch (error) {
        console.error('Error in POST /api/reviews:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/reviews?campaignId=... - Fetch reviews for a campaign
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');

        if (!campaignId) {
            return NextResponse.json(
                { error: 'campaignId query parameter is required' },
                { status: 400 }
            );
        }

        const { data: reviews, error } = await supabase
            .from('CampaignReview')
            .select('*')
            .eq('campaignId', campaignId)
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('Error fetching reviews:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ reviews: reviews || [] });
    } catch (error) {
        console.error('Error in GET /api/reviews:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
