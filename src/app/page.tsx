import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          SNS Content Autopilot
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          AI-powered content planning for Instagram, Threads, and Note
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/calendar"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-instagram text-3xl mb-2">📅</div>
          <h2 className="text-xl font-semibold mb-2">Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your monthly posting schedule
          </p>
        </Link>

        <Link
          href="/ideas"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-threads text-3xl mb-2">💡</div>
          <h2 className="text-xl font-semibold mb-2">Ideas</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Generate and manage content ideas with AI
          </p>
        </Link>

        <Link
          href="/drafts"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-note text-3xl mb-2">✍️</div>
          <h2 className="text-xl font-semibold mb-2">Drafts</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and schedule posts across platforms
          </p>
        </Link>

        <Link
          href="/analytics"
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-gray-600 text-3xl mb-2">📊</div>
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track performance and insights
          </p>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>Set up your database with <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npm run db:push</code></li>
          <li>Seed sample data with <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npm run db:seed</code></li>
          <li>Configure your OpenAI API key in <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">.env</code></li>
          <li>Start generating content ideas and scheduling posts!</li>
        </ol>
      </div>
    </div>
  )
}
