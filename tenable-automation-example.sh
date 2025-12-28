#!/bin/bash
# Tenable/Nessus Automation Script
# EQOM Security Scanning
# Author: Claude Code
# Date: 2025-12-28

set -euo pipefail

# Configuration
NESSUS_URL="${NESSUS_URL:-https://nessus.eqom.local:8834}"
ACCESS_KEY="${NESSUS_ACCESS_KEY}"
SECRET_KEY="${NESSUS_SECRET_KEY}"
TARGET="${1:-helloid-connect.eqomit.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

# API call helper
nessus_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local auth_header="X-ApiKeys: accessKey=${ACCESS_KEY}; secretKey=${SECRET_KEY}"

    if [ -z "$data" ]; then
        curl -s -X "$method" "${NESSUS_URL}${endpoint}" \
            -H "$auth_header" \
            -H "Content-Type: application/json"
    else
        curl -s -X "$method" "${NESSUS_URL}${endpoint}" \
            -H "$auth_header" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

# Create scan
create_scan() {
    log "Creating scan for target: $TARGET"

    local scan_config='{
        "uuid": "731a8e52-3ea6-a291-ec0a-d2ff0619c19d7bd788d6be818b65",
        "settings": {
            "name": "EQOM - '"$TARGET"' - '"$(date +%Y%m%d-%H%M)"'",
            "text_targets": "'"$TARGET"'",
            "description": "Automated security scan via Claude Code",
            "enabled": true,
            "launch": "ON_DEMAND"
        }
    }'

    local response=$(nessus_api POST "/scans" "$scan_config")

    local scan_id=$(echo "$response" | jq -r '.scan.id')

    if [ "$scan_id" = "null" ]; then
        error "Failed to create scan"
        echo "$response" | jq .
        exit 1
    fi

    log "✓ Scan created with ID: $scan_id"
    echo "$scan_id"
}

# Launch scan
launch_scan() {
    local scan_id="$1"

    log "Launching scan $scan_id"

    nessus_api POST "/scans/$scan_id/launch" > /dev/null

    log "✓ Scan launched"
}

# Wait for scan completion
wait_for_scan() {
    local scan_id="$1"
    local max_wait=3600  # 1 hour
    local elapsed=0

    log "Waiting for scan to complete (max ${max_wait}s)..."

    while [ $elapsed -lt $max_wait ]; do
        local status=$(nessus_api GET "/scans/$scan_id" | jq -r '.info.status')

        case "$status" in
            "completed")
                log "✓ Scan completed"
                return 0
                ;;
            "running")
                echo -n "."
                sleep 30
                elapsed=$((elapsed + 30))
                ;;
            "canceled"|"aborted")
                error "Scan was $status"
                return 1
                ;;
            *)
                warn "Unknown status: $status"
                sleep 30
                elapsed=$((elapsed + 30))
                ;;
        esac
    done

    error "Scan timeout after ${max_wait}s"
    return 1
}

# Export results
export_results() {
    local scan_id="$1"
    local output_file="scan-${scan_id}-$(date +%Y%m%d-%H%M).nessus"

    log "Exporting scan results..."

    # Request export
    local export_response=$(nessus_api POST "/scans/$scan_id/export" '{"format": "nessus"}')
    local file_id=$(echo "$export_response" | jq -r '.file')

    # Wait for export to be ready
    sleep 5

    # Download export
    curl -s "${NESSUS_URL}/scans/${scan_id}/export/${file_id}/download" \
        -H "X-ApiKeys: accessKey=${ACCESS_KEY}; secretKey=${SECRET_KEY}" \
        -o "$output_file"

    log "✓ Results exported to: $output_file"
    echo "$output_file"
}

# Parse results (high-level summary)
parse_results() {
    local nessus_file="$1"

    log "Parsing results from $nessus_file"

    # Extract key metrics using xmllint
    local critical=$(xmllint --xpath 'count(//ReportItem[@severity="4"])' "$nessus_file" 2>/dev/null || echo "0")
    local high=$(xmllint --xpath 'count(//ReportItem[@severity="3"])' "$nessus_file" 2>/dev/null || echo "0")
    local medium=$(xmllint --xpath 'count(//ReportItem[@severity="2"])' "$nessus_file" 2>/dev/null || echo "0")
    local low=$(xmllint --xpath 'count(//ReportItem[@severity="1"])' "$nessus_file" 2>/dev/null || echo "0")

    echo ""
    echo "════════════════════════════════════════"
    echo "  Vulnerability Summary"
    echo "════════════════════════════════════════"
    echo -e "${RED}Critical:${NC} $critical"
    echo -e "${RED}High:${NC}     $high"
    echo -e "${YELLOW}Medium:${NC}   $medium"
    echo -e "${GREEN}Low:${NC}      $low"
    echo "════════════════════════════════════════"
    echo ""

    # Return JSON for further processing
    cat > "scan-summary.json" <<EOF
{
    "scan_file": "$nessus_file",
    "timestamp": "$(date -Iseconds)",
    "target": "$TARGET",
    "vulnerabilities": {
        "critical": $critical,
        "high": $high,
        "medium": $medium,
        "low": $low,
        "total": $((critical + high + medium + low))
    }
}
EOF

    log "✓ Summary saved to: scan-summary.json"
}

# Main execution
main() {
    log "Starting Tenable scan automation"
    log "Target: $TARGET"

    # Validate credentials
    if [ -z "${ACCESS_KEY:-}" ] || [ -z "${SECRET_KEY:-}" ]; then
        error "Missing NESSUS_ACCESS_KEY or NESSUS_SECRET_KEY"
        exit 1
    fi

    # Create and launch scan
    scan_id=$(create_scan)
    launch_scan "$scan_id"

    # Wait for completion
    if wait_for_scan "$scan_id"; then
        # Export and parse
        nessus_file=$(export_results "$scan_id")
        parse_results "$nessus_file"

        log "✓ Scan complete! Results ready for Claude analysis."
        log "Next: Pass $nessus_file to Claude for detailed analysis and remediation"
    else
        error "Scan failed"
        exit 1
    fi
}

# Check dependencies
for cmd in curl jq xmllint; do
    if ! command -v $cmd &> /dev/null; then
        error "Required command not found: $cmd"
        exit 1
    fi
done

main "$@"
