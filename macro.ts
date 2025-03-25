import { easyMap, Macro, Node, NodeData, Ptm } from "jsptm";
import { Metadata } from "./metadata.js";
import { codeToHtml } from "shiki";
import { mathjax } from "mathjax-full/js/mathjax.js"
import { TeX } from "mathjax-full/js/input/tex.js"
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

const HighlightInlineCode: Macro = {
    filter: ["inlineCode"],
    func(node: Node, metadata: Map<string, unknown>): NodeData | null {
        if (node.type === "inlineCode") {
            easyMap<Metadata>(metadata).entry("hasInlineCode").or(true);
            return {
                type: "rawHtml",
                data: { html: "<code>" + node.data.code + "</code>" },
            }
        }
        return null;
    }
}

type HighlightInlineCodeMetadata = { hasInlineCode: boolean };

const HighlightFenceCode: Macro = {
    filter: ["fenceCode"],
    async func(node: Node, metadata: Map<string, unknown>): Promise<NodeData | null> {
        if (node.type === "fenceCode") {
            easyMap<Metadata>(metadata).entry("hasCodeBlock").or(true);
            let tooLong = node.data.code.split("\n").find(l => l.length > 100);
            if (tooLong) {
                console.error("Code line too much long:", tooLong);
            }
            let ctype = node.data.codetype;
            const TypeMap: { [key: string]: string } = {
                "x86asm": "asm"
            };
            if (Object.keys(TypeMap).includes(ctype)) {
                ctype = TypeMap[ctype];
            }
            let code = await codeToHtml(node.data.code, {
                lang: ctype,
                theme: "github-light"
            });
            return {
                type: "rawHtml",
                data: { html: `<div class='codeblock'><pre>${code.substring(89)}</div>` },
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
    func(): NodeData {
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

const adaptor = liteAdaptor();
const handler = RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: 'none' });
const tex2svg = mathjax.document('', { InputJax: tex, OutputJax: svg });

function RenderTexCodeToSvg(tex: string, args: string[], inline: boolean): string {
    console.log(tex);
    const node = tex2svg.convert(tex, {
        display: !inline
    });
    const svg = adaptor.innerHTML(node);
    console.log(svg);
    return svg;
}

const TexBlock: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "fenceCode") {
            if (node.data.codetype === "tex") {
                const args = arg.split(",").map(a => a.trim());
                easyMap<Metadata>(metadata).entry("hasTexBlock").or(true);
                const tex = node.data.code;
                const svg = RenderTexCodeToSvg(tex, args, false);
                const texnode: NodeData = {
                    type: "rawHtml",
                    data: { html: `<div class="latex-block">${svg}</div>` },
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

const GFMTexBlock: Macro = {
    filter: ["para"],
    func(node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "para") {
            if (node.rawData.startsWith("$$\n") && node.rawData.endsWith("\n$$")) {
                const args = arg.split(",").map(a => a.trim());
                easyMap<Metadata>(metadata).entry("hasTexBlock").or(true);
                const tex = node.rawData.slice(3, node.rawData.length - 3);
                const svg = RenderTexCodeToSvg(tex, args, false);
                const texnode: NodeData = {
                    type: "rawHtml",
                    data: { html: `<div class="latex-block">${svg}</div>` },
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

type GFMTexBlockMetadata = { hasTexBlock: boolean };

const TexInline: Macro = {
    filter: ["inlineCode"],
    func(node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "inlineCode") {
            if (node.data.code.startsWith("$ ") && node.data.code.endsWith(" $")) {
                const args = arg.split(",").map(a => a.trim());
                easyMap<Metadata>(metadata).entry("hasTexBlock").or(true);
                const tex = node.data.code.slice(2, node.data.code.length - 2);
                const svg = RenderTexCodeToSvg(tex, args, true);
                const texnode: NodeData = {
                    type: "rawHtml",
                    data: { html: `<span class="latex-inline">${svg}</span>` },
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

type TexInlineMetadata = { hasTexInline: boolean };

const PunctuationCompression: Macro = {
    filter: ["text"],
    func: function (node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "text") {
            let text = node.data.text.replace(/([\p{Pe}。]+)([。，、；：])/gu, "<span class='halt'>$1</span>$2");
            text = text.replace(/([。，、；：])([\p{Ps}。]+)/gu, "$1<span class='halt'>$2</span>");
            return {
                type: "text",
                data: {
                    text
                }
            };
        }
        return null;
    }
}

const Descript: Macro = {
    filter: ["para"],
    func: function (node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "para" && !easyMap<Metadata>(metadata).has("descript")) {
            easyMap<Metadata>(metadata).set("descript", node.rawData);
            return {
                type: "void",
                data: null
            }
        }
        return null;
    }
}

type DescriptMetadata = { descript: string };

const RedirectLink: Macro = {
    filter: ["link"],
    func: function (node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "link") {
            if (node.data.url.endsWith(".md")) {
                return {
                    type: "link",
                    data: {
                        name: node.data.name,
                        url: node.data.url.substring(0, node.data.url.length - 2) + "html"
                    }
                }
            } else {
                return {
                    type: "link",
                    data: node.data
                }
            }
        }
        return null;
    }
}

const CustomImgRender: Macro = {
    filter: ["image"],
    func: function (node: Node, metadata: Map<string, unknown>, arg: string): NodeData | null {
        if (node.type === "image") {
            return {
                type: "rawHtml",
                data: {
                    html: `<span class="img-container" title="${node.data.alt}"><img alt="${node.data.alt}" title="${node.data.alt}" src="${node.data.url}" loading="lazy"/></span>`
                }
            }
        }
        return null;
    }
}

export {
    Title, TitleMetadata,
    HighlightInlineCode, HighlightInlineCodeMetadata,
    HighlightFenceCode, HighlightFenceCodeMetadata,
    Exclude, ExcludeMetadata,
    RawHtml, RawHtmlMetadata,
    TexBlock, TexBlockMetadata,
    GFMTexBlock, GFMTexBlockMetadata,
    TexInline, TexInlineMetadata,
    PunctuationCompression,
    Descript, DescriptMetadata,
    RedirectLink,
    CustomImgRender
};
