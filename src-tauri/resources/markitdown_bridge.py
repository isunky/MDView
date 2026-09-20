"""Minimal offline bridge for MDView's DOCX-to-Markdown import."""

import os
import sys


def main() -> None:
    package_dir, source_path, output_path = sys.argv[1:4]
    package_dir = os.path.realpath(package_dir)
    source_path = os.path.realpath(source_path)
    output_path = os.path.realpath(output_path)

    # Reject anything that isn't a real, existing file (blocks traversal via
    # symlinks/"..") and refuse to overwrite a directory as the output.
    if not os.path.isfile(source_path):
        raise SystemExit(f"Invalid source path: {source_path}")
    if os.path.isdir(output_path):
        raise SystemExit(f"Invalid output path: {output_path}")

    sys.path.insert(0, package_dir)

    from markitdown import MarkItDown

    # Plugins stay disabled. MDView only supplies a user-selected .docx path.
    converter = MarkItDown(enable_plugins=False)
    result = converter.convert_local(source_path, keep_data_uris=True)

    with open(output_path, "w", encoding="utf-8", newline="\n") as output:
        output.write(result.markdown)


if __name__ == "__main__":
    main()
