declare module "rollup-plugin-visualizer" {
  import type { Plugin } from "rollup";
  export function visualizer(options?: {
    filename?: string;
    template?: "treemap" | "sunburst" | "network" | "raw-data";
    title?: string;
    gzipSize?: boolean;
    brotliSize?: boolean;
    open?: boolean;
  }): Plugin;
  export default any;
}
