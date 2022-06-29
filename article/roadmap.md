<!---
hideIndex = "both"
specialPosition = ["navbar-article", "navbar-index", "readme"]
--->

# TODO

## 使用 LSP 实现泛用的代码语义着色

见 [Puellaquae/colorfulize](https://github.com/Puellaquae/colorfulize) 项目。

目前大部分的代码高亮工具都是语法高亮，而支持语义高亮的基本都是代码编辑器或 IDE。所以我希望尝试开发一个基于 LSP 的语义高亮工具，为我的这个网站服务。同时我也希望加入提示功能，像代码编辑器或 IDE 一样，移上去可以显示类型等信息。

## 增量生成功能

因为我使用了 pdfLaTex 配合 dvisvgm 来渲染公式，导致一旦文章涉及到公式，就会出现一下两个问题：1、pdfLaTex 编译时间太长，导致一篇文章的编译的耗时达到了分钟级别；2、生成的 svg 图不稳定，每一次渲染出来的字体数据的顺序都是不一致的。所以需要增量编译来解决这两个问题。这就需要实现判断是否需要重新生成的功能了。
