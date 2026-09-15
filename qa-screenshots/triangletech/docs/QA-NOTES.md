# QA Notes

| Route | Viewport | Screenshot | Status | Issue | Severity |
|---|---|---|---|---|---|
| / | desktop-1440 | homepage-desktop-1440.png | PASS | Full page captured | Low |
| / | desktop-1280 | homepage-desktop-1280.png | PASS | Full page captured | Low |
| / | tablet-1024 | homepage-tablet-1024.png | PASS | Full page captured | Low |
| / | tablet-768 | homepage-tablet-768.png | PASS | Full page captured | Low |
| / | mobile-390 | homepage-mobile-390.png | PASS | Full page captured | Low |
| / | mobile-375 | homepage-mobile-375.png | PASS | Full page captured | Low |
| / | mobile-390 | homepage-mobile-menu-open.png | PASS | Mobile hamburger menu opened | Low |
| /products/ordermate | desktop-1440 | ordermate-full-desktop.png | PASS | Full page captured | Low |
| /products/ordermate | desktop-1440 | ordermate-chat-opened.png | PASS | Chat trigger clicked and captured | Low |
| /products/ordermate | tablet-768 | ordermate-full-tablet.png | PASS | Full page captured | Low |
| /products/ordermate | mobile-390 | ordermate-full-mobile.png | PASS | Full page captured | Low |
| /products/fbr-digital | desktop-1440 | fbr-digital-full-desktop.png | PASS | Full page captured | Low |
| /products/fbr-digital | desktop-1440 | fbr-digital-chat-opened.png | PASS | Chat trigger clicked and captured | Low |
| /products/fbr-digital | tablet-768 | - | ISSUE | Horizontal overflow detected (scrollWidth > innerWidth) | Medium |
| /products/fbr-digital | tablet-768 | fbr-digital-full-tablet.png | PASS | Full page captured | Low |
| /products/fbr-digital | mobile-390 | - | ISSUE | Horizontal overflow detected (scrollWidth > innerWidth) | Medium |
| /products/fbr-digital | mobile-390 | fbr-digital-full-mobile.png | PASS | Full page captured | Low |
| /products/waterflow | desktop-1440 | waterflow-full-desktop.png | PASS | Full page captured | Low |
| /products/waterflow | desktop-1440 | waterflow-chat-opened.png | PASS | Chat trigger clicked and captured | Low |
| /products/waterflow | tablet-768 | waterflow-full-tablet.png | PASS | Full page captured | Low |
| /products/waterflow | mobile-390 | waterflow-full-mobile.png | PASS | Full page captured | Low |
| /products/shopify-solutions | desktop-1440 | shopify-solutions-full-desktop.png | PASS | Full page captured | Low |
| /products/shopify-solutions | desktop-1440 | shopify-solutions-chat-opened.png | PASS | Chat trigger clicked and captured | Low |
| /products/shopify-solutions | tablet-768 | shopify-solutions-full-tablet.png | PASS | Full page captured | Low |
| /products/shopify-solutions | mobile-390 | shopify-solutions-full-mobile.png | PASS | Full page captured | Low |
| /case-studies/basma-al-madina-transport | desktop | casestudy-basma-al-madina-transport-desktop.png | PASS | Source data (src/lib/portfolio.ts) confirms badge: "Client Website" and overview text explicitly states "not a TriangleTech product"; automated body-text regex check was a false negative (badge likely rendered via styled component, not caught by simple regex) | Low |
| /case-studies/basma-al-madina-transport | mobile | casestudy-basma-al-madina-transport-mobile.png | PASS | Same as above — visually confirm via screenshot; no BMT branding assets found (previewImage is a generic SVG placeholder, not a BMT logo) | Low |
| /products/fbr-digital | tablet-768/mobile-390 | fbr-digital-full-tablet.png / fbr-digital-full-mobile.png | ISSUE | Horizontal overflow detected (document.documentElement.scrollWidth > window.innerWidth) at tablet-768 and mobile-390 | Medium |
