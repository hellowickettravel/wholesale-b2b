# Catalogue import files

One CSV per source list. Header row required; only `category` and `name` are mandatory.

| column | meaning |
|---|---|
| `category` | Category name. Matched to an existing category by name or slug; otherwise a new category is created. |
| `name` | Item name as the supplier writes it, e.g. `BASANT BASMATI RICE 20 KGS`. The pack size is parsed out of the name and sizes of the same product are grouped. |
| `size` | Optional explicit pack size (e.g. `330ML x 24`), overrides parsing. |
| `sku` | Optional supplier code. |
| `vat` | Optional VAT % for this size (0, 5, 20). Blank = the category default. |
| `description` | Optional product description. |

Costs are never imported: every new size is flagged **needs price** for the admin.
Re-running an import is safe: existing products and sizes are left exactly as the admin edited them.

Run from the admin screen (`/admin/products/import`) or the CLI:

```bash
npx tsx --env-file=.env.local scripts/import-catalogue.mts data/import/shrivi-items.csv --supplier "Shrivi Limited" --source shrivi_items          # dry run
npx tsx --env-file=.env.local scripts/import-catalogue.mts data/import/shrivi-items.csv --supplier "Shrivi Limited" --source shrivi_items --apply
```

The client's PDFs (`/data/source/`) are converted to these CSVs when they arrive (see HANDOVER).
