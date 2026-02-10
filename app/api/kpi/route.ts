import { NextResponse } from 'next/server';

const LAMATIC_API_URL = process.env.LAMATIC_API_URL;
const LAMATIC_KPI_DATE_RANGE_ID = process.env.LAMATIC_KPI_DATE_RANGE_WORKFLOW_ID;
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

// GET: Fetch KPI data for a specific platform + date range
export async function GET(req: Request) {
    if (!LAMATIC_KPI_DATE_RANGE_ID) {
        return NextResponse.json({ error: 'Missing Date Range Workflow ID' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!platform || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required params: platform, startDate, endDate' }, { status: 400 });
    }

    const query = `
    query ExecuteWorkflow($workflowId: String!, $platform: String, $startDate: String, $endDate: String) {
      executeWorkflow(workflowId: $workflowId, payload: { platform: $platform, startDate: $startDate, endDate: $endDate }) {
        status
        result
      }
    }
  `;

    try {
        const data = await fetchGraphQL(query, {
            workflowId: LAMATIC_KPI_DATE_RANGE_ID,
            platform,
            startDate,
            endDate
        });

        const result = data?.executeWorkflow?.result?.response;
        return NextResponse.json(result || {});
    } catch (error: any) {
        console.error('KPI Date Range Error:', error);
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

        const result = data?.executeWorkflow?.result?.output;
        return NextResponse.json(result || {});
    } catch (error: any) {
        console.error('KPI Detail Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch KPI detail' }, { status: 500 });
    }
}
