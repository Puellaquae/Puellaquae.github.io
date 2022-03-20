import { lstatSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Macro, Ptm, easyMap } from "jsptm";
import { configure } from "nunjucks";
import { spawnSync } from "child_process";
import { Metadata } from "./metadata";
import { Exclude, ExcludeMetadata, HighlightFenceCode, HighlightFenceCodeMetadata, HighlightInlineCode, HighlightInlineCodeMetadata, RawHtml, RawHtmlMetadata, Title, TitleMetadata } from "./macro";

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

type BasicMetadata = {
    template: string,
    tags: string[],
    outdir: string,
    outfilename: string,
    hideIndex: "none" | "html" | "md" | "both",
    rawdir: string,
    rawfilename: string,
    useIndent: boolean,
    hasCodeBlock: boolean,
    hasTexBlock: boolean,
    modifyDate: Date,
    createDate: Date,
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
        let em = easyMap<Metadata>(ptm.metadata);
        em.entry("template").or("article.html");
        em.entry("tags").or([]);
        em.entry("outdir").or(this.outputDir);
        em.entry("hideIndex").or("none");
        const ofn = (em.get("rawfilename")! as string).split(".")[0] + "." + (em.get("template")! as string).split(".")[1];
        em.entry("outfilename").or(ofn);
        if (!em.has("useIndent") && !em.entry("hasCodeBlock").or(false).val && !em.entry("hasTexBlock").or(false).val) {
            em.entry("useIndent").val = true;
        }
        let rawfile = em.get("rawdir")! as string + "/" + em.get("rawfilename")! as string;
        const changeLog = spawnSync("git", ["log", "--format=format:%cd", rawfile]).stdout.toString().split("\n");
        const last = new Date(changeLog[0]);
        const first = new Date(changeLog[changeLog.length - 1]);
        em.entry("modifyDate").val = last;
        const cdate = em.entry("createDate").or(first);
        if (cdate.val.toLocaleDateString === undefined) {
            cdate.val = new Date(cdate.val.toJSON() + "T00:00:00+08:00");
        }
    }

    done() {
        let ptms = [];
        for (const { dir, name } of this.articles) {
            let ptm = Ptm.parse(readFileSync(dir + "/" + name, { encoding: "utf-8" }));
            let meta = easyMap<Metadata>(ptm.metadata);
            meta.set("rawdir", dir);
            meta.set("rawfilename", name);
            ptm.applyMacro(this.macro, this.forceMacro);
            ptms.push(ptm);
        }
        ptms.forEach(this.prepareMetadata, this);
        ptms.sort((a, b) => (a.metadata.get("createDate")! as Date) < (b.metadata.get("createDate")! as Date) ? 1 : -1);
        for (let ptm of ptms) {
            let meta = easyMap<Metadata>(ptm.metadata);
            const file = applyTemplate(ptm, ptms)
            const outfilepath = meta.get("outdir") + "/" + meta.get("outfilename");
            writeFileSync(outfilepath, file, { encoding: "utf-8" });
            console.log(`${meta.get("rawdir")}/${meta.get("rawfilename")} gened to ${outfilepath}`);
            console.log(ptm.metadata);
        }
    }
}

const macro: { [name: string]: Macro; } = {
    Title,
    HighlightFenceCode,
    HighlightInlineCode,
    Exclude,
    RawHtml
};

type MacrosMetadatas = [
    TitleMetadata, 
    HighlightFenceCodeMetadata, 
    HighlightInlineCodeMetadata, 
    ExcludeMetadata,
    RawHtmlMetadata
];

const forceMacro: string[] = ["Title", "HighlightFenceCode"];

new Articles("article").process(macro, forceMacro).output("page").done();

export { BasicMetadata, MacrosMetadatas };