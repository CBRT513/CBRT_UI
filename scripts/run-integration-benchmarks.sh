#!/bin/bash

# Integration Layer Benchmark Suite
# Comprehensive performance testing for F milestone

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PROJECT_ROOT/benchmark-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/benchmark_$TIMESTAMP.log"

# Benchmark configuration
SCENARIOS=("light" "moderate" "heavy")
VERIFICATION_ENABLED=true
LOAD_TEST_ENABLED=true
UNIT_TEST_ENABLED=true
PERFORMANCE_PROFILING=true

# Create results directory
mkdir -p "$RESULTS_DIR"

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Print banner
print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Integration Layer Benchmarks                ║"
    echo "║                     Milestone F Testing                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        warning "Node.js version should be 18+ for optimal performance"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if in project root
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Not in a Node.js project directory"
        exit 1
    fi
    
    # Check for integration files
    if [ ! -d "$PROJECT_ROOT/src/lib/integration" ]; then
        error "Integration layer not found. Run implementation first."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install project dependencies
    if ! npm install --silent; then
        error "Failed to install npm dependencies"
        exit 1
    fi
    
    # Install additional benchmark dependencies
    local benchmark_deps=("clinic" "autocannon" "0x")
    for dep in "${benchmark_deps[@]}"; do
        if ! npm list -g "$dep" &> /dev/null; then
            log "Installing global dependency: $dep"
            if ! npm install -g "$dep" --silent; then
                warning "Failed to install $dep globally, some features may be limited"
            fi
        fi
    done
    
    success "Dependencies installed"
}

# Run verification
run_verification() {
    if [ "$VERIFICATION_ENABLED" = false ]; then
        log "Verification skipped (disabled)"
        return 0
    fi
    
    log "Running integration layer verification..."
    
    cd "$PROJECT_ROOT"
    
    if node scripts/verify-integration-layer.js > "$RESULTS_DIR/verification_$TIMESTAMP.log" 2>&1; then
        success "Verification passed"
        return 0
    else
        error "Verification failed"
        cat "$RESULTS_DIR/verification_$TIMESTAMP.log"
        return 1
    fi
}

# Run unit tests
run_unit_tests() {
    if [ "$UNIT_TEST_ENABLED" = false ]; then
        log "Unit tests skipped (disabled)"
        return 0
    fi
    
    log "Running unit tests..."
    
    cd "$PROJECT_ROOT"
    
    # Check if Jest is available
    if npm list jest &> /dev/null || npm list -g jest &> /dev/null; then
        local test_command="npm test"
        
        # Run with coverage if available
        if npm list nyc &> /dev/null || npm list -g nyc &> /dev/null; then
            test_command="npm run test:coverage"
        fi
        
        if $test_command > "$RESULTS_DIR/unit_tests_$TIMESTAMP.log" 2>&1; then
            success "Unit tests passed"
            
            # Extract test results
            local test_results=$(grep -E "(passing|failing)" "$RESULTS_DIR/unit_tests_$TIMESTAMP.log" | tail -1)
            log "Test results: $test_results"
            
            return 0
        else
            error "Unit tests failed"
            tail -20 "$RESULTS_DIR/unit_tests_$TIMESTAMP.log"
            return 1
        fi
    else
        warning "Jest not found, skipping unit tests"
        return 0
    fi
}

# Run load tests
run_load_tests() {
    if [ "$LOAD_TEST_ENABLED" = false ]; then
        log "Load tests skipped (disabled)"
        return 0
    fi
    
    log "Running load tests..."
    
    cd "$PROJECT_ROOT"
    
    local overall_success=true
    
    for scenario in "${SCENARIOS[@]}"; do
        log "Running $scenario load test scenario..."
        
        local scenario_log="$RESULTS_DIR/load_test_${scenario}_$TIMESTAMP.log"
        
        if timeout 300 node scripts/load-test-integration.js "$scenario" > "$scenario_log" 2>&1; then
            success "$scenario scenario completed"
            
            # Extract key metrics
            local throughput=$(grep "Throughput:" "$scenario_log" | awk '{print $2}' | head -1)
            local avg_response=$(grep "Avg Response Time:" "$scenario_log" | awk '{print $4}' | head -1)
            local error_rate=$(grep "Error Rate:" "$scenario_log" | awk '{print $3}' | head -1)
            
            log "$scenario metrics - Throughput: ${throughput}req/s, Avg Response: ${avg_response}, Error Rate: ${error_rate}"
            
        else
            error "$scenario scenario failed or timed out"
            tail -10 "$scenario_log"
            overall_success=false
        fi
        
        # Brief pause between scenarios
        sleep 10
    done
    
    if [ "$overall_success" = true ]; then
        success "All load test scenarios completed"
        return 0
    else
        error "Some load test scenarios failed"
        return 1
    fi
}

# Performance profiling
run_performance_profiling() {
    if [ "$PERFORMANCE_PROFILING" = false ]; then
        log "Performance profiling skipped (disabled)"
        return 0
    fi
    
    log "Running performance profiling..."
    
    cd "$PROJECT_ROOT"
    
    # CPU profiling with 0x (if available)
    if command -v 0x &> /dev/null; then
        log "Running CPU profiling with 0x..."
        
        if timeout 60 0x -o "$RESULTS_DIR/cpu_profile_$TIMESTAMP" -- node scripts/load-test-integration.js light > /dev/null 2>&1; then
            success "CPU profiling completed"
        else
            warning "CPU profiling failed or timed out"
        fi
    fi
    
    # Memory profiling with clinic (if available)
    if command -v clinic &> /dev/null; then
        log "Running memory profiling with clinic..."
        
        if timeout 60 clinic doctor --dest "$RESULTS_DIR" -- node scripts/load-test-integration.js light > /dev/null 2>&1; then
            success "Memory profiling completed"
        else
            warning "Memory profiling failed or timed out"
        fi
    fi
    
    return 0
}

# Benchmark HTTP endpoints (if server is running)
benchmark_http_endpoints() {
    log "Checking for running server to benchmark HTTP endpoints..."
    
    # Common development ports
    local ports=(3000 5177 8080 8000)
    local server_found=false
    local active_port=""
    
    for port in "${ports[@]}"; do
        if nc -z localhost "$port" 2>/dev/null; then
            server_found=true
            active_port=$port
            break
        fi
    done
    
    if [ "$server_found" = false ]; then
        warning "No development server found, skipping HTTP endpoint benchmarks"
        return 0
    fi
    
    log "Found server on port $active_port, running HTTP benchmarks..."
    
    # Define endpoints to test
    local endpoints=(
        "/"
        "/api/health"
        "/api/integrations"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Benchmarking endpoint: $endpoint"
        
        local endpoint_name=$(echo "$endpoint" | sed 's/[^a-zA-Z0-9]/_/g')
        local benchmark_log="$RESULTS_DIR/http_${endpoint_name}_$TIMESTAMP.log"
        
        if command -v autocannon &> /dev/null; then
            # Use autocannon for HTTP benchmarking
            if autocannon -c 10 -d 30 "http://localhost:$active_port$endpoint" > "$benchmark_log" 2>&1; then
                # Extract key metrics
                local rps=$(grep "Req/Sec" "$benchmark_log" | awk '{print $2}' | head -1)
                local latency=$(grep "Latency" "$benchmark_log" | awk '{print $2}' | head -1)
                
                log "$endpoint results - RPS: $rps, Latency: $latency"
                success "$endpoint benchmark completed"
            else
                warning "$endpoint benchmark failed"
            fi
        else
            # Fallback to curl-based simple test
            local start_time=$(date +%s%N)
            for i in {1..100}; do
                curl -s "http://localhost:$active_port$endpoint" > /dev/null
            done
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            local rps=$(( 100000 / duration ))
            
            log "$endpoint simple test - 100 requests in ${duration}ms (~${rps} req/s)"
        fi
        
        sleep 2
    done
    
    success "HTTP endpoint benchmarks completed"
}

# Collect system information
collect_system_info() {
    log "Collecting system information..."
    
    local system_info="$RESULTS_DIR/system_info_$TIMESTAMP.txt"
    
    {
        echo "System Information - $(date)"
        echo "=================================="
        echo
        
        echo "Operating System:"
        uname -a
        echo
        
        echo "CPU Information:"
        if [ -f /proc/cpuinfo ]; then
            grep "model name" /proc/cpuinfo | head -1
            grep "cpu cores" /proc/cpuinfo | head -1
        elif command -v sysctl &> /dev/null; then
            sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "CPU info not available"
            sysctl -n hw.ncpu 2>/dev/null || echo "CPU count not available"
        fi
        echo
        
        echo "Memory Information:"
        if [ -f /proc/meminfo ]; then
            grep "MemTotal" /proc/meminfo
            grep "MemAvailable" /proc/meminfo
        elif command -v vm_stat &> /dev/null; then
            vm_stat
        fi
        echo
        
        echo "Node.js Version:"
        node --version
        echo
        
        echo "npm Version:"
        npm --version
        echo
        
        echo "Git Information:"
        git rev-parse --short HEAD 2>/dev/null || echo "Not a git repository"
        echo
        
        echo "Network Configuration:"
        if command -v ifconfig &> /dev/null; then
            ifconfig | grep "inet " | head -3
        elif command -v ip &> /dev/null; then
            ip addr show | grep "inet " | head -3
        fi
        
    } > "$system_info"
    
    success "System information collected"
}

# Generate summary report
generate_summary_report() {
    log "Generating summary report..."
    
    local summary_report="$RESULTS_DIR/benchmark_summary_$TIMESTAMP.md"
    
    {
        echo "# Integration Layer Benchmark Summary"
        echo
        echo "**Generated:** $(date)"
        echo "**Benchmark ID:** $TIMESTAMP"
        echo
        
        echo "## Configuration"
        echo "- Scenarios tested: ${SCENARIOS[*]}"
        echo "- Verification enabled: $VERIFICATION_ENABLED"
        echo "- Load testing enabled: $LOAD_TEST_ENABLED"
        echo "- Unit testing enabled: $UNIT_TEST_ENABLED"
        echo "- Performance profiling: $PERFORMANCE_PROFILING"
        echo
        
        echo "## Results Summary"
        echo
        
        # Verification results
        if [ "$VERIFICATION_ENABLED" = true ]; then
            if [ -f "$RESULTS_DIR/verification_$TIMESTAMP.log" ]; then
                if grep -q "VERIFICATION PASSED" "$RESULTS_DIR/verification_$TIMESTAMP.log"; then
                    echo "✅ **Verification:** PASSED"
                else
                    echo "❌ **Verification:** FAILED"
                fi
            else
                echo "⚠️ **Verification:** No results found"
            fi
        fi
        
        # Unit test results
        if [ "$UNIT_TEST_ENABLED" = true ]; then
            if [ -f "$RESULTS_DIR/unit_tests_$TIMESTAMP.log" ]; then
                local test_summary=$(grep -E "(passing|failing)" "$RESULTS_DIR/unit_tests_$TIMESTAMP.log" | tail -1)
                if [[ $test_summary == *"failing"* ]]; then
                    echo "❌ **Unit Tests:** FAILED - $test_summary"
                else
                    echo "✅ **Unit Tests:** PASSED - $test_summary"
                fi
            else
                echo "⚠️ **Unit Tests:** No results found"
            fi
        fi
        
        # Load test results
        if [ "$LOAD_TEST_ENABLED" = true ]; then
            echo
            echo "### Load Test Results"
            echo
            
            for scenario in "${SCENARIOS[@]}"; do
                local scenario_log="$RESULTS_DIR/load_test_${scenario}_$TIMESTAMP.log"
                
                if [ -f "$scenario_log" ]; then
                    if grep -q "Load test PASSED" "$scenario_log"; then
                        echo "✅ **$scenario:** PASSED"
                    else
                        echo "❌ **$scenario:** FAILED"
                    fi
                    
                    # Extract metrics
                    local throughput=$(grep "Throughput:" "$scenario_log" | awk '{print $2}' | head -1)
                    local avg_response=$(grep "Avg Response Time:" "$scenario_log" | awk '{print $4}' | head -1)
                    local error_rate=$(grep "Error Rate:" "$scenario_log" | awk '{print $3}' | head -1)
                    
                    echo "  - Throughput: ${throughput}req/s"
                    echo "  - Avg Response Time: ${avg_response}"
                    echo "  - Error Rate: ${error_rate}"
                    echo
                else
                    echo "⚠️ **$scenario:** No results found"
                fi
            done
        fi
        
        echo "## Files Generated"
        echo
        find "$RESULTS_DIR" -name "*$TIMESTAMP*" -type f | while read -r file; do
            local filename=$(basename "$file")
            local size=$(ls -lh "$file" | awk '{print $5}')
            echo "- \`$filename\` ($size)"
        done
        
        echo
        echo "## Next Steps"
        echo
        echo "1. Review detailed logs for any failures"
        echo "2. Analyze performance profiles if generated"
        echo "3. Compare results with previous benchmarks"
        echo "4. Address any performance regressions"
        echo
        
    } > "$summary_report"
    
    success "Summary report generated: benchmark_summary_$TIMESTAMP.md"
}

# Clean up old results
cleanup_old_results() {
    log "Cleaning up old benchmark results..."
    
    # Keep only the last 10 benchmark runs
    local old_files=$(find "$RESULTS_DIR" -name "benchmark_*" -type f | sort | head -n -30)
    
    if [ -n "$old_files" ]; then
        echo "$old_files" | xargs rm -f
        success "Cleaned up old benchmark files"
    else
        log "No old files to clean up"
    fi
}

# Main execution
main() {
    print_banner
    
    log "Starting integration layer benchmarks at $(date)"
    log "Results will be saved to: $RESULTS_DIR"
    
    # Run benchmark suite
    local overall_success=true
    
    # Prerequisites
    if ! check_prerequisites; then
        overall_success=false
    fi
    
    # Dependencies
    if ! install_dependencies; then
        overall_success=false
    fi
    
    # System info
    collect_system_info
    
    # Verification
    if ! run_verification; then
        overall_success=false
    fi
    
    # Unit tests
    if ! run_unit_tests; then
        overall_success=false
    fi
    
    # Load tests
    if ! run_load_tests; then
        overall_success=false
    fi
    
    # Performance profiling
    run_performance_profiling
    
    # HTTP benchmarks
    benchmark_http_endpoints
    
    # Generate reports
    generate_summary_report
    
    # Cleanup
    cleanup_old_results
    
    # Final status
    echo
    if [ "$overall_success" = true ]; then
        success "All benchmarks completed successfully!"
        log "View summary: cat $RESULTS_DIR/benchmark_summary_$TIMESTAMP.md"
        exit 0
    else
        error "Some benchmarks failed. Check logs for details."
        log "View logs: ls -la $RESULTS_DIR/*$TIMESTAMP*"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Integration Layer Benchmark Suite"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --no-verification   Skip verification step"
        echo "  --no-load-test      Skip load testing"
        echo "  --no-unit-test      Skip unit testing"
        echo "  --no-profiling      Skip performance profiling"
        echo "  --scenario SCENARIO Run only specific load test scenario"
        echo
        echo "Available scenarios: ${SCENARIOS[*]}"
        exit 0
        ;;
    --no-verification)
        VERIFICATION_ENABLED=false
        shift
        ;;
    --no-load-test)
        LOAD_TEST_ENABLED=false
        shift
        ;;
    --no-unit-test)
        UNIT_TEST_ENABLED=false
        shift
        ;;
    --no-profiling)
        PERFORMANCE_PROFILING=false
        shift
        ;;
    --scenario)
        if [ -n "${2:-}" ]; then
            SCENARIOS=("$2")
            shift 2
        else
            error "Scenario name required after --scenario"
            exit 1
        fi
        ;;
esac

# Execute main function
main "$@"