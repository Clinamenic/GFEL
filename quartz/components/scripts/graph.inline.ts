import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle, Sprite, Texture } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics | Sprite
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
}

type NodeStyles = {
  regularNode: {
    fillColor: string
    strokeColor: string
    strokeWidth: number
  }
  tagNode: {
    fillColor: string
    strokeColor: string
    strokeWidth: number
    backgroundColor: string
    backgroundRadius: number
  }
}

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

function resolveStrokeColor(color: string): string {
  if (color === "none") {
    return "#000000"
  }
  if (color.startsWith("var(")) {
    // Extract the CSS variable name
    const varName = color.slice(4, -1)
    // Get the computed value
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    // Convert the color to hex
    if (computed.startsWith("#")) {
      return computed
    }
    // For now, just return black if we can't parse it
    return "#000000"
  }
  if (color.startsWith("#")) {
    return color
  }
  // If we can't parse the color, return black
  return "#000000"
}

function resolveFillColor(color: string): number {
  if (color === "none") {
    return 0x000000
  }
  if (color.startsWith("var(")) {
    // Extract the CSS variable name
    const varName = color.slice(4, -1)
    // Get the computed value
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    // Convert the color to hex
    if (computed.startsWith("#")) {
      return parseInt(computed.slice(1), 16)
    }
    // For now, just return black if we can't parse it
    return 0x000000
  }
  if (color.startsWith("#")) {
    return parseInt(color.slice(1), 16)
  }
  // If we can't parse the color, return black
  return 0x000000
}

function createHashtagGraphics(radius: number, styles: NodeStyles["tagNode"]): Graphics {
  // Scale the path to fit within the given radius
  const scale = radius / 18 // SVG viewBox is 36x36, so divide by 2 for radius
  
  // Center offset (since SVG viewBox is 0,0,36,36 we need to center around 18,18)
  const offsetX = -18 * scale
  const offsetY = -18 * scale
  
  const gfx = new Graphics()
    // Draw background circle for hashtag
    .beginFill(resolveFillColor(styles.backgroundColor))
    .circle(0, 0, radius * styles.backgroundRadius)
    .endFill()
    // Draw outer shape for hashtag
    .beginFill(resolveFillColor(styles.fillColor))
    .moveTo(31.87 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(26.32 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(27.32 * scale + offsetX, 5.17 * scale + offsetY)
    .lineTo(26.35 * scale + offsetX, 4 * scale + offsetY)
    .lineTo(24.35 * scale + offsetX, 4 * scale + offsetY)
    .lineTo(23.35 * scale + offsetX, 4.78 * scale + offsetY)
    .lineTo(22.33 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(16.93 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(17.93 * scale + offsetX, 5.17 * scale + offsetY)
    .lineTo(17 * scale + offsetX, 4 * scale + offsetY)
    .lineTo(15 * scale + offsetX, 4 * scale + offsetY)
    .lineTo(14 * scale + offsetX, 4.78 * scale + offsetY)
    .lineTo(13 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(7 * scale + offsetX, 10 * scale + offsetY)
    .lineTo(6 * scale + offsetX, 10.8 * scale + offsetY)
    .lineTo(5.59 * scale + offsetX, 12.8 * scale + offsetY)
    .lineTo(6.59 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(12.14 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(10.5 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(4.5 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(3.5 * scale + offsetX, 22.8 * scale + offsetY)
    .lineTo(3.09 * scale + offsetX, 24.8 * scale + offsetY)
    .lineTo(4.09 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(9.68 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(8.68 * scale + offsetX, 30.83 * scale + offsetY)
    .lineTo(9.68 * scale + offsetX, 32 * scale + offsetY)
    .lineTo(11.68 * scale + offsetX, 32 * scale + offsetY)
    .lineTo(12.63 * scale + offsetX, 31.22 * scale + offsetY)
    .lineTo(13.67 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(19.07 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(18.07 * scale + offsetX, 30.83 * scale + offsetY)
    .lineTo(19.07 * scale + offsetX, 32 * scale + offsetY)
    .lineTo(21.07 * scale + offsetX, 32 * scale + offsetY)
    .lineTo(22.07 * scale + offsetX, 31.22 * scale + offsetY)
    .lineTo(23.05 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(29.05 * scale + offsetX, 26 * scale + offsetY)
    .lineTo(30.05 * scale + offsetX, 25.2 * scale + offsetY)
    .lineTo(30.45 * scale + offsetX, 23.2 * scale + offsetY)
    .lineTo(29.45 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(23.87 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(25.5 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(31.5 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(32.5 * scale + offsetX, 13.2 * scale + offsetY)
    .lineTo(32.91 * scale + offsetX, 11.2 * scale + offsetY)
    .lineTo(31.91 * scale + offsetX, 10 * scale + offsetY)
    .closePath()
    .endFill()
    // Draw inner square for hashtag in background color to create the hole effect
    .beginFill(resolveFillColor(styles.backgroundColor))
    .moveTo(19.87 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(14.47 * scale + offsetX, 22 * scale + offsetY)
    .lineTo(16.11 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(21.51 * scale + offsetX, 14 * scale + offsetY)
    .lineTo(19.87 * scale + offsetX, 22 * scale + offsetY)
    .closePath()
    .endFill()

  return gfx
}

async function renderGraph(container: string, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  const graph = document.getElementById(container)
  if (!graph) return
  removeAllChildren(graph)

  const defaultNodeStyles: NodeStyles = {
    regularNode: {
      fillColor: "var(--tertiary)",
      strokeColor: "var(--dark)",
      strokeWidth: 0.5
    },
    tagNode: {
      fillColor: "white",
      strokeColor: "white",
      strokeWidth: 0,
      backgroundColor: "var(--gray)",
      backgroundRadius: 1.2
    }
  }

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    nodeStyles
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  // Use default styles if none provided
  const styles = (nodeStyles ?? defaultNodeStyles) as NodeStyles

  // Load the hashtag SVG texture
  const tagTexture = await Texture.from("/static/hashtag_solid_icon_235931.svg")

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  const nodes = [...neighbourhood].map((url) => {
    // For tag nodes, add spaces after each subtag to enable wrapping
    const text = url.startsWith("tags/") 
      ? "#" + url.substring(5).split("/").join(" / ")
      : (data.get(url)?.title ?? url)
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)

  // we virtualize the simulation and use pixi to actually render it
  // Calculate the radius of the container circle
  const radius = Math.min(width, height) / 2 - 40 // 40px padding
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => collisionRadius(n)).iterations(3))

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key)
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // calculate color
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return computedStyleMap["--secondary"]
    } else if (visited.has(d.id) || d.id.startsWith("tags/")) {
      return computedStyleMap["--tertiary"]
    } else {
      return computedStyleMap["--gray"]
    }
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return 3 + Math.sqrt(numLinks) * 2
  }

  function collisionRadius(d: NodeData) {
    return (nodeRadius(d) * 3) + 20 // Creates an invisible buffer zone around each node
  }

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 0.1  // default alpha for no hover state

      // if we are hovering over a node
      if (hoveredNodeId) {
        // connected lines get full opacity, unconnected lines fade to 0
        alpha = l.active ? 1 : 0
      }

      l.color = computedStyleMap["--dark"]
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = 1 / scale
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id
      let targetAlpha = 0

      if (hoveredNodeId === nodeId || hoveredNeighbours.has(nodeId)) {
        targetAlpha = 1
      }

      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          {
            alpha: targetAlpha,
            scale: { x: activeScale, y: activeScale },
          },
          100,
        ),
      )

      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          {
            alpha: targetAlpha,
            scale: { x: hoveredNodeId === nodeId ? activeScale : defaultScale, y: hoveredNodeId === nodeId ? activeScale : defaultScale },
          },
          100,
        ),
      )
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2
      }

      if (n.gfx instanceof Graphics) {
        tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
      } else {
        tweenGroup.add(new Tweened<Sprite>(n.gfx, tweenGroup).to({ alpha }, 200))
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgpu",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics | Sprite>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 12,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
        stroke: computedStyleMap["--light"],
        strokeThickness: 1,
        wordWrap: true,
        wordWrapWidth: 60,
        align: 'center',
        lineHeight: fontSize * 14,
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    
    let gfx: Graphics
    if (isTagNode) {
      // Create a hashtag icon for tag nodes
      gfx = createHashtagGraphics(nodeRadius(n), styles.tagNode)
      gfx.interactive = true
      gfx.eventMode = "static"
      gfx.cursor = "pointer"
      gfx.hitArea = new Circle(0, 0, nodeRadius(n) * styles.tagNode.backgroundRadius)
    } else {
      // Create a circle for regular nodes
      gfx = new Graphics({
        interactive: true,
        eventMode: "static",
        hitArea: new Circle(0, 0, nodeRadius(n)),
        cursor: "pointer",
      })

      // Apply stroke style first if it's not "none"
      if (styles.regularNode.strokeColor !== "none") {
        gfx.lineStyle(styles.regularNode.strokeWidth, resolveStrokeColor(styles.regularNode.strokeColor))
      }

      // Then draw the filled circle
      gfx.beginFill(resolveFillColor(styles.regularNode.fillColor))
        .circle(0, 0, nodeRadius(n))
        .endFill()
    }

    // Add common event handlers
    gfx.label = nodeId
    gfx.on("pointerover", (e) => {
      updateHoverInfo(e.target.label)
      oldLabelOpacity = label.alpha
      if (!dragging) {
        renderPixiFromD3()
      }
    })
    gfx.on("pointerleave", () => {
      updateHoverInfo(null)
      label.alpha = oldLabelOpacity
      if (!dragging) {
        renderPixiFromD3()
      }
    })

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: '#' + resolveFillColor(isTagNode ? styles.tagNode.fillColor : styles.regularNode.fillColor).toString(16).padStart(6, '0'),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap["--lightgray"],
      alpha: 0.1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  let currentTransform = zoomIdentity
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
          dragging = false

          // if the time between mousedown and mouseup is short, we consider it a click
          if (Date.now() - dragStartTime < 500) {
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    select<HTMLCanvasElement, NodeData>(app.canvas).call(
      zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.125, 6])
        .on("zoom", ({ transform }) => {
          currentTransform = transform
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // zoom adjusts opacity of labels too
          const scale = transform.k * opacityScale
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (activeNodes.includes(label)) {
              label.alpha = 1
            } else {
              label.alpha = 0
            }
          }
        }),
    )
  }

  function animate(time: number) {
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2)
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      if (l.gfx instanceof Graphics) {
        l.gfx.clear()
        l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
        l.gfx
          .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
          .stroke({ alpha: l.alpha, width: 0.3, color: l.color })
      }
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  const graphAnimationFrameHandle = requestAnimationFrame(animate)
  window.addCleanup(() => cancelAnimationFrame(graphAnimationFrameHandle))
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))
  await renderGraph("graph-container", slug)

  // Function to re-render the graph when the theme changes
  const handleThemeChange = () => {
    renderGraph("graph-container", slug)
  }

  // event listener for theme change
  document.addEventListener("themechange", handleThemeChange)

  // cleanup for the event listener
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  const container = document.getElementById("global-graph-outer")
  const sidebar = container?.closest(".sidebar") as HTMLElement

  function renderGlobalGraph() {
    const slug = getFullSlug(window)
    container?.classList.add("active")
    if (sidebar) {
      sidebar.style.zIndex = "1"
    }

    renderGraph("global-graph-container", slug)
    registerEscapeHandler(container, hideGlobalGraph)
  }

  function hideGlobalGraph() {
    container?.classList.remove("active")
    if (sidebar) {
      sidebar.style.zIndex = ""
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const globalGraphOpen = container?.classList.contains("active")
      globalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  const containerIcon = document.getElementById("global-graph-icon")
  containerIcon?.addEventListener("click", renderGlobalGraph)
  window.addCleanup(() => containerIcon?.removeEventListener("click", renderGlobalGraph))

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => document.removeEventListener("keydown", shortcutHandler))
})
