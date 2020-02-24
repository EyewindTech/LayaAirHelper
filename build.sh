export GOOS=windows
export GOARCH=amd64
go build -o ./build/windows/LayaHelper.exe LayaHelper.go

export CGO_ENABLED=0
export GOOS=darwin
export GOARCH=amd64
go build -o ./build/macOS/LayaHelper LayaHelper.go

export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64
go build -o ./build/linux/LayaHelper LayaHelper.go
