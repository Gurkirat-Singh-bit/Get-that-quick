import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import React from 'react';

/* ── Inline SVG icons (Lucide-style) ── */

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

function ContainerIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
      <path d="M6 18h12" />
      <path d="M6 14h12" />
      <path d="m12 3.34 10 4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <MicIcon />,
    title: 'Local Speech-to-Text',
    description: 'Vosk-powered STT runs on your machine. 20+ language models. No cloud APIs needed.',
  },
  {
    icon: <LayoutIcon />,
    title: 'Template System',
    description: 'Create, manage, and share prompt templates with YAML frontmatter. Sync community templates from GitHub.',
  },
  {
    icon: <ZapIcon />,
    title: 'Multi-Provider LLM',
    description: 'OpenRouter, OpenAI, Ollama, LM Studio, or any OpenAI-compatible endpoint.',
  },
  {
    icon: <ContainerIcon />,
    title: 'Single Docker Container',
    description: 'One container, one command. Data persisted to ~/getthatquick via bind mount.',
  },
  {
    icon: <MessageIcon />,
    title: 'Chat Interface',
    description: 'Streaming responses, markdown rendering, code highlighting, thinking tokens, plan mode.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Self-Hosted',
    description: 'No accounts, no telemetry, no cloud dependency. Everything stays on your machine.',
  },
];

function HeroSection() {
  const {siteConfig} = useDocusaurusContext();
  const logoSrc = useBaseUrl('/img/icon-white.png');
  return (
    <header className="hero-gtq">
      <div className="container">
        <img src={logoSrc} alt="GetThatQuick" className="hero-gtq__logo" />
        <h1 className="hero-gtq__title">{siteConfig.title}</h1>
        <p className="hero-gtq__subtitle">{siteConfig.tagline}</p>
        <div className="hero-gtq__actions">
          <Link className="hero-gtq__btn-primary" to="/docs/getting-started">
            Get Started
          </Link>
          <Link className="hero-gtq__btn-secondary" to="/docs/architecture/overview">
            Architecture
          </Link>
          <Link
            className="hero-gtq__btn-secondary"
            href="https://github.com/Gurkirat-Singh-bit/Get-that-quick"
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function QuickInfo() {
  return (
    <div className="quick-info">
      <div className="quick-info__item">
        <span className="quick-info__value">Bun + Hono</span>
        <span className="quick-info__label">Runtime</span>
      </div>
      <div className="quick-info__item">
        <span className="quick-info__value">React 19</span>
        <span className="quick-info__label">Frontend</span>
      </div>
      <div className="quick-info__item">
        <span className="quick-info__value">20+</span>
        <span className="quick-info__label">STT Languages</span>
      </div>
      <div className="quick-info__item">
        <span className="quick-info__value">Docker</span>
        <span className="quick-info__label">Deployment</span>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="features-section">
      <p className="features-section__heading">What you get</p>
      <div className="features-grid">
        {FEATURES.map((feature, i) => (
          <div key={i} className="feature-card">
            <div className="feature-card__icon">{feature.icon}</div>
            <h3 className="feature-card__title">{feature.title}</h3>
            <p className="feature-card__desc">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home(): React.ReactElement {
  return (
    <Layout title="Home" description="Self-hosted AI prompt workbench documentation">
      <HeroSection />
      <QuickInfo />
      <main>
        <FeaturesSection />
      </main>
    </Layout>
  );
}
