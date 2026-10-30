/**
 * Font families for SuperDoc toolbar + document rendering.
 * Stacks mirror the dashboard RichText/document editor fallbacks.
 */

export interface SuperdocFontDefinition {
  /** Display name; also stored as font-family on selected text. */
  label: string
  /** Full CSS stack for dropdown preview and rendering fallbacks. */
  stack: string
}

export const SUPERDOC_FONT_DEFINITIONS: SuperdocFontDefinition[] = [
  {
    label: 'Arial',
    stack: "Arial, 'Noto Sans Arabic', Cairo, Helvetica, sans-serif",
  },
  {
    label: 'Futura',
    stack: "Futura, 'Trebuchet MS', 'Noto Sans Arabic', Cairo, Arial, sans-serif",
  },
  {
    label: 'Roboto',
    stack: "Roboto, 'Noto Sans Arabic', Arial, sans-serif",
  },
  {
    label: 'Open Sans',
    stack: "'Open Sans', 'Noto Sans Arabic', Arial, sans-serif",
  },
  {
    label: 'Montserrat',
    stack: "Montserrat, Cairo, 'Noto Sans Arabic', Arial, sans-serif",
  },
  {
    label: 'Lato',
    stack: "Lato, 'Noto Sans Arabic', Cairo, Arial, sans-serif",
  },
  {
    label: 'Poppins',
    stack: "Poppins, Cairo, 'Noto Sans Arabic', Arial, sans-serif",
  },
  {
    label: 'Times New Roman',
    stack: "'Times New Roman', Times, 'Noto Naskh Arabic', Amiri, Georgia, serif",
  },
  {
    label: 'Garamond',
    stack: "Garamond, 'Times New Roman', Amiri, 'Noto Naskh Arabic', Georgia, serif",
  },
  {
    label: 'Bodoni',
    stack: "Bodoni, 'Bodoni Moda', 'Bodoni 72', Didot, Amiri, 'Noto Naskh Arabic', serif",
  },
  {
    label: 'Didot',
    stack: "Didot, 'Playfair Display', Amiri, 'Noto Naskh Arabic', serif",
  },
  {
    label: 'Georgia',
    stack: "Georgia, 'Times New Roman', 'Noto Naskh Arabic', Amiri, serif",
  },
  {
    label: 'Playfair Display',
    stack: "'Playfair Display', Amiri, 'Noto Naskh Arabic', Georgia, serif",
  },
]

/** Passed to `modules.toolbar.fonts` - label must match first family in stack. */
export const SUPERDOC_FONT_CONFIGS = SUPERDOC_FONT_DEFINITIONS.map((font) => ({
  label: font.label,
  key: font.stack,
  props: {
    style: {
      fontFamily: font.stack,
    },
  },
}))
