import { LEGAL } from "@/lib/legal";

/** Long-form legal document with a consistent, readable typographic scale. */
export function LegalDoc({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <article className="legal max-w-[72ch]">
      <p className="label">Effective {LEGAL.effective}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-100">{title}</h1>
      <p className="mt-4 rounded-md border border-gray-600 bg-gray-800 p-4 text-[14px] leading-relaxed text-gray-400">{summary}</p>
      <div className="mt-8 space-y-8">{children}</div>
    </article>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-400 [&_a]:text-gray-100 [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-gray-100 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function Contact() {
  return LEGAL.contact ? (
    <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>
  ) : (
    <a href={LEGAL.contactUrl} target="_blank" rel="noopener noreferrer">our GitHub issue tracker</a>
  );
}
