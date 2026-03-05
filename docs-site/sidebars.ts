import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/tech-stack',
        'architecture/data-flow',
      ],
    },
    {
      type: 'category',
      label: 'Client',
      collapsed: true,
      items: [
        'client/overview',
        'client/pages',
        'client/components',
        'client/hooks',
        'client/api-client',
        'client/styling',
      ],
    },
    {
      type: 'category',
      label: 'Server',
      collapsed: true,
      items: [
        'server/overview',
        'server/routes',
        'server/services',
        'server/lib',
        'server/websocket',
        'server/seed-templates',
      ],
    },
    {
      type: 'category',
      label: 'Shared',
      collapsed: true,
      items: [
        'shared/types',
        'shared/schemas',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        'api/sessions',
        'api/templates',
        'api/generate',
        'api/models',
        'api/settings',
        'api/websocket-stt',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/docker-deployment',
        'guides/template-format',
        'guides/github-pages',
      ],
    },
  ],
};

export default sidebars;
