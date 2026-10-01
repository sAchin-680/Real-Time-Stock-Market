import type { Metadata } from "next";
import { LegalDoc, Section } from "@/components/legal/LegalDoc";

export const metadata: Metadata = { title: "Risk & Data Disclaimer" };

export default function DisclaimerPage() {
  return (
    <LegalDoc
      title="Risk & Data Disclaimer"
      summary="Tickline shows information, not advice. Investing involves risk, including loss of principal. Market data can be delayed or wrong, and calculated figures depend on the transactions you enter."
    >
      <Section title="Not investment advice">
        <p>
          Tickline is a personal portfolio-tracking and information tool. It is not a registered investment adviser, broker-dealer or financial
          institution. Nothing displayed — prices, metrics, heatmaps, alerts, news or automatically generated email summaries — is a recommendation or solicitation
          to buy, sell or hold any security. Consult a qualified professional before making financial decisions.
        </p>
      </Section>

      <Section title="Investment risk">
        <p>
          Securities and cryptocurrencies are volatile. Past performance does not guarantee future results, and you may lose some or all of your
          investment. Risk metrics such as beta and concentration are simplified estimates, not forecasts.
        </p>
      </Section>

      <Section title="Market data">
        <ul>
          <li>Quotes, trades, fundamentals and news are provided by Finnhub; charts and some widgets by TradingView.</li>
          <li>&ldquo;Live&rdquo; prices reflect the latest trades available from our provider and may be delayed, incomplete or interrupted. When streaming is unavailable, Tickline falls back to periodic updates and labels them &ldquo;Delayed&rdquo;.</li>
          <li>Extended-hours and holiday schedules follow published NYSE calendars; edge cases may differ.</li>
        </ul>
      </Section>

      <Section title="Calculations">
        <p>
          Portfolio values, cost basis (FIFO), realized and unrealized P&amp;L and attributions are computed from the transactions you enter and the
          market data we receive. They are not tax documents. Your broker&apos;s statements are the authoritative record.
        </p>
      </Section>

      <Section title="Alerts">
        <p>
          Alerts are evaluated periodically during regular market hours and delivered by email on a best-effort basis. They can be delayed or missed and
          should not be relied on for time-critical trading.
        </p>
      </Section>
    </LegalDoc>
  );
}
