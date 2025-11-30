'use client';

import { useState } from 'react';
import Link from 'next/link';
import CreatineReportTemplate, { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';

interface WizardData {
  // Step 1: Template & basics
  template: string;
  productName: string;
  productUrl: string;
  mainKeyword: string;
  
  // Step 2: Audience & tone
  ageRange: string;
  gender: string;
  country: string;
  region: string;
  tone: string;
  
  // Step 3: Content placeholders
  pageHeadline: string;
  introParagraph: string;
  mainBenefits: string;
}

const initialData: WizardData = {
  template: 'creatine-report-default',
  productName: '',
  productUrl: '',
  mainKeyword: '',
  ageRange: '',
  gender: '',
  country: '',
  region: '',
  tone: '',
  pageHeadline: '',
  introParagraph: '',
  mainBenefits: '',
};

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = (field: keyof WizardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      return data.productName.trim() !== '' && data.mainKeyword.trim() !== '';
    }
    if (currentStep === 2) {
      return data.ageRange !== '' && data.gender !== '' && data.tone !== '';
    }
    return true;
  };

  const goNext = () => {
    if (canGoNext() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateContent = async () => {
    // Validate required fields
    if (!data.productName || !data.mainKeyword) {
      setErrorMessage('Product name and main keyword are required to generate content.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const payload = {
        productName: data.productName,
        mainKeyword: data.mainKeyword,
        ageRange: data.ageRange,
        gender: data.gender,
        country: data.country || undefined,
        state: data.region || undefined,
        tone: data.tone,
      };

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrorMessage('Content generation failed. Please try again or edit manually.');
        return;
      }

      const result = await response.json();
      const { headline, intro, benefits } = result;

      // Update wizard state with generated content
      updateField('pageHeadline', headline);
      updateField('introParagraph', intro);
      updateField('mainBenefits', benefits.join('\n'));

      setErrorMessage(null);
    } catch (error) {
      console.error('Content generation error:', error);
      setErrorMessage('Content generation failed. Please try again or edit manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const previewProps = buildPreviewProps(data);
      const slug = data.mainKeyword
        ? data.mainKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : 'funnel';

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, props: previewProps }),
      });

      if (!response.ok) {
        alert('Export failed. Please try again.');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const buildPreviewProps = (formState: WizardData): CreatineReportProps => {
    // Build breadcrumb
    const breadcrumb = `Creatine Product Buyer's Guide > ${formState.productName || 'Supplement Review'}`;

    // Build page title
    const pageTitle = formState.pageHeadline || formState.productName || 'Creatine Supplement Review';

    // Build main lead
    let mainLead = formState.introParagraph;
    if (!mainLead || mainLead.trim() === '') {
      const keywordText = formState.mainKeyword ? ` about ${formState.mainKeyword}` : '';
      mainLead = `${formState.productName || 'This creatine supplement'} is a high-quality product${keywordText}. This comprehensive review examines its effectiveness, ingredients, and value for money.`;
    }

    // Build main benefits
    let mainBenefits: string[] = [];
    if (formState.mainBenefits && formState.mainBenefits.trim() !== '') {
      mainBenefits = formState.mainBenefits
        .split('\n')
        .map(b => b.trim())
        .filter(b => b !== '');
    }
    if (mainBenefits.length === 0) {
      mainBenefits = [
        'Increases muscle strength and power output',
        'Enhances muscle recovery after workouts',
        'Supports muscle growth and size gains',
        'Improves exercise performance and endurance',
        'Helps maintain muscle mass during training'
      ];
    }

    // Build paragraph sections using wizard data
    const ageText = formState.ageRange ? ` for ${formState.ageRange}` : '';
    const genderText = formState.gender && formState.gender !== 'all' ? ` ${formState.gender}` : '';
    const locationText = formState.country ? ` in ${formState.country}` : '';
    const toneText = formState.tone ? ` with a ${formState.tone} tone` : '';
    const keywordText = formState.mainKeyword ? ` related to ${formState.mainKeyword}` : '';

    const effectivenessParagraphs = [
      `${formState.productName || 'This creatine supplement'} contains pure creatine monohydrate, which is the most researched and proven form of creatine available. Studies consistently show that creatine monohydrate supplementation can increase muscle creatine stores by up to 40%, leading to improved performance in high-intensity activities.`,
      `The product is designed${ageText}${genderText ? ` for ${genderText} users` : ''}${locationText}${toneText}. Each serving provides 5 grams of creatine monohydrate, which is the standard effective dose recommended by research.`,
      `Users typically report noticeable improvements in strength and muscle fullness within 2-4 weeks of consistent use, especially when combined with proper training and nutrition.`
    ];

    const comparisonParagraphs = [
      `Compared to other creatine supplements on the market, ${formState.productName || 'this product'} offers excellent value. While some brands charge premium prices for "advanced" forms of creatine, research shows that creatine monohydrate is equally effective and often more cost-efficient.`,
      `The product stands out for its purity and lack of unnecessary additives. Unlike some competitors that include fillers or proprietary blends, this supplement provides exactly what you need: pure creatine monohydrate${keywordText}.`,
      `When compared to leading brands, ${formState.productName || 'this creatine supplement'} delivers similar results at a more affordable price point, making it an excellent choice for budget-conscious athletes and fitness enthusiasts.`
    ];

    const reviewParagraphs = [
      `Customer reviews consistently praise ${formState.productName || 'this product'} for its effectiveness and value. Many users report significant strength gains and improved workout performance after just a few weeks of use.`,
      `The powder mixes easily in water or juice, with minimal clumping. Some users note a slight chalky taste, which is common with creatine supplements, but it's generally well-tolerated.`,
      `The packaging is functional and includes a scoop for easy measuring. The product arrives well-sealed and fresh, with a long shelf life when stored properly.`
    ];

    const bottomLineParagraph = `${formState.productName || 'This creatine supplement'} is a solid choice for anyone looking to supplement with creatine monohydrate${keywordText}. It offers proven effectiveness, good value for money, and reliable quality. While it may not have the flashy marketing of premium brands, it delivers the results you need at a reasonable price. Recommended for athletes, bodybuilders, and fitness enthusiasts looking to enhance their performance and muscle gains.`;

    return {
      breadcrumb,
      pageTitle,
      updatedTag: 'Updated November 2025',
      productName: formState.productName || 'Creatine Supplement',
      productImageAlt: `Product image for ${formState.productName || 'this creatine supplement'}`,
      mainLead,
      mainBenefits,
      effectivenessParagraphs,
      comparisonParagraphs,
      reviewParagraphs,
      bottomLineParagraph,
      ratings: {
        customerService: 5,
        valueRating: 5,
        customerRating: 5,
        overallRating: 5,
      },
      productUrl: formState.productUrl || '#',
      sidebarDiscoverItems: [
        'How creatine monohydrate works in your body',
        'The science behind muscle strength gains',
        'Optimal dosing strategies for best results',
        'Common myths about creatine debunked',
        'How to cycle creatine effectively'
      ],
      sidebarTopItems: [
        'Purity and quality of ingredients',
        'Dosage and serving size',
        'Price and value for money',
        'Mixability and taste',
        'Customer reviews and ratings',
        'Third-party testing and certifications'
      ],
      newsletterTitle: 'Stay Updated',
      newsletterDesc: 'Get the latest creatine research, product reviews, and fitness tips delivered to your inbox.'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to home
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              New Funnel Wizard
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            Step {currentStep} of 3
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side: Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Step 1: Template & basics */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Template & Basics
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.template}
                        onChange={(e) => updateField('template', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="creatine-report-default">
                          Creatine Report (default)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplement / Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.productName}
                        onChange={(e) => updateField('productName', e.target.value)}
                        placeholder="e.g. CreaPure Creatine Monohydrate"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Product URL
                      </label>
                      <input
                        type="text"
                        value={data.productUrl}
                        onChange={(e) => updateField('productUrl', e.target.value)}
                        placeholder="https://example.com/product"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Keyword / Topic <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.mainKeyword}
                        onChange={(e) => updateField('mainKeyword', e.target.value)}
                        placeholder="e.g. creatine bloating"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Audience & tone */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Audience & Tone
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Range <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.ageRange}
                        onChange={(e) => updateField('ageRange', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select age range</option>
                        <option value="18-34">18–34</option>
                        <option value="35+">35+</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={data.country}
                        onChange={(e) => updateField('country', e.target.value)}
                        placeholder="e.g. United States"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State / Region <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={data.region}
                        onChange={(e) => updateField('region', e.target.value)}
                        placeholder="e.g. California"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone of Voice <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.tone}
                        onChange={(e) => updateField('tone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select tone</option>
                        <option value="serious">Serious</option>
                        <option value="educational">Educational</option>
                        <option value="cheerful">Cheerful</option>
                        <option value="direct">Direct</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Content placeholders */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Content Placeholders
                  </h2>

                  <div className="mb-6">
                    <button
                      onClick={handleGenerateContent}
                      disabled={isGenerating || !data.productName || !data.mainKeyword}
                      className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
                        isGenerating || !data.productName || !data.mainKeyword
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isGenerating ? 'Generating content...' : 'Generate content with AI'}
                    </button>
                    {isGenerating && (
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Generating content...
                      </p>
                    )}
                    {errorMessage && (
                      <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Headline
                      </label>
                      <input
                        type="text"
                        value={data.pageHeadline}
                        onChange={(e) => updateField('pageHeadline', e.target.value)}
                        placeholder="e.g. Does Creatine Cause Bloating? Here's What Science Says"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Intro Paragraph
                      </label>
                      <textarea
                        value={data.introParagraph}
                        onChange={(e) => updateField('introParagraph', e.target.value)}
                        placeholder="Write a brief introduction..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Benefits <span className="text-gray-500">(one per line)</span>
                      </label>
                      <textarea
                        value={data.mainBenefits}
                        onChange={(e) => updateField('mainBenefits', e.target.value)}
                        placeholder="Increases muscle strength&#10;Improves workout performance&#10;Enhances muscle recovery"
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="w-full px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={goBack}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 rounded-md font-medium ${
                    currentStep === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Back
                </button>

                <button
                  onClick={goNext}
                  disabled={!canGoNext() || currentStep === 3}
                  className={`px-6 py-2 rounded-md font-medium ${
                    !canGoNext() || currentStep === 3
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right side: Summary */}
          <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Live Summary
              </h3>

              {/* Template & basics */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Template & Basics
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Template:</span>{' '}
                    <span className="text-gray-900">Creatine Report (default)</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>{' '}
                    <span className="text-gray-900">
                      {data.productName || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">URL:</span>{' '}
                    <span className="text-gray-900 break-all">
                      {data.productUrl || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Keyword:</span>{' '}
                    <span className="text-gray-900">
                      {data.mainKeyword || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audience & tone */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Audience & Tone
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Age:</span>{' '}
                    <span className="text-gray-900">
                      {data.ageRange || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gender:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.gender || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>{' '}
                    <span className="text-gray-900">
                      {data.country || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Region:</span>{' '}
                    <span className="text-gray-900">
                      {data.region || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tone:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.tone || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content draft */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Content Draft
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Headline:</span>
                    <span className="text-gray-900">
                      {data.pageHeadline || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Intro:</span>
                    <span className="text-gray-900">
                      {data.introParagraph ? (
                        <span className="block text-xs leading-relaxed">
                          {data.introParagraph.substring(0, 100)}
                          {data.introParagraph.length > 100 && '...'}
                        </span>
                      ) : (
                        <em className="text-gray-400">Not set yet</em>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Benefits:</span>
                    {data.mainBenefits ? (
                      <ul className="list-disc list-inside text-xs text-gray-900 space-y-1">
                        {data.mainBenefits.split('\n').filter(b => b.trim()).slice(0, 5).map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    ) : (
                      <em className="text-gray-400">Not set yet</em>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Generated Page Preview
              </h2>
              <button
                onClick={handleExport}
                className="px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Export for WebDev (HTML)
              </button>
            </div>
            <CreatineReportTemplate {...buildPreviewProps(data)} />
          </div>
        )}
      </div>
    </div>
  );
}

