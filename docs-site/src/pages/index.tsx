import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const INSTALLS = [
  {
    label: 'Linux / macOS',
    cmd: 'curl -fsSL https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.sh | sh',
  },
  {
    label: 'Windows',
    cmd: 'irm https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.ps1 | iex',
  },
];

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="lp-copy"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? '✓' : 'Copy'}
    </button>
  );
}

export default function Home(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  const version = String(siteConfig.customFields?.version ?? 'dev');
  const iconSrc = useBaseUrl('/img/icon.png');
  const iconDarkSrc = useBaseUrl('/img/icon-white.png');

  const [osTab, setOsTab] = useState(0);

  return (
    <Layout
      title="Home"
      description="GetThatQuick — Self-hosted AI prompt workbench"
    >
      <div className="lp">
        <div className="lp-wrap">
          {/* ── Main card ──────────────────────────────── */}
          <article className="lp-card lp-card--hero">
            <div className="lp-hero-top">
              <div className="lp-logo-box">
                <img src={iconSrc} alt="" className="lp-logo-box__img lp-logo-box__img--light" />
                <img src={iconDarkSrc} alt="" className="lp-logo-box__img lp-logo-box__img--dark" />
              </div>
              <h1>GetThatQuick</h1>
              <span className="lp-ver">v{version}</span>
            </div>
            <p className="lp-lede">
              <strong>Self-hosted AI prompt workbench</strong> with speech-to-text,
              reusable templates, and multi-provider LLM support. All in a single
              Docker container.
            </p>

            <div className="lp-btns">
              <Link className="lp-btn lp-btn--fill" to="/docs/getting-started">
                Get Started
              </Link>
              <Link className="lp-btn lp-btn--outline" to="/docs/intro">
                Documentation
              </Link>
            </div>
          </article>

          {/* ── Quick install card with tabs ────────────── */}
          <article className="lp-card lp-card--install">
            <h2>Quick Install</h2>
            <p>Run one command to clone, pull the container, and start the app.</p>

            <div className="lp-tabs">
              {INSTALLS.map((item, i) => (
                <button
                  key={item.label}
                  className={`lp-tab ${osTab === i ? 'lp-tab--active' : ''}`}
                  onClick={() => setOsTab(i)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="lp-code-block">
              <div className="lp-code-row">
                <code>{INSTALLS[osTab].cmd}</code>
                <CopyBtn text={INSTALLS[osTab].cmd} />
              </div>
            </div>

            <p className="lp-code-hint">
              Both scripts check for prerequisites, clone the repo, and start the app.
            </p>
          </article>

          {/* ── What it does ───────────────────────────── */}
          <article className="lp-card">
            <h2>What is GetThatQuick?</h2>
            <p>A local-first productivity tool that lets you:</p>
            <ul>
              <li><strong>Speak naturally</strong> and convert voice into structured prompts</li>
              <li><strong>Use templates</strong> to standardize prompt formatting across sessions</li>
              <li><strong>Chat with any LLM</strong> via OpenRouter, OpenAI, Ollama, or GitHub Copilot</li>
              <li><strong>Manage sessions</strong> with full conversation history and project grouping</li>
              <li><strong>Stay fully local</strong> with no cloud dependency or telemetry</li>
            </ul>
          </article>

          {/* ── Navigate ───────────────────────────────── */}
          <article className="lp-card">
            <h2>Explore the Docs</h2>
            <div className="lp-links">
              <Link to="/docs/getting-started" className="lp-link-row">
                <span className="lp-link-row__title">Getting Started</span>
                <span className="lp-link-row__desc">Install, first run, provider configuration</span>
              </Link>
              <Link to="/docs/architecture/overview" className="lp-link-row">
                <span className="lp-link-row__title">Architecture</span>
                <span className="lp-link-row__desc">System overview, data flow, tech stack</span>
              </Link>
              <Link to="/docs/guides/docker-deployment" className="lp-link-row">
                <span className="lp-link-row__title">Docker Deployment</span>
                <span className="lp-link-row__desc">GHCR image, volumes, port mapping</span>
              </Link>
              <Link to="/docs/api/sessions" className="lp-link-row">
                <span className="lp-link-row__title">API Reference</span>
                <span className="lp-link-row__desc">REST endpoints, generation, settings</span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </Layout>
  );
}
