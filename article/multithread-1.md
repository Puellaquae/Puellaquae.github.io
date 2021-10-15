# C++ 多线程 volatile 限定符

有线程 A 和 B，线程 B 需要中断等待线程 A 触发特定条件，线程 B 只需保证不早于线程 A 触发特定条件继续执行即可。如果使用一个`flag`变量和`while`忙查，如下代码

```c
    while(flag)
    //do something
```

会导致编译不能检测到`flag`在线程 A 中的读写操作，而导致优化后的代码和源代码的表现不一致，每次判断都从寄存器里直接取值，变成一个死循环。

```asm
000000 mov  eax, dword ptr [flag]
000001 test eax, eax 
000002 je   000001h    ;这里只跳转到test指令处，没有从内存中更新值 
000003 nop             ;do something
```

对于这种情况，就需要在变量`flag`上加上`volatile`限定符，阻止编译器对此变量的优化。

> 通过 volatile 限定的类型的泛左值表达式的每次访问（读或写操作、成员函数调用等），都被当作对于优化而言是可见的副作用（即在单个执行线程内，volatile 访问不能被优化掉，或者与另一按顺序早于或按顺序晚于该 volatile 访问的可见副作用进行重排序。这使得 volatile 对象适用于与信号处理函数之间的交流，但不适于与另一执行线程交流，参阅 std::memory_order）。试图通过非 volatile 泛左值涉指 volatile 对象（例如，通过到非 volatile 类型的引用或指针）会导致未定义行为。

> Every access (read or write operation, member function call, etc.) made through a glvalue expression of volatile-qualified type is treated as a visible side-effect for the purposes of optimization (that is, within a single thread of execution, volatile accesses cannot be optimized out or reordered with another visible side effect that is sequenced-before or sequenced-after the volatile access. This makes volatile objects suitable for communication with a signal handler, but not with another thread of execution, see std::memory_order). Any attempt to refer to a volatile object through a non-volatile glvalue (e.g. through a reference or pointer to non-volatile type) results in undefined behavior.

当然，`volatile`在这里只是阻止编译器做优化的作用，并不能保证时序。