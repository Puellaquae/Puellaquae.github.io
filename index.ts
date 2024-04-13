import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Macro, Ptm, easyMap, MacroCall, CacheData, jsonToCacheData, cacheDataToJson } from "jsptm";
import pkg from 'nunjucks';
const { configure } = pkg;
import { spawnSync } from "child_process";
import { Metadata } from "./metadata";
import {
    Exclude,
    ExcludeMetadata,
    HighlightFenceCode,
    HighlightFenceCodeMetadata,
    HighlightInlineCode,
    HighlightInlineCodeMetadata,
    RawHtml,
    RawHtmlMetadata,
    TexBlock,
    TexBlockMetadata,
    Title,
    TitleMetadata,
    GFMTexBlock,
    GFMTexBlockMetadata,
    TexInline,
    TexInlineMetadata,
    PunctuationCompression,
    Descript,
    DescriptMetadata,
    RedirectLink
} from "./macro";
import { basename, extname, dirname, format, join, relative } from "path/posix";

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

function loadCache(filepath: string): CacheData {
    const cacheFile = join("cache", filepath) + ".json";
    if (existsSync(cacheFile)) {
        return jsonToCacheData(readFileSync(cacheFile).toString());
    } else {
        return {
            lastMacroApply: new Map(),
            lastMacroHash: new Map()
        }
    }
}

function saveCache(filepath: string, cache: CacheData) {
    const cacheFile = join("cache", filepath) + ".json";
    const cacheDir = dirname(cacheFile);
    if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
    }
    writeFileSync(cacheFile, cacheDataToJson(cache));
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
    subtype: string,
    language: "zh" | "en",
    relativeRoot: string,
    specialPosition: ("navbar-article" | "navbar-index" | "readme")[]
}

class Articles {
    articles: { dir: string; name: string; }[];
    macro: { [name: string]: Macro; } = {};
    forceMacro: MacroCall[] = [];
    inputDir: string;
    outputDir: string = "";
    rootDir: string = ".";
    newChangedFile: string[]
    constructor(dir: string) {
        this.inputDir = dir;
        this.articles = getAllFiles(dir);
        this.newChangedFile = spawnSync("git", ["status", "-s"]).stdout.toString().split("\n");
    }

    process(macro: { [name: string]: Macro; }, forceMacro: MacroCall[]) {
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
        const outdir = join(this.outputDir, relative(this.inputDir, em.get("rawdir")!));
        em.entry("outdir").or(outdir);
        em.entry("relativeRoot").or(relative(outdir, this.rootDir));

        em.entry("hideIndex").or("none");
        em.entry("specialPosition").or([]);
        const rawfilename = em.get("rawfilename")!;
        const basefilename = basename(rawfilename, extname(rawfilename));
        const ofn = format({
            name: basefilename,
            ext: extname(em.get("template")!)
        });
        em.entry("outfilename").or(ofn);
        if (!em.has("useIndent") && !em.entry("hasCodeBlock").or(false).val && !em.entry("hasTexBlock").or(false).val) {
            em.entry("useIndent").val = true;
        }
        const rawdir = em.get("rawdir")!;
        if (dirname(rawdir) !== ".") {
            let sub = basename(rawdir);
            const specSubName: { [key: string]: string } = {
                "os": "OS",
                "mlsys": "MLsys"
            }
            if (Object.keys(specSubName).includes(sub)) {
                sub = specSubName[sub]
            } else {
                sub = sub[0].toUpperCase() + sub.substring(1).toLowerCase();
            }
            em.entry("subtype").or(sub);
        }
        em.entry("hasTex").val = em.entry("hasTexBlock").or(false).val
        let rawfile = join(em.get("rawdir")!, rawfilename);
        let changeLog = spawnSync("git", ["log", "--follow", "--format=format:%cd", "--", rawfile]).stdout.toString().split("\n").filter(s => s !== "");
        const renamed = this.newChangedFile.find(s => s.includes(rawfile) && s.startsWith('R'));
        let newChanged = this.newChangedFile.find(s => s.includes(rawfile) && !s.startsWith('R')) ?? false;
        if (renamed) {
            const oldfilename = renamed.substring(2).split("->")[0].trim();
            changeLog = spawnSync("git", ["log", "--follow", "--format=format:%cd", "--", oldfilename]).stdout.toString().split("\n").filter(s => s !== "");
            const diff = spawnSync("git", ["diff", "--staged", "-M", "--", oldfilename, rawfile]).stdout.toString();
            const onlyRename = diff.includes("similarity index 100%");
            if (!onlyRename) {
                newChanged = true;
            }
        }
        const last = (changeLog.length > 0 && !newChanged) ? (new Date(changeLog[0])) : (new Date());
        const first = changeLog.length > 0 ? (new Date(changeLog[changeLog.length - 1])) : (new Date());
        em.entry("modifyDate").val = last;
        const cdate = em.entry("createDate").or(first);
        if (cdate.val.toLocaleDateString === undefined) {
            cdate.val = new Date(cdate.val.toJSON() + "T00:00:00+08:00");
        }
    }

    async done() {
        let ptms = [];
        for (const { dir, name } of this.articles) {
            process.stdout.write(`process ${dir}/${name} `);
            const t0 = performance.now();
            let ptm = Ptm.parse(readFileSync(join(dir, name), { encoding: "utf-8" }));
            let meta = easyMap<Metadata>(ptm.metadata);
            meta.set("rawdir", dir);
            meta.set("rawfilename", name);
            const cacheData = loadCache(join(dir, name));
            const newCache = await ptm.applyMacroWithCache(this.macro, this.forceMacro, cacheData);
            saveCache(join(dir, name), newCache);
            this.prepareMetadata(ptm);
            const t1 = performance.now();
            process.stdout.write(`${(t1 - t0).toFixed(3)}ms\n`);
            ptms.push(ptm);
        }
        // ptms.forEach(this.prepareMetadata, this);
        ptms.sort((a, b) => (a.metadata.get("createDate")! as Date) < (b.metadata.get("createDate")! as Date) ? 1 : -1);
        for (let ptm of ptms) {
            let meta = easyMap<Metadata>(ptm.metadata);
            let file = applyTemplate(ptm, ptms)
            const outdir = meta.get("outdir")!;
            if (!existsSync(outdir)) {
                mkdirSync(outdir, { recursive: true });
            }
            const outfilename = meta.get("outfilename")!;
            const outfilepath = join(this.rootDir, outdir, outfilename);
            writeFileSync(outfilepath, file, { encoding: "utf-8" });
            console.log(`${meta.get("rawdir")}/${meta.get("rawfilename")} gened to ${outfilepath}`);
        }
    }
}

const macro = {
    Title,
    HighlightFenceCode,
    HighlightInlineCode,
    Exclude,
    RawHtml,
    TexBlock,
    GFMTexBlock,
    TexInline,
    PunctuationCompression,
    Descript,
    RedirectLink
};

type MacroName = keyof typeof macro;

type MacrosMetadatas = [
    TitleMetadata,
    HighlightFenceCodeMetadata,
    HighlightInlineCodeMetadata,
    ExcludeMetadata,
    RawHtmlMetadata,
    TexBlockMetadata,
    GFMTexBlockMetadata,
    TexInlineMetadata,
    DescriptMetadata
];

const forceMacro: { name: MacroName, arg?: string }[] = [
    { name: "Title" },
    { name: "HighlightFenceCode" },
    { name: "RedirectLink" }
];

new Articles("article").process(macro, forceMacro).output("page", ".").done();

export { BasicMetadata, MacrosMetadatas };