import type { Metadata } from 'next';
import './landing.css';
import { WaitlistForm } from './waitlist-form';

export const metadata: Metadata = {
  title: 'Nuthatch — self-hosted cost tracker for teams',
  description:
    'Open-source dashboard for SaaS subscriptions, cloud usage, and AI API spend. Stash your stack costs where only you can see them.',
  keywords: [
    'saas cost tracking',
    'self-hosted',
    'open source',
    'cloud cost',
    'AI cost',
    'subscription management',
    'FinOps',
    'privacy-first',
  ],
  openGraph: {
    title: 'Nuthatch — self-hosted cost tracker',
    description:
      'Stash your stack costs where only you can see them. One dashboard for SaaS, cloud, and AI spend. Open source. Self-hosted.',
    type: 'website',
    url: 'https://nuthatch.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nuthatch — self-hosted cost tracker',
    description: 'Stash your stack costs where only you can see them. Open source. Self-hosted.',
  },
};

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="site-nav">
        <div className="landing-container nav-inner">
          <a href="/" className="brand" aria-label="Nuthatch home">
            <svg
              width="28"
              height="28"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 6 C 8 6, 10 14, 14 18 L 22 22 C 26 24, 30 26, 32 30 L 30 32 C 26 30, 22 30, 18 28 L 10 24 C 7 22, 6 18, 6 14 L 6 8 Z"
                fill="#1c1a15"
                stroke="#1c1a15"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="1.1" fill="#f5f0e6" />
              <path d="M6 8 L 4 6" stroke="#1c1a15" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 32 30 L 34 33 L 31 33 Z" fill="#a8743c" />
            </svg>
            Nuthatch
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="https://github.com/nuthatch" rel="noopener">
              GitHub
            </a>
            <a href="#waitlist" className="nav-cta">
              Early access
            </a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="landing-container hero-grid">
          <div className="hero-text">
            <span className="eyebrow">
              <span className="dot" />
              Open source · Self-hosted · For teams
            </span>
            <h1>
              Stash your stack
              <br />
              costs where only <em>you</em>
              <br />
              can see them.
            </h1>
            <p className="lede">
              One dashboard for SaaS subscriptions, cloud usage, and AI API spend. Runs on your own
              infra. Your bills never leave your server.
            </p>
            <div className="ctas">
              <a href="#waitlist" className="btn btn-primary">
                Join early access
              </a>
              <a href="https://github.com/nuthatch" className="btn btn-ghost" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                Star on GitHub
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div
              className="terminal"
              role="img"
              aria-label="Sample terminal output showing monthly cost breakdown across cloud, SaaS, and AI"
            >
              <div className="term-chrome">
                <span className="dot" style={{ background: '#ff5f57' }} />
                <span className="dot" style={{ background: '#febc2e' }} />
                <span className="dot" style={{ background: '#28c840' }} />
                <span className="title">~/acme · nuthatch</span>
              </div>
              <div className="term-body">
                <div>
                  <span className="prompt">$</span> <span className="cmd">nuthatch status</span>
                </div>
                <div className="sep">────────────────────────────</div>
                <div className="row">
                  <span className="dim">This month</span>
                  <span className="strong">฿172,450</span>
                </div>
                <div className="row">
                  <span className="dim">vs last</span>
                  <span className="pct-warn">+6.8%</span>
                </div>
                <br />
                <div className="row">
                  <span className="label">Cloud</span>
                  <span className="val">฿82,900</span>
                  <span className="pct">48%</span>
                </div>
                <div className="row">
                  <span className="label">SaaS</span>
                  <span className="val">฿39,900</span>
                  <span className="pct">23%</span>
                </div>
                <div className="row">
                  <span className="label">AI</span>
                  <span className="val">฿32,800</span>
                  <span className="pct">19%</span>
                </div>
                <div className="row">
                  <span className="label">Other</span>
                  <span className="val">฿16,850</span>
                  <span className="pct">10%</span>
                </div>
                <div className="sep">────────────────────────────</div>
                <div>
                  <span className="dim">Next cache:</span> Canva Pro · Nov 29
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="features" style={{ background: 'var(--bg-alt)' }}>
        <div className="landing-container">
          <div className="section-head">
            <div className="section-eyebrow">The behavior</div>
            <h2>
              Nuthatches <em>remember</em> every stash.
              <br />
              So do we.
            </h2>
            <p>
              Named after the bird that hides seeds in the cracks of bark and remembers each spot
              months later. We do the same with your stack costs — tucked away on your own server,
              surfaced exactly when you need them.
            </p>
          </div>
          <div className="feature-grid">
            <div className="feature">
              <div className="feature-icon i1">∑</div>
              <h3>One territory</h3>
              <p>
                SaaS, AWS/GCP/Azure, OpenAI/Anthropic — one dashboard. Fixed subscriptions and
                usage-based costs, side by side.
              </p>
            </div>
            <div className="feature">
              <div className="feature-icon i2">⌂</div>
              <h3>Hidden by you</h3>
              <p>
                Deploy with Docker Compose on your own infra. Envelope encryption, per-tenant keys.
                AGPL v3 open source.
              </p>
            </div>
            <div className="feature">
              <div className="feature-icon i3">◇</div>
              <h3>Flock-ready</h3>
              <p>
                Multi-user with RBAC and audit log. SSO/SAML in Team tier. Built for 5–50 people,
                not solo users.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="compare">
        <div className="landing-container">
          <div className="section-head">
            <div className="section-eyebrow">How it compares</div>
            <h2>
              The <em>self-hosted</em> option
              <br />
              for teams who need full coverage.
            </h2>
          </div>
          <div className="compare-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Capability</th>
                  <th className="col-us" style={{ textAlign: 'center' }}>
                    Nuthatch
                  </th>
                  <th style={{ textAlign: 'center' }}>StackSpend</th>
                  <th style={{ textAlign: 'center' }}>Zylo</th>
                  <th style={{ textAlign: 'center' }}>Wallos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label">Self-hostable</td>
                  <td className="cell us">Yes</td>
                  <td className="cell neutral">—</td>
                  <td className="cell neutral">—</td>
                  <td className="cell yes">Yes</td>
                </tr>
                <tr>
                  <td className="label">Team / multi-user</td>
                  <td className="cell us">Yes</td>
                  <td className="cell yes">Yes</td>
                  <td className="cell yes">Yes</td>
                  <td className="cell neutral">—</td>
                </tr>
                <tr>
                  <td className="label">Cloud + AI + SaaS unified</td>
                  <td className="cell us">Yes</td>
                  <td className="cell yes">Yes</td>
                  <td className="cell neutral">Partial</td>
                  <td className="cell neutral">—</td>
                </tr>
                <tr>
                  <td className="label">Open source license</td>
                  <td className="cell us">AGPL v3</td>
                  <td className="cell neutral">—</td>
                  <td className="cell neutral">—</td>
                  <td className="cell yes">AGPL</td>
                </tr>
                <tr>
                  <td className="label">Transparent pricing</td>
                  <td className="cell us">Yes</td>
                  <td className="cell yes">Yes</td>
                  <td className="cell neutral">Sales call</td>
                  <td className="cell yes">Free</td>
                </tr>
                <tr>
                  <td className="label">Primary segment</td>
                  <td className="cell us">SME teams</td>
                  <td className="cell neutral">Startups</td>
                  <td className="cell neutral">Enterprise</td>
                  <td className="cell neutral">Personal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="block" id="pricing" style={{ background: 'var(--bg-alt)' }}>
        <div className="landing-container">
          <div className="section-head">
            <div className="section-eyebrow">Pricing</div>
            <h2>
              Fair pricing.
              <br />
              <em>Self-host</em> first.
            </h2>
            <p>
              Community edition is free forever and covers the core. Team unlocks enterprise
              features for self-hosters. Cloud is the same product, managed by us.
            </p>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="tier-label">Community</div>
              <h3>Self-host OSS</h3>
              <div className="price-amount">
                <span className="num">Free</span>
              </div>
              <p className="price-desc">AGPL v3. Full core features on your own server.</p>
              <ul className="price-features">
                <li>Manual entry + 20 vendor parsers</li>
                <li>5 API integrations</li>
                <li>Dashboard + charts + alerts</li>
                <li>Multi-user up to 10</li>
                <li>Docker Compose deploy</li>
                <li>Community support</li>
              </ul>
              <a href="https://github.com/nuthatch" className="btn btn-ghost price-cta">
                See on GitHub
              </a>
            </div>

            <div className="price-card featured">
              <span className="price-badge">Most popular</span>
              <div className="tier-label">Team</div>
              <h3>Self-host + enterprise</h3>
              <div className="price-amount">
                <span className="num">$49</span>
                <span className="unit">/ month per org</span>
              </div>
              <p className="price-desc">
                Same code. License key unlocks enterprise plugins. Still self-hosted.
              </p>
              <ul className="price-features">
                <li>Everything in Community</li>
                <li className="plus">SSO / SAML / OIDC</li>
                <li className="plus">Advanced audit log</li>
                <li className="plus">Fine-grained RBAC</li>
                <li className="plus">Unlimited users</li>
                <li className="plus">15 API integrations</li>
                <li className="plus">Anomaly detection</li>
                <li className="plus">Priority email support</li>
              </ul>
              <a href="#waitlist" className="btn btn-primary price-cta">
                Get early access
              </a>
            </div>

            <div className="price-card">
              <div className="tier-label">Cloud</div>
              <h3>Managed hosting</h3>
              <div className="price-amount">
                <span className="num">$19</span>
                <span className="unit">/ month + per user</span>
              </div>
              <p className="price-desc">We host and operate. For teams that prefer zero-ops.</p>
              <ul className="price-features">
                <li>Everything in Team</li>
                <li className="plus">Data hosted in your chosen region</li>
                <li className="plus">Automated backups</li>
                <li className="plus">99.5% SLA</li>
                <li className="plus">Zero infra management</li>
                <li className="plus">Same encryption model</li>
              </ul>
              <a href="#waitlist" className="btn btn-ghost price-cta">
                Join cloud waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="waitlist">
        <div className="landing-container">
          <div className="waitlist-card">
            <h2>
              Get <em>early</em> access.
            </h2>
            <p>
              Private beta launching Q2 2026. We&apos;ll pick 20 design partners from the waitlist.
              <br />
              No spam, unsubscribe anytime.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <span>© 2026 Nuthatch · Open source under AGPL v3</span>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/security">Security</a>
            <a href="/docs">Docs</a>
            <a href="https://github.com/nuthatch">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
