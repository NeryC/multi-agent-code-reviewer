import { ReviewerClient } from './reviewer-client';

export default function Home() {
  return (
    <main className="container mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Multi-Agent Code Reviewer</h1>
        <p className="text-muted-foreground">
          Paste a snippet or a GitHub file URL. Three specialized AI agents review your code in
          parallel — security, performance, and maintainability — and a supervisor synthesizes a
          scored report.
        </p>
      </header>
      <ReviewerClient />
    </main>
  );
}
