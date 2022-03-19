import { lstatSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Macro, Ptm, Node, easyMap } from "jsptm";
import { configure } from "nunjucks";
import { spawnSync } from "child_process";
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
        let em = easyMap(ptm.metadata);
        const defaultMetadata = {
            "hasTex": false,
            "template": "article.html",
            "tags": [],
            "outdir": this.outputDir,
            "hideIndex": "none"
        }
        for (const [keys, values] of Object.entries(defaultMetadata)) {
            em.entry<typeof values>(keys).or(values);
        }

        const ofn = (em.get("rawfilename")! as string).split(".")[0] + "." + (em.get("template")! as string).split(".")[1];
        em.entry<string>("outfilename").or(ofn);
        if (!em.has("useIndent") && !em.entry<boolean>("hasCodeBlock").or(false).val && !em.entry<boolean>("hasTexBlock").or(false).val) {
            em.entry<boolean>("useIndent").val = true;
        }
        let rawfile = em.get("rawdir")! as string + "/" + em.get("rawfilename")! as string;
        const changeLog = spawnSync("git", ["log", "--format=format:%cd", rawfile]).stdout.toString().split("\n");
        const last = new Date(changeLog[0]);
        const first = new Date(changeLog[changeLog.length - 1]);
        em.entry<Date>("modifyDate").val = last;
        const cdate = em.entry<Date>("createDate").or(first);
        if (cdate.val.toLocaleDateString === undefined) {
            cdate.val = new Date(cdate.val.toJSON() + "T00:00:00+08:00");
        }
    }

    done() {
        let ptms = [];
        for (const { dir, name } of this.articles) {
            let ptm = Ptm.parse(readFileSync(dir + "/" + name, { encoding: "utf-8" }));
            ptm.metadata.set("rawdir", dir);
            ptm.metadata.set("rawfilename", name);
            ptm.applyMacro(this.macro, this.forceMacro);
            ptms.push(ptm);
        }
        ptms.forEach(this.prepareMetadata, this);
        ptms.sort((a, b) => (a.metadata.get("createDate")! as Date) < (b.metadata.get("createDate")! as Date) ? 1 : -1);
        for (let ptm of ptms) {
            const file = applyTemplate(ptm, ptms)
            const outfilepath = ptm.metadata.get("outdir")! as string + "/" + ptm.metadata.get("outfilename")! as string;
            writeFileSync(outfilepath, file, { encoding: "utf-8" });
            console.log(`${ptm.metadata.get("rawdir")}/${ptm.metadata.get("rawfilename")} gened to ${outfilepath}`);
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
    },
    "exclude": {
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
    },
    "rawHtml": {
        filter: ["fenceCode"],
        func(node: Node, metadata: Map<string, unknown>): Node {
            if (node.type === "fenceCode" && node.data.codetype === "html") {
                easyMap(metadata).entry<boolean>("hasRawHTML").val = true;
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
};

const forceMacro: string[] = ["title", "highlighFenceCode"];

new Articles("article").process(macro, forceMacro).output("page").done();