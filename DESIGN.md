---
name: Gosnells Smash Repairs
description: A dark, cinematic showroom story for insurance-approved vehicle restoration in Maddington.
colors:
  black: "#050708"
  ink: "#0b0e10"
  charcoal: "#15191c"
  silver: "#c7ccd0"
  white: "#f5f6f4"
  muted: "#9aa1a6"
  amber: "#e6a230"
  amber-bright: "#f3b956"
  placeholder: "#73797d"
  rosso: "#d40000"
  bone: "#e4e0d5"
  cool-haze: "rgba(84, 101, 110, 0.12)"
  scrim-white: "rgba(255, 255, 255, 0.3)"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.3rem, 6.1vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.8rem, 4.7vw, 4.9rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.028em"
  body:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.12em"
  note:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  field:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  spec:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.1
  lead:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.35
  lede:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  display-mobile:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.8rem, 11vw, 4.2rem)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.028em"
  headline-mobile:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.5rem, 10vw, 3.8rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.028em"
rounded:
  sm: "2px"
  none: "0px"
  scrollbar: "9px"
spacing:
  xs: "7px"
  sm: "14px"
  md: "16px"
  lg: "25px"
  xl: "36px"
  page: "clamp(22px, 4.4vw, 72px)"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.black}"
    rounded: "{rounded.sm}"
    padding: "13px 25px"
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "13px 25px"
  input-field:
    backgroundColor: "{colors.black}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "10px 13px"
---

# Design System: Gosnells Smash Repairs

## Overview

**Creative North Star: "The Collector's Atelier"**

This is a night-time automotive atelier: one vehicle, one continuous turntable, one measured journey through a workshop's capabilities. The interface behaves like gallery architecture rather than a brochure — fixed, dark, restrained, and built around the car's movement. Editorial copy sits in soft black scrims, allowing the 3D stage to remain the protagonist from arrival through enquiry.

The visual world is deliberately quiet. Deep charcoal and near-black tones absorb light; a single warm amber accent behaves like a showroom spot, marking focus, progress, and primary action. Condensed uppercase headings give authority without shouting, while Barlow body copy stays practical and legible for a real local repair business. Depth comes from light, reflection, and layering rather than decorative shadows.

**Key Characteristics:**
- A persistent 3D stage with one car and continuous rotation; no slideshow or model swap.
- Alternating left/right copy blocks that let the car travel across the viewport.
- Editorial scale, generous negative space, and a 1440px container with responsive page padding.
- Amber used as a scarce focal signal, not a general brand wash.
- Real workshop photography presented as restrained gallery frames.

## Colors

The palette is a dark neutral stage with one warm, precise accent.

### Primary
- **Showroom Amber** (#e6a230): Spotlight ring, focus outlines, chapter progress, primary buttons, and the only chromatic signal in the 3D stage.

### Neutral
- **Stage Black** (#050708): Page canvas, stage background, form fields, and all fixed dark surfaces.
- **Workshop Ink** (#0b0e10): Panels, topbar, and elevated dark containers.
- **Graphite** (#15191c): Cards, gallery frames, and secondary surface fills.
- **Soft Silver** (#c7ccd0): Borders, rules, turntable ticks, and quiet metadata.
- **Studio White** (#f5f6f4): Headlines, body copy, and high-priority text.
- **Muted Silver** (#9aa1a6): Supporting body text, labels, and fine print.
- **Placeholder Grey** (#73797d): Form placeholder text only.
- **Rosso** (#d40000) and **Bone** (#e4e0d5): Manual finish swatches for the 3D stage only.
- **Cool Haze** (rgba(84, 101, 110, 0.12)) and **Scrim White** (rgba(255, 255, 255, 0.3)): Atmospheric background wash and translucent white overlays.

### Named Rules
**The One Spotlight Rule.** Amber marks focus and action; body copy, borders, and large surfaces stay neutral.

**The Dark Stage Rule.** The car is lit against near-black. Do not introduce light page backgrounds or broad colour panels.

## Typography

**Display Font:** Barlow Condensed (Arial Narrow fallback)  
**Body Font:** Barlow (Arial fallback)  
**Label Font:** Barlow (Arial fallback)

**Character:** Condensed display type creates showroom-poster authority; humanist body copy keeps the business information plain, trustworthy, and readable.

### Hierarchy
- **Display** (700, clamp(3.3rem, 6.1vw, 6rem), 0.88): Hero statement only.
- **Headline** (700, clamp(2.8rem, 4.7vw, 4.9rem), 0.92): Chapter headings.
- **Body** (400, 15px, 1.7): Primary copy, maximum 52ch.
- **Label** (700, 11px, 0.12em): Functional metadata, form labels, and chapter rail.
- **Button / Field** (700 / 400, 14px, 0.13em / normal): Calls to action and form inputs.
- **Note** (400, 12px, 1.6): Fine print and supporting notes.
- **Meta** (500, 13px, 1.5): Compact metadata and small controls.
- **Spec** (600, 19px, 1.1) and **Lead** (500, 21px, 1.35): Stage figures and short lede lines.
- **Lede** (400, 16px, 1.8): Hero paragraph with a wider reading rhythm.
- **Mobile Display / Headline** (clamp fluid ramps): The same hierarchy compressed for small screens.

### Named Rules
**The Condensed Voice Rule.** Headings are uppercase Barlow Condensed; body copy remains sentence case Barlow.

**The Readable Floor Rule.** Functional text never drops below 11px; body notes stay at 12px or larger.

## Layout

The page uses a 1440px maximum container with `clamp(22px, 4.4vw, 72px)` horizontal padding and a 108px fixed header offset. A fixed full-viewport stage sits behind all content. Chapters are tall scrolling panels with copy alternating sides; the car's horizontal position is interpolated from chapter centres, so the same object crosses the stage rather than resetting.

At 1100px and below, copy widens; at 1000px and below, the navigation collapses to a burger; at 700px and below, the stage scales down, the car centers more tightly, and the copy becomes full-width. The gallery uses a clipped, absolutely positioned track so horizontal scrolling never creates document overflow.

## Elevation & Depth

Depth is atmospheric, not card-based. The stage uses a PMREM showroom environment, floor reflection, a spotlight cone, turntable rings, and a soft AO shadow under the car. Page surfaces are mostly flat and separated by scrims, borders, and light falloff.

### Named Rules
**The Light Is Structure Rule.** Use reflection, shadow, and gradient falloff for hierarchy; avoid decorative drop shadows on content blocks.

## Shapes

The system is almost entirely rectangular: 2px button radii, square form fields, hairline borders, and long horizontal rules. The recurring curved geometry belongs to the 3D stage — turntable rings, wheel arcs, and the spotlight cone.

## Components

### Buttons
- **Shape:** Crisp rectangles with a 2px radius.
- **Primary:** Showroom Amber background with Stage Black text, `13px 25px` padding, uppercase Barlow Condensed label.
- **Secondary:** Transparent Workshop Ink fill, silver border and Studio White text; hover shifts border and text to amber.
- **States:** Lift 2px on hover, settle on active, amber 2px focus outline with 4px offset.

### Inputs / Fields
- **Style:** Square fields, 1px silver border, Stage Black background, Studio White text, `10px 13px` padding.
- **Focus:** Amber border plus a soft amber halo.
- **Labels:** Uppercase 11px muted silver labels; placeholders use Placeholder Grey.

### Navigation
- **Style:** Fixed header, small Barlow links, amber primary quote button.
- **Mobile:** Links collapse into a bordered burger control with animated bars and a full dark panel.

### Chapter Rail
- **Style:** Fixed lower-left count, chapter name, and progress rule.
- **Behavior:** Updates as the car moves between chapters; progress is an amber scale transform.

### Finish UI
- **Style:** Fixed lower-right label with three circular finish swatches and an Auto control.
- **Behavior:** Manual selection overrides automatic finish; Auto restores scroll-driven colour.

### Gallery
- **Style:** Clipped horizontal filmstrip with square workshop images and caption gradients.
- **Behavior:** ScrollTrigger translates the track while the 3D stage remains fixed.

## Do's and Don'ts

### Do:
- **Do** keep one Ferrari GLB on stage for the full story.
- **Do** let copy alternate sides while the car moves continuously.
- **Do** keep amber scarce: focus, progress, primary action, and stage lighting.
- **Do** label stage performance figures as illustrative.
- **Do** preserve the verified workshop facts: MRB9647, Maddington, phone, email, hours, and free quote path.

### Don't:
- **Don't** swap models, cut to static car slides, or reset the stage between chapters.
- **Don't** use light backgrounds, playful illustration, or soft rounded cards.
- **Don't** shrink functional text below 11px or use wide tracking on body copy.
- **Don't** imply the Ferrari is a vehicle the workshop repaired.
- **Don't** allow gallery motion to create horizontal document overflow.
