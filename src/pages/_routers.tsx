import { createBrowserRouter, redirect, RouteObject } from 'react-router'

import Layout from './_layout'
import { navItems } from './_navigation'
import { navigationItems } from './_navigation-meta'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, loader: () => redirect(navigationItems.proxies.path) },
      { path: '/home', loader: () => redirect(navigationItems.proxies.path) },
      ...navItems.map(
        (item) =>
          ({
            path: item.path,
            Component: item.Component,
          }) as RouteObject,
      ),
    ],
  },
])
