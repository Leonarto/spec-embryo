# TASK131 initial-loading evidence interpretation

This clarifies existing captured timestamps; it authorizes no new probe, series, product change or threshold adjustment.

For a verified fresh navigation from about:blank, with no previous application document, service worker response, BFCache/prerender reuse or injected application UI, a finite navigation responseStart greater than150 ms establishes a lower bound: the application document response had not begun by150 ms, so an application-owned HTML loading indicator could not have existed by that deadline. Report this as a loading-requirement FAIL supported by unavailable document response, even if PaintTiming is absent. Do not invent an exact first-paint time or blank duration beyond that lower bound.

This follows the responseStart timing definition and its relationship to document navigation. Current Resource Timing defines it from the first interim response when present, otherwise final response headers; either being later than150 ms is a conservative earlier-than-body boundary in this setup. Sources: [Resource Timing responseStart](https://www.w3.org/TR/resource-timing/#dom-performanceresourcetiming-responsestart), [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/).

A responseStart at or below150 ms does not prove a timely application paint or indicator. Missing FCP is unknown, not an automatic FAIL or PASS. Late FCP records late contentful paint, not necessarily a wholly blank page: non-contentful painting could precede it. Keep those concepts and raw fields separate.

A positively observed actual product loading indicator with the approved visibility/frame probe has its own evidence and clock; missing FCP does not erase it. If neither a lower-bound failure nor sufficient positive indicator evidence exists, record NOT PROVEN. Never substitute browser chrome, a test-created indicator, DOM hydration readiness alone or a clock reset at shell arrival.

The original150 ms origin remains navigationStart. The independent <=2.5 s cold-navigation and <=800 ms warm-navigation budgets retain their existing endpoints and statistics. The tiny compiled smoke is functional setup evidence only, regardless of its diagnostic timestamps.
