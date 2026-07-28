// Retired. The last-page anchoring of the closing block is now done in the PDF
// renderer (src/lib/pdf/render-pdf.ts, `anchorClosingBlock`), which can iterate
// against the REAL paginated page count — something in-page JS cannot observe,
// because a `break-inside: avoid` block that moves to the next page does not
// change the DOM's continuous height. Kept as an empty module to avoid a
// dangling import; safe to remove.
export {}
