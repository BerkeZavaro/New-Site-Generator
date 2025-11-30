import { NextRequest } from 'next/server';
import { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';
import { buildCreatineReportHtml } from '@/lib/export/buildStaticHtml';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, props }: { slug?: string; props: CreatineReportProps } = body;

    if (!props) {
      return new Response('Missing props in request body', { status: 400 });
    }

    const html = buildCreatineReportHtml(props);
    const filename = slug || 'funnel';

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.html"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Failed to generate export', { status: 500 });
  }
}

