import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/Get-that-quick/docs',
    component: ComponentCreator('/Get-that-quick/docs', '5dd'),
    routes: [
      {
        path: '/Get-that-quick/docs',
        component: ComponentCreator('/Get-that-quick/docs', '49f'),
        routes: [
          {
            path: '/Get-that-quick/docs',
            component: ComponentCreator('/Get-that-quick/docs', '6a8'),
            routes: [
              {
                path: '/Get-that-quick/docs/',
                component: ComponentCreator('/Get-that-quick/docs/', '698'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/generate',
                component: ComponentCreator('/Get-that-quick/docs/api/generate', '212'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/models',
                component: ComponentCreator('/Get-that-quick/docs/api/models', '4b6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/sessions',
                component: ComponentCreator('/Get-that-quick/docs/api/sessions', '503'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/settings',
                component: ComponentCreator('/Get-that-quick/docs/api/settings', 'ca2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/templates',
                component: ComponentCreator('/Get-that-quick/docs/api/templates', '513'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/api/websocket-stt',
                component: ComponentCreator('/Get-that-quick/docs/api/websocket-stt', '117'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/architecture/data-flow',
                component: ComponentCreator('/Get-that-quick/docs/architecture/data-flow', '3da'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/architecture/overview',
                component: ComponentCreator('/Get-that-quick/docs/architecture/overview', '38d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/architecture/tech-stack',
                component: ComponentCreator('/Get-that-quick/docs/architecture/tech-stack', 'da8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/api-client',
                component: ComponentCreator('/Get-that-quick/docs/client/api-client', '6c3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/components',
                component: ComponentCreator('/Get-that-quick/docs/client/components', 'e04'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/hooks',
                component: ComponentCreator('/Get-that-quick/docs/client/hooks', '39f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/overview',
                component: ComponentCreator('/Get-that-quick/docs/client/overview', 'b03'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/pages',
                component: ComponentCreator('/Get-that-quick/docs/client/pages', 'ae3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/client/styling',
                component: ComponentCreator('/Get-that-quick/docs/client/styling', '7b0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/getting-started',
                component: ComponentCreator('/Get-that-quick/docs/getting-started', '7b4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/guides/docker-deployment',
                component: ComponentCreator('/Get-that-quick/docs/guides/docker-deployment', '217'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/guides/github-pages',
                component: ComponentCreator('/Get-that-quick/docs/guides/github-pages', '5e9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/guides/template-format',
                component: ComponentCreator('/Get-that-quick/docs/guides/template-format', 'bf8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/lib',
                component: ComponentCreator('/Get-that-quick/docs/server/lib', 'bd0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/overview',
                component: ComponentCreator('/Get-that-quick/docs/server/overview', '655'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/routes',
                component: ComponentCreator('/Get-that-quick/docs/server/routes', 'fb8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/seed-templates',
                component: ComponentCreator('/Get-that-quick/docs/server/seed-templates', 'b98'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/services',
                component: ComponentCreator('/Get-that-quick/docs/server/services', '547'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/server/websocket',
                component: ComponentCreator('/Get-that-quick/docs/server/websocket', '259'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/shared/schemas',
                component: ComponentCreator('/Get-that-quick/docs/shared/schemas', 'f11'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/Get-that-quick/docs/shared/types',
                component: ComponentCreator('/Get-that-quick/docs/shared/types', '331'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/Get-that-quick/',
    component: ComponentCreator('/Get-that-quick/', '722'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
