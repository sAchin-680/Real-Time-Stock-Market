import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
      <p className="num text-sm text-gray-100">404</p>
      <h1 className="text-3xl font-semibold text-gray-100">Page not found</h1>
      <p className="max-w-md text-gray-500">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="rounded-lg btn-primary px-4 py-2">
        Back to dashboard
      </Link>
    </main>
  );
}
