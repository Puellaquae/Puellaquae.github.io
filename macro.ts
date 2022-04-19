import { easyMap, Macro, Node, NodeData, Ptm } from "jsptm";
import { Metadata } from "./metadata";
import highligt from "highlight.js";
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path/posix";
import os from "os";
import { customAlphabet } from "nanoid";

const HighlightInlineCode: Macro = {
    filter: ["inlineCode"],
    func(node: Node, metadata: Map<string, unknown>): NodeData | null {
        if (node.type === "inlineCode") {
            easyMap<Metadata>(metadata).entry("hasInlineCode").or(true);
            return {
                type: "rawHtml",
                data: { html: "<code>" + highligt.highlightAuto(node.data.code).value + "</code>" },
            }
        }
        return null;
    }
}

type HighlightInlineCodeMetadata = { hasInlineCode: boolean };

const HighlightFenceCode: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>): NodeData | null {
        if (node.type === "fenceCode") {
            easyMap<Metadata>(metadata).entry("hasCodeBlock").or(true);
            let code = highligt.highlight(node.data.code, { language: node.data.codetype }).value;
            return {
                type: "rawHtml",
                data: { html: `<div class='codeblock'><pre><code>${code}</code></pre></div>` },
            }

        }
        return null;
    }
}

type HighlightFenceCodeMetadata = { hasCodeBlock: boolean };

const Title: Macro = {
    filter: ["title"],
    func(node: Node, metadata: Map<string, unknown>): NodeData | null {
        let m = easyMap<Metadata>(metadata);
        let titleCount = m.entry("titleCount").or(0);
        if (node.type === "title" && node.data.level === 1) {
            titleCount.val++;
            if (titleCount.val > 1) {
                throw "too many h1 title";
            }
            if (!m.has("title") && node.children.length !== 1 && node.children.some(n => n.type !== "text")) {
                throw "h1 title should only contain single text if you not set title in metadata";
            }
            m.entry("title").or(node.rawData.substring(2));
            return {
                type: "void",
                data: null
            }
        }
        return null;
    }
}

type TitleMetadata = { title: string, titleCount: number };

const Exclude: Macro = {
    filter: [],
    func(node: Node): NodeData {
        return {
            type: "void",
            data: null
        }
    }
};

type ExcludeMetadata = {};

const RawHtml: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>): NodeData | null {
        if (node.type === "fenceCode" && node.data.codetype === "html") {
            easyMap<Metadata>(metadata).entry("hasRawHTML").val = true;
            return {
                type: "rawHtml",
                data: { html: node.data.code }
            }
        }
        return null;
    }
}

type RawHtmlMetadata = { hasRawHTML: boolean };

const TexBlock: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "fenceCode") {
            if (node.data.codetype === "tex") {
                const args = arg.split(",").map(a => a.trim());
                easyMap<Metadata>(metadata).entry("hasTexBlock").or(true);
                const tex = '\\documentclass{standalone}\n\\usepackage[UTF8]{ctex}\n\\usepackage{amsmath}\n\\begin{document}\n$\\displaystyle\n'
                    + node.data.code +
                    '\n$\n\\end{document}';
                const tmpdir = mkdtempSync(path.join(os.tmpdir(), "tex-"));
                const texfile = path.join(tmpdir, "doc.tex");
                writeFileSync(texfile, tex, { encoding: "utf-8" });
                const cwd = process.cwd();
                process.chdir(tmpdir);
                const xelatexOutput = spawnSync("latex", ["--halt-on-error", texfile]).stdout.toString("utf-8");
                const dvifile = path.join(tmpdir, "doc.dvi");
                if (!existsSync(dvifile)) {
                    process.chdir(cwd);
                    rmSync(tmpdir, { recursive: true });
                    throw xelatexOutput;
                }
                const dvisvgmOutput = spawnSync("dvisvgm", ["-f", "woff2", "--exact-bbox", "--zoom=-1", "--no-style", dvifile]);
                const svgfile = path.join(tmpdir, "doc.svg");
                if (!existsSync(svgfile)) {
                    process.chdir(cwd);
                    rmSync(tmpdir, { recursive: true });
                    throw dvisvgmOutput;
                }
                let svg = readFileSync(svgfile, { encoding: "utf-8" });
                const fontRename = new Map<string, string>();
                const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);
                svg = svg.replaceAll(/font-family:(.+?);/g, (_match, p1) => {
                    const id = nanoid();
                    const rename = `${id}${p1}`;
                    fontRename.set(p1, rename);
                    return `font-family:${rename};`;
                });
                svg = svg.replaceAll(/font-family='(.+?)'/g, (_match, p1) => {
                    const rename = fontRename.get(p1)!;
                    return `font-family='${rename}'`;
                })
                process.chdir(cwd);
                rmSync(tmpdir, { recursive: true });
                const texnode: NodeData = {
                    type: "rawHtml",
                    data: { html: svg },
                }
                if (args.includes("copycode")) {
                    return {
                        type: "forknodes",
                        data: {
                            nodes: [node, texnode]
                        }
                    };
                } else {
                    return texnode;
                }
            }
        }
        return null;
    }
}

type TexBlockMetadata = { hasTexBlock: boolean };

export {
    Title, TitleMetadata,
    HighlightInlineCode, HighlightInlineCodeMetadata,
    HighlightFenceCode, HighlightFenceCodeMetadata,
    Exclude, ExcludeMetadata,
    RawHtml, RawHtmlMetadata,
    TexBlock, TexBlockMetadata
};