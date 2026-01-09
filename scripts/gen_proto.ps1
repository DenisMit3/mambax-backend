# PowerShell script to generate Go code from Protobuf files

$PROTO_DIR = "proto"
$OUT_DIR = "pkg/pb"

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OUT_DIR)) {
    New-Item -ItemType Directory -Path $OUT_DIR | Out-Null
    Write-Host "Created directory: $OUT_DIR"
}

# Check if protoc is installed
if (-not (Get-Command "protoc" -ErrorAction SilentlyContinue)) {
    Write-Error "Error: 'protoc' compiler is not installed or not in PATH."
    exit 1
}

# Check if protoc-gen-go is installed (simplified check)
# In a real environment, you'd verify the plugins
Write-Host "Generating Go code from proto files..."

# Generate code
# Assuming go_out and go-grpc_out plugins are installed
# We use standard go flags
protoc --proto_path=$PROTO_DIR --go_out=$OUT_DIR --go_opt=paths=source_relative --go-grpc_out=$OUT_DIR --go-grpc_opt=paths=source_relative $PROTO_DIR/*.proto

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully generated Protobuf code in $OUT_DIR"
} else {
    Write-Error "Failed to generate Protobuf code."
}
