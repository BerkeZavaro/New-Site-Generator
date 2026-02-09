'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UploadedTemplateRenderer } from '@/components/templates/UploadedTemplateRenderer';
import { TEMPLATES, TemplateId, getTemplateConfigById } from '@/lib/templates/registry';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import type { TemplateConfig } from '@/lib/templates/types';
import { getTemplateFields } from '@/lib/generator/templateFields';

// --- HELPER COMPONENTS ---

function getSlotMaxLength(slotId: string, template: TemplateConfig | null): number | undefined {
  if (!template) return undefined;
  const fields = getTemplateFields(template);
  const field = fields.find(f => f.slotId === slotId);
  return field?.maxLength;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function CharacterCounter({ value, maxLength }: { value: string; maxLength?: number }) {
  const currentLength = value.length;
  if (!maxLength) {
    return <div className="absolute bottom-2 right-2 text-xs text-gray-500">{currentLength} chars</div>;
  }
  const isOverLimit = currentLength > maxLength;
  return (
    <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
      {currentLength}/{maxLength}
    </div>
  );
}

function FormattingToolbar({ textareaId, value, onChange }: { textareaId: string; value: string; onChange: (v: string) => void }) {
  const applyFormatting = (tag: 'strong' | 'em') => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const openTag = tag === 'strong' ? '<strong>' : '<em>';
    const closeTag = tag === 'strong' ? '</strong>' : '</em>';
    const newValue = value.substring(0, start) + openTag + (selectedText || '') + closeTag + value.substring(end);
    onChange(newValue);
  };

  return (
    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
      <button type="button" onClick={() => applyFormatting('strong')} className="px-3 py-1 text-sm font-bold bg-white border border-gray-300 rounded hover:bg-gray-100">B</button>
      <button type="button" onClick={() => applyFormatting('em')} className="px-3 py-1 text-sm italic bg-white border border-gray-300 rounded hover:bg-gray-100">I</button>
    </div>
  );
}

// --- MAIN WIZARD CONTENT ---

interface WizardData {
  templateId: TemplateId;
  productName: string;
  productUrl: string;
  websiteUrl: string;
  mainKeyword: string;
  targetStates: string[];
  ageRange: string;
  gender: string;
  country: string;
  region: string;
  tone: string;
  font: string;
  coreNarrative: string;
  slotData?: Record<string, string>;
}

const initialData: WizardData = {
  templateId: '',
  productName: '',
  productUrl: '',
  websiteUrl: '',
  mainKeyword: '',
  targetStates: [],
  ageRange: '',
  gender: '',
  country: 'United States',
  region: '',
  tone: '',
  font: 'Arial',
  coreNarrative: '',
};

function WizardPageContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMappingToSlots, setIsMappingToSlots] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setUploadedTemplates(loadUploadedTemplates());
  }, []);

  const debouncedSlotData = useDebounce(data.slotData || {}, 300);

  const getSelectedTemplate = (): TemplateConfig | null => {
    if (!data.templateId) return null;
    return getTemplateConfigById(data.templateId) || uploadedTemplates.find(t => t.id === data.templateId) || null;
  };

  const updateField = (field: keyof WizardData, value: string | string[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateCoreNarrative = async () => {
    if (!data.productName || !data.mainKeyword) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-core-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          ageRange: data.ageRange,
          gender: data.gender,
          tone: data.tone,
        }),
      });
      const result = await res.json();
      if (result.coreNarrative) updateField('coreNarrative', result.coreNarrative);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to generate narrative.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMapNarrativeToSlots = async () => {
    const selected = getSelectedTemplate();
    if (!selected || !data.coreNarrative) return;
    setIsMappingToSlots(true);
    try {
      const res = await fetch('/api/map-narrative-to-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreNarrative: data.coreNarrative,
          templateId: data.templateId,
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          ageRange: data.ageRange,
          gender: data.gender,
          tone: data.tone,
          templateSlots: selected.slots,
        }),
      });
      const result = await res.json();
      if (result.slots) {
        setData(prev => ({ ...prev, slotData: { ...(prev.slotData || {}), ...result.slots } }));
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to map slots.');
    } finally {
      setIsMappingToSlots(false);
    }
  };

  const handleRegenerateSlot = async (slotId: string, slotType: string) => {
    if (!data.coreNarrative) return;
    const selected = getSelectedTemplate();
    const maxLength = getSlotMaxLength(slotId, selected);
    const effectiveType = maxLength && maxLength < 80 ? 'headline' : slotType;

    try {
      const res = await fetch('/api/regenerate-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          slotType: effectiveType,
          coreNarrative: data.coreNarrative,
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          tone: data.tone,
          maxLength,
        }),
      });
      const result = await res.json();
      if (result.content) {
        setData(prev => ({
          ...prev,
          slotData: { ...(prev.slotData || {}), [slotId]: result.content }
        }));
      }
    } catch (e) { console.error(e); }
  };

  const selected = getSelectedTemplate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Text Generator (Part 2)</h1>
          <div className="text-sm text-gray-500">Step {currentStep} of 4</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-6">1. Basics</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Template</label>
                <select
                  className="w-full border p-2 rounded"
                  value={data.templateId}
                  onChange={e => updateField('templateId', e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {uploadedTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input className="w-full border p-2 rounded" value={data.productName} onChange={e => updateField('productName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Main Keyword</label>
                <input className="w-full border p-2 rounded" value={data.mainKeyword} onChange={e => updateField('mainKeyword', e.target.value)} />
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!data.templateId || !data.productName}
                className="w-full bg-blue-600 text-white py-2 rounded mt-4 disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-6">2. Audience</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tone</label>
                <select className="w-full border p-2 rounded" value={data.tone} onChange={e => updateField('tone', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="professional">Professional</option>
                  <option value="excited">Excited</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
               <div>
                <label className="block text-sm font-medium mb-1">Age Range</label>
                <select className="w-full border p-2 rounded" value={data.ageRange} onChange={e => updateField('ageRange', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="18-35">18-35</option>
                  <option value="35-50">35-50</option>
                  <option value="50+">50+</option>
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                 <button onClick={() => setCurrentStep(1)} className="px-4 py-2 border rounded">Back</button>
                 <button onClick={() => setCurrentStep(3)} className="flex-1 bg-blue-600 text-white py-2 rounded">Next</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-6">3. Narrative</h2>
            <div className="mb-4">
              <button
                onClick={handleGenerateCoreNarrative}
                disabled={isGenerating}
                className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-purple-300"
              >
                {isGenerating ? 'Generating...' : 'Generate Narrative with AI'}
              </button>
            </div>
            <textarea
              className="w-full border p-4 rounded h-96 font-sans text-base"
              value={data.coreNarrative}
              onChange={e => updateField('coreNarrative', e.target.value)}
              placeholder="Your master narrative will appear here..."
            />
            <div className="flex gap-4 mt-6">
               <button onClick={() => setCurrentStep(2)} className="px-4 py-2 border rounded">Back</button>
               <button
                 onClick={async () => {
                   if(data.coreNarrative) {
                     await handleMapNarrativeToSlots();
                     setCurrentStep(4);
                   }
                 }}
                 disabled={!data.coreNarrative}
                 className="flex-1 bg-blue-600 text-white py-2 rounded disabled:bg-gray-300"
               >
                 {isMappingToSlots ? 'Mapping...' : 'Next: Generate Content'}
               </button>
            </div>
          </div>
        )}

        {/* STEP 4: TEXT EDITOR (STRICTLY TEXT) */}
        {currentStep === 4 && selected && (
          <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex-1 overflow-hidden flex gap-6">
              {/* LEFT PANEL: EDITOR */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">
                  Text Content (Strict Limits)
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* CRITICAL FILTER: REMOVE IMAGES & CTAS */}
                  {selected.slots
                    .filter(s => s.type !== 'image' && s.type !== 'cta')
                    .map(slot => {
                      const val = data.slotData?.[slot.id] || '';
                      const max = getSlotMaxLength(slot.id, selected);
                      return (
                        <div key={slot.id} className="relative">
                          <div className="flex justify-between mb-1">
                            <label className="font-medium text-gray-900">{slot.label}</label>
                            {data.coreNarrative && (
                              <button
                                onClick={() => handleRegenerateSlot(slot.id, slot.type)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Regenerate
                              </button>
                            )}
                          </div>
                          {slot.type === 'list' ? (
                            <textarea
                              className="w-full border p-2 rounded"
                              rows={5}
                              value={val}
                              onChange={e => setData(prev => ({ ...prev, slotData: { ...(prev.slotData || {}), [slot.id]: e.target.value } }))}
                            />
                          ) : (
                            <>
                              <FormattingToolbar
                                textareaId={`txt-${slot.id}`}
                                value={val}
                                onChange={v => setData(prev => ({ ...prev, slotData: { ...(prev.slotData || {}), [slot.id]: v } }))}
                              />
                              <textarea
                                id={`txt-${slot.id}`}
                                className="w-full border p-2 rounded font-sans text-lg"
                                rows={max && max < 100 ? 2 : 4}
                                value={val}
                                onChange={e => setData(prev => ({ ...prev, slotData: { ...(prev.slotData || {}), [slot.id]: e.target.value } }))}
                              />
                            </>
                          )}
                          <CharacterCounter value={val} maxLength={max} />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* RIGHT PANEL: PREVIEW / CODE */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">
                  Preview & Code
                </div>
                <div className="flex-1 overflow-hidden relative">
                   {/* This Renderer will show the COPY CODE button */}
                   <UploadedTemplateRenderer template={selected} slotData={debouncedSlotData} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button onClick={() => setCurrentStep(3)} className="px-6 py-2 border rounded bg-white">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WizardPage() {
  return <Suspense fallback={<div>Loading...</div>}><WizardPageContent /></Suspense>;
}
