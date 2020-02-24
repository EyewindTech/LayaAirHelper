package main

import (
	"flag"
	"fmt"
	"github.com/otiai10/copy"
	"os"
	"path"
)

import (
	"eyewind.com/LayaHelper/utils"
	"io/ioutil"
	"os/exec"
)

const (
	PackageJs = "package.json"
	GulpFile  = "gulpfile.js"
)

var (
	Src        string // 源路径
	Ver        string // 版本
	CurPath    string // 当前路径
	AssetsPath string // 资源路径
	CachesPath string // 缓存路径
)

func main() {
	flag.Parse()
	CurPath = utils.GetCurPath()
	AssetsPath = path.Join(CurPath, "assets")
	CachesPath = path.Join(CurPath, "caches")
	checkCommand()
	prep()
	execute()
}

func prep() {
	if Src == "/|\\" || !utils.Exists(Src) {
		fmt.Println("[Error] Sources path error.")
		os.Exit(-1)
	}
	nodeModulePath := path.Join(CachesPath, "node_modules")
	existOrMakeDir(CachesPath)
	existOrMakeDir(path.Join(CachesPath, "dst"))
	copyFile(PackageJs, path.Join(AssetsPath, PackageJs), path.Join(CachesPath, PackageJs))
	copyFile(GulpFile, path.Join(AssetsPath, GulpFile), path.Join(CachesPath, GulpFile))
	if !utils.Exists(path.Join(AssetsPath, Ver)) {
		fmt.Printf("[Error] Bad version code: \"%s\".", Ver)
		os.Exit(-1)
	}
	if dir, _ := ioutil.ReadDir(nodeModulePath); dir == nil || len(dir) == 0 {
		cmd := exec.Command("npm", "install")
		cmd.Dir = CachesPath
		cmd.Stdout = os.Stdout
		fmt.Println("[Info] Prep npm install.")
		if err := cmd.Run(); err != nil {
			fmt.Println("[Error] npm install execution failure." + err.Error())
			os.Exit(-1)
		} else {
			fmt.Println("[Success] npm install.")
		}
	}
}

func execute() {
	srcPath := path.Join(CachesPath, "src")
	if err := os.RemoveAll(srcPath); err != nil {
		fmt.Printf("[Error] Remove failure: %s\n", err.Error())
		os.Exit(-1)
	}
	if err := copy.Copy(Src, srcPath); err != nil {
		fmt.Printf("[Error] Copy failure: %s\n", err.Error())
		os.Exit(-1)
	}
	const coreJs = "laya.core.js"
	copyFile(
		coreJs,
		path.Join(AssetsPath, Ver, coreJs),
		path.Join(CachesPath, "src", "libs", coreJs),
	)
	cmd := exec.Command("gulp", "minMode")
	cmd.Dir = CachesPath
	cmd.Stdout = os.Stdout
	if err := cmd.Run(); err != nil {
		fmt.Println("[Error] Build failure." + err.Error())
		os.Exit(-1)
	} else {
		fmt.Println("[Success] Build Successful.")
	}
}

func copyFile(name, src, dst string) {
	err := utils.CopyFile(src, dst)
	if err != nil {
		fmt.Printf("[Error] Copy %s failed.\n", name)
		os.Exit(-1)
	}
}

func existOrMakeDir(path string) {
	if !utils.Exists(path) {
		if err := os.MkdirAll(path, os.ModePerm); err != nil {
			fmt.Printf("[Error]  Make dir failed: %s.", path)
			os.Exit(-1)
		}
	}
}

func checkCommand() {
	if _, ok := exec.LookPath("npm"); ok != nil {
		fmt.Println("[Error] npm not found.")
		os.Exit(-1)
	}

	if _, ok := exec.LookPath("gulp"); ok != nil {
		fmt.Println("[Error] Gulp not found.")
		os.Exit(-1)
	}
}

func init() {
	flag.StringVar(&Ver, "v", "2.4.0", "LayaAir version.")
	flag.StringVar(&Src, "s", "/|\\", "Source Path")
	flag.Usage = usage
}

func usage() {
	_, _ = fmt.Fprintf(os.Stderr, `
LayaHelper version: LayaHelper/1.0.0
Usage: LayaHelper [-v version] [-s sourcePath]

Options:
`)
	flag.PrintDefaults()
}
