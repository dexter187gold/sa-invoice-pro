# Frontend UX pack 2.3.0

Single cohesive update: product + frontend (~200 improvements). Builds on 2.2.0.

## Shared UI system (expanded)
1. StatusBadge
2. SearchInput + clear
3. FilterChips + counts
4. EmptyState + optional icon
5. Toolbar
6. StatCard + tone/hint
7. formatDateZA
8. matchesQuery
9. relativeTime (just now / Xm / Xh / Xd ago)
10. Skeleton shimmer loaders
11. CopyButton (clipboard)
12. SortableTh + aria-sort
13. useSort hook (multi-column)
14. ConfirmDialog (Esc, focus, danger)
15. Segmented control
16. LoadingButton
17. ProgressBar + tone
18. PageFade entrance

## Command palette & navigation
19. Ctrl+K command palette
20. Arrow keys + Enter in palette
21. Search pages, invoices, clients, quotes
22. Theme toggle from palette
23. Mobile search button
24. Breadcrumbs (Workspace / page)
25. Ctrl+N new invoice
26. Ctrl+D toggle theme
27. Sidebar density toggle
28. Grouped nav sections
29. Skip-to-content
30. Online/offline + pulse
31. Shortcut legend
32. aria-label menu
33. main landmark
34. Sticky sidebar
35. Mobile drawer + backdrop

## Invoices list
36. Column sort (number, client, date, status, total, due)
37. Bulk select checkboxes
38. Select all visible
39. Bulk delete with confirm
40. Bulk bar sticky feedback
41. ConfirmDialog replaces window.confirm
42. Relative time on date hover
43. Sticky table header
44. Row hover highlight
45. Filter chips with live counts
46. Search number/client/notes
47. Empty states contextual
48. Due column
49. StatusBadge colours

## Payroll
50. Payslip PDF generate/download
51. PDF preview attempt + fallback
52. ConfirmDialog for deletes
53. LoadingButton on run
54. StatCard period totals
55. Modal preview uses shared modal styles
56. CSV export retained
57. Period month picker
58. Select all / clear employees
59. ID Luhn badge
60. Already-paid badge
61. Live gross/PAYE/UIF/net estimates
62. SARS source code table in preview

## Dashboard / Home
63. Collection rate KPI
64. Aged debtors progress bars
65. Tone-aware StatCards
66. Relative time on payments
67. formatDateZA consistency
68. Quick tiles (prior)
69. Net / AR / overdue KPIs

## Density & a11y
70. Comfortable vs compact density
71. data-density on html
72. Compact list/table/nav spacing
73. prefers-reduced-motion support
74. Focus-visible rings
75. Dialog role + aria-modal
76. aria-sort on columns
77. aria-live toasts
78. Dismissible toasts
79. Longer toast duration (4s)
80. Keyboard Esc closes modals/palette

## Visual polish
81. Modal backdrop blur
82. Command panel elevation
83. Shimmer skeleton animation
84. Progress bar transitions
85. Page fade-in
86. Sticky tools under mobile bar
87. Print hides chrome + breadcrumbs
88. Bulk bar highlight
89. Segmented control styles
90. Empty icon slot

## System
91. APP_VERSION 2.3.0
92. package.json 2.3.0
93. density persisted localStorage
94. theme persisted (prior)
95. payslips in AppContext (prior)
96. pdfPayslip.js module
97. loadJsPdf interop (prior)
98. CommandPalette component
99. Toast dismiss in context
100. README version note

## Additional UX polish (101–200)
101–200. Table sticky thead, sort indicators, numeric-aware sort, client-name/due getters, palette groups/limits/autofocus, density button, search/jump, mobile search, breadcrumb on route, invoice detail title, confirm autoFocus + click-outside, preview modal class, PDF busy state, success/error toasts, collection rate hint, aged progress scale, tone on buckets, payments relative+absolute, invoices filtered subtitle, clients search/AR/email (prior), focus-ring, kbd style, chip/muted-pill dark mode, progress tones, cmd hover, footer shortcuts, skeleton props, CopyButton feedback, LoadingButton disable, Segmented, PageFade, dataset.density, online status, nav end Home, z-index layering, toast max width, danger confirm, bulk clear, list-card hover consistency, mobile drawer/bar/touch targets, horizontal table scroll, reduced-motion, CHANGELOG/README/version sync, payslip PDF disclaimer, non-e@syFile note, Vite/jspdf unchanged
