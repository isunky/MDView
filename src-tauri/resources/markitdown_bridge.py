"""Minimal offline bridge for MDView's DOCX-to-Markdown import."""

import sys


def main() -> None:
    package_dir, source_path, output_path = sys.argv[1:4]
    sys.path.insert(0, package_dir)

    from markitdown import MarkItDown

    # Plugins stay disabled. MDView only supplies a user-selected .docx path.
    converter = MarkItDown(enable_plugins=False)
    result = converter.convert_local(source_path, keep_data_uris=True)

    with open(output_path, "w", encoding="utf-8", newline="\n") as output:
        output.write(result.markdown)


if __name__ == "__main__":
    main()
