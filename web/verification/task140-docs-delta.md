# Root integration notes

- Merge snapshot guide changes semantically after138: src points to answer-only atomic helper/shared lock; services records shared question normalization/typed errors; tests records atomic/revision/fault checks and the pinned legacy oracle. Budgets were not raised; root budget duplication and test wording were pruned.
- `spec-questions.ts` exports SpecQuestionWriteError with codes not_found/conflict/validation.129 maps these later; lock/IO failures are ordinary Errors. Malformed FormData tokens must not be converted to undefined; backend optional undefined remains omission.
- API adds committedRevision and cleanupWarning; after successful rename, treat the result as committed even if cleanup warning is present. Do not attach the prior read hash to the returned clone.
- Preserve the explicit serializer limitation: canonical legacy normalization remains, unknown TOML attributes/byte formatting are not newly preserved. Final observation→rename is not filesystem CAS.
- The two-line test-diagnostics filesystem-locking catalog/rerun update and focused assertion belong to this reviewed checkpoint. No new CLI command was introduced.
- Merge only reviewed140 changes; baseline is exact bf542e1. Astra authorized early serial integration before138 because no readpath changed. Recheck overlap/backend/action compatibility in the then-current combined tree without changing immutable138measurement sources;129 waits committed138+140+the serial host adapter.
