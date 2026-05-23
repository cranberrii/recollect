"""Clean up orphaned rows in `bookmark_categories` and `categories`.

Two passes:
  1. `bookmark_categories` rows whose `bookmark_id` no longer exists in
     `bookmarks` (defensive — the FK has ON DELETE CASCADE, but historical
     rows from before CASCADE or from manual deletes can leak through).
  2. `categories` of type 'ai' that no longer have any `bookmark_categories`
     row pointing at them. `user` categories are left alone — they can
     legitimately exist without any bookmark linked.

Schema note: `bookmark_categories` has a composite PK (bookmark_id,
category_id), no surrogate `id` column.

Run from the backend dir:
    uv run python scripts/cleanup_categories.py            # dry run
    uv run python scripts/cleanup_categories.py --apply    # delete
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from supabase import create_client


def fetch_all_ids(client, table: str, column: str) -> set[str]:
    """Page through `table` returning the set of values in `column`."""
    ids: set[str] = set()
    page_size = 1000
    start = 0
    while True:
        rows = (
            client.table(table)
            .select(column)
            .range(start, start + page_size - 1)
            .execute()
            .data
        )
        if not rows:
            break
        ids.update(r[column] for r in rows if r.get(column) is not None)
        if len(rows) < page_size:
            break
        start += page_size
    return ids


def fetch_bookmark_category_rows(client) -> list[dict]:
    rows: list[dict] = []
    page_size = 1000
    start = 0
    while True:
        page = (
            client.table("bookmark_categories")
            .select("bookmark_id,category_id")
            .range(start, start + page_size - 1)
            .execute()
            .data
        )
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        start += page_size
    return rows


def fetch_ai_categories(client) -> list[dict]:
    rows: list[dict] = []
    page_size = 1000
    start = 0
    while True:
        page = (
            client.table("categories")
            .select("id,name,user_id")
            .eq("type", "ai")
            .range(start, start + page_size - 1)
            .execute()
            .data
        )
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        start += page_size
    return rows


def delete_in_chunks(
    client, table: str, column: str, values: list[str], chunk: int = 500
) -> int:
    deleted = 0
    for i in range(0, len(values), chunk):
        batch = values[i : i + chunk]
        res = client.table(table).delete().in_(column, batch).execute()
        deleted += len(res.data or [])
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete rows. Without this flag, runs as dry-run.",
    )
    args = parser.parse_args()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return 1

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"== Cleanup categories ({mode}) ==")

    # Pass 1: orphaned bookmark_categories rows
    print("\n[1/2] Scanning bookmark_categories table for orphaned bookmark_ids...")
    bc_rows = fetch_bookmark_category_rows(client)
    live_bookmark_ids = fetch_all_ids(client, "bookmarks", "id")
    referenced_bookmark_ids = {r["bookmark_id"] for r in bc_rows}
    orphan_bookmark_ids = sorted(referenced_bookmark_ids - live_bookmark_ids)
    orphan_bc_count = sum(
        1 for r in bc_rows if r["bookmark_id"] in orphan_bookmark_ids
    )
    print(
        f"    bookmark_categories total: {len(bc_rows)}, "
        f"live bookmarks: {len(live_bookmark_ids)}, "
        f"orphan junction rows: {orphan_bc_count} "
        f"(from {len(orphan_bookmark_ids)} dead bookmark_ids)"
    )
    if orphan_bookmark_ids and args.apply:
        n = delete_in_chunks(
            client, "bookmark_categories", "bookmark_id", orphan_bookmark_ids
        )
        print(f"    deleted {n} bookmark_categories rows")

    # Pass 2: ai categories with no remaining links
    print("\n[2/2] Scanning categories table (type='ai') with no bookmark links...")
    # Refetch junction rows after pass 1 if we applied changes.
    if args.apply and orphan_bookmark_ids:
        bc_rows = fetch_bookmark_category_rows(client)
    referenced_category_ids = {r["category_id"] for r in bc_rows}
    ai_categories = fetch_ai_categories(client)
    orphan_cats = [
        c["id"] for c in ai_categories if c["id"] not in referenced_category_ids
    ]
    print(
        f"    ai categories total: {len(ai_categories)}, "
        f"referenced: {len(ai_categories) - len(orphan_cats)}, "
        f"orphans: {len(orphan_cats)}"
    )
    if orphan_cats and args.apply:
        n = delete_in_chunks(client, "categories", "id", orphan_cats)
        print(f"    deleted {n} categories rows")

    if not args.apply and (orphan_bookmark_ids or orphan_cats):
        print("\nRe-run with --apply to delete the rows above.")
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
