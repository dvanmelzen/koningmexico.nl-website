#!/bin/bash
# Nessus Results Analysis for Claude
# Extracts actionable insights from .nessus XML files
# Author: Claude Code
# Date: 2025-12-28

set -euo pipefail

NESSUS_FILE="${1:-}"

if [ -z "$NESSUS_FILE" ]; then
    echo "Usage: $0 <scan-results.nessus>"
    exit 1
fi

if [ ! -f "$NESSUS_FILE" ]; then
    echo "Error: File not found: $NESSUS_FILE"
    exit 1
fi

echo "Analyzing Nessus results: $NESSUS_FILE"
echo ""

# Extract critical findings
echo "═══════════════════════════════════════════════════════════"
echo "  CRITICAL Vulnerabilities (Severity 4)"
echo "═══════════════════════════════════════════════════════════"

xmllint --xpath '//ReportItem[@severity="4"]' "$NESSUS_FILE" 2>/dev/null | \
    xmllint --format - | \
    grep -E '<pluginName>|<description>|<solution>|<cve>' | \
    head -50

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  HIGH Vulnerabilities (Severity 3)"
echo "═══════════════════════════════════════════════════════════"

xmllint --xpath '//ReportItem[@severity="3"]' "$NESSUS_FILE" 2>/dev/null | \
    xmllint --format - | \
    grep -E '<pluginName>|<description>|<solution>' | \
    head -50

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Remediation Priority"
echo "═══════════════════════════════════════════════════════════"

# Generate JSON for Claude processing
cat > "nessus-analysis.json" <<EOF
{
    "source": "$NESSUS_FILE",
    "analyzed_at": "$(date -Iseconds)",
    "findings": {
        "critical": [
$(xmllint --xpath '//ReportItem[@severity="4"]' "$NESSUS_FILE" 2>/dev/null | \
    xmllint --format - | \
    grep '<pluginName>' | \
    sed 's/<pluginName>//g; s/<\/pluginName>//g' | \
    sed 's/^[ \t]*/            "/' | \
    sed 's/$/",/' | \
    sed '$ s/,$//')
        ],
        "high": [
$(xmllint --xpath '//ReportItem[@severity="3"]' "$NESSUS_FILE" 2>/dev/null | \
    xmllint --format - | \
    grep '<pluginName>' | \
    sed 's/<pluginName>//g; s/<\/pluginName>//g' | \
    sed 's/^[ \t]*/            "/' | \
    sed 's/$/",/' | \
    sed '$ s/,$//')
        ]
    }
}
EOF

echo "✓ Detailed analysis saved to: nessus-analysis.json"
echo ""
echo "Next steps:"
echo "  1. Review nessus-analysis.json"
echo "  2. Pass to Claude for remediation plan"
echo "  3. Generate DANIEL journal entries"
echo "  4. Create Jira tickets with context"
