#!/bin/bash

# LibreChat Export Converter
# Converts markdown/text exports to PDF or DOCX using Gotenberg

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORTS_DIR="$SCRIPT_DIR/exports"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LibreChat Export Converter${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Determine Gotenberg URL (container vs local)
if [ -n "$GOTENBERG_URL" ]; then
    GOTENBERG_HOST="$GOTENBERG_URL"
elif curl -s http://gotenberg:3000/health > /dev/null 2>&1; then
    GOTENBERG_HOST="http://gotenberg:3000"
else
    GOTENBERG_HOST="http://localhost:3002"
fi

# Check if Gotenberg is running
if ! curl -s $GOTENBERG_HOST/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Gotenberg service is not running!${NC}"
    echo "Start it with: docker compose up -d gotenberg"
    exit 1
fi

# Check if input file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <input-file.md|input-file.txt> [output-format]"
    echo
    echo "Output formats:"
    echo "  pdf   - Convert to PDF (default)"
    echo "  docx  - Convert to DOCX"
    echo
    echo "Example:"
    echo "  $0 conversation.md pdf"
    echo "  $0 conversation.txt docx"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FORMAT="${2:-pdf}"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file '$INPUT_FILE' not found!${NC}"
    exit 1
fi

# Get base filename without extension
BASENAME=$(basename "$INPUT_FILE" | sed 's/\.[^.]*$//')
OUTPUT_DIR=$(dirname "$INPUT_FILE")

echo -e "${GREEN}Input:${NC} $INPUT_FILE"
echo -e "${GREEN}Format:${NC} $OUTPUT_FORMAT"
echo

case "$OUTPUT_FORMAT" in
    pdf)
        OUTPUT_FILE="$OUTPUT_DIR/${BASENAME}.pdf"
        echo "Converting to PDF..."

        # Convert markdown to HTML first, then to PDF via Gotenberg
        if command -v pandoc &> /dev/null; then
            # Use pandoc if available
            HTML_FILE="/tmp/${BASENAME}.html"
            pandoc "$INPUT_FILE" -s -o "$HTML_FILE" --metadata title="$BASENAME"

            curl --request POST \
                --form "files=@$HTML_FILE;filename=index.html" \
                --output "$OUTPUT_FILE" \
                $GOTENBERG_HOST/forms/chromium/convert/html

            rm "$HTML_FILE"
        else
            # Simple HTML wrapper
            HTML_FILE="/tmp/${BASENAME}.html"
            cat > "$HTML_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>$BASENAME</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
        }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
<pre>$(cat "$INPUT_FILE")</pre>
</body>
</html>
EOF

            curl --request POST \
                --form "files=@$HTML_FILE;filename=index.html" \
                --output "$OUTPUT_FILE" \
                $GOTENBERG_HOST/forms/chromium/convert/html

            rm "$HTML_FILE"
        fi
        ;;

    docx)
        OUTPUT_FILE="$OUTPUT_DIR/${BASENAME}.docx"
        echo "Converting to DOCX..."

        if command -v pandoc &> /dev/null; then
            pandoc "$INPUT_FILE" -o "$OUTPUT_FILE"
        else
            echo -e "${RED}Error: pandoc is required for DOCX conversion${NC}"
            echo "Install with: brew install pandoc (macOS) or apt-get install pandoc (Linux)"
            exit 1
        fi
        ;;

    *)
        echo -e "${RED}Error: Unknown output format '$OUTPUT_FORMAT'${NC}"
        echo "Supported formats: pdf, docx"
        exit 1
        ;;
esac

if [ -f "$OUTPUT_FILE" ]; then
    echo
    echo -e "${GREEN}✓ Conversion successful!${NC}"
    echo -e "${GREEN}Output:${NC} $OUTPUT_FILE"

    # Show file size
    if command -v du &> /dev/null; then
        SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo -e "${GREEN}Size:${NC} $SIZE"
    fi
else
    echo -e "${RED}✗ Conversion failed!${NC}"
    exit 1
fi
