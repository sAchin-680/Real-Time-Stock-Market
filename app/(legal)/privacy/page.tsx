import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalDoc, Section } from "@/components/legal/LegalDoc";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      summary="We collect only what Tickline needs to run your account: your sign-in details, the portfolio data you enter and basic security logs. We don't sell data, show ads or use tracking cookies. You can export or delete everything at any time from the account menu."
    >
      <Section title="1. Who we are">
        <p>
          Tickline (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a portfolio tracking and market data application. This policy explains what personal data we process
          when you use Tickline, why, and the choices you have. Questions or requests: <Contact />.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <ul>
          <li><strong>Account data</strong> — your name and email address. If you sign up with email, a salted hash of your password (we never store it in plain text). If you use Google, Apple or Microsoft, the provider&apos;s account identifier and the profile details they share (name, email).</li>
          <li><strong>Profile answers</strong> — the optional country, investment goal, risk tolerance and preferred industry you give at sign-up, used to personalise emails.</li>
          <li><strong>Portfolio data you enter</strong> — transactions (symbol, quantity, price, fees, date, notes), watchlist symbols and price alerts.</li>
          <li><strong>Session and security data</strong> — session tokens, and the IP address and browser user agent recorded with each session, used to keep your account secure and to rate-limit abuse.</li>
          <li><strong>Operational logs</strong> — errors and request metadata kept by our hosting provider for a limited period.</li>
        </ul>
        <p>We do not collect payment details, government IDs or brokerage credentials, and we do not connect to your brokerage accounts.</p>
      </Section>

      <Section title="3. How we use it">
        <ul>
          <li>To provide the service: authenticate you, store and value your portfolio, evaluate alerts and show market data.</li>
          <li>To send the emails you expect: a welcome email, price-alert notifications and, if enabled, a daily market digest.</li>
          <li>To keep Tickline secure and reliable: rate limiting, abuse prevention, debugging.</li>
        </ul>
        <p>
          Legal bases (where GDPR applies): performance of our contract with you (running your account), our legitimate interests (security, service
          improvement) and, where required, your consent.
        </p>
      </Section>

      <Section title="4. Service providers">
        <p>We share data only with providers that help us run Tickline, under their own privacy and security terms:</p>
        <ul>
          <li><strong>Vercel</strong> — application hosting and logs.</li>
          <li><strong>MongoDB Atlas</strong> — database storage for your account and portfolio data.</li>
          <li><strong>Inngest</strong> — background jobs (alert checks, emails); receives event data such as your email and profile answers.</li>
          <li><strong>Google Gemini</strong> — generates the text of personalised welcome emails and news digests from your profile answers and market news.</li>
          <li><strong>Email provider (SMTP)</strong> — delivers alert and digest emails to your address.</li>
          <li><strong>Finnhub</strong> — market data. We send ticker symbols, never your identity.</li>
          <li><strong>TradingView</strong> — charts and widgets loaded in your browser; TradingView may collect technical data under its own policy.</li>
          <li><strong>Google, Apple, Microsoft</strong> — only if you choose to sign in with them.</li>
        </ul>
        <p>We do not sell or rent personal data and do not share it for advertising.</p>
      </Section>

      <Section title="5. Cookies and local storage">
        <p>
          Tickline uses <strong>strictly necessary cookies only</strong>: a secure, HTTP-only session cookie that keeps you signed in. Your browser&apos;s
          local and session storage hold interface preferences and today&apos;s live portfolio chart; they never leave your device. We use no analytics,
          advertising or cross-site tracking cookies, so no consent banner is needed.
        </p>
      </Section>

      <Section title="6. Retention">
        <ul>
          <li>Account and portfolio data: kept while your account exists; deleted immediately when you delete your account.</li>
          <li>Demo workspaces: deleted automatically after 24 hours.</li>
          <li>Sessions: expire after 7 days of inactivity.</li>
          <li>Hosting logs: retained by our providers for a limited period according to their policies.</li>
        </ul>
      </Section>

      <Section title="7. Your rights and choices">
        <p>Depending on where you live (for example under GDPR or CCPA), you may have the right to access, correct, export, delete or restrict the use of your data, and to object to processing. In Tickline you can:</p>
        <ul>
          <li><strong>Export</strong> all of your data as JSON from the account menu (Export my data).</li>
          <li><strong>Delete</strong> your account and all associated data from the account menu (Delete account).</li>
          <li><strong>Edit or delete</strong> individual transactions, watchlist items and alerts at any time.</li>
        </ul>
        <p>For anything else, contact us at <Contact />. You may also complain to your local data protection authority.</p>
      </Section>

      <Section title="8. Security">
        <p>
          Data is encrypted in transit (HTTPS with HSTS). Passwords are hashed, sessions use secure HTTP-only cookies, inputs are validated and requests
          are rate limited. No system is perfectly secure, but we work to protect your data and will notify affected users of a breach as required by law.
        </p>
      </Section>

      <Section title="9. International transfers">
        <p>Our providers may process data in the United States and other countries. Where required, transfers rely on appropriate safeguards such as Standard Contractual Clauses.</p>
      </Section>

      <Section title="10. Children">
        <p>Tickline is not directed to children under 16, and we do not knowingly collect their data. If you believe a child has created an account, contact us and we will delete it.</p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update this policy as Tickline evolves. Material changes will be highlighted in the app; the effective date above shows the latest version.
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalDoc>
  );
}
