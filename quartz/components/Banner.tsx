import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

function Banner({ fileData }: QuartzComponentProps) {
  const bannerURI = fileData.frontmatter?.bannerURI

  if (!bannerURI) {
    return null
  }

  return (
    <div className="banner" style="width: calc(100% - 2px); margin-top: 1.5rem;">
      <img src={bannerURI} alt="Banner" style="width: 100%; max-width: var(--pageContentWidth); margin-top: 0rem; border-radius: 10px; border: 1px solid var(--dark)"/>
    </div>
  )
}

export default (() => Banner) satisfies QuartzComponentConstructor