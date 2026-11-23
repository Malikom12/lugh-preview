# Lugh Medical Centre: website concept

A website I designed and built for Lugh Medical Centre, a GP practice in Dundalk. It's a self-initiated concept. The practice hasn't approved it, and it isn't their official website.

**Live preview:** https://malikom12.github.io/lugh-preview/

![Lugh Medical Centre website concept](assets/img/og-image.png)

## What it does

- **Knows if the surgery is open.** The opening status is worked out in Irish time, whatever time zone the visitor is in, and it knows Irish public holidays. After hours, the out-of-hours numbers move to the top of the page.
- **Follows the real sun.** The picture of Dundalk Bay at the top uses the sunrise equation for Dundalk, so the sun and sky change through the day.
- **Free GP care checker.** Answers "will I have to pay?" for medical cards, GP visit cards, under-8s and over-70s, and lists the free vaccines and screening for your age. It runs in the browser and sends nothing.
- **Repeat prescription form (demo).** Form validation with an error summary, following the GOV.UK pattern. Nothing is sent.
- **Help for every patient.** A text size control, a printable fridge card, a contact card download, and key information in Polish, Lithuanian, Latvian and Ukrainian.

## Accessibility

Built to WCAG 2.2 AA. axe-core finds no issues on any page, at phone and desktop sizes, by day and by night. Body text is set in Atkinson Hyperlegible Next, designed by the Braille Institute for readers with low vision. The site also respects reduced motion and Windows high contrast mode.

## Tech

Plain HTML, CSS and JavaScript: no framework, no build step, no cookies and no trackers. Pages are routed with the URL hash, and without JavaScript the content is still readable as one long page.

To see the site at another time, add `?at=` with a Dublin date and time to the address, for example `?at=2026-12-25T10:00` (Christmas Day) or `?at=2026-11-12T21:30` (a weekday night).

## Fonts

Atkinson Hyperlegible Next and Young Serif, both under the SIL Open Font License. The licence files are in `assets/fonts`.
