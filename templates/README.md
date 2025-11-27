# Templates Directory

This directory is where funnel site templates will be stored.

## Purpose

- Store pre-built funnel templates (HTML/CSS layouts)
- Store user-uploaded custom templates
- Each template should include:
  - HTML structure with marked content slots
  - CSS styling
  - Metadata file (JSON) describing available slots and configuration options

## Template Structure (Future)

Each template will be in its own subdirectory:

```
templates/
├── default-creatine-funnel/
│   ├── template.html      # HTML with slot markers
│   ├── styles.css         # Template styles
│   ├── config.json        # Slot definitions and metadata
│   └── preview.png        # Preview image for selection
└── premium-landing/
    ├── template.html
    ├── styles.css
    ├── config.json
    └── preview.png
```

## Slot Markers

Templates will use special markers to indicate where content should be inserted, for example:
- `{{SLOT:product_name}}`
- `{{SLOT:hero_headline}}`
- `{{IMAGE:hero_image}}`
- `{{CONTENT:benefit_section}}`

