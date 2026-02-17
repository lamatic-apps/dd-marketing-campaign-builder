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
}): Promise<{ success: boolean; error?: string }> {
    const API_URL = process.env.LAMATIC_API_URL;
    const API_TOKEN = process.env.LAMATIC_API_TOKEN;
    const PROJECT_ID = process.env.LAMATIC_PROJECT_ID;
    const WORKFLOW_ID = process.env.LAMATIC_REVIEW_NOTIFICATION_WORKFLOW_ID;

    console.log('[Email Notification] Attempting to send:', {
        type: params.notificationType,
        to: params.recipientEmail,
        campaign: params.campaignTitle,
        hasApiUrl: !!API_URL,
        hasToken: !!API_TOKEN,
        hasProjectId: !!PROJECT_ID,
        hasWorkflowId: !!WORKFLOW_ID,
    });

    if (!API_URL || !API_TOKEN || !PROJECT_ID || !WORKFLOW_ID) {
        const missing = [
            !API_URL && 'LAMATIC_API_URL',
            !API_TOKEN && 'LAMATIC_API_TOKEN',
            !PROJECT_ID && 'LAMATIC_PROJECT_ID',
            !WORKFLOW_ID && 'LAMATIC_REVIEW_NOTIFICATION_WORKFLOW_ID',
        ].filter(Boolean).join(', ');
        console.error(`[Email Notification] Missing env vars: ${missing}`);
        return { success: false, error: `Missing env vars: ${missing}` };
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
        const requestBody = {
            query,
            variables: {
                workflowId: WORKFLOW_ID,
                ...params,
            },
        };

        console.log('[Email Notification] Calling Lamatic API:', API_URL);
        console.log('[Email Notification] Workflow ID:', WORKFLOW_ID);
        console.log('[Email Notification] Variables:', JSON.stringify(requestBody.variables, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
                'x-project-id': PROJECT_ID,
            },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log('[Email Notification] Response status:', response.status);
        console.log('[Email Notification] Response body:', responseText);

        if (!response.ok) {
            console.error(`[Email Notification] HTTP error ${response.status}:`, responseText);
            return { success: false, error: `HTTP ${response.status}: ${responseText}` };
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error('[Email Notification] Failed to parse response as JSON:', responseText);
            return { success: false, error: `Invalid JSON response: ${responseText.slice(0, 200)}` };
        }

        if (result.errors) {
            console.error('[Email Notification] GraphQL errors:', JSON.stringify(result.errors));
            return { success: false, error: result.errors[0]?.message || 'GraphQL error' };
        }

        console.log('[Email Notification] Success! Result:', JSON.stringify(result.data));
        return { success: true };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[Email Notification] Exception:', errMsg);
        return { success: false, error: errMsg };
    }
}
