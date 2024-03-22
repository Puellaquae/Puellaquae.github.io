# fork：像线程一样使用进程

曾经的我不理解 linux 上 fork 的设计，但是现在我发现了 fork 的一个独到的用处，就是可以像线程一样去使用进程。

## 做什么

我需要设计一个函数 `([T;n], T -> R) -> [Result<R>;n]`，提供一个函数和一组输入，并行的将这个函数应用到每一个输入上得到一组输出，其中输入的数量是编译时可计算得到的值。但是函数在运行时可能会出错崩溃，而且函数设计时没有考虑过并行的情况。

## 为什么

大部分语言和平台都提供了简单 api 可以让函数运行在一个新的线程里，可以简单地实现一个线程池来做一些并行的任务。但是，由于线程是共享内存的，有些库内部维护了一个全局状态，不能很好地处理并行的情况，或者就没有考虑过；而且如果其中一个线程崩掉，会直接把自身进程一并带崩溃掉，需要非常繁琐的信号处理，可能也无法完美清理崩溃的现场。但是使用进程就不一样了，即使子进程崩溃掉了，对自身毫无影响，直接再唤起一个便是了；而且由于各自有各自的内存，所以也不用担心什么全局状态的问题。

## 怎么做

当然，使用进程并没有使用线程一样简单，因为内存是各自。所以需要使用共享内存等方法将函数的结果传递给父进程。下面是一个简易的实现：

```cpp
template <class Task, class Ret, size_t TaskCnt> struct ProcessPool {
#if defined(ATOMIC_INT_LOCK_FREE)
    using AtomicLockFreeType = std::atomic<int>;
#elif defined(ATOMIC_LONG_LOCK_FREE)
    using AtomicLockFreeType = std::atomic<long>;
#elif defined(ATOMIC_LLONG_LOCK_FREE)
    using AtomicLockFreeType = std::atomic<long long>;
#endif

    struct SharedMemory {
        AtomicLockFreeType tasksTopIdx;
        Ret rets[TaskCnt];
        pid_t whom[TaskCnt];
        int taskStatus[TaskCnt];
    };

    static_assert(std::is_trivial_v<Ret> && std::is_standard_layout_v<Ret>,
                  "Ret require trivial and standard_layout");

    std::vector<Task> tasks;
    int shmid;
    SharedMemory *shmp = nullptr;
    std::vector<pid_t> child_process;
    std::function<Ret(Task)> func;

    void CreateProc() {
        pid_t pid = fork();
        if (pid == -1) {
            printf("fork fail: %s\n", strerror(errno));
            exit(-1);
        }
        if (pid == 0) {
            shmp = (SharedMemory *)shmat(shmid, NULL, 0);
            if ((void *)shmp == (void *)-1) {
                printf("shmat fail: %s\n", strerror(errno));
                exit(-1);
            }
            pid_t mine = getpid();
            while (true) {
                int curTask = shmp->tasksTopIdx.fetch_add(1);
                if (curTask >= TaskCnt) {
                    break;
                }
                printf("child[%d] get task %d\n", mine, curTask);
                shmp->whom[curTask] = mine;
                Ret ret = func(tasks[curTask]);
                memcpy(shmp->rets + curTask, &ret, sizeof(ret));
                shmp->taskStatus[curTask] = 0;
            }
            int ret = shmdt(shmp);
            if (ret == -1) {
                printf("shmdt fail: %s\n", strerror(errno));
                exit(-1);
            }
            exit(0);
        } else {
            child_process.push_back(pid);
        }
    }

    template <class Fn>
    ProcessPool(Fn fn, const std::vector<Task> tasks, int poolSize) 
        : tasks(tasks), func(fn) {
        shmid = shmget(IPC_PRIVATE, sizeof(SharedMemory), IPC_CREAT | 0600);
        if (shmid == -1) {
            printf("shmget fail: %s\n", strerror(errno));
            exit(-1);
        }

        shmp = (SharedMemory *)shmat(shmid, NULL, 0);
        if ((void *)shmp == (void *)-1) {
            printf("shmat fail: %s\n", strerror(errno));
            exit(-1);
        }
        new (&shmp->tasksTopIdx) decltype(shmp->tasksTopIdx);
        for (int i = 0; i < TaskCnt; i++) {
            shmp->taskStatus[i] = -1;
        }
        shmp->tasksTopIdx.store(0);
        poolSize = std::min(poolSize, (int)TaskCnt);
        for (int i = 0; i < poolSize; i++) {
            CreateProc();
        }
    }

    std::vector<std::tuple<Ret, int>> await() {
        int exited_children = 0;
        while (exited_children < child_process.size()) {
            int status = 0;
            pid_t who = waitpid(-1, &status, 0);
            if (!WIFEXITED(status)) {
                printf("child[%d] killed, create new proc\n", who);
                for (int i = 0; i < TaskCnt; i++) {
                    if (shmp->whom[i] == who && shmp->taskStatus[i] != 0) {
                        shmp->taskStatus[i] = status;
                    }
                }
                CreateProc();
            } else {
                printf("child[%d] finish\n", who);
            }
            exited_children++;
        }
        std::vector<std::tuple<Ret, int>> rets;
        rets.reserve(TaskCnt);
        for (int i = 0; i < TaskCnt; i++) {
            rets.emplace_back(shmp->rets[i], shmp->taskStatus[i]);
        }
        return rets;
    }

    ~ProcessPool() {
        shmdt(shmp);
        shmid_ds ds;
        shmctl(shmid, IPC_RMID, &ds);
    }
};
```

核心的思想就是利用 fork 创建一个进程来执行传入的函数，利用一个下标来分配任务，函数的结果直接写入共享内容（这里对返回值的类型有要求，因为数据通信使用的是直接内存拷贝）。这里我开发的时候 `shmget` 的 `key` 得是 `IPC_PRIVATE`，否则会会报 `Permission denied`，暂时不清楚是什么原因。父进程等到所有的子进程都推出后返回所有的输入，如果发现有子进程意外结束，就记录进程退出的状态码，然后重新拉起一个进程。
