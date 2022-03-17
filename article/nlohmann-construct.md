<!---
cdate = "2021/01/30"
mdate = "2021/01/30"
tags = ["C++"]
--->

# 对 nlohmann-json 构造函数的分析

之前看到 nlohmann 的 json 库中`json`的构造函数实现的很有意思。可以实现`json{{"Array":{"Str",1,2.0,false,nullptr}},{"Object",{}}}`这种所见即所得的效果。

看了源码以及经过几次试验后发现这个构造函数的关键在于这两个重载：

```c++
template<class... T> Json(T...); // 记为重载
Json(initializer_list<Json>); // 记为重载 2
```

以`Json{1,{2},{{nullptr,true},{}}}`为例，根据程序输出的结果来看：首先因为花括号里的元素类型不一致，参数传入重载 1，但是这里我发现传递进去的参数包只会有零个或一个，所以 1 被传入，源对象变为`{Json@1,{2},{{nullptr,true},{}}}`；

对于`{2}`先进入重载 1，花括号里类型全部变成`Json`类型，可以被重载 2 接受，源对象变为`{Json@1,Json@list_Json@2,{{nullptr,true},{}}}`。

如此反复递归，直到最后花括号内类型全部转化为`Json`类型被重载 2 接受。