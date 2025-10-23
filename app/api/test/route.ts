export async function GET() {
  return Response.json({
    apiKeyExists: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY?.length,
    apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...'
  });
}
