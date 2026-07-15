# MemoryCare — Documentation

FYP documentation for the Memory Assistant System, aligned with the built app.

| File | Contents |
|------|----------|
| [THESIS-UPDATES.md](THESIS-UPDATES.md) | Corrections + additions to paste into the existing thesis chapters (SPMP / SRS / SDD) |
| [CHATBOT-MODULE.md](CHATBOT-MODULE.md) | Module documentation for the custom-trained chatbot NLP model |
| [TESTING.md](TESTING.md) | Chapter 4 (Software Testing) rewritten around the real Jest/Supertest suite + model evaluation |
| [USER-MANUAL.md](USER-MANUAL.md) | Step-by-step user guide for patient / caregiver / admin |
| [INTERFACES.md](INTERFACES.md) | Interfaces chapter — 12 screens with descriptions (insert screenshots) |
| [DIAGRAM-ERD.md](DIAGRAM-ERD.md) | Entity-Relationship Diagram (Mermaid) generated from the 15 data models |

## Converting to Word (.docx)

These are Markdown so you can paste them straight into your Word thesis
(headings and tables carry over). To produce standalone `.docx` files, install
[pandoc](https://pandoc.org) and run, e.g.:

```bash
pandoc docs/USER-MANUAL.md -o USER-MANUAL.docx
pandoc docs/CHATBOT-MODULE.md -o CHATBOT-MODULE.docx
pandoc docs/TESTING.md -o TESTING.docx
pandoc docs/THESIS-UPDATES.md -o THESIS-UPDATES.docx
```

Remember to insert your own screenshots and the model accuracy / confusion-matrix
figures where marked.
