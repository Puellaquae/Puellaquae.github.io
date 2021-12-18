<!---
    cdate: 2021/12/16
    mdate: 2021/12/16
    tags: OS
--->

# Pintos 实验记录【未完成】

Pintos 是我们学校操作系统课程的课程设计的一个内容，是拿的伯克利的 CS162 课程的大实验，另外 CS162 中的 shell 作业也包含在课程设计中。

## 环境配置

[pintos-anon](https://pintos-os.org) 这个版本的配置最为简单，即使是 WSL1 也可以轻松运行。

将 pintos-anon 克隆下来，安装 build-essentials，make，qemu，bochs 等必要软件，将 pintos-anon/src/utils 设为 PATH 路径，然后直接在 threads 文件夹下 `make && make check` 即可编译与运行测试。

## Threads

我并没有按照伯克利的顺序，而是按照斯坦福 CS140 的顺序，首先是 Threads 这个 Project。

斯坦福课程自身提供了一份 [guide](https://web.stanford.edu/class/cs140/projects/pintos/pintos_6.html)，[这篇博客](https://www.cnblogs.com/laiy/p/pintos_project1_thread.html)写得也很详细，GitHub 上可参考的代码也很多。

斯坦福的课程将这个 Project 分成了三个任务，按照顺序坐下去就可以了。

### Alarm Clock

第一个任务要求我们重构 `timer_sleep` 函数，因为它这个函数原来使用忙等实现的，我们要重写代码避免忙等。

一般的实现就是使用一个队列保存所有 sleep 的进程，每次 tick 都检查一遍这个队列，判断是否需要唤醒。

### Priority Scheduling

第二个任务要求我们实现进程优先级，一共有两个部分：process preempt 和 priority donate。

Process preempt 要求高优先级的进程就绪时，正在运行的低由优先级的进程需要立刻让出资源给高优先级进程。一般进程抢占会发生进程被创建，进程被唤醒时。pintos 已经实现了 `list_insert_ordered` 和 `list_sort` 函数，可以让进程根据优先级在队列中排队。

## User Program

根据斯坦福 guide 的[顺序](https://web.stanford.edu/class/cs140/projects/pintos/pintos_3.html#SEC40)，首先是 Argument Passing。

另外，我遇到了一个奇怪的问题，我 Project 1 的代码似乎和 Projec 2 不兼容，内核在启动时因为 `thread_yield(): ASSERT(!intr_context())` 而崩溃，所以写 Project 2 时我又用了一份新的 pintos。

后来经过分析发现是 `idle` 线程在 `sema_up (idle_started)` 那里由于之前优先级抢占的代码，会导致 `thread_yield` 在中断情况下触发，进而导致内核奔溃，但对于为什么那时会处于中断情况下仍然不清楚，有可能是 `userprog` 多初始化的几个项目有关。

### Argument Passing

首先通过 `printf` 和 `debug_backtrace_all` 先理一遍系统启动的流程。pintos 整个系统的主程序在 `threads/init.c:main` 这个函数。

首先是复制一份 `file_name` 用于传递参数，注意生命周期，不能提早释放。压栈要注意逆序压入，对于栈的内容 guide 中有说明，也可以参考别人的文章和代码。

由于 `process_wait` 还没有实现，主进程不会等到子进程的运行导致系统推出了子进程都还没加载进内存。在 `thread` 结构体中加入子进程的信息和用于等待的信号量，同样也要注意生命周期的问题，子进程的数据在进程退出后就会被回收，此时如果父进程去读取子进程中想要的数据（比如退出码）就会导致内存读取错误，所以需要用另外申请出来的空间。

用户进程 `return` 后具体会回到不是很清楚，但是会触发 `sys_exit` 系统调用引起进程退出。另外 `printf` 也需要实现 `sys_write` 系统调用（这里展示实现一下终端的输出就行了），所以还需要实现这两个系统调用才可以正式开始跑测试。系统调用时，栈顶为系统调用号，然后自顶向下是顺序第一个，第二个等参数。

实现以上相关内容后就可以运行 `args-*` 相关的测试点了。

## 其他

