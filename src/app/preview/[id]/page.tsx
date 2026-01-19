'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getFunnelById, upsertFunnel } from '@/lib/funnels/storage';
import { FunnelConfig } from '@/lib/funnels/types';
import type { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';
import { buildCreatineReportHtml } from '@/lib/export/buildStaticHtml';
import { TEMPLATES } from '@/lib/templates/registry';
import { buildUploadedTemplateFiles } from '@/lib/export/buildUploadedTemplateFiles';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';

type ViewMode = 'desktop' | 'mobile' | 'side-by-side';
type EditMode = 'preview' | 'edit';

export default function EnhancedPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;
  
  const [funnel, setFunnel] = useState<FunnelConfig | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [editMode, setEditMode] = useState<EditMode>('preview');
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    if (funnelId) {
      const loaded = getFunnelById(funnelId);
      if (loaded) {
        setFunnel(loaded);
        generatePreview(loaded);
      } else {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelId]);

  const generatePreview = (funnelData: FunnelConfig) => {
    try {
      const template = TEMPLATES.find(t => t.id === funnelData.templateId);
      
      if (template?.id === 'creatine-report') {
        // Build preview props for CreatineReport
        const props = buildPreviewProps(funnelData);
        const html = buildCreatineReportHtml(props);
        setPreviewHtml(html);
      } else {
        // Handle uploaded templates
        const uploadedTemplates = JSON.parse(
          localStorage.getItem('site-generator:uploaded-templates') || '[]'
        ) as UploadedTemplate[];
        const uploadedTemplate = uploadedTemplates.find(t => t.id === funnelData.templateId);
        
        if (uploadedTemplate) {
          const files = buildUploadedTemplateFiles(uploadedTemplate, funnelData.slotData || {});
          const htmlFile = files.find(f => f.path === 'index.html');
          if (htmlFile) {
            setPreviewHtml(htmlFile.contents);
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      // Silently handle preview generation errors
      setIsLoading(false);
    }
  };

  const buildPreviewProps = (funnelData: FunnelConfig): CreatineReportProps => {
    const breadcrumb = `Creatine Product Buyer's Guide > ${funnelData.productName || 'Supplement Review'}`;
    const pageTitle = funnelData.pageHeadline || funnelData.productName || 'Creatine Supplement Review';
    
    let mainLead = funnelData.introParagraph || '';
    if (!mainLead) {
      const keywordText = funnelData.mainKeyword ? ` about ${funnelData.mainKeyword}` : '';
      mainLead = `${funnelData.productName || 'This creatine supplement'} is a high-quality product${keywordText}.`;
    }

    const mainBenefits = (funnelData.mainBenefits || '')
      .split('\n')
      .map(b => b.trim().replace(/^[•\-\*]\s*/, ''))
      .filter(b => b !== '');

    const effectivenessParagraphs = (funnelData.effectivenessParagraphs || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const comparisonParagraphs = (funnelData.comparisonParagraphs || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const reviewParagraphs = (funnelData.reviewParagraphs || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const sidebarDiscoverItems = (funnelData.sidebarDiscoverItems || '')
      .split('\n')
      .filter(i => i.trim() !== '');

    const sidebarTopItems = (funnelData.sidebarTopItems || '')
      .split('\n')
      .filter(i => i.trim() !== '');

    return {
      breadcrumb,
      pageTitle,
      updatedTag: `Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      productName: funnelData.productName,
      productImageAlt: `${funnelData.productName} Product Image`,
      mainLead,
      mainBenefits: mainBenefits.length > 0 ? mainBenefits : ['Benefit 1', 'Benefit 2', 'Benefit 3'],
      effectivenessParagraphs: effectivenessParagraphs.length > 0 ? effectivenessParagraphs : ['Effectiveness paragraph'],
      comparisonParagraphs: comparisonParagraphs.length > 0 ? comparisonParagraphs : ['Comparison paragraph'],
      reviewParagraphs: reviewParagraphs.length > 0 ? reviewParagraphs : ['Review paragraph'],
      bottomLineParagraph: funnelData.bottomLineParagraph || 'Bottom line paragraph',
      ratings: {
        customerService: parseFloat(funnelData.ratings?.customerService || '5'),
        valueRating: parseFloat(funnelData.ratings?.valueRating || '5'),
        customerRating: parseFloat(funnelData.ratings?.customerRating || '5'),
        overallRating: parseFloat(funnelData.ratings?.overallRating || '5'),
      },
      productUrl: funnelData.productUrl,
      sidebarDiscoverItems: sidebarDiscoverItems.length > 0 ? sidebarDiscoverItems : ['Item 1', 'Item 2'],
      sidebarTopItems: sidebarTopItems.length > 0 ? sidebarTopItems : ['Item 1', 'Item 2'],
      newsletterTitle: funnelData.newsletterTitle || 'Stay Updated',
      newsletterDesc: funnelData.newsletterDesc || 'Get the latest updates delivered to your inbox.',
    };
  };

  const handleQuickEdit = (fieldId: string, value: string) => {
    setEditedContent(prev => ({ ...prev, [fieldId]: value }));
    // Update funnel data immediately
    if (funnel) {
      const updated = { ...funnel };
      // Update field if it exists in funnel config, otherwise update slotData
      const fieldValue = (updated as Record<string, unknown>)[fieldId];
      if (fieldId in updated && typeof fieldValue === 'string') {
        (updated as Record<string, unknown>)[fieldId] = value;
      } else if (updated.slotData) {
        updated.slotData[fieldId] = value;
      }
      setFunnel(updated);
      generatePreview(updated);
    }
  };

  const handleSave = () => {
    if (funnel) {
      const updated = { ...funnel, ...editedContent };
      upsertFunnel(updated);
      setFunnel(updated);
      setEditMode('preview');
      setEditedContent({});
      alert('Changes saved!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Funnel not found</p>
          <Link href="/funnels" className="text-blue-600 hover:text-blue-800">
            ← Back to Funnels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Controls */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/funnels" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                ← Back to Funnels
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">{funnel.name}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === 'desktop'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🖥️ Desktop
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === 'mobile'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📱 Mobile
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === 'side-by-side'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ↔️ Compare
                </button>
              </div>

              {/* Edit Mode Toggle */}
              <button
                onClick={() => setEditMode(editMode === 'preview' ? 'edit' : 'preview')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  editMode === 'edit'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {editMode === 'edit' ? '👁️ Preview' : '✏️ Quick Edit'}
              </button>

              {editMode === 'edit' && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  💾 Save Changes
                </button>
              )}

              <button
                onClick={() => router.push(`/wizard?id=${funnelId}`)}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔧 Full Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'side-by-side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Desktop View</p>
              </div>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: '800px', transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}
                />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Mobile View</p>
              </div>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: '1000px', maxWidth: '375px', margin: '0 auto' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{
                  height: viewMode === 'mobile' ? '1000px' : '800px',
                  maxWidth: viewMode === 'mobile' ? '375px' : '100%',
                  margin: viewMode === 'mobile' ? '0 auto' : '0',
                  transform: viewMode === 'mobile' ? 'scale(0.9)' : 'none',
                  transformOrigin: 'top center',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

