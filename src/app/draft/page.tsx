"use client";

export default function DraftPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Draft</h1>
        <p className="text-gray-600">Draft interface coming soon...</p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Draft System</h2>
        <p className="text-gray-600 mb-4">
          The draft interface will be available once captains are assigned and
          the draft order is set.
        </p>
        <div className="text-sm text-gray-500">
          <p>Features coming:</p>
          <ul className="mt-2 space-y-1">
            <li>• Snake draft with Sleeper-style grid</li>
            <li>• Real-time draft updates</li>
            <li>• Trade indicators</li>
            <li>• Captain authentication</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
