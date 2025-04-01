import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { Script } from "./quartz/components/Script"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
    Component.Header({
      title: "Ethereum Localism",
      links: {
        "Introduction": "/introduction",
        "Library": "/library",
        "Resources": "/resources",
      }
    }),
    Component.Darkmode(),
    Component.Search(),
  ],
  afterBody: [
    Component.Graph(),
    Component.Backlinks(),
    Script({ src: "/internal/resources/static/js/resource-tiles.js" }),
    Script({ 
      script: `
        document.addEventListener('DOMContentLoaded', () => {
          const tileManager = new ResourceTileManager();
          tileManager.init();
        });
      `
    }),
  ],
  footer: Component.Footer({
    socialLinks: {
      "Twitter": "https://twitter.com/ethlocalism",
      "Discord": "https://discord.gg/ethereum-localism",
      "GitHub": "https://github.com/ethereum-localism",
    }
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [],
  right: [],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(), 
    Component.ArticleTitle(), 
    Component.ContentMeta()
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
  ],
  right: [],
}

// Create a dedicated resources page layout
export const resourcePageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
  ],
  right: [],
}
