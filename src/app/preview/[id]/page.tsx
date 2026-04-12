'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getFunnelById, saveFunnel } from '@/lib/savedFunnelStorage';
import type { SavedFunnel } from '@/lib/savedFunnelStorage';
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
  
  const [funnel, setFunnel] = useState<SavedFunnel | null>(null);
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

  const generatePreview = (funnelData: SavedFunnel) => {
    try {
      const d = funnelData.data ?? {};
      const template = TEMPLATES.find(t => t.id === d.templateId);
      
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
        const uploadedTemplate = uploadedTemplates.find(t => t.id === d.templateId);
        
        if (uploadedTemplate) {
          const files = buildUploadedTemplateFiles(uploadedTemplate, (d.slotData as Record<string, string>) || {});
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

  const buildPreviewProps = (saved: SavedFunnel): CreatineReportProps => {
    const d = saved.data ?? {};
    const productName = (d.productName as string | undefined) || '';
    const breadcrumb = `Creatine Product Buyer's Guide > ${productName || 'Supplement Review'}`;
    const pageTitle = (d.pageHeadline as string | undefined) || productName || 'Creatine Supplement Review';
    
    let mainLead = (d.introParagraph as string | undefined) || '';
    if (!mainLead) {
      const mainKeyword = d.mainKeyword as string | undefined;
      const keywordText = mainKeyword ? ` about ${mainKeyword}` : '';
      mainLead = `${productName || 'This creatine supplement'} is a high-quality product${keywordText}.`;
    }

    const mainBenefits = ((d.mainBenefits as string | undefined) || '')
      .split('\n')
      .map(b => b.trim().replace(/^[•\-\*]\s*/, ''))
      .filter(b => b !== '');

    const effectivenessParagraphs = ((d.effectivenessParagraphs as string | undefined) || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const comparisonParagraphs = ((d.comparisonParagraphs as string | undefined) || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const reviewParagraphs = ((d.reviewParagraphs as string | undefined) || '')
      .split('\n')
      .filter(p => p.trim() !== '');

    const sidebarDiscoverItems = ((d.sidebarDiscoverItems as string | undefined) || '')
      .split('\n')
      .filter(i => i.trim() !== '');

    const sidebarTopItems = ((d.sidebarTopItems as string | undefined) || '')
      .split('\n')
      .filter(i => i.trim() !== '');

    const ratings = d.ratings as {
      customerService?: string;
      valueRating?: string;
      customerRating?: string;
      overallRating?: string;
    } | undefined;

    return {
      breadcrumb,
      pageTitle,
      updatedTag: `Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      productName,
      productImageAlt: `${productName} Product Image`,
      mainLead,
      mainBenefits: mainBenefits.length > 0 ? mainBenefits : ['Benefit 1', 'Benefit 2', 'Benefit 3'],
      effectivenessParagraphs: effectivenessParagraphs.length > 0 ? effectivenessParagraphs : ['Effectiveness paragraph'],
      comparisonParagraphs: comparisonParagraphs.length > 0 ? comparisonParagraphs : ['Comparison paragraph'],
      reviewParagraphs: reviewParagraphs.length > 0 ? reviewParagraphs : ['Review paragraph'],
      bottomLineParagraph: (d.bottomLineParagraph as string | undefined) || 'Bottom line paragraph',
      ratings: {
        customerService: parseFloat(ratings?.customerService || '5'),
        valueRating: parseFloat(ratings?.valueRating || '5'),
        customerRating: parseFloat(ratings?.customerRating || '5'),
        overallRating: parseFloat(ratings?.overallRating || '5'),
      },
      productUrl: (d.productUrl as string | undefined) || '',
      sidebarDiscoverItems: sidebarDiscoverItems.length > 0 ? sidebarDiscoverItems : ['Item 1', 'Item 2'],
      sidebarTopItems: sidebarTopItems.length > 0 ? sidebarTopItems : ['Item 1', 'Item 2'],
      newsletterTitle: (d.newsletterTitle as string | undefined) || 'Stay Updated',
      newsletterDesc: (d.newsletterDesc as string | undefined) || 'Get the latest updates delivered to your inbox.',
    };
  };

  const handleQuickEdit = (fieldId: string, value: string) => {
    setEditedContent(prev => ({ ...prev, [fieldId]: value }));
    // Update funnel data immediately
    if (funnel) {
      const updated = { ...funnel, data: { ...funnel.data } };
      if (updated.data && fieldId in updated.data && fieldId !== 'slotData') {
        (updated.data as Record<string, unknown>)[fieldId] = value;
      } else if (updated.data) {
        updated.data = {
          ...updated.data,
          slotData: { ...((updated.data.slotData as Record<string, string> | undefined) || {}), [fieldId]: value },
        };
      }
      setFunnel(updated);
      generatePreview(updated);
    }
  };

  const handleSave = () => {
    if (funnel) {
      const mergedData = { ...funnel.data };
      for (const [fieldId, value] of Object.entries(editedContent)) {
        if (fieldId in mergedData && fieldId !== 'slotData') {
          (mergedData as Record<string, unknown>)[fieldId] = value;
        } else {
          mergedData.slotData = { ...(mergedData.slotData || {}), [fieldId]: value };
        }
      }
      const updated: SavedFunnel = {
        ...funnel,
        data: mergedData,
        updatedAt: Date.now(),
      };
      saveFunnel(updated.data, updated.id);
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

