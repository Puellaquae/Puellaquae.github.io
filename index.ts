import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Macro, Ptm, easyMap } from "jsptm";
import { configure } from "nunjucks";
import { spawnSync } from "child_process";
import { Metadata } from "./metadata";
import { Exclude, ExcludeMetadata, HighlightFenceCode, HighlightFenceCodeMetadata, HighlightInlineCode, HighlightInlineCodeMetadata, RawHtml, RawHtmlMetadata, TexBlock, TexBlockMetadata, Title, TitleMetadata } from "./macro";
import { basename, extname, format, join, relative } from "path/posix";

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
    hasTex: boolean,
    modifyDate: Date,
    createDate: Date,
    type: "article" | "about" | "indexHTML" | "indexMD",
    language: "zh" | "en",
    relativeRoot: string
}

class Articles {
    articles: { dir: string; name: string; }[];
    macro: { [name: string]: Macro; } = {};
    forceMacro: string[] = [];
    inputDir: string;
    outputDir: string = "";
    rootDir: string = ".";
    newChangedFile: string[]
    constructor(dir: string) {
        this.inputDir = dir;
        this.articles = getAllFiles(dir);
        this.newChangedFile = spawnSync("git", ["status", "-s"]).stdout.toString().split("\n");
    }

    process(macro: { [name: string]: Macro; }, forceMacro: string[]) {
        this.macro = macro;
        this.forceMacro = forceMacro;
        return this;
    }

    output(dir: string, root: string = ".") {
        this.outputDir = dir;
        this.rootDir = root;
        return this;
    }

    prepareMetadata(ptm: Ptm) {
        let em = easyMap<Metadata>(ptm.metadata);
        em.entry("template").or("article.html");
        em.entry("tags").or([]);
        const outdir = join(this.outputDir, relative(this.inputDir, em.get("rawdir")));
        em.entry("outdir").or(outdir);
        em.entry("relativeRoot").or(relative(outdir, this.rootDir));
        em.entry("hideIndex").or("none");
        const rawfilename = em.get("rawfilename");
        const basefilename = basename(rawfilename, extname(rawfilename));
        const ofn = format({
            name: basefilename,
            ext: extname(em.get("template"))
        });
        em.entry("outfilename").or(ofn);
        if (!em.has("useIndent") && !em.entry("hasCodeBlock").or(false).val && !em.entry("hasTexBlock").or(false).val) {
            em.entry("useIndent").val = true;
        }
        em.entry("hasTex").val = em.entry("hasTexBlock").or(false).val
        let rawfile = join(em.get("rawdir"), rawfilename);
        const changeLog = spawnSync("git", ["log", "--format=format:%cd", rawfile]).stdout.toString().split("\n").filter(s => s !== "");
        const newChanged = this.newChangedFile.some(s => s.includes(rawfile));
        const last = (changeLog.length > 0 && !newChanged) ? (new Date(changeLog[0])) : (new Date());
        const first = changeLog.length > 0 ? (new Date(changeLog[changeLog.length - 1])) : (new Date());
        em.entry("modifyDate").val = last;
        const cdate = em.entry("createDate").or(first);
        if (cdate.val.toLocaleDateString === undefined) {
            cdate.val = new Date(cdate.val.toJSON() + "T00:00:00+08:00");
        }
    }

    done() {
        let ptms = [];
        for (const { dir, name } of this.articles) {
            let ptm = Ptm.parse(readFileSync(join(dir, name), { encoding: "utf-8" }));
            let meta = easyMap<Metadata>(ptm.metadata);
            console.log(`process ${dir}/${name}`);
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
            const outdir = meta.get("outdir");
            if (!existsSync(outdir)) {
                mkdirSync(outdir, { recursive: true });
            }
            const outfilepath = join(this.rootDir, outdir, meta.get("outfilename"));
            writeFileSync(outfilepath, file, { encoding: "utf-8" });
            console.log(`${meta.get("rawdir")}/${meta.get("rawfilename")} gened to ${outfilepath}`);
        }
    }
}

const macro: { [name: string]: Macro; } = {
    Title,
    HighlightFenceCode,
    HighlightInlineCode,
    Exclude,
    RawHtml,
    TexBlock
};

type MacrosMetadatas = [
    TitleMetadata,
    HighlightFenceCodeMetadata,
    HighlightInlineCodeMetadata,
    ExcludeMetadata,
    RawHtmlMetadata,
    TexBlockMetadata
];

const forceMacro: string[] = ["Title", "HighlightFenceCode"];

new Articles("article").process(macro, forceMacro).output("page", ".").done();

export { BasicMetadata, MacrosMetadatas };