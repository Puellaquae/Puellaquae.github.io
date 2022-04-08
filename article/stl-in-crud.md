<!---
createDate = 2020-07-15
tags = ["C++"]
--->

# 80 行的课设，C++ 标准库在简单增删改查中的使用

大一 C++ 的课设内容不外乎文件读写与经典的增删改查，而利用 C++ 的标准库可以较为便利而优雅的实现。

先前在 cppreference 中看到了 `copy` 函数和输入迭代器的巧妙利用。

```c++
copy(vector.begin(), vector.end(), ostream_iterator<int>(cout, " "));
```

将输入流视为一个特殊的容器，把 `vector` 容器中的内容复制到输出流中，可以实现数据的快速输出。同样地，输入流也可以被视作一个容器，用这种方法实现快速的输入。

```c++
copy(istream_iterator<int>(cin), istream_iterator<int>(), back_inserter(vector));
```

再结合算法库中的 `remove_if`，`sort` 等函数，就可用较短的代码实现一个完整课设内容。

**课设要求**：

信用卡信息：卡号、用户姓名、身份证号码、开户银行、信用额度、消费金额、信用积分（可能为负）等。

**功能要求**：

- 设计菜单实现功能选择；
- 能够对信用卡信息进行维护：新建、修改、删除操作；
- 能够对信用卡进行信用额度调整、信用积分兑换等工作；
- 按给定的条件（卡号、用户姓名、身份证号码、信用积分等）查询课程信息；
- 能将信用卡信息按卡号；信用额度、消费金额、消费金额这些信息项排序整理；
- 以文件形式保存相关信息，可以读取默认文件中的信息进行查询等操作。

**详细代码**：

```c++
#include <fstream>
#include <iostream>
#include <vector>
#include <iterator>
#include <algorithm>
using namespace std;
#define ForEach(Container) (Container).begin(), (Container).end()
#define QueryByItem(Item)\
    cout << #Item "?\n";\
    decltype(Account::Item) Item##Q;\
    cin >> Item##Q;\
    copy_if(ForEach(accounts), ostream_iterator<Account>(cout, "\n"),[=](Account r) { return r.Item == Item##Q; })
#define SortByItem(Item) sort(ForEach(accounts), [](const Account& a, const Account& b) { return a.##Item < b.##Item; })
template<class T> T Input(const string& placeholder, T& var) { cout << placeholder; cin >> var; return var; }
struct Account
{
    int 卡号{};
    string 姓名{}, 身份证号{}, 开户银行{};
    double 信用额度{}, 消费金额{}, 信用积分{};
};
ostream& operator<<(ostream& out, const Account& r)
{
    return out << r.卡号 << "\t" << r.姓名 << "\t" << r.身份证号 << "\t" << r.开户银行 << "\t" << r.信用额度 << "\t" << r.消费金额 << "\t" << r.信用积分;
}
istream& operator>>(istream& in, Account& r)
{
    return in >> r.卡号 >> r.姓名 >> r.身份证号 >> r.开户银行 >> r.信用额度 >> r.消费金额 >> r.信用积分;
}
int main()
{
    vector<Account> accounts;
    ifstream infile("data.txt");
    copy(istream_iterator<Account>(infile), istream_iterator<Account>(), back_inserter(accounts));
    infile.close();
    for (int cmd = -1, mIntVar; cmd != 0; system("pause"))
    {
        if (Input("\033[H\033[J欢迎使用【信用卡客户管理系统】\n1.查\n2.增\n3.改\n4.删\n5.排序\n0.退出\n", cmd) == 1)
        {
            if (Input("1.按卡号\n2.按姓名\n3.按身份证\n4.按信用积分\n5.全部显示\n", cmd) == 1) { QueryByItem(卡号); }
            else if (cmd == 2) { QueryByItem(姓名); }
            else if (cmd == 3) { QueryByItem(身份证号); }
            else if (cmd == 4) { QueryByItem(信用积分); }
            else if (cmd == 5) { copy(ForEach(accounts), ostream_iterator<Account>(cout, "\n")); }
        }
        else if (cmd == 2)
        {
            Input("几条?\n", mIntVar);
            cout << "卡号、用户姓名、身份证号码、开户银行、信用额度、消费金额、信用积分\n";
            copy_n(istream_iterator<Account>(cin), mIntVar, back_inserter(accounts));
        }
        else if (cmd == 3)
        {
            Input("卡号?\n", mIntVar);
            if (Input("1.修改信用额度\n2.兑换积分\n", cmd) == 1)
            {
                cin >> find_if(ForEach(accounts), [=](const Account& r) { return r.卡号 == mIntVar; })->信用额度;
            }
            else if (cmd == 2)
            {
                decltype(Account::信用积分) fidemD;
                find_if(ForEach(accounts), [=](const Account& r) { return r.卡号 == mIntVar; })->信用积分 -= Input("", fidemD);
            }
        }
        else if (cmd == 4)
        {
            Input("卡号?", mIntVar);
            accounts.erase(remove_if(ForEach(accounts), [=](const Account& r) { return r.卡号 == mIntVar; }), accounts.end());
        }
        else if (cmd == 5)
        {
            if (Input("1.卡号\n2.消费金额\n3.信用额度\n4.信用积分\n", cmd) == 1) { SortByItem(卡号); }
            else if (cmd == 2) { SortByItem(消费金额); }
            else if (cmd == 3) { SortByItem(信用额度); }
            else if (cmd == 4) { SortByItem(信用积分); }
        }
    }
    ofstream outfile("data.txt");
    copy(ForEach(accounts), ostream_iterator<Account>(outfile, "\n"));
    outfile.close();
}
```