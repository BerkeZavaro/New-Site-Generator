# Exports Directory

This directory is where generated export packages will be written.

## Purpose

When a marketing team member completes their funnel configuration and is satisfied with the preview, they can export a ready-to-deploy package. These packages are saved here temporarily for download.

## Export Formats (Future)

The generator will support multiple export formats:

### 1. Static HTML Package
- Complete HTML file with inline or linked CSS
- All assets bundled
- Ready to deploy to any static hosting

### 2. React Component Package
- React component(s) with the funnel structure
- JSON data file with content
- Import instructions for developers

### 3. WordPress Package (Optional)
- PHP template file
- Custom post type or page template
- Installation instructions

## File Structure (Example)

```
exports/
├── funnel-123456/
│   ├── index.html
│   ├── styles.css
│   ├── assets/
│   │   └── images/
│   └── README.md          # Instructions for dev team
└── funnel-789012/
    ├── FunnelPage.tsx
    ├── content.json
    └── README.md
```

## Cleanup

Export packages should be automatically cleaned up after a certain period (e.g., 7 days) to prevent disk space issues.

