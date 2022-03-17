import { lstatSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Macro, Ptm, Node, easyMap } from "jsptm";
import { configure } from "nunjucks";
import highligt from "highlight.js";

function getAllFiles(dir: string): { dir: string, name: string }[] {
    let res = [];
    const files = readdirSync(dir);
    for (const file of files) {
        if (lstatSync(dir + "/" + file).isDirectory()) {
            res.push(...getAllFiles(dir + "/" + file));
        } else {
            res.push({ dir, name: file });
        }
    }
    return res;
}

const nunjucks = configure('template', { autoescape: false })

function applyTemplate(ptm: Ptm, ptms: Ptm[]) {
    return nunjucks.render(ptm.metadata.get("template") + ".jinja",
        {
            metadata: Object.fromEntries(ptm.metadata),
            content: ptm.render("html"),
            articles: ptms.map(p => Object.fromEntries(p.metadata))
        });
}

class Articles {
    articles: { dir: string; name: string; }[];
    macro: { [name: string]: Macro; } = {};
    forceMacro: string[] = [];
    outputDir: string = "";
    constructor(dir: string) {
        this.articles = getAllFiles(dir);
    }

    process(macro: { [name: string]: Macro; }, forceMacro: string[]) {
        this.macro = macro;
        this.forceMacro = forceMacro;
        return this;
    }

    output(dir: string) {
        this.outputDir = dir;
        return this;
    }

    prepareMetadata(ptm: Ptm) {
        let m = ptm.metadata;
        const defaultMetadata = {
            "hasTex": false,
            "useIndent": false,
            "template": "article.html",
            "tags": [],
            "outdir": this.outputDir,
            "hideIndex": "none"
        }
        for (const [keys, values] of Object.entries(defaultMetadata)) {
            if (!m.has(keys)) {
                m.set(keys, values);
            }
        }
        if (!m.has("outfilename")) {
            const ofn = (m.get("rawfilename")! as string).split(".")[0] + "." + (m.get("template")! as string).split(".")[1];
            m.set("outfilename", ofn);
        }
        let em = easyMap(m);
        if (!em.entry<boolean>("hasCodeBlock").or(false).val && !em.entry<boolean>("hasTexBlock").or(false).val) {
            em.entry<boolean>("useIndent").val = true;
        }
    }

    done() {
        let ptms = [];
        for (const { dir, name } of this.articles) {
            console.log(`Parse ${dir}/${name}`);
            let ptm = Ptm.parse(readFileSync(dir + "/" + name, { encoding: "utf-8" }));
            ptm.metadata.set("rawdir", dir);
            ptm.metadata.set("rawfilename", name);
            ptm.applyMacro(this.macro, this.forceMacro);
            ptms.push(ptm);
        }
        ptms.forEach(this.prepareMetadata, this);
        for (let ptm of ptms) {
            const file = applyTemplate(ptm, ptms)
            const outfilepath = ptm.metadata.get("outdir")! as string + "/" + ptm.metadata.get("outfilename")! as string;
            writeFileSync(outfilepath, file, { encoding: "utf-8" });
            console.log(`Render ${ptm.metadata.get("rawfilename")} gened to ${outfilepath}`);
            console.log(ptm.metadata);
        }
    }
}

const macro: { [name: string]: Macro; } = {
    "title": {
        filter: ["title"],
        func(node: Node, metadata: Map<string, unknown>): Node {
            let m = easyMap(metadata);
            let titleCount = m.entry<number>("titleCount").or(0);
            if (node.type === "title" && node.data.level === 1) {
                titleCount.val++;
                if (titleCount.val > 1) {
                    throw "too many h1 title";
                }
                if (!m.has("title") && node.children.length !== 1 && node.children.some(n => n.type !== "text")) {
                    throw "h1 title should only contain single text if you not set title in metadata";
                }
                m.entry<string>("title").or(node.rawData.substring(2));
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
    },
    "highlighFenceCode": {
        filter: ["fenceCode"],
        func(node: Node, metadata: Map<string, unknown>): Node {
            if (node.type === "fenceCode") {
                easyMap(metadata).entry<boolean>("hasCodeBlock").or(true);
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
    },
    "highlighInlineCode": {
        filter: ["inlineCode"],
        func(node: Node, metadata: Map<string, unknown>): Node {
            if (node.type === "inlineCode") {
                easyMap(metadata).entry<boolean>("hasInlineCode").or(true);
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
};

const forceMacro: string[] = ["title", "highlighFenceCode"];

new Articles("article").process(macro, forceMacro).output("writing").done();