<!---
tags = ["OS"]
--->

# Pintos 实验记录

Pintos 是我们学校操作系统课程的课程设计的一个内容，是拿的伯克利的 CS162 课程的大实验，另外 CS162 中的 shell 作业也包含在课程设计中。

## 环境配置

[pintos-anon](https://pintos-os.org) 这个版本的配置最为简单，即使是 WSL1 也可以轻松运行。

将 pintos-anon 克隆下来，安装 build-essentials，make，qemu，bochs 等必要软件，将 `pintos-anon/src/utils` 设为 PATH 路径，然后直接在 `threads` 文件夹下 `make && make check` 即可编译与运行测试。

## Threads

我并没有按照伯克利的顺序，而是按照斯坦福 CS140 的顺序，首先是 Threads 这个 Project。

斯坦福课程自身提供了一份 [guide](https://web.stanford.edu/class/cs140/projects/pintos/pintos_6.html)，[这篇博客](https://www.cnblogs.com/laiy/p/pintos_project1_thread.html)写得也很详细，GitHub 上可参考的代码也很多。

斯坦福的课程将这个 Project 分成了三个任务，按照顺序坐下去就可以了。

### Alarm Clock

第一个任务要求我们重构 `timer_sleep` 函数，因为它这个函数原来使用忙等实现的，我们要重写代码避免忙等。

一般的实现就是使用一个队列保存所有 sleep 的进程（也可以不单独拎出一个队列），每次 tick 都检查一遍这个队列，判断是否需要唤醒。

### Priority Scheduling

第二个任务要求我们实现进程优先级，一共有两个部分：process preempt 和 priority donate。

Process preempt 要求高优先级的进程就绪时，正在运行的低由优先级的进程需要立刻让出资源给高优先级进程。一般进程抢占会发生进程被创建，进程被唤醒时。pintos 已经实现了 `list_insert_ordered` 和 `list_sort` 函数，可以让进程根据优先级在队列中排队。

但是这里存在一个称为 priority inversion 的问题，优先级高的进程 H 无法获取到低优先级进程 L（低于其他第三进程）持有的锁，因为那个低优先级的进程无法获得 CPU 时间，从而也无法释放锁。所以还需要实现 priority donation 功能，即此时低优先级的进程 L 临时以进程 H 的优先级运行，直到 L 释放锁。另外还有考虑高优先级程序想要获取低优先级进程持有的锁，而低优先级进程想要获取更低优先级进程持有的锁等嵌套 priority donate 的情况。

实现 priority donation 的主要思想是给锁加上优先级。锁的优先级是获取者进程中的最高优先级，而锁的持有者可以得到锁的优先级。然后再进程中记录正在等待获取的锁（一个进程在一个时刻只有可能等待获取一个锁），进程获取锁是递归处理 priority donation。另外进程需要保存两个优先级，一个用于调度的表观优先级（donated priority）和原生优先级，通过 `thread_set_priority` 设置优先级只应该改变原生优先级。当进程释放锁时，进程的表观优先级变成余下持有锁中最高的优先级或原生优先级（不再持有锁）。

### MLFQS

这里需要实现多级反馈队列调度（multilevel feedback queue scheduler），对于这个调度器的介绍可以去看 guide 中的[介绍](https://web.stanford.edu/class/cs140/projects/pintos/pintos_7.html#SEC131)。这个调度器不同于之前做的优先级调度（不依赖 priority donation），有一项 `-mlfqs` 参数控制是否使用这个调度机制。这里主要需要实现定点数运算（因为没有 pintos 开启浮点运算）。Guide 中给出了相关的 `priority`、`nice` 和 `load_avg` 计算公式和定点数计算的公式。

另外这部分的测试点程序编写着就需要 180 秒以上的时间，而学校的 autograder 只给了 180 秒去运行，基本就肯定会超时。所以需要修改 `devices/pic.c:pit_configure_channel` 这个函数的 `frequency` 参数，可以在调用时改，也可以直接改在函数体里。

## User Program

这里主要是参考了 [liziwl/operating_system_project2](https://github.com/liziwl/operating_system_project2) 和 [NicoleMayer/pintos_project2](https://github.com/NicoleMayer/pintos_project2) 的代码。

根据斯坦福 guide 的[顺序](https://web.stanford.edu/class/cs140/projects/pintos/pintos_3.html#SEC40)，首先是 Argument Passing。

另外，我遇到了一个奇怪的问题，我 Project 1 的代码似乎和 Projec 2 不兼容，内核在启动时因为 `thread_yield(): ASSERT(!intr_context())` 而崩溃，所以写 Project 2 时我又用了一份新的 pintos。

后来经过分析发现是 `idle` 线程在 `sema_up (idle_started)` 那里由于之前优先级抢占的代码，会导致 `thread_yield` 在中断情况下触发，进而导致内核奔溃，但对于为什么那时会处于中断情况下仍然不清楚，有可能是 `userprog` 多初始化的几个项目有关。

### Argument Passing

首先通过 `printf` 和 `debug_backtrace_all` 先理一遍系统启动的流程。pintos 整个系统的主程序在 `threads/init.c:main` 这个函数。

首先是复制一份 `file_name` 用于传递参数，注意生命周期，不能提早释放。压栈要注意逆序压入，对于栈的内容 guide 中有说明，也可以参考别人的文章和代码。

由于 `process_wait` 还没有实现，主进程不会等到子进程的运行导致系统推出了子进程都还没加载进内存。在 `thread` 结构体中加入子进程的信息和用于等待的信号量，同样也要注意生命周期的问题，子进程的数据在进程退出后就会被回收，此时如果父进程去读取子进程中想要的数据（比如退出码）就会导致内存读取错误，所以需要用另外申请出来的空间。因为系统设定，进程只能等待自己的子进程，所以可以假定一个子进程只能阻塞一个父进程一次（第一次 `sema-down` 就会把自己阻塞，而等到子进程退出 `sema-up` 恢复后也没有办法 `sema-down` 第二次了）。因为我无法覆盖到所有的进程终止的情况，所以我将 `exit_code` 的测试点设为 -1 便于通过测试。

用户进程 `return` 后具体会回到不是很清楚，但是会触发 `sys_exit` 系统调用引起进程退出。另外 `printf` 也需要实现 `sys_write` 系统调用（这里展示实现一下终端的输出就行了），所以还需要实现这两个系统调用才可以正式开始跑测试。系统调用时，栈顶为系统调用号，然后自顶向下是顺序第一个，第二个等参数。

实现以上相关内容后就可以运行 `args-*` 相关的测试点了。

### System Call

System call 这部分剩下要处理的主要是文件操作相关的了。不过另外还有处理一下用户进程内存访问的问题，需要检查调用访问的内存地址是否是合法的用户内存地址。这里 guide 中有提供思路和一些代码。但是有时候需要读取 4 个字节的内存，但是有 2 个字节是合法的内存而另外一半是不合法的，这里我的实现是连续检查一个指针长度内存地址。

对于 `process_start`，还需要在子进程进行 `load` 的时候将父进程阻塞住，便于通知父进程子进程的状态，因为系统要求进程创建失败时返回 -1，而 `load` 是在子进程下进行的，所以只要进程创建成功就有有效的 `tid`，无法判断是否加载成功。这里我在 `thread` 结构体中加了一个信号量用于同步父子进程。

然后开始处理文件操作相关的系统调用，对于用户程序，文件是用数字标号来表示的。所以要在 `thread` 结构体中加入相关内容来记录打开的文件和标号。文件操作相关的函数 pintos 已经为我们提供了，所以只需要调用即可。另外对于文件操作，这里选择共用一个文件操作锁来避免读写冲突。系统要求可执行文件不能被写（好像只能通过 `load` 来判断文件是不是可执行文件，加载文件时 `file_deny_write`），而因为文件被 `close` 时会将文件 `file_allow_write` 设回 `true`，所以进程需要一直占有自身可执行文件，直到进程退出后再 `close`。

### CS162 的额外内容

因为我的学校使用的是伯克利 CS162 的 pintos，而这个学期 Fall 2021，CS162 的 pintos 有 96 个测试点，较我使用的 pintos-anon 多了 16 个测试点。这 16 个测试点具体为 `do-nothing`，`iloveos`，`practice`，`stack-align` 系列和 `fp` 系列测试。其中 `do-nothing` 和 `iloveos` 基本不需要额外的代码，`practice` 需要新增 `sys_practice` 系统调用，`stack-align` 系列因为需要额外使用 clang 编译器（gcc 编译器下始终 pass）而暂时没有处理。最后是 `fp` 系列，也是这个学期 Fall 2021 新增的浮点计算相关的测试点。

移植测试时需要注意 CS162 独有的函数和文件，另外浮点计算部分需要删除 gcc 的 `-msoft-float` 标志。对于 `fp-kasm` 和 `fp-kinit`，这两个测试点要求使用内核模式运行，需要修改 `threads/init.c` 中的主函数（学校 autograder 似乎会对 make 脚本做特殊处理，并不会使用 `rukt` 命令，需要代码写死判断）。

浮点计算需要使用 FPU，CS162 的 guide 有相关提示，需要实现开启和初始化 FPU，保存恢复 FPU 状态的功能。开启 FPU 是修改 `entry.S` 中切换保护模式时写入 `cr0` 的参数（去掉 `CR0_EM`）。初始化、保存和恢复 FPU 状态的指令分别是 `fninit fsave frstor`，FPU 状态需要 108 字节保存。我对 GNU 扩展的 AT&T 风格的汇编不是很清楚（不知道传参数那的 `"m"` `"g"` 什么的到底是个什么意思），我直接把 108 字节长的数组塞进了 thread 结构体。在进程创建时（`thread_create`）保存自身进程 FPU 状态，初始化并保存一份 FPU 状态给新的进程，再恢复自身进程的 FPU 状态。另外再切换进程时（`schedule`），保存当前进程 FPU 状态，加载新进程的 FPU 状态。

## 其他

