# 阻止 Ctrl C 杀死父进程

接着[fork：像线程一样使用进程](./fork-usage.md)这篇文章，有时某一个子进程卡死了，只能用 Ctrl C 杀死，但是父进程也会被一起杀死，就无法得到已经运行结束进程的结果了；或者我不想继续运行了，但我仍然想要得到已经完成的结果。

## 做什么

父进程需要能够处理 Ctrl C 事件，同时有额外的参数记录进程的情况：进程正常退出，进程意外退出，进程未完成；这里没有区分进程是没有开始还是运行到一半人为停止了。当 Ctrl C 按下后，停止所有的子进程，对于未启动的子进程也不再运行了，直接收集子进程的运行结果。

## 怎么做

首先要能够感知到 SIGINT（Ctrl C）事件，使用 sigaction 函数可以切换信号的处理函数，sigaction 会返回旧的处理函数，需要保留下来以便处理结束后恢复回原始的处理函数。不过这个处理函数是 `(int signal) -> void`，没法传递自己的参数，好在可以利用全局函数指针解决一下。

这里只需要父进程使用我们的处理函数，子进程并不需要，因为按照需求父进程需要把所有的子进程杀死，直接让子进程收到 SIGINT 自己结束就可以了。所以在 fork 后再使用 sigcation 切换会原始的处理函数。

因为子进程没有修改 SIGINT 处理函数，所以杀死进程时可以直接使用 SIGINT 将其杀死，然后父进程中监听退出原因是否是 SIGINT 来判断子进程是被父进程杀死的还是自己奔溃了。

```cpp
enum {
    PROCESS_POOL_TASK_UNFIN = 1 << 7,
    PROCESS_POOL_TASK_FIN = 2 << 7,
    PROCESS_POOL_TASK_CRASH = 3 << 7,
};

inline std::function<void()> &SuiteTestOnSignalEvent() {
    static std::function<void()> fn = nullptr;
    return fn;
};

inline void SuiteTestSignalHandler(int signal) {
    auto &fn = SuiteTestOnSignalEvent();
    if (fn != nullptr) {
        fn();
    } else {
        exit(0);
    }
}

template <class Task, class Ret, size_t TaskCnt> struct ProcessPool {
#if ATOMIC_INT_LOCK_FREE == 2
    using AtomicLockFreeType = std::atomic<int>;
#elif ATOMIC_LONG_LOCK_FREE == 2
    using AtomicLockFreeType = std::atomic<long>;
#elif ATOMIC_LLONG_LOCK_FREE == 2
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
    struct sigaction system_handler;
    struct sigaction self_handler;
    std::unordered_set<pid_t> exited_process;

    void CreateProc() {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            exit(-1);
        }
        if (pid == 0) {
            sigaction(SIGINT, &system_handler, nullptr);
            shmp = (SharedMemory *)shmat(shmid, NULL, 0);
            if ((void *)shmp == (void *)-1) {
                perror("shmat");
                exit(-1);
            }
            pid_t mine = getpid();
            do {
                size_t curTask = shmp->tasksTopIdx.fetch_add(1);
                if (curTask >= TaskCnt) {
                    break;
                }
                printf("child[%d] get task %ld\n", mine, curTask);
                shmp->whom[curTask] = mine;
                Ret ret = func(tasks[curTask]);
                memcpy(shmp->rets + curTask, &ret, sizeof(ret));
                shmp->taskStatus[curTask] = PROCESS_POOL_TASK_FIN;
            } while (true);
            int ret = shmdt(shmp);
            if (ret == -1) {
                perror("shmdt");
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
            perror("shmget");
            exit(-1);
        }

        shmp = (SharedMemory *)shmat(shmid, NULL, 0);
        if ((void *)shmp == (void *)-1) {
            perror("shmat");
            exit(-1);
        }
        new (&shmp->tasksTopIdx) decltype(shmp->tasksTopIdx);
        for (size_t i = 0; i < TaskCnt; i++) {
            shmp->taskStatus[i] = PROCESS_POOL_TASK_UNFIN;
        }
        shmp->tasksTopIdx.store(0);

        SuiteTestOnSignalEvent() = [this](){ this->abort(); };
        self_handler.sa_handler = SuiteTestSignalHandler;
        sigemptyset(&self_handler.sa_mask);
        self_handler.sa_flags = 0;

        sigaction(SIGINT, &self_handler, &system_handler);
        poolSize = std::min(poolSize, (int)TaskCnt);
        for (int i = 0; i < poolSize; i++) {
            CreateProc();
        }
    }

    std::vector<std::tuple<Ret, int>> await() {
        size_t exited_children = 0;
        while (exited_children < child_process.size()) {
            int status = 0;
            pid_t who = waitpid(-1, &status, 0);
            if (who == -1) {
                break;
            }
            exited_process.insert(who);
            if (!WIFEXITED(status)) {
                if (WTERMSIG(status) != SIGINT) {
                    printf("child[%d] killed, create new proc\n", who);
                    for (size_t i = 0; i < TaskCnt; i++) {
                        if (shmp->whom[i] == who && 
                            shmp->taskStatus[i] == PROCESS_POOL_TASK_UNFIN) {
                            shmp->taskStatus[i] = 
                                (status & 0x7f) | PROCESS_POOL_TASK_CRASH;
                            break;
                        }
                    }
                    CreateProc();
                }
            } else {
                printf("child[%d] finish\n", who);
            }
            exited_children++;
        }
        std::vector<std::tuple<Ret, int>> rets;
        rets.reserve(TaskCnt);
        for (size_t i = 0; i < TaskCnt; i++) {
            rets.emplace_back(shmp->rets[i], shmp->taskStatus[i]);
        }
        return rets;
    }

    void abort() {
        std::vector<pid_t> kill_list;
        std::swap(kill_list, child_process);
        for (auto pid : kill_list) {
            if (exited_process.count(pid) == 0) {
                kill(pid, SIGINT);
            }
        }
    }

    ~ProcessPool() {
        shmdt(shmp);
        shmid_ds ds;
        shmctl(shmid, IPC_RMID, &ds);
        sigaction(SIGINT, &system_handler, nullptr);
    }
};
```

## 后续

[监听子进程输出](./stdio-monitor.md)
