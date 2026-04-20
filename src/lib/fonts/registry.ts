export type FontEntry = {
  id: string;
  label: string;
  group: "sans-serif" | "serif" | "monospace";
  cssFamily: string;
  googleFontsUrl: string | null;
};

export const FONTS: FontEntry[] = [
  {
    id: "Arial",
    label: "Arial",
    group: "sans-serif",
    cssFamily: "'Arial', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Helvetica",
    label: "Helvetica",
    group: "sans-serif",
    cssFamily: "'Helvetica', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Verdana",
    label: "Verdana",
    group: "sans-serif",
    cssFamily: "'Verdana', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Trebuchet MS",
    label: "Trebuchet MS",
    group: "sans-serif",
    cssFamily: "'Trebuchet MS', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Tahoma",
    label: "Tahoma",
    group: "sans-serif",
    cssFamily: "'Tahoma', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Geneva",
    label: "Geneva",
    group: "sans-serif",
    cssFamily: "'Geneva', sans-serif",
    googleFontsUrl: null,
  },
  {
    id: "Open Sans",
    label: "Open Sans (Google)",
    group: "sans-serif",
    cssFamily: "'Open Sans', system-ui, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap",
  },
  {
    id: "Roboto",
    label: "Roboto (Google)",
    group: "sans-serif",
    cssFamily: "'Roboto', system-ui, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700&display=swap",
  },
  {
    id: "Lato",
    label: "Lato (Google)",
    group: "sans-serif",
    cssFamily: "'Lato', system-ui, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
  },
  {
    id: "Montserrat",
    label: "Montserrat (Google)",
    group: "sans-serif",
    cssFamily: "'Montserrat', system-ui, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap",
  },
  {
    id: "Poppins",
    label: "Poppins (Google)",
    group: "sans-serif",
    cssFamily: "'Poppins', system-ui, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap",
  },
  {
    id: "Times New Roman",
    label: "Times New Roman",
    group: "serif",
    cssFamily: "'Times New Roman', serif",
    googleFontsUrl: null,
  },
  {
    id: "Georgia",
    label: "Georgia",
    group: "serif",
    cssFamily: "'Georgia', serif",
    googleFontsUrl: null,
  },
  {
    id: "Garamond",
    label: "Garamond",
    group: "serif",
    cssFamily: "'Garamond', serif",
    googleFontsUrl: null,
  },
  {
    id: "Palatino",
    label: "Palatino",
    group: "serif",
    cssFamily: "'Palatino', serif",
    googleFontsUrl: null,
  },
  {
    id: "Merriweather",
    label: "Merriweather (Google)",
    group: "serif",
    cssFamily: "'Merriweather', serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
  {
    id: "Playfair Display",
    label: "Playfair Display (Google)",
    group: "serif",
    cssFamily: "'Playfair Display', serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  },
  {
    id: "Courier New",
    label: "Courier New",
    group: "monospace",
    cssFamily: "'Courier New', monospace",
    googleFontsUrl: null,
  },
  {
    id: "Monaco",
    label: "Monaco",
    group: "monospace",
    cssFamily: "'Monaco', monospace",
    googleFontsUrl: null,
  },
  {
    id: "Lucida Console",
    label: "Lucida Console",
    group: "monospace",
    cssFamily: "'Lucida Console', monospace",
    googleFontsUrl: null,
  },
];

export const DEFAULT_FONT_ID = "Arial";

export function getFontById(id: string | undefined | null): FontEntry | undefined {
  if (id == null) return undefined;
  return FONTS.find((f) => f.id === id);
}

export function getFontByIdOrDefault(id: string | undefined | null): FontEntry {
  return getFontById(id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;
}
