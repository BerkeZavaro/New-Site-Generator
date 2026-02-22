import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Funnel Site Generator (Modular)
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
            <li><strong>Template Manager:</strong> Analyzes your HTML to create the master blueprints.</li>
            <li><strong>Text Generator:</strong> Writes strict, formatted copy that fits your template slots.</li>
            <li><strong>Image Studio:</strong> Generates images sized exactly to your template&apos;s dimensions.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

          <Link
            href="/templates"
            className="group block p-6 bg-gray-800 rounded-lg shadow-md hover:bg-gray-900 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">1. Manage Templates</h3>
            <p className="text-gray-300 text-sm">
              Upload HTML templates and analyze slots/dimensions.
            </p>
          </Link>

          <Link
            href="/wizard"
            className="group block p-6 bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">2. Text Generator</h3>
            <p className="text-blue-100 text-sm">
              Generate headlines & paragraphs strictly formatted for your template.
            </p>
          </Link>

          <Link
            href="/image-studio"
            className="group block p-6 bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">3. Image Studio</h3>
            <p className="text-purple-100 text-sm">
              Generate or upload images matching exact template dimensions.
            </p>
          </Link>

          <Link
            href="/assembler"
            className="group block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-green-300 transition-all transform hover:-translate-y-1"
          >
            <div className="text-green-600 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">4. Final Assembler</h3>
            <p className="text-gray-500 text-sm">
              Merge Text + Images into the master template.
            </p>
          </Link>

          <Link
            href="/saved"
            className="group block p-6 bg-orange-600 rounded-lg shadow-md hover:bg-orange-700 transition-all transform hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-white mb-2">5. Saved Work</h3>
            <p className="text-orange-100 text-sm">
              View your saved text drafts and projects.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
