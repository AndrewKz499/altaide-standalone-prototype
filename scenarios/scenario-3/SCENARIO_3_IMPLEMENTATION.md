# Scenario 3 implementation master-spec

## Architecture contract

- Scenario 1 and Scenario 2 are READ-ONLY references.
- Scenario 3 changes stay inside `scenarios/scenario-3/`.
- Figma is the visual source of truth.
- `sourceDocuments` contains the live source of truth.
- Build snapshots are immutable historical copies and never follow live source mutations.
- Code actions use local click-targets only: no `input`, `contenteditable`, caret, paste, or manual typing.
- Every implementation step ends with: test → commit → push → GitHub Pages deployment → PUBLIC verification.

## Completed flow

1. Initial screen → Compile → Console and deterministic compile progress.
2. Compile completes → Compiler Messages → immutable Build #1 with collapsed CMP101.
3. CMP101 expands → two conflict locations and snapshot-based code preview.
4. Location click → corresponding live document opens; Content Tab and Tree selection sync; conflict is revealed without changing source or Build #1.
5. Location → click `compute` → live name becomes `calculate`; Build #1 remains unchanged.
6. Rename → Compile → Console/progress → immutable Build #2 (`23.06.2026 15:55`) without name-conflict diagnostics; Build #1 remains selectable and unchanged.
7. Build #2 → live `calculate` document → click `Вставьте код` → canonical body appears; live Analyzer reports ST001 while Build #1 and Build #2 remain unchanged.
8. Analyzer ST001 → click `Объявите переменную` → `result : INT;` appears in live source; Analyzer clears immediately while Build history remains unchanged.
9. Declared live source → Compile → Console/progress → immutable clean Build #3 (`23.06.2026 15:58`); Build #1 and Build #2 remain selectable and unchanged.

## Remaining flow

10. Verify build-history selection, counters, timestamps, diagnostics, and immutable previews.
11. Final regression of the complete Scenario 3 flow.
