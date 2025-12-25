/**
 * Export format types for the funnel site generator.
 * 
 * - "static-html": Static HTML/CSS/JS files (index.html, styles.css, main.js)
 * - "react-json": React component + JSON config + CSS (LandingPage.tsx, <slug>.config.json, styles.css)
 * - "wordpress": WordPress page template + functions.php snippet
 */
export type ExportFormat = "static-html" | "react-json" | "wordpress";
