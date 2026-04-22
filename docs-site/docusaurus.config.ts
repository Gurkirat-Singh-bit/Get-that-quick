import fs from 'node:fs';
import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as {version: string};

const appVersion = process.env.DOCS_VERSION ?? packageJson.version;

const config: Config = {
  title: 'GetThatQuick',
  tagline: 'Self-hosted AI prompt workbench with speech-to-text, templates & multi-provider LLM support',
  favicon: 'img/favicon.ico',

  url: 'https://gurkirat-singh-bit.github.io',
  baseUrl: '/Get-that-quick/',

  organizationName: 'Gurkirat-Singh-bit',
  projectName: 'Get-that-quick',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    version: appVersion,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Gurkirat-Singh-bit/Get-that-quick/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    announcementBar: {
      id: 'release-version',
      content: `Now shipping <strong>v${appVersion}</strong> with container-first deployment and automated releases.`,
      backgroundColor: '#102033',
      textColor: '#eff6ff',
      isCloseable: true,
    },
    navbar: {
      title: 'GetThatQuick',
      logo: {
        alt: 'GetThatQuick Logo',
        src: 'img/icon.png',
        srcDark: 'img/icon-white.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Project Docs',
        },
        {
          to: '/',
          label: 'Overview',
          position: 'left',
        },
        {
          to: '/docs/getting-started',
          label: 'Get Started',
          position: 'left',
        },
        {
          type: 'html',
          position: 'right',
          value: `<span class="navbar-version">v${appVersion}</span>`,
        },
        {
          href: 'https://github.com/Gurkirat-Singh-bit/Get-that-quick',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
            { label: 'API Reference', to: '/docs/api/sessions' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/Gurkirat-Singh-bit/Get-that-quick' },
            { label: 'License', href: 'https://github.com/Gurkirat-Singh-bit/Get-that-quick/blob/main/LICENSE' },
            { label: `Version ${appVersion}`, to: '/' },
          ],
        },
      ],
      copyright: `GetThatQuick v${appVersion} • Copyright © ${new Date().getFullYear()} Gurkirat Singh. CC BY-NC 4.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'docker', 'typescript'],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
