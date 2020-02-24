@echo off
SET GOOS=windows
SET GOARCH=amd64
go build -o ./build/windows/LayaHelper.exe LayaHelper.go

SET CGO_ENABLED=0
SET GOOS=darwin
SET GOARCH=amd64
go build -o ./build/macOS/LayaHelper LayaHelper.go

SET CGO_ENABLED=0
SET GOOS=linux
SET GOARCH=amd64
go build -o ./build/linux/LayaHelper LayaHelper.go
