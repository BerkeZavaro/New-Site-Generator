# Generator Library

This directory will contain the core logic for generating funnel sites.

## Planned Functionality

- **Content Generation**: Use AI to generate marketing content based on configuration
- **Slot Mapping**: Map generated content to template slots
- **Export Builders**: Create export packages in various formats (static HTML, React+JSON, etc.)
- **Preview Generator**: Generate preview versions of the funnel site

## Future Structure

```
generator/
├── content-generator.ts  # AI-powered content generation
├── slot-mapper.ts        # Map content to template slots
├── export/
│   ├── html-builder.ts   # Build static HTML export
│   ├── react-builder.ts  # Build React component export
│   └── types.ts          # Export format types
├── preview.ts            # Generate preview renders
└── types.ts              # Core generator types
```

