const gulp = require('gulp')
const concat = require('gulp-concat')
const through = require('through2')
const path = require('path')
const order = require('gulp-order')
const minifier = require('html-minifier-terser')
const clean = require('gulp-clean')
const terser = require('gulp-terser')

const SRC = './src/'
const DST = './dst/'
const MIME_TYPES = {
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',

    txt: 'text/plain',
    text: 'text/plain',
    js: 'text/javascript',

    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    bmp: 'image/bmp',
    png: 'image/png',
    webp: 'image/webp',

    any: 'application/octet-stream',

    ogg: "audio/ogg",
    mp3: 'audio/mp3',
    midi: 'audio/midi',
    webm: 'audio/webm',
    wav: 'audio/wav',

    mp4: 'video/mp4'
}

gulp.task('mergeJavaScript', () => mergeJavaScript(true))

gulp.task('mergeJavaScript2', () => mergeJavaScript(false))

gulp.task('buildAssets', () => {
    return gulp.src([
        `${SRC}prefab/*.*`,
        `${SRC}sound/**/*.*`,
        `${SRC}res/**/*.*`,
        `${SRC}/*/*.ani`,
        `${SRC}/*/*.json`,
        `${SRC}*.json`])
        .pipe(buildAssets('assets.js'))
        .pipe(gulp.dest(DST))
})

gulp.task('buildIndexHtml', () => {
    return gulp.src(`${SRC}/index.html`)
        .pipe(buildIndexHtml())
        .pipe(gulp.dest(DST))
})

gulp.task('default', ['mergeJavaScript', 'buildAssets', 'buildIndexHtml'])

gulp.task('buildMinMode', ['default', 'mergeJavaScript2'], () => {
    var options = {
        removeComments: true,
        collapseWhitespace: true,
        removeEmptyAttributes: true,
        minifyJS: true,
        minifyCSS: true
    };
    return gulp.src([`${DST}/assets.js`, `${DST}/code2.js`, `${SRC}/index.html`])
        .pipe(buildSingleIndexHtml('index.min.html'))
        .pipe(htmlMinify(options))
        .pipe(gulp.dest(DST))
})

gulp.task('minMode', ['buildMinMode'], () => {
    return gulp.src(`${DST}/code2.js`, { read: false })
        .pipe(clean());
})

function mergeJavaScript(one) {
    let p = gulp.src([`${SRC}libs/*.js`, `${SRC}js/*.js`])
        .pipe(order([
            `src/libs/laya.core.js`,
            `src/libs/laya.ui.js`,
            `src/libs/*.js`,
            `src/js/*.js`
        ], {
            base: './'
        }))
        .pipe(concat(one ? 'code.js' : 'code2.js'))
    if (one) {
        p = p.pipe(terser())
    }
    return p.pipe(gulp.dest(DST))
}

/**
 * 构建资源
 */
function buildAssets(file) {
    if (!file) {
        throw new Error('Missing file option');
    }

    let latestMod, latestFile, content
    return through.obj((file, _enc, callback) => {
        if (file.isNull()) {
            callback()
            return
        }

        if (file.isStream()) {
            this.emit('error', new Error('Streaming not supported'))
            callback()
            return
        }

        if (!latestMod || file.stat && file.stat.mtime > latestMod) {
            latestFile = file;
            latestMod = file.stat && file.stat.mtime
        }

        if (!content) {
            content = {}
        }
        const p = path.basename(file.path)
        const ext = p.split('.').pop() || 'any';
        const key = `${ext}_${p.split('.')[0]}`
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
        if (ext === 'json' || ext === 'atlas' || ext === 'ani' ||
            ext === 'lang' || ext === 'part' || ext === 'ls' ||
            ext === 'lh') {
            content[key] = JSON.stringify(JSON.parse(file.contents));
        } else {
            content[key] = getBase64Data(mimeType, file.contents)
        }
        callback()
    }, function (callback) {
        // 无视空数据
        if (!content || !latestFile) {
            callback()
            return
        }
        var jsFile;
        if (typeof file === 'string') {
            jsFile = latestFile.clone({ contents: false })
            jsFile.path = path.join(latestFile.base, file)
        } else {
            jsFile = new File(file)
        }
        // 合并文件
        jsFile.contents = Buffer.from(
            `var assetsResources=${JSON.stringify(content)};`,
            'utf-8'
        );
        this.push(jsFile)
        callback()
    })
}

/**
 * 获取 Base64 数据
 */
function getBase64Data(mimeType, data) {
    const ret = `data:${mimeType};base64,${data.toString("base64")} `
    return ret
}

/**
 * 构建 index.html
 */
function buildIndexHtml() {
    return through.obj(function (file, _enc, callback) {
        let content = file.contents.toString('utf-8')
        function createJsLink(name) {
            return `<script type="text/javascript" src="${name}.js"></script>`
        }
        const reg = /<script[\s\S]+?"index.js">.*?script>/
        content = content.replace(reg, `${createJsLink('assets')}\n${createJsLink('code')}`)
        file.contents = Buffer.from(content, 'utf-8');
        this.push(file)
        callback()
    })
}

/**
 * 构建 单个index.html
 */
function buildSingleIndexHtml(fileName) {
    if (!fileName) {
        throw new Error('Missing fileName option');
    }
    let code, assets;
    return through.obj(function (file, _enc, callback) {
        let content = file.contents.toString('utf-8')
        const name = path.basename(file.path)
        switch (name) {
            case 'assets.js':
                assets = content
                break
            case 'code2.js':
                code = content
                break
            case 'index.html':
                const reg = /<script[\s\S]+?"index.js">.*?script>/
                const js = `<script type="text/javascript">${assets}</script>
                <script type="text/javascript">${code}</script>`
                content = content.replace(reg, js)
                let minFile = file.clone({ contents: false })
                minFile.path = path.join(file.base, fileName)
                minFile.contents = Buffer.from(content, 'utf-8');
                this.push(minFile)
                break
            default:
                break
        }
        callback()
    })
}

/**
 * HTML 文件压缩
 */
function htmlMinify(options) {
    return through.obj(function (file, enc, next) {
        if (file.isNull()) {
            next(null, file);
            return;
        }

        const minify = (buf, _, callback) => {
            try {
                let contents = Buffer.from(minifier.minify(buf.toString(), options));
                if (next === callback) {
                    file.contents = contents;
                    callback(null, file);
                    return;
                }
                callback(null, contents);
                next(null, file);
            } catch (err) {
                let opts = Object.assign({}, options, { fileName: file.path });
                let error = new PluginError('htmlMinify', err, opts);
                if (next !== callback) {
                    next(error);
                    return;
                }
                callback(error);
            }
        };

        if (file.isStream()) {
            file.contents = file.contents.pipe(through(minify));
        } else {
            minify(file.contents, null, next);
        }
    });
};