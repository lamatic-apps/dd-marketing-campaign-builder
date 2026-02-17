import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { action, ...params } = body

    const API_URL = process.env.LAMATIC_API_URL
    const API_TOKEN = process.env.LAMATIC_API_TOKEN
    const PROJECT_ID = process.env.LAMATIC_PROJECT_ID

    if (!API_URL || !API_TOKEN || !PROJECT_ID) {
        return NextResponse.json(
            { error: "Lamatic API not configured" },
            { status: 500 }
        )
    }

    try {
        if (action === "generate-campaign") {
            const WORKFLOW_ID = process.env.LAMATIC_CAMPAIGN_WORKFLOW_ID
            if (!WORKFLOW_ID) {
                return NextResponse.json(
                    { error: "Campaign workflow ID not configured" },
                    { status: 500 }
                )
            }

            const query = `query ExecuteWorkflow(
        $workflowId: String!
        $topic: String
        $bundleId: String
        $products: [String]
        $channels_blog: String
        $channels_email: String
        $channels_sms: String
        $channels_facebook: String
        $channels_instagram: String
        $channels_twitter: String
        $imageChannels_blog: String
        $imageChannels_facebook: String
        $imageChannels_instagram: String
        $imageChannels_twitter: String
        $notes: String
        $contentFocus: String
      ) {
        executeWorkflow(
          workflowId: $workflowId
          payload: {
            topic: $topic
            bundleId: $bundleId
            products: $products
            channels: {
              blog: $channels_blog
              email: $channels_email
              sms: $channels_sms
              facebook: $channels_facebook
              instagram: $channels_instagram
              twitter: $channels_twitter
            }
            imageChannels: {
              blog: $imageChannels_blog
              facebook: $imageChannels_facebook
              instagram: $imageChannels_instagram
              twitter: $imageChannels_twitter
            }
            notes: $notes
            contentFocus: $contentFocus
          }
        ) {
          status
          result
        }
      }`

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json",
                    "x-project-id": PROJECT_ID,
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        workflowId: WORKFLOW_ID,
                        ...params,
                    },
                }),
            })

            const data = await response.json()
            return NextResponse.json(data)
        }

        if (action === "search-products") {
            const WORKFLOW_ID = process.env.LAMATIC_PRODUCT_SEARCH_WORKFLOW_ID
            if (!WORKFLOW_ID) {
                return NextResponse.json(
                    { error: "Product search workflow ID not configured" },
                    { status: 500 }
                )
            }

            const query = `query ExecuteWorkflow(
        $workflowId: String!
        $keyword: String
      ) {
        executeWorkflow(
          workflowId: $workflowId
          payload: {
            keyword: $keyword
          }
        ) {
          status
          result
        }
      }`

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json",
                    "x-project-id": PROJECT_ID,
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        workflowId: WORKFLOW_ID,
                        keyword: params.keyword,
                    },
                }),
            })

            const data = await response.json()
            return NextResponse.json(data)
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Lamatic API error:", error)
        return NextResponse.json(
            { error: "API request failed" },
            { status: 500 }
        )
    }
}
