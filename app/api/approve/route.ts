import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendNotificationEmail } from '@/lib/send-notification';

interface Recipient {
    id?: string;
    email: string;
    name?: string;
}

// POST /api/approve - Approve a campaign and notify recipients
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            campaignId,
            campaignTitle,
            recipients,
            senderName,
            senderEmail,
        } = body as {
            campaignId: string;
            campaignTitle: string;
            recipients: Recipient[];
            senderName: string;
            senderEmail: string;
        };

        if (!campaignId) {
            return NextResponse.json(
                { error: 'campaignId is required' },
                { status: 400 }
            );
        }

        const campaignUrl = `https://dd-campaign-builder.app.lamatic.ai/campaigns/${campaignId}`;

        // 1. Update campaign status to APPROVED
        const { error: campaignError } = await supabase
            .from('Campaign')
            .update({
                status: 'APPROVED',
                updatedAt: new Date().toISOString(),
            })
            .eq('id', campaignId);

        if (campaignError) {
            console.error('Error updating campaign status:', campaignError);
            return NextResponse.json({ error: campaignError.message }, { status: 500 });
        }

        // 2. Update all PENDING CampaignReview records to APPROVED
        const { error: reviewUpdateError } = await supabase
            .from('CampaignReview')
            .update({
                status: 'APPROVED',
                respondedAt: new Date().toISOString(),
            })
            .eq('campaignId', campaignId)
            .eq('status', 'PENDING');

        if (reviewUpdateError) {
            console.error('Error updating review records:', reviewUpdateError);
        }

        // 3. Log APPROVED activity
        await supabase.from('CampaignActivity').insert({
            campaignId,
            userEmail: senderEmail || 'unknown',
            action: 'APPROVED',
            details: {
                recipients: recipients?.map(r => ({ email: r.email, name: r.name })) || [],
            },
        });

        // 4. Send approval notification emails
        const emailResults: { email: string; success: boolean; error?: string }[] = [];
        if (recipients && recipients.length > 0) {
            for (const recipient of recipients) {
                console.log(`[Approve API] Sending notification to ${recipient.email}...`);
                const result = await sendNotificationEmail({
                    notificationType: 'approval',
                    campaignTitle: campaignTitle || 'Untitled Campaign',
                    campaignUrl,
                    recipientEmail: recipient.email,
                    recipientName: recipient.name || recipient.email,
                    senderName: senderName || 'A team member',
                    senderEmail: senderEmail || '',
                });
                emailResults.push({ email: recipient.email, ...result });
                console.log(`[Approve API] Notification to ${recipient.email}:`, result);
            }
        } else {
            console.warn('[Approve API] No recipients provided - skipping email notifications');
        }

        const allEmailsSent = emailResults.length === 0 || emailResults.every(r => r.success);
        return NextResponse.json({
            success: true,
            emailsSent: allEmailsSent,
            emailResults,
        });
    } catch (error) {
        console.error('Error in POST /api/approve:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
