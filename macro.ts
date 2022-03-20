import { easyMap, Macro, Node } from "jsptm";
import { Metadata } from "./metadata";
import highligt from "highlight.js";

const HighlightInlineCode: Macro = {
    filter: ["inlineCode"],
    func(node: Node, metadata: Map<string, unknown>): Node {
        if (node.type === "inlineCode") {
            easyMap<Metadata>(metadata).entry("hasInlineCode").or(true);
            return {
                type: "rawHtml",
                data: { html: "<code>" + highligt.highlightAuto(node.data.code).value + "</code>" },
                rawData: node.rawData,
                macros: node.macros,
                children: node.children,
            }
        }
        return node;
    }
}

type HighlightInlineCodeMetadata = { hasInlineCode: boolean };

const HighlightFenceCode: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>): Node {
        if (node.type === "fenceCode") {
            easyMap<Metadata>(metadata).entry("hasCodeBlock").or(true);
            let code = highligt.highlight(node.data.code, { language: node.data.codetype }).value;
            return {
                type: "rawHtml",
                data: { html: `<div class='codeblock'><pre><code>${code}</code></pre></div>` },
                rawData: node.rawData,
                macros: node.macros,
                children: node.children,
            }

        }
        return node;
    }
}

type HighlightFenceCodeMetadata = { hasCodeBlock: boolean };

const Title: Macro = {
    filter: ["title"],
    func(node: Node, metadata: Map<string, unknown>): Node {
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
                data: null,
                rawData: node.rawData,
                macros: node.macros,
                children: node.children
            }
        }
        return node;
    }
}

type TitleMetadata = { title: string, titleCount: number };

const Exclude: Macro = {
    filter: [],
    func(node: Node): Node {
        return {
            type: "void",
            data: null,
            rawData: node.rawData,
            macros: node.macros,
            children: node.children
        }
    }
};

const RawHtml: Macro = {
    filter: ["fenceCode"],
    func(node: Node, metadata: Map<string, unknown>): Node {
        if (node.type === "fenceCode" && node.data.codetype === "html") {
            easyMap<Metadata>(metadata).entry("hasRawHTML").val = true;
            return {
                type: "rawHtml",
                data: { html: node.data.code },
                rawData: node.rawData,
                macros: node.macros,
                children: node.children
            }
        }
        return node;
    }
}

type RawHtmlMetadata = { hasRawHTML: boolean };

export {
    Title, TitleMetadata,
    HighlightInlineCode, HighlightInlineCodeMetadata,
    HighlightFenceCode, HighlightFenceCodeMetadata,
    Exclude,
    RawHtml, RawHtmlMetadata
};