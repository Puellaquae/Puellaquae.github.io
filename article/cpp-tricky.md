<!---
tags = ["C++"]
--->

# C++ 小知识

## 访问私有成员

在一个博客看到了 [C++ 获取私有成员的一个方法](http://bloglitb.blogspot.com/2010/07/access-to-private-members-thats-easy.html)，感觉非常神奇，就花了两三个晚上分析了其背后的原理。

```cpp
#include <iostream>

struct A {
    void print_b() { std::cout << b << std::endl; }

    int a{};
private:
    int b{};
};

template <typename Tag, typename Tag::type M>
struct Rob {
    friend typename Tag::type get(Tag) { return M; }
};

struct A_b {
    using type = int A::*;
    friend type get(A_b);
};

template struct Rob<A_b, &A::b>;

int main() {
    A a{};
    a.*get(A_b{}) = 12; // access private member 'b'
    a.print_b(); // print 12
}
```

### 成员指针访问运算符

最初看到 `a.*get(A_b{})` 这一语句感到非常奇妙，仿佛我们向类型 `A` 扩展了方法 `get` 一样。但其实 `.*` 是一个二元运算符，[成员指针访问运算符](https://zh.cppreference.com/w/cpp/language/operator_member_access#.E5.86.85.E5.BB.BA.E7.9A.84.E6.88.90.E5.91.98.E6.8C.87.E9.92.88.E8.AE.BF.E9.97.AE.E8.BF.90.E7.AE.97.E7.AC.A6)。另外我最初被 `get` 函数迷惑了，以为它是在类型的域内的，但它是友元函数，它是全局上的一个函数。

了解成员指针访问运算符后我们可以这样获取成员变量：

```cpp
int A:: *ptr_a = &A::a;
A a{};
a.*ptr_a = 13;
```

当然直接用这种方式是获取不了私有变量的，它是通不过编译检查的：

```cpp
int A:: *ptr_b = &A::b; // error
A a{};
a.*ptr_b = 13;
```

当然，你可让 `A` 直接返回一个指针给你，但在这讨论就没有什么意义了。

### 逃过编译器检查

但是作者发现了一处编译器不会检查的地方，而且这个这是写在 C++ 标准里的（C++ 20 前在 [temp.explicit.12](https://timsong-cpp.github.io/cppwp/n4659/temp.explicit#12)，20 起移到了 [temp.spec.general.6](https://timsong-cpp.github.io/cppwp/temp.spec.general#6)）。对于特化申明的模板参数，编译器不会进行检查。

```cpp
template<typename T> struct S {};
template struct S<&A::b>; // no error
```

但是仅仅这样是不行的，因为 `&A::b` 不能出现在特化申明以外的地方，所以我们现在也获取不到那个特化的 `S`。这里博客展示了两个手法：

```cpp
template <typename Tag>
struct Get {
    static typename Tag::type ptr;
};

template <typename Tag>
typename Tag::type Get<Tag>::ptr;

template <typename Tag, typename Tag::type M>
struct Rob {
    struct D {
        D() { Rob<Tag>::ptr = M; }
    };
    static D d;
};

template <typename Tag, typename Tag::type p>
typename Rob<Tag, p>::D Rob<Tag, p>::d;

struct A_b {
    using type = int A::*;
};

template struct Rob<A_b, &A::b>;

int main() {
    A a{};
    a.*Get<A_b>::ptr = 12;
    a.print_b();
}
```

这个手法首先将指针值的模板参数与 `Get` 剥离，使得我们只需要一个 `Tag` 类型就可以取得特定的特化。然后利用辅助类型 `Rob`，`Rob` 的静态成员 `d` 初始化时将指针的值赋到对于的 `Get` 类型上。

另一个手法就是文章最开始展示的，利用了 `get` 函数重载。但是仅仅在模板中的友元申明是不能被 ADL 找到的

```cpp
template <class T>
struct S {
    friend void f(T){}
};

template struct S<int>;

int main() {
    f(1); // cannot resolve symbol
}
```

所以需要在 `A_b` 中申明具体的 `get` 函数。其中函数申明也可以写到类型外面：

```cpp
struct A_b {
    using type = int A::*;
};
A_b::type get(A_b);
```

### 扩展阅读

在[这篇博文](https://quuxplusone.github.io/blog/2020/12/02/unused-private-member/)中作者探讨测试了未使用的类的私有成员是否会被编译器优化掉（我们的代码需要建立在不会被优化掉的基础上才能正常工作）。
