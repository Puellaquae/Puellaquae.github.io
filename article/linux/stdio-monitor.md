# 监听子进程输出

继续我们在[阻止 Ctrl C 杀死父进程](./sigint-handler.md)中的代码，现在我想要能够监听子进程的输出，可以使用函数记录、过滤、修改子进程的输出

## 做什么

简单来说，就是子进程的输出会首先经过用户给定的处理函数再输出到终端。

## 怎么做

在 Linux 上，这个需要很容易就想到管道这个功能。首先在 fork 前使用 pipe 创建一个管道用来联系起父进程和子进程；在子进程中使用 dup2 函数可以将 stdout 的 fd 指向我们给定管道的 fd。这样在父进程中读这个管道就可以读到子进程的输出了，父进程再调用函数处理并自己将其输出回终端。

完成了管道和重定向后，我们还需要在父进程中读取这些管道。之前的代码中父进程已经在监听子进程的运行状态了，现在我们需要加上对子进程一堆管道的监听。之前是一直阻塞直到子进程状态变化，当然可以直接等着子进程结束了在一次性处理输出，但如果管道被塞满了可能就直接死锁了。所以我们给 waitpid 加上 WNOHANG 改成非阻塞的监听。如果父进程本次循环中没有子进程状态事件，就检查子进程有没有输出。这里每个子进程都会有一个管道，所以这里使用 poll 函数帮我们监听这一堆管道。对于子进程输出的监听，采用阻塞的形式，不然循环可能大部分时间都在空跑了。此外当子进程退出，管道关闭后会置 POLLHUP 事件，这时需要将其从 poll 监听的数组中移除，不然后续会持续触发 POLLHUP。

此外，回调处理函数时还会提供一个任务序号；由于进程会被复用，所以一个进程会运行多个任务，这里会有一个共享的数据在任务开始前记录进程当前运行的任务序号。当然，这个是存在缺陷的，如果父进程的处理不及时，就会将上一次任务的输出认作是这一次的输出。

```cpp
enum {
    PROCESS_POOL_TASK_UNFIN = 1 << 7,
    PROCESS_POOL_TASK_FIN = 2 << 7,
    PROCESS_POOL_TASK_CRASH = 3 << 7,
};

// 只有签名的函数表示就上一篇文章的代码没有变化
inline std::function<void()> &SuiteTestOnSignalEvent();

inline void SuiteTestSignalHandler(int signal);

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
        int fd0[TaskCnt];
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
    std::function<void(size_t, const char *)> output_callback;
    std::vector<std::array<int, 2>> pipes;
    std::vector<pollfd> pollfds;

    void CreateProc() {
        std::array<int, 2> cpipe;
        if (pipe(cpipe.data()) == -1) {
            perror("pipe");
            exit(-1);
        }
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
            close(cpipe[0]); // child no need read
            dup2(cpipe[1], STDOUT_FILENO);
            dup2(cpipe[1], STDERR_FILENO);
            close(cpipe[1]);
            pid_t mine = getpid();
            std::optional<size_t> lastTask = std::nullopt;
            do {
                size_t curTask = shmp->tasksTopIdx.fetch_add(1);
                if (curTask >= TaskCnt) {
                    break;
                }
                if (lastTask.has_value()) {
                    shmp->fd0[lastTask.value()] = -1;
                }
                lastTask = curTask;
                printf("child[%d] get task %ld\n", mine, curTask);
                shmp->whom[curTask] = mine;
                shmp->fd0[curTask] = cpipe[0];
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
            close(cpipe[1]); // self no need write
            pipes.push_back(cpipe);
            pollfd cfd;
            cfd.fd = cpipe[0];
            cfd.events = POLLIN;
            pollfds.push_back(cfd);
            child_process.push_back(pid);
        }
    }

    template <class Fn, class CbFn>
    ProcessPool(Fn fn, const std::vector<Task> tasks, int poolSize, 
                CbFn OutputCb)
        : tasks(tasks), func(fn), output_callback(OutputCb) {
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

    void ChildOutputWatch() {
        static char buffer[2048];
        if (!pollfds.empty()) {
            int ret = poll(pollfds.data(), pollfds.size(), -1);
            if (ret == -1) {
                perror("poll");
                return;
            } else if (ret == 0) {
                return;
            }
            for (auto it = pollfds.begin(); it != pollfds.end();) {
                if (it->revents & POLLIN) {
                    size_t taskIdx = -1;
                    for (size_t i = 0; i < TaskCnt; i++) {
                        if (shmp->fd0[i] == it->fd) {
                            taskIdx = i;
                        }
                    }
                    int numRead = read(it->fd, buffer, sizeof(buffer) - 1);
                    if (numRead > 0) {
                        buffer[numRead] = '\0';
                        output_callback(taskIdx, buffer);
                        fputs(buffer, stdout);
                    }
                    ++it;
                } else if (it->revents & POLLHUP) {
                    close(it->fd);
                    it = pollfds.erase(it);
                } else {
                    ++it;
                }
            }
        }
    }

    std::vector<std::tuple<Ret, int>> await() {
        size_t exited_children = 0;
        while (exited_children < child_process.size()) {
            int status = 0;
            pid_t who = waitpid(-1, &status, WNOHANG);
            if (who == -1) {
                break;
            } else if (who == 0) {
                ChildOutputWatch();
                continue;
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

    void abort();

    ~ProcessPool();
};
```
