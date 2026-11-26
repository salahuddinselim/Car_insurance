# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Motorists in Perth's south-east who need accident or panel damage repaired, often after an insurance claim. Their job is to understand the workshop's craft and trustworthiness, then request a free quote or call the workshop.

## Product Purpose

Gosnells Smash Repairs presents its insurance-approved panel-beating, welding and refinishing service through an immersive showroom story. Success is a visitor who understands the end-to-end repair process and takes the quote or phone action.

## Positioning

An independent, insurance-approved and preferred workshop with 50+ years of continuous panel work, offering free quotes, direct insurer handling, loan cars and free post-repair detailing. The visitor has the right to choose their repairer.

## Operating Context

Local workshop at 21 Carole Rd, Maddington WA 6109. Phone (08) 9459 6307, email admin@gosnellssmashrepairs.com.au. Hours: Mon–Thu 8:00am–4:00pm, Fri 8:00am–4:30pm, closed Sat/Sun. Licensed repairer MRB9647. Insurance and third-party claims are accepted.

## Capabilities and Constraints

- Static HTML/CSS/JS site with local Three.js, GSAP and ScrollTrigger vendor files; no build tooling or package manager.
- Real 3D Ferrari GLB is the persistent hero asset; a BMW GLB also exists in the repository but is not the hero.
- Performance figures shown on the showroom car are illustrative cinematic content, not verified specifications or claims about the repair business.
- Must preserve the quote form, phone/email links, business facts and accessibility preferences (including reduced motion).

## Brand Commitments

Name: Gosnells Smash Repairs. Voice: assured, craft-led, plain-spoken and trustworthy. Established 1973. Insurance approved and preferred independent repairer. Existing logo and favicon are in `assets/brand/`.

## Evidence on Hand

Current site content and 3D implementation in `index.html`, `assets/css/` and `assets/js/`. Assets: `assets/models/ferrari.glb`, `assets/models/bmw_m4.glb`, `assets/models/ferrari_ao.png`, workshop and completed-work photography in `assets/img/`. No verified Ferrari specification sheet is present; do not present illustrative numbers as factual.

## Product Principles

- Lead with craft and trust, never with speed or spectacle alone.
- Keep the repair customer's next step obvious throughout the experience.
- Treat the car as one continuous object; avoid static-car slideshows or resets.
- Keep business facts exact and label illustrative showroom figures as such.
- Preserve performance on ordinary devices and respect reduced-motion preferences.

## Accessibility & Inclusion

Users may be on low-power devices without WebGL, so the story must remain usable with a static fallback. Reduced-motion users must receive a non-animated but complete version of the content and actions.
