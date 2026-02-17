/**
 * Shared helper to trigger the SMTP notification Lamatic flow.
 * Used by both /api/reviews and /api/approve.
 */
export async function sendNotificationEmail(params: {
    notificationType: 'review_request' | 'approval';
    campaignTitle: string;
    campaignUrl: string;
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    senderEmail: string;
}): Promise<boolean> {
    const API_URL = process.env.LAMATIC_API_URL;
    const API_TOKEN = process.env.LAMATIC_API_TOKEN;
    const PROJECT_ID = process.env.LAMATIC_PROJECT_ID;
    const WORKFLOW_ID = process.env.LAMATIC_REVIEW_NOTIFICATION_WORKFLOW_ID;

    if (!API_URL || !API_TOKEN || !PROJECT_ID || !WORKFLOW_ID) {
        console.warn('Notification workflow not configured - skipping email');
        return false;
    }

    const query = `query ExecuteWorkflow(
        $workflowId: String!
        $notificationType: String
        $campaignTitle: String
        $campaignUrl: String
        $recipientEmail: String
        $recipientName: String
        $senderName: String
        $senderEmail: String
    ) {
        executeWorkflow(
            workflowId: $workflowId
            payload: {
                notificationType: $notificationType
                campaignTitle: $campaignTitle
                campaignUrl: $campaignUrl
                recipientEmail: $recipientEmail
                recipientName: $recipientName
                senderName: $senderName
                senderEmail: $senderEmail
            }
        ) {
            status
            result
        }
    }`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
                'x-project-id': PROJECT_ID,
            },
            body: JSON.stringify({
                query,
                variables: {
                    workflowId: WORKFLOW_ID,
                    ...params,
                },
            }),
        });

        const result = await response.json();
        if (result.errors) {
            console.error('Lamatic email flow error:', result.errors);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Failed to trigger email notification:', error);
        return false;
    }
}
