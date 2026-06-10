import { createMDX } from 'fumadocs-mdx/next'

/** @type {import("next").NextConfig} */
const config = {
  output: 'export',
  // Folder/index.html output — clean URLs on any static file server.
  trailingSlash: true,
}

const withMDX = createMDX()

export default withMDX(config)
