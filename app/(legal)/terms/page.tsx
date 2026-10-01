import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalDoc, Section } from "@/components/legal/LegalDoc";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      summary="Tickline is an information tool for tracking your own portfolio. It does not give investment advice or execute trades, and market data may be delayed or inaccurate. Use it at your own discretion, keep your account secure, and don't misuse the service."
    >
      <Section title="1. Agreement">
        <p>
          By creating an account, signing in (including with Google, Apple or Microsoft) or using the demo, you agree to these Terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, don&apos;t use Tickline.
        </p>
      </Section>

      <Section title="2. The service">
        <p>
          Tickline lets you record transactions, track positions and performance, maintain watchlists, set price alerts and view market data and news.
          Tickline is <strong>not a broker</strong>: it does not hold funds or securities, connect to brokerage accounts or place orders. &ldquo;Trades&rdquo;
          in Tickline are records you enter yourself.
        </p>
      </Section>

      <Section title="3. Not investment advice">
        <p>
          Nothing in Tickline is investment, financial, legal or tax advice, or a recommendation to buy or sell any security. You are solely responsible
          for your investment decisions. Read the <Link href="/disclaimer">Risk &amp; Data Disclaimer</Link>.
        </p>
      </Section>

      <Section title="4. Your account">
        <ul>
          <li>You must be at least 16 years old and provide accurate information.</li>
          <li>Keep your credentials secure; you are responsible for activity under your account. Tell us promptly about any unauthorised use.</li>
          <li>Demo workspaces are temporary sandboxes and are deleted automatically after 24 hours.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>break the law, infringe others&apos; rights, or use Tickline to manipulate markets;</li>
          <li>scrape, resell or redistribute market data shown in Tickline;</li>
          <li>probe, overload or interfere with the service, bypass rate limits or access other users&apos; data;</li>
          <li>reverse engineer the service except where the law allows.</li>
        </ul>
      </Section>

      <Section title="6. Market data and third-party content">
        <p>
          Quotes, fundamentals, news and charts come from third parties such as Finnhub and TradingView and are subject to their terms. They may be
          delayed, incomplete or inaccurate, and we can&apos;t guarantee their availability.
        </p>
      </Section>

      <Section title="7. Your content">
        <p>
          You own the data you enter (transactions, notes, watchlists, alerts). You grant us a limited licence to store and process it solely to provide
          the service. You can export or delete it at any time.
        </p>
      </Section>

      <Section title="8. Availability and changes">
        <p>
          We aim for Tickline to be available and accurate but provide it &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We may change, suspend or
          discontinue features, and we may update these Terms; continued use after changes means you accept them.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You can stop using Tickline and delete your account at any time from the account menu. We may suspend or terminate accounts that violate these
          Terms or put the service or other users at risk.
        </p>
      </Section>

      <Section title="10. Disclaimers and limitation of liability">
        <p>
          To the fullest extent permitted by law, Tickline is provided without warranties of any kind, express or implied, including accuracy, fitness for
          a particular purpose and non-infringement. We are not liable for any investment losses, trading decisions, missed or delayed alerts, data errors,
          or any indirect, incidental, special or consequential damages. Our total liability for any claim is limited to the greater of the amount you paid
          us in the 12 months before the claim (currently zero) or USD 100. Some jurisdictions don&apos;t allow these limits, so they may not fully apply to you.
        </p>
      </Section>

      <Section title="11. Indemnity">
        <p>You agree to indemnify us against claims arising from your misuse of Tickline or violation of these Terms.</p>
      </Section>

      <Section title="12. Contact">
        <p>Questions about these Terms: <Contact />.</p>
      </Section>
    </LegalDoc>
  );
}
