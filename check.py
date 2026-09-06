from html.parser import HTMLParser
from pathlib import Path, PurePath
import re

NO_CLOSE = set(['br', 'hr', 'img', 'input', 'link', 'meta'])

RE_QUOT = re.compile("[\"\']([^\"\']*)[\"\']")
CLASS_NAME = re.compile("\\.[A-Za-z_\\-][0-9A-Za-z_\\-]*")
ID_NAME = re.compile("#[A-Za-z_\\-][0-9A-Za-z_\\-]*")

CLASS_JS = re.compile("\bdocument\\.getElementsByClassName\\(['\"]([^'\"]*)['\"]\\)")
CLASS_JS2 = re.compile("\bclassList\\.(add|remove|contains)\\(['\"]([^'\"]*)['\"]\\)")
ID_JS = re.compile("\bdocument\\.getElementById\\(['\"]([^'\"]*)['\"]\\)")
JS_EQ = re.compile("[^!=]==[^=]|!=[^=]")

def resolve_path(path):
    dst = []
    for s in path.parts:
        if s == '..':
            dst.pop()
        else:
            dst.append(s)
    return '/'.join(dst)

class HTMLFileSrc(HTMLParser):
    def __init__(self, path, dic_js, dic_css):
        super().__init__()
        self.path = path
        self.dic_js = dic_js
        self.dic_css = dic_css
        self.parent = PurePath('/'.join(path.parent.parts[1:]))
        self.id_list = set()
        self.class_list = set()
        self.script_list = set()
        self.css_list = set()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            for k, v in attrs:
                if k == 'src':
                    s = resolve_path(self.parent / v)
                    if s not in self.dic_js:
                        raise Exception(f"{self.path}({self.getpos()[0]}) <script src={s}> not found")
                    self.script_list.add(s)
            self.tags.append(tag)
        elif tag == 'link':
            rel = None
            href = None
            for k, v in attrs:
                match k:
                    case 'rel':
                        rel = v
                    case 'href':
                        href = v
            if rel == 'stylesheet' and href is not None:
                s = resolve_path(self.parent / href)
                if s not in self.dic_css:
                    raise Exception(f"{self.path}({self.getpos()[0]}) <script src={s}> not found")
                self.css_list.add(s)
        else:
            alt = True
            if tag == 'img':
                alt = False
            if tag not in NO_CLOSE:
                self.tags.append(tag)
            elif tag == 'script':
                for k, v in attrs:
                    if k == 'src':
                        self.script_list.add(v)
            for k, v in attrs:
                match k:
                    case 'id':
                        self.id_list.add(v)
                    case 'class':
                        self.class_list.add(v)
                    case 'alt':
                        alt = True
            if not alt:
                print(f"{self.path}({self.getpos()[0]}) <img> without alt")

    def handle_endtag(self, tag):
        if len(self.tags) == 0 or tag != self.tags.pop():
            print(f"{self.path}({self.getpos()[0]}) </{tag}> without open tag")

class JSFileSrc:
    def __init__(self, path):
        self.path = path
        self.id_list = set()
        self.class_list = set()
        self.imports = set()
        parent = PurePath('/'.join(path.parent.parts[1:]))

        with open(path, 'r', encoding='utf-8') as r:
            num = 1
            while line := r.readline():
                if line.startswith('import'):
                    if m := RE_QUOT.search(line):
                        self.imports.add(resolve_path(parent / m.group(1)))
                elif m := CLASS_JS.search(line):
                    self.class_list.add(m.group(1))
                elif m := CLASS_JS2.search(line):
                    self.class_list.add(m.group(2))
                elif m := ID_JS.search(line):
                    self.id_list.add(m.group(1))
                if m := JS_EQ.search(line):
                    raise Exception(f"{path}({num}) == or != found (use === or !==)")
                num += 1

class CSSFileSrc:
    def __init__(self, path):
        self.path = path
        self.id_list = set()
        self.class_list = set()
        self.id_used = set()
        self.class_used = set()

        with open(path, 'r', encoding='utf-8') as r:
            while line := r.readline():
                if line.endswith('{'):
                    if m := CLASS_NAME.search(line):
                        self.class_list.add(m.group(0)[1:])
                    elif m := ID_NAME.search(line):
                        self.id_list.add(m.group(0)[1:])

    def used_id(self, id):
        self.id_used.add(id)
    def used_class(self, cls):
        self.class_used.add(cls)

if __name__ == '__main__':
    js_files = dict()
    src_dir = Path('docs')
    dic_html = dict()
    dic_js = dict()
    dic_css = dict()

    for src in src_dir.glob('**/*.*'):
        match src.suffix:
            case '.js':
                js = JSFileSrc(src)
                dic_js['/'.join(src.parts[1:])] = js
                pass
            case '.css':
                css = CSSFileSrc(src)
                dic_css['/'.join(src.parts[1:])] = css
                pass
        
    for src in src_dir.glob('*.html'):
        with open(src, 'r', encoding='utf-8') as r:
            html = HTMLFileSrc(src, dic_js, dic_css)
            dic_html['/'.join(src.parent.parts[1:])] = html
            html.feed(r.read())
            if len(html.tags) > 0:
                print(f"{html.path} <{html.tags.pop()}> without close tag")
