# Independent review — Mermaid zoom group

Approved for root integration and commit. No blocking finding.

Verified frozen manifest SHA256 e12b336b1205cae9c489d145f5a31009800a90cfa4e2518075b6f81aa14d0a2b and all five referenced file hashes. The patch adds only role="group" to the existing div labelled "Diagram zoom controls"; applying that exact replacement to shared source 5f922ace59583dbb02f877010088fada9e5f8fd309f3c955b511370788e85493 yields frozen candidate d32d4400d705a9d2e84080a0b869ab1215c1515e6361dcb11e0553aa3b80aac4. Shared product source remained unchanged during review.

The role appropriately names a group of three related native buttons. It requires no toolbar keyboard behavior, new event handlers, tabindex or layout changes. Reviewed the focused helper and evidence: a fresh owned DEV process renders the exact named group; axe 4.11.4 aria-prohibited-attr reports zero violations/incomplete and one pass. All five native-keyboard checks pass: Tab out → reset → in, Enter zooms to 120%, Space resets to 100%, and Enter on zoom-out reaches 80%. The patched snapshot Svelte log reports zero errors and warnings. The original incomplete remains recorded.

This closes only the concrete Mermaid semantic defect and its focused regression. It does not approve the rest of the accessibility matrix, native 200% zoom, installed runtime or performance gates. The runtime build must consume this reviewed component blob and later record its own source/artifact identity.

No product file was edited and no browser, server or test suite was started by this reviewer.
