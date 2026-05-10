---
name: Snapbug Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fd'
  surface-container-highest: '#d9e3f7'
  on-surface: '#121c2b'
  on-surface-variant: '#3d4a3a'
  inverse-surface: '#273140'
  inverse-on-surface: '#ebf1ff'
  outline: '#6d7b68'
  outline-variant: '#bccbb5'
  surface-tint: '#006e15'
  primary: '#006e15'
  on-primary: '#ffffff'
  primary-container: '#62ef62'
  on-primary-container: '#006a14'
  inverse-primary: '#54e256'
  secondary: '#a900a9'
  on-secondary: '#ffffff'
  secondary-container: '#fe00fe'
  on-secondary-container: '#500050'
  tertiary: '#006a6a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00ebeb'
  on-tertiary-container: '#006666'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#73ff70'
  primary-fixed-dim: '#54e256'
  on-primary-fixed: '#002202'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#ffd7f5'
  secondary-fixed-dim: '#ffabf3'
  on-secondary-fixed: '#380038'
  on-secondary-fixed-variant: '#810081'
  tertiary-fixed: '#00fbfb'
  tertiary-fixed-dim: '#00dddd'
  on-tertiary-fixed: '#002020'
  on-tertiary-fixed-variant: '#004f4f'
  background: '#f9f9ff'
  on-background: '#121c2b'
  surface-variant: '#d9e3f7'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-sm: 16px
  margin-md: 32px
  margin-lg: 48px
  container-max: 1280px
---

## Brand & Style

This design system is built on a "Digital Sketchbook" philosophy. It merges the raw, tactile energy of a developer’s whiteboard with the functional precision of a modern web application. The aesthetic is unpolished by design, celebrating imperfection through irregular lines and high-energy marker strokes.

The style is a fusion of **Neo-Brutalism** and **Tactile Cartooning**. It rejects the sterile, perfectly rounded corners of traditional SaaS in favor of heavy, hand-drawn borders, vibrant high-contrast accents, and deep, hard-edged shadows. The interface should feel like it was quickly sketched out in a moment of creative inspiration, evoking a sense of speed, accessibility, and fun.

**Key visual drivers:**
- **Irregularity:** No two borders are perfectly straight.
- **High Contrast:** Dark ink-like lines against vibrant highlighter colors.
- **Motion:** Hover states that mimic a marker scribbling or a highlighter stroke appearing behind text.

## Colors

The palette is derived from "Highlighter" aesthetics—vibrant, translucent-feeling neons that demand attention. 

- **Primary (#62EF62):** A high-energy "Electric Lime" used for core actions and success states.
- **Secondary (#FF00FF):** A "Marker Pink" used for bug highlighting and urgent call-outs.
- **Tertiary (#00FFFF):** A "Cyan Ink" used for informational elements and secondary highlights.
- **Neutral (#1D2736):** A deep, ink-like navy used for all borders, shadows, and primary text to ensure maximum legibility and "ink-on-paper" feel.
- **Surface (#F7F8F7 & #FFFFFF):** Clean, paper-white backgrounds to allow the marker colors to pop.

Use the marker colors as if they were drawn over the UI. They should rarely be the background of a component; instead, use them as "under-strokes" or thick borders.

## Typography

Typography in this design system emphasizes character and clarity.

- **Headlines (Bricolage Grotesque):** Chosen for its quirky, variable-width feel that mimics hand-lettering while remaining professional. Use large sizes with tight tracking.
- **Body (Rubik):** A friendly, rounded sans-serif that balances the aggressive headlines. It ensures long-form content is readable and approachable.
- **Technical Labels (Space Mono):** Used for metadata, developer-specific information, and small UI labels. The monospaced nature reinforces the "developer-focused" personality.

Avoid all-caps except for technical labels or very short calls to action.

## Layout & Spacing

The layout philosophy follows a **Loose Grid** approach. While elements are aligned to an 8px base unit for structural integrity, the visual appearance should suggest a manual layout.

- **Grid:** Use a 12-column fluid system for desktop. Content blocks should have generous internal padding (minimum 24px) to simulate "breathing room" on a whiteboard.
- **Gutters:** Standardized at 24px, but individual cards may use "wobble" (negative margins or slight rotations of 1-2 degrees) to break the rigid grid lines.
- **Adaptation:** On mobile, margins reduce to 16px. Complex horizontal cards reflow into vertical stacks with thick, 4px separators.

## Elevation & Depth

Depth is conveyed through **Hard Offsets** rather than soft shadows. This mimics 2D paper layers stacked on a desk.

- **Surface Layers:** All cards and interactive elements sit on the base background with a 2px solid border (`#1D2736`).
- **Elevated State:** When an element is focused or prioritized, it gains a "drop shadow" which is actually a solid block of color (usually `#1D2736`) offset by 4px or 8px. There is zero blur.
- **Interaction Depth:** On click, the element "pushes" into the page by reducing the shadow offset to 0px, providing a tactile, mechanical feel.
- **Marker Overlays:** Modals and popovers do not use background blurs. Instead, they use a semi-transparent colored "wash" (e.g., Cyan at 10% opacity) over the background to draw focus.

## Shapes

The shape language is defined by **Controlled Irregularity**.

- **Rounded Corners:** While the base `roundedness` is set to `2` (0.5rem), this should be applied inconsistently to simulate hand-drawing. For example, a card might have `border-top-left-radius: 12px`, `border-top-right-radius: 8px`, `border-bottom-left-radius: 10px`, and `border-bottom-right-radius: 14px`.
- **Borders:** Border widths should vary between 2px and 4px. Use SVG masks or `border-image` to create a slightly "shaky" line effect on primary containers.
- **Interactive Shapes:** Buttons should never be perfect pills. They should look like hand-drawn rectangles with slightly rounded corners.

## Components

### Buttons
- **Primary:** Thick 3px border, Primary Green background, and a 4px hard black shadow.
- **Hover:** The button "shakes" slightly (2-degree rotation) and the shadow grows.
- **Text:** Bold Bricolage Grotesque, centered.

### Input Fields
- **Style:** 2px solid borders. On focus, the border color changes to Primary Green and the border thickness increases to 4px.
- **Labels:** Always use Space Mono in small-caps for field labels, placed slightly "haphazardly" above the input.

### Cards
- **Style:** White background, irregular border-radius.
- **Interactive Cards:** On hover, a "highlighter stroke" (semi-transparent Primary Green) appears behind the card title.

### Checkboxes & Radios
- **Design:** Hand-drawn "X" for checkboxes and a solid "blob" for radio buttons. Avoid perfect geometric circles and squares.

### Lists
- Use "bullet points" that look like hand-drawn dots or dashes. Each list item is separated by a thin, slightly wavy line.

### Marker Tooltip
- Tooltips should look like "Post-it" notes with a slight rotation and a "tape" texture at the top, using the Secondary Pink color for the background.