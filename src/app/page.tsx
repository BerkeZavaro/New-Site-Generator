import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Creatine Funnel Site Generator (Modular)
          </h1>
          <p className="text-xl text-gray-600">
            A specialized toolkit for building high-converting affiliate pages.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What This Tool Does</h2>
          <p className="text-gray-600 mb-4">
            This system separates content creation into specialized workflows to ensure pixel-perfect results:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
            <li><strong>Text Generator:</strong> Writes strict, formatted copy that fits your template slots.</li>
            <li><strong>Image Studio:</strong> Generates images sized exactly to your template&apos;s dimensions.</li>
            <li><strong>Template Manager:</strong> Analyzes your HTML to create the master blueprints.</li>
          </ul>
        </div>

        {/* THE TOOLBOX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* 1. TEXT GENERATOR */}
          <Link
            href="/wizard"
            className="group block p-6 bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">1. Text Generator</h3>
            <p className="text-blue-100 text-sm">
              Generate headlines & paragraphs strictly formatted for your template.
            </p>
          </Link>

          {/* 2. IMAGE STUDIO */}
          <Link
            href="/image-studio"
            className="group block p-6 bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">2. Image Studio</h3>
            <p className="text-purple-100 text-sm">
              Generate or upload images matching exact template dimensions.
            </p>
          </Link>

          {/* 3. MANAGE TEMPLATES */}
          <Link
            href="/templates"
            className="group block p-6 bg-gray-800 rounded-lg shadow-md hover:bg-gray-900 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">Manage Templates</h3>
            <p className="text-gray-300 text-sm">
              Upload HTML templates and analyze slots/dimensions.
            </p>
          </Link>

          {/* 4. MY FUNNELS (Saved Work) */}
          <Link
            href="/funnels"
            className="group block p-6 bg-orange-600 rounded-lg shadow-md hover:bg-orange-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">Saved Work</h3>
            <p className="text-orange-100 text-sm">
              View your saved text drafts and projects.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
