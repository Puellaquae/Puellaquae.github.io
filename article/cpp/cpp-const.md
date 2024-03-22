<!---
tags = ["C++"]
--->

# C++ 的 const 限定

我在 StackOverflow 看到了这样一个问题，大意是为什么下面的模板函数会特化失败。

```cpp
template<class T>
void func(const T& val);

template<>
void func(const char *& val);
```

然后发现我也不会。我把特化的函数删掉，然后传入一个 `const char *` 的值，此时 `T` 是 `const char *` 没错，但是函数的签名确是 `void func<const char *>(const char *const& val)`。这也就是说对 `T *` 追加 const 限定后的类型其实是 `T *const` 而不是 `const T *`。我马上去看了一下 `add_const` 函数，发现样例中正好有一个就是对 `const int *` 追加 const 限定。

其实这才对，const 限定是限定自身不可变。`const T *` 只是指向不可变。进而，考虑到 `const T` 也可以写作 `T const`, 那么如果一律将 const 写在右侧的话，就可以非常简单的写出复杂的指针类型了。真正体现追加。

```cpp
int x;          //                  data
int const cx;   //            const data
int *px;        //       pointer to data
int const *pcx; // pointer to const data
int * const cpx // const pointer to data
```

此外，我才知道原来 `const T &` 是不算有 const 限定的，根据 [[dcl.ref]/1](https://timsong-cpp.github.io/cppwp/dcl.ref#1)（翻译来自 [cppreference](https://zh.cppreference.com/w/cpp/language/reference)）

> 引用类型不能在顶层有 cv 限定；声明中没有为此而设的语法，如果在 typedef 名、decltype 说明符 (C++11 起)或类型模板形参上添加了该限定符，它将会被忽略。

也就是说，因为引用本身是没有规定需要真实在内存中存在的，而且引用初始化就必须绑定。所以对于引用是没有可变和不可变之说的，只能说是引用了可变的数据或不可变的数据。所有如果用 `is_const` 去测试一个引用类型永远都是 `false` 的。

C++ 还是太复杂了，怪不得只有 C++ 需要语言律师。
