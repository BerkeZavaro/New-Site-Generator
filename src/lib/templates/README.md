# Templates Library

This directory will contain code for managing funnel site templates.

## Planned Functionality

- **Template Parser**: Parse uploaded HTML/CSS templates to identify content slots and image placeholders
- **Template Registry**: Manage available templates (built-in and user-uploaded)
- **Slot Detection**: Automatically detect and map template slots to configuration fields
- **Validation**: Ensure templates meet the required structure and format

## Future Structure

```
templates/
├── parser.ts         # Parse HTML/CSS to extract slot definitions
├── registry.ts       # Manage available templates
├── validator.ts      # Validate template structure
└── types.ts          # TypeScript types for templates
```

