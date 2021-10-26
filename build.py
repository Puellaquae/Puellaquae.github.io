import markdown2
from jinja2 import Environment, FileSystemLoader
import re
import os
import time
import sys


jinjaEnv = Environment(loader=FileSystemLoader("template"))


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
    for line in mdfile.readlines():
        matches = re.match(r"\[extra\]\: #\((.*)\)", line, re.S)
        if matches:
            if matches.group(1) == "inline_html":
                inlineHtml = True
            elif matches.group(1) == "exclude":
                exclude = True
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
        elif titleMd == "" and line.startswith("# "):
            titleMd = line.strip("# ").strip()
        elif exclude:
            exclude = False
        else:
            sline = line.split("`$")
            for i in range(1, len(sline)):
                ss = sline[i].split("$`")
                ss[0] = renderTexInline(ss[0])
                sline[i] = "".join(ss)
            md += "".join(sline)
    mdfile.close()
    html = markdown2.markdown(md, extras=["fenced-code-blocks", "metadata"])
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
        html.metadata["template"] = "article.html.jinja"
    if not "hideIndex" in html.metadata:
        html.metadata["hideIndex"] = "none"
    if not "hasTex" in html.metadata:
        html.metadata["hasTex"] = hasTex
    if "tags" in html.metadata:
        html.metadata["tags"] = [t.strip()
                                 for t in html.metadata["tags"].split(",")]
    return html


def genhtmls(srcDir, desDir, genIndex=False):
    articles = []
    for file in os.listdir(srcDir):
        if not file.endswith(".md"):
            continue
        html = mdfile2html(srcDir + "/" + file)
        metadata = html.metadata
        template = jinjaEnv.get_template(metadata["template"])
        fileout = open(desDir + "/" + file.replace(".md", ".html"),
                       mode="w", encoding="utf-8")
        fileout.write(template.render(content=html, metadata=metadata))
        fileout.close()
        metadata["path"] = file.replace(".md", "")
        articles.append(metadata)
    if genIndex:
        articles = sorted(articles, key=lambda art: art["cdate"], reverse=True)
        indexTemplate = jinjaEnv.get_template("index.html.jinja")
        indexout = open("index.html", mode="w", encoding="utf-8")
        indexout.write(indexTemplate.render(articles=articles))
        indexout.close()

        readmeTemplate = jinjaEnv.get_template("readme.md.jinja")
        readmeOut = open("README.md", mode="w", encoding="utf-8")
        readmeOut.write(readmeTemplate.render(articles=articles))
        readmeOut.close()


if __name__ == "__main__":
    if "writing" in sys.argv:
        genhtmls("writing", "writing")
    if "release" in sys.argv:
        genhtmls("article", "page", True)
