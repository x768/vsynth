from base64 import b64encode
from html import escape
from html.parser import HTMLParser
from os import makedirs
from pathlib import Path, PurePath
import re
from shutil import copyfile

RE_QUOT = re.compile("[\"\']([^\"\']*)[\"\']")
IDENTIFIER = re.compile("[A-Za-z_$][0-9A-Za-z_]*")
URL = re.compile("\\burl\\([\"\']([^\"\']*)[\"\']\\)")
FETCH = re.compile("\\bfetch\\([\"\']([^\"\']*)[\"\']\\)")

B64_MAX_LINE = 120

def to_data_scheme(src):
    type = 'application/octet-stream'
    match src.suffix:
        case '.css':
            type = 'text/css'
        case '.csv':
            type = 'text/csv'
        case '.gif':
            type = 'image/gif'
        case '.jpg':
            type = 'image/jpeg'
        case '.js':
            type = 'text/javascript'
        case '.png':
            type = 'image/png'
        case '.txt':
            type = 'text/plain'
        case '.wasm':
            type = 'application/wasm'
        case '.woff2':
            type = 'font/woff2'

    with open(src, 'rb') as r:
        return 'data:' + type + ';base64,' + str(b64encode(r.read()), encoding='utf-8')

def write_data_scheme(w, src):
    data = to_data_scheme(src)
    n = len(data)
    for i in range(0, n, B64_MAX_LINE):
        w.write(data[i:i+B64_MAX_LINE])
        if i + B64_MAX_LINE < n:
            w.write("\n")

def add_data_scheme_line(list, src, left, right):
    data = to_data_scheme(src)
    n = len(data)
    if n <= B64_MAX_LINE:
        list.append(left + data + right)
    else:
        for i in range(0, n, B64_MAX_LINE):
            if i == 0:
                list.append(left + data[i:i+B64_MAX_LINE] + "\\\n")
            elif i + B64_MAX_LINE < n:
                list.append(data[i:i+B64_MAX_LINE] + "\\\n")
            else:
                list.append(data[i:i+B64_MAX_LINE] + right)

def get_script_list(ret, js_files, s):
    if s not in ret:
        ret.insert(0, s)
        for f in js_files[s].imports:
            get_script_list(ret, js_files, f)

def resolve_path(path):
    dst = []
    for s in path.parts:
        if s == '..':
            dst.pop()
        else:
            dst.append(s)
    return '/'.join(dst)

class HTMLFileSrc(HTMLParser):
    def __init__(self, src, w, js_files):
        super().__init__()
        self.path = src
        self.parent = PurePath('/'.join(src.parent.parts[1:]))
        self.w = w
        self.js_files = js_files
        self.skip = False
        w.write('<!doctype html>')

    def handle_starttag(self, tag, attrs):
        if self.skip:
            return
        if tag == 'script':
            for k, v in attrs:
                if k == 'src':
                    first = True
                    files = []
                    get_script_list(files, self.js_files, resolve_path(self.parent / v))
                    for f in files:
                        if first:
                            first = False
                        else:
                            self.w.write("\n")
                        self.w.write('<script src="./' + f + "\"></script>")
        elif tag == 'meta':
            equiv = ''
            for k, v in attrs:
                if k == 'http-equiv':
                    equiv = v
            if equiv == 'Content-Security-Policy':
                self.w.write('<meta http-equiv="' + equiv + "\" content=\"default-src 'self' data:\">")
            else:
                self.w.write('<' + tag)
                for k, v in attrs:
                    self.output_attr(k, v)
                self.w.write('>')
        else:
            self.w.write('<' + tag)
            for k, v in attrs:
                self.output_attr(k, v)
            self.w.write('>')

    def handle_comment(self, data):
        if self.skip:
            if '#endif' in data:
                self.skip = False
        else:
            if '#if_module' in data:
                self.skip = True

    def output_attr(self, k, v):
        self.w.write(' ')
        self.w.write(k)
        if v is not None:
            self.w.write('="')
            self.w.write(escape(v))
            self.w.write('"')

    def handle_endtag(self, tag):
        if self.skip:
            return
        if tag != 'script':
            self.w.write('</' + tag + '>')

    def handle_data(self, data):
        if self.skip:
            return
        self.w.write(data)

class JSFileSrc:
    def __init__(self, src, dst, src_dir):
        self.path = src
        lines = ['']
        with open(src, 'r', encoding='utf-8') as r:
            parent = PurePath('/'.join(src.parent.parts[1:]))
            exports = set()
            self.imports = set()
            skip = False
            while line := r.readline():
                if line.startswith('import'):
                    if m := RE_QUOT.search(line):
                        self.imports.add(resolve_path(parent / m.group(1)))
                elif line.startswith('export '):
                    lines.append(line[7:])
                    for m in IDENTIFIER.finditer(line, 7):
                        id = m.group(0)
                        if id != 'function' and id != 'class' and id != 'const':
                            exports.add(id)
                            break
                elif line.startswith('//#if_module'):
                    skip = True
                elif line.startswith('//#endif'):
                    skip = False
                elif not skip:
                    if m := FETCH.search(line):
                        file = src_dir / m.group(1)
                        add_data_scheme_line(lines, file, line[:m.start(1)], line[m.end(1):])
                    else:
                        lines.append(line)
        if len(exports) > 0:
            lines[0] = 'const [' + ', '.join(exports) + "] = (() => {\n";
            lines.append('return [' + ', '.join(exports) + "];\n})();\n")
        else:
            lines[0] = "(() => {\n";
            lines.append("})();\n")
        with open(dst, 'w', encoding='utf-8') as w:
            w.write("'use strict';\n")
            for line in lines:
                w.write(line)

def make_css_file(src, dst):
    lines = []
    with open(src, 'r', encoding='utf-8') as r:
        parent = src.parent
        while line := r.readline():
            if m := URL.search(line):
                file = parent / m.group(1)
                add_data_scheme_line(lines, file, line[:m.start(1)], line[m.end(1):])
            else:
                lines.append(line)
    with open(dst, 'w', encoding='utf-8') as w:
        for line in lines:
            w.write(line)

if __name__ == '__main__':
    js_files = dict()
    src_dir = Path('docs')
    dst_dir = Path('local')

    for src in src_dir.glob('**/*.*'):
        dst = dst_dir / '/'.join(src.parts[1:])
        makedirs(dst.parent, exist_ok=True)

        match src.suffix:
            case '.html':
                pass
            case '.js':
                js_files['/'.join(src.parts[1:])] = JSFileSrc(src, dst, src_dir)
            case '.css':
                make_css_file(src, dst)
                pass
            case _:
                copyfile(src, dst)

    for src in src_dir.glob('*.html'):
        dst = dst_dir / '/'.join(src.parts[1:])
        makedirs(dst.parent, exist_ok=True)

        with open(src, 'r', encoding='utf-8') as r:
            with open(dst, 'w', encoding='utf-8') as w:
                parser = HTMLFileSrc(src, w, js_files)
                parser.feed(r.read())
