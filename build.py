import markdown2
import re
import os
import time
import sys
from jinja2 import Environment, FileSystemLoader

jinjaEnv = Environment(loader=FileSystemLoader("template"))


def pageGen(srcDir, desDir):
    articles = scanArticle(srcDir)
    print([str(a) for a in articles])
    htmldatas = [h.genHtml(desDir) for h in articles]
    metadatas = sorted([h.metadata for h in htmldatas],
                       key=lambda art: art["cdate"], reverse=True)
    for h in htmldatas:
        writeFile(h, metadatas)


class Article:
    root: str
    relpath: str
    filename: str

    def __init__(self, root, relativePath, filename) -> None:
        self.root = root
        self.relpath = relativePath
        self.filename = filename

    def genHtml(self, outDir: str):
        name, type = os.path.splitext(self.filename)
        if type == '.md':
            fullpath = os.path.normpath(os.path.join(
                self.root, self.relpath, self.filename))
            html = mdfile2html(fullpath)
            if not 'outdir' in html.metadata:
                html.metadata['outdir'] = os.path.normpath(
                    os.path.join(outDir, self.relpath))
            html.metadata['srcfile'] = os.path.normpath(
                os.path.join(self.root, self.relpath, name))
            _, type = os.path.splitext(html.metadata['template'])
            html.metadata['path'] = os.path.normpath(
                os.path.join(html.metadata['outdir'], name)) + type
            return html

    def __str__(self) -> str:
        return os.path.normpath(os.path.join(self.root, self.relpath, self.filename))


def scanArticle(srcDir: str) -> list[Article]:
    articles = []
    for root, dirs, files in os.walk(srcDir):
        for file in files:
            articles.append(
                Article(srcDir, os.path.relpath(root, srcDir), file))
    return articles


def writeFile(html, metadatas):
    outdir = html.metadata['outdir']
    if not os.path.exists(outdir):
        os.makedirs(outdir)
    metadata = html.metadata
    template = jinjaEnv.get_template(metadata["template"] + '.jinja')
    print(metadata['path'])
    fileout = open(metadata['path'], mode="w", encoding="utf-8")
    fileout.write(template.render(
        content=html, metadata=metadata, articles=metadatas))
    fileout.close()


def jscall(file, func, args):
    cmd = 'node -e "var res = require(\\"%s\\").%s(%s); console.log(res)"' % (
        file, func, args.replace("\"", "\\\""))
    res = os.popen(cmd)
    return res.buffer.read().decode("utf-8")


def renderTex(tex):
    return jscall("katex", "renderToString", "String.raw`%s`, {displayMode: true}" % (tex))


def renderTexInline(tex):
    return jscall("katex", "renderToString", "String.raw`%s`" % (tex))


def mdfile2html(filepath: str, encoding: str = "utf-8"):
    mdfile = open(filepath, mode="r", encoding=encoding)
    md = ""
    titleMd = ""
    inlineHtml = False
    inHtml = False
    exclude = False
    inMath = False
    tex = ""
    hasTex = False
    hasCodeBlock = False
    extras = ["fenced-code-blocks", "metadata"]
    for line in mdfile.readlines():
        matches = re.match(r"\[extra\]\: #\((.*)\)", line, re.S)
        if matches:
            if matches.group(1) == "inline_html":
                inlineHtml = True
            elif matches.group(1) == "exclude":
                exclude = True
        elif line.strip() == "<!-- code-friendly -->":
            extras.append("code-friendly")
        elif line.strip() == "```html" and inlineHtml:
            inHtml = True
        elif line.strip() == "```" and inHtml and inlineHtml:
            inHtml = False
            inlineHtml = False
        elif line.strip() == "```tex":
            inMath = True
        elif inMath and line.strip() != "```":
            tex += line.strip()
        elif inMath and line.strip() == "```":
            inMath = False
            md += renderTex(tex)
            tex = ""
            hasTex = True
        elif not inMath and line.strip() == "```":
            hasCodeBlock = True
            md += line
        elif titleMd == "" and line.startswith("# "):
            titleMd = line.strip("# ").strip()
        elif exclude:
            exclude = False
        else:
            sline = line.split("`$")
            for i in range(1, len(sline)):
                ss = sline[i].split("$`")
                ss[0] = renderTexInline(ss[0])
                hasTex = True
                sline[i] = "".join(ss)
            md += "".join(sline)
    mdfile.close()
    html = markdown2.markdown(md, extras=extras)
    if "title" not in html.metadata:
        html.metadata["title"] = titleMd
    html.metadata["titleMd"] = titleMd
    html.metadata["titleHtml"] = markdown2.markdown("# " + titleMd)
    mdate = time.gmtime(os.path.getmtime(filepath))
    cdate = time.gmtime(os.path.getctime(filepath))
    if not "mdate" in html.metadata:
        html.metadata["mdate"] = time.strftime("%Y/%m/%d", mdate)
    if not "cdate" in html.metadata:
        html.metadata["cdate"] = time.strftime("%Y/%m/%d", cdate)
    if not "template" in html.metadata:
        html.metadata["template"] = "article.html"
    if not "hideIndex" in html.metadata:
        html.metadata["hideIndex"] = "none"
    if (not "hasTex" in html.metadata) and hasTex:
        html.metadata["hasTex"] = "true"
    if (not "useIndent" in html.metadata) and not(hasTex or hasCodeBlock):
        html.metadata["useIndent"] = "true"
    if "tags" in html.metadata:
        html.metadata["tags"] = [t.strip()
                                 for t in html.metadata["tags"].split(",")]
    return html


if __name__ == '__main__':
    pageGen(sys.argv[1], sys.argv[2])
