# Pintos

操作系统实验记录

## 环境配置

首先克隆 [Pintos-os.org](pintos-os.org) 上的 pintos 代码，这个仓库是一直在维护的，斯坦福网站上的版本太老了。这里我吃了巨亏，这份代码一跑就成，而且 WSL1 也能用，非常好。

然后 `install build-essential bochs qemu qemu-system-i386` 这些需要的程序。

最后直接去 `/src/threads` 下面 `make` 一下就完事了。

### 吐槽

之前我下的斯坦福课程网站的，它有个安装指南，但是我没有它指定的 bochs 2.2.6，我直接 apt install 的。然后它又要 make utils 里的几个程序，头文件找不到，一搜是 unix 下的头文件，直接注释掉。接着又是一段编不过的给 unix 写的代码。好不容易都给编译过了，check 了下，马上一个 27 of 27 failed，我一瞅，这终于成了么。结果 pintos 一 run，它 bo 不 chs 来，它说什么，我去网上一搜，stack overflow 上也有个这问题，那也是 WSL 的，但没人回答。于是，我想是不是 WSL1 或者 bochs 版本的问题。我先去换了几个 bochs，带显示的不带显示的，2.7 的 2.2.6 的，似乎能跑起来但不是报错就是崩溃。bochs 搞半天不行，我就去试 WSL2，Windows 可以跑 Linux 的 GUI 程序，很不错，bochs 能跑，qemu 能跑，但一碰上 pintos 它俩就歇了。这 pintos 太娇贵了，我特地装了 ubuntu 的虚拟机，结果 qemu 能跑，但是内核死活 load 不上。bochs 呢，搞半天自己都没跑起来。无可奈何，只能祭出 docker 大法，还是 docker 好，一拉直接就完事，alarm-multiple 能跑，check 也有 20 of 27 failed。看这两分钟就跑得飞起，我气的，不知怎么去下了个 pintos-anon，一试。好家伙，直接就是 alarm-multiple，20 of 27 failed。往之前的 WSL1 里一扔，bochs 啊 qemu 啊马上跑起来了。一个星期的白白折腾啊我，为什么网上都是些改文件的，不写 PATH 直接塞 `/usr/bin` 的，还有那斯坦福课程网站也是，太让人失望了。
