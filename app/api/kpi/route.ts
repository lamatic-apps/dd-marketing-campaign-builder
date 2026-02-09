import { NextResponse } from 'next/server';

const LAMATIC_API_URL = process.env.LAMATIC_API_URL;
const LAMATIC_KPI_SUMMARY_ID = process.env.LAMATIC_KPI_SUMMARY_WORKFLOW_ID;
const LAMATIC_KPI_DETAIL_ID = process.env.LAMATIC_KPI_DETAIL_WORKFLOW_ID;
const API_TOKEN = process.env.LAMATIC_API_TOKEN;

async function fetchGraphQL(query: string, variables: any) {
    if (!LAMATIC_API_URL || !API_TOKEN) {
        throw new Error('Missing Lamatic URL or Token');
    }

    const res = await fetch(LAMATIC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
            // x-project-id is usually not needed if token is sufficient, but user included it in curl.
            // We will relay it if we have it, or rely on token. user's .env didn't highlight x-project-id header specifically but had PROJECT_ID.
            // Let's include it to be safe if env has it.
            ...(process.env.LAMATIC_PROJECT_ID ? { 'x-project-id': process.env.LAMATIC_PROJECT_ID } : {})
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    const json = await res.json();
    if (json.errors) {
        console.error('GraphQL Errors:', json.errors);
        throw new Error(json.errors[0].message || 'GraphQL Error');
    }
    return json.data;
}

// GET: Fetch Summary Data
export async function GET() {
    if (!LAMATIC_KPI_SUMMARY_ID) {
        return NextResponse.json({ error: 'Missing Summary Workflow ID' }, { status: 500 });
    }

    const query = `
    query ExecuteWorkflow($workflowId: String!, $fetchData: String) {
      executeWorkflow(workflowId: $workflowId, payload: { fetchData: $fetchData }) {
        status
        result
      }
    }
  `;

    try {
        const data = await fetchGraphQL(query, {
            workflowId: LAMATIC_KPI_SUMMARY_ID,
            fetchData: "true"
        });

        // Structure: data.executeWorkflow.result.response
        const result = data?.executeWorkflow?.result?.response;
        return NextResponse.json(result || {});
    } catch (error: any) {
        console.error('KPI Summary Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch KPI data' }, { status: 500 });
    }
}

// POST: Fetch Detail Data
export async function POST(req: Request) {
    if (!LAMATIC_KPI_DETAIL_ID) {
        return NextResponse.json({ error: 'Missing Detail Workflow ID' }, { status: 500 });
    }

    try {
        const { platform, campaignId } = await req.json();

        const query = `
      query ExecuteWorkflow($workflowId: String!, $platform: String, $campaignId: String) {
        executeWorkflow(workflowId: $workflowId, payload: { platform: $platform, campaignId: $campaignId }) {
          status
          result
        }
      }
    `;

        const data = await fetchGraphQL(query, {
            workflowId: LAMATIC_KPI_DETAIL_ID,
            platform,
            campaignId
        });

        // Structure: data.executeWorkflow.result.output (based on detail kpi response.json)
        const result = data?.executeWorkflow?.result?.output;
        return NextResponse.json(result || {});
    } catch (error: any) {
        console.error('KPI Detail Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch KPI detail' }, { status: 500 });
    }
}
