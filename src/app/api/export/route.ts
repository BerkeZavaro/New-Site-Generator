import { NextRequest } from 'next/server';
import { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';
import { buildCreatineReportFiles } from '@/lib/export/buildCreatineReportFiles';
import { buildCreatineReportReactFiles } from '@/lib/export/buildCreatineReportReactFiles';
import { buildReadyToEditExport } from '@/lib/export/buildReadyToEditExport';
import { buildUploadedTemplateFiles } from '@/lib/export/buildUploadedTemplateFiles';
import { buildWordPressTemplate, buildWordPressUploadedTemplate } from '@/lib/export/buildWordPressExport';
import { buildZipFromFiles } from '@/lib/export/zip';
import { ExportFormat } from '@/lib/export/types';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      slug, 
      props, 
      template,
      slotData,
      exportFormat = "static-html" 
    }: { 
      slug?: string; 
      props?: CreatineReportProps;
      template?: UploadedTemplate;
      slotData?: Record<string, string>;
      exportFormat?: ExportFormat;
    } = body;

    let files;
    const exportSlug = slug || 'funnel';
    const safeSlug = exportSlug.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50) || 'funnel';
    
    // Handle uploaded templates
    if (template) {
      if (exportFormat === "ready-to-edit") {
        files = buildReadyToEditExport(template);
      } else if (slotData) {
        if (exportFormat === "react-json") {
          // React export for uploaded templates not yet implemented
          return new Response('React export for uploaded templates is not yet supported', { status: 400 });
        } else if (exportFormat === "wordpress") {
          files = buildWordPressUploadedTemplate(template, slotData, safeSlug);
        } else {
          // Default to static-html
          files = buildUploadedTemplateFiles(template, slotData);
        }
      } else {
        return new Response('slotData required for this export format', { status: 400 });
      }
    } 
    // Handle CreatineReport template
    else if (props) {
      if (exportFormat === "react-json") {
        files = buildCreatineReportReactFiles(props, safeSlug);
      } else if (exportFormat === "wordpress") {
        files = buildWordPressTemplate(props, safeSlug);
      } else {
        // Default to static-html
        files = buildCreatineReportFiles(props);
      }
    } else {
      return new Response('Missing props or template in request body', { status: 400 });
    }

    const zipBytes = await buildZipFromFiles(files);
    const filename = safeSlug;

    // Type assertion to satisfy TypeScript strict checking
    return new Response(new Uint8Array(zipBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}.zip"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Failed to generate export', { status: 500 });
  }
}

