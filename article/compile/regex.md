<!---
tags = ["Rust", "Regex"]
--->

# 正则表达式转化为自动机

正则文法，3-型文法，可用正则表达式描述，可被有限状态自动机接受。

一般，正则表达式到 DFA 转化分为三步：

- 正则表达式转化为 NFA
- NFA 转化 DFA
- DFA 最小化

## 正则表达式转化为 NFA

### 正则表达式的定义

本文只实现了最基础的正则表达式，仅支持连接 `ab`，选择 `a|b` 和 Kleene 星号 `a*` 运算。此外，因为没有做字符转义，所以 ε 将被特殊符号处理。程序未考虑运算优先级，没有使用括号指明的都当作 UB 考虑。

### 预处理正则表达式

根据 *[Regular Expression Matching Can Be Simple And Fast](https://swtch.com/~rsc/regexp/regexp1.html)* 这篇文章。预先将正则表达式预处理为后缀表达式再转化到 NFA 更方便。对于省略的连接运算符，相邻两个字符，字符与括号，星号和字符之间都需要额外补上。例如 `aa(((bc)|(de))*)f` 补上省略的连接符（用加号表示）`a+a+(((b+c)|(d+e))*)+f`，转为后缀 `aabc+de+|*f+++`。

```rust
pub fn regex2post(r: &str) -> Vec<RegexToken> {
    use RegexToken::{Alter, Cat, Bracket, Closure, Char};
    let mut stack = Vec::new();
    let mut post = Vec::new();
    let mut add_cat = false; // 表示是否需要一个连接符
    for c in r.chars() {
        match c {
            '|' => {
                add_cat = false; // 新的双目运算符直接取代了连接符
                stack.push(Alter);
            }
            '(' => {
                if add_cat {
                    stack.push(Cat);
                    add_cat = false; // 一个左括号可以连接前面的，但不能连接后面的
                }
                stack.push(Bracket);
            }
            ')' => {
                if !add_cat { unreachable!(); }
                while !matches!(stack.last(), Some(Bracket) | None) {
                    post.push(stack.pop().unwrap());
                }
                stack.pop();
            }
            '*' => { // 单目运算符不影响状态
                post.push(Closure);
            }
            'ε' => {
                if add_cat {
                    stack.push(Cat);
                }
                add_cat = true;
                post.push(Epsilon);
            }
            _ => {
                if add_cat {
                    stack.push(Cat);
                }
                add_cat = true; // 字符即可连接前面也可连接后面
                post.push(Char(c));
            }
        }
    }
    if !add_cat { unreachable!(); }
    while let Some(r) = stack.pop() {
        post.push(r);
    }
    post
}
```

### 后缀表达式转 NFA

rust 用指针不是很方便，所以这里用数组来存放 NFA 的图结构。

```rust
pub struct NFA {
    pub nodes: Vec<Option<char>>,
    pub edges: Vec<(usize, usize)>,
    pub start: usize,
    pub out: usize,
}
```

用一个栈来存放后缀表达式转化到 NFA 中临时的图，使用边来表示（即想象将这个图的入口和出口用一条有向边直接连起来），暂且称之为块。

对于字符，直接向图中添加新节点，压入下标。

```rust
RegexToken::Char(c) => {
    let idx = nfa.add_node(NFANode::new(Some(*c)));
    stack.push((idx, idx));
}

RegexToken::Epsilon => {
    let idx = nfa.add_node(NFANode::new(None));
    stack.push((idx, idx));
}
```

对于连接符，弹出两个块，块甲和块乙（注意先后）。连接乙的出和甲的入（这条边是可以确定下来存入 NFA 中的），再压入乙的入和甲的出。

```text
      +---+    +---+
in -> | B | -> | A | -> out 
      +---+    +---+
```

```rust
RegexToken::Cat => {
    let (e2_start, e2_out) = stack.pop().unwrap();
    let (e1_start, e1_out) = stack.pop().unwrap();
    nfa.add_edge(e1_out, e2_start);
    stack.push((e1_start, e2_out));
}
```

对于选择符，弹出两个块，需要两个新节点做辅助，并可确定四条边。

```text
              +---+
        +---> | A | --->+
      +---+   +---+   +---+
in -> |   |           |   | -> out
      +---+   +---+   +---+
        +---> | B | --->+
              +---+
```

```rust
RegexToken::Alter => {
    let (e2_start, e2_out) = stack.pop().unwrap();
    let (e1_start, e1_out) = stack.pop().unwrap();
    let a_start = nfa.add_node(NFANode::new(None));
    let a_out = nfa.add_node(NFANode::new(None));
    nfa.add_edge(a_start, e1_start);
    nfa.add_edge(a_start, e2_start);
    nfa.add_edge(e1_out, a_out);
    nfa.add_edge(e2_out, a_out);
    stack.push((a_start, a_out));
}
```

对于星号，弹出一个块，需要一个新节点做辅助，并可确定两条边。

```text
              +---+
        +---> | A |
      +---+   +---+
in -> |   | <---+  
      +---+
        +---> out
```

```rust
RegexToken::Closure => {
    let idx = nfa.add_node(NFANode::new(None));
    let (e_start, e_out) = stack.pop().unwrap();
    nfa.add_edge(idx, e_start);
    nfa.add_edge(e_out, idx);
    stack.push((idx, idx));
}
```

最后栈里剩下的一个块就是完整的图了，两个下标分别就是 NFA 的初始状态和接收状态，后缀表达式到 NFA 的转化就做完了。

## NFA 转 DFA

NFA 转 DFA 使用子集构造法，这需要为 NFA 增加一个 get_reach 函数计算一个状态消耗一个字符可到达的状态的集合。另外 DFA 没有采用 NFA 一样的数据结构，而是直接使用了一个二维数组表示。

```rust
pub struct DFA {
    pub accepts: Vec<char>,
    pub table: Vec<Vec<Option<usize>>>,
    pub start: usize,
    pub out: Vec<usize>,
}
```

以 `nfa.get_reach(nfa.start, None)` 作为初始状态，求新的状态，直到没有新的状态产生为止。所有包含了原终结状态的新状态都作为 DFA 的终结状态。

```rust
pub fn determinize(nfa: &NFA) -> DFA {
    let start = nfa.get_reach(nfa.start, None);
    let mut table = Vec::new();
    let mut states = vec![start.clone()];
    let accepts: Vec<_> = nfa
        .get_accepts()
        .into_iter()
        .filter(|x| matches!(x, Some(_)))
        .map(|x| x.unwrap())
        .collect(); // 输入符号集合
    while !states.is_empty() {
        let state = states.pop().unwrap();
        let new_states: Vec<_> = accepts
            .iter()
            .map(|a| {
                let mut new_state: Vec<_> = state
                    .iter()
                    .map(|s| nfa.get_reach(*s, Some(*a)))
                    .flatten()
                    .collect();
                new_state.sort_unstable();
                new_state.dedup();
                new_state
            })
            .collect();
        table.push((state, new_states.clone()));
        for new_state in new_states {
            if !new_state.is_empty()
                && !table.iter().any(|s| s.0 == new_state)
                && !states.contains(&new_state)
            {
                states.push(new_state) // 只有新的状态才加入计算队列
            }
        }
    }

    let rename: HashMap<Vec<usize>, usize> = table
        .iter()
        .enumerate()
        .map(|(i, s)| (s.0.clone(), i))
        .collect();

    DFA {
        accepts,
        table: table
            .into_iter()
            .map(|(_, ns)| {
                ns.iter()
                    .map(|n| rename.get(n).copied())
                    .collect::<Vec<_>>()
            })
            .collect(),
        start: *rename.get(&start).unwrap(),
        out: rename
            .into_iter()
            .filter(|(s, _)| s.contains(&nfa.out))
            .map(|(_, i)| i)
            .collect(),
    }
}
```

## 最小化 DFA

最小化 DFA 使用的是 Hopcroft 算法，但是不同于网上算法，这里首先求出了状态的划分，再重新建立跳转表。划分状态首先要判断两个状态是否可区分（distinguish）,即能否有串能被甲状态接受而不被乙状态接受。如果甲、乙接受一个字符跳转到的状态丙、丁是可区分的，那么甲、乙是可区分的。根据定义，一个终结状态和一个非终结状态一定是可区分的（终结状态可接受 ε 而非终结状态不能）。由此可以递归地求出任意两个状态是否是可区分的。

例如：

```text
   | a | b |
 0 | 2 | 1 |
 1 | 2 | 1 |
 2 | 2 | 1 |
```

其中 0 是初始状态，1 是终结状态。这里的 0 和 2 就是不可区分的两个状态，因为没有一个串可以被 0 接受而不被 2 接受。所以状态就被划分为 {0, 2} 和 1。

```rust
pub fn distinguishable(&self, p: usize, q: usize) -> bool {
        use TransRes::{Accept, Next, Unaccept};
        let p_out = self.out.contains(&p);
        let q_out = self.out.contains(&q);
        if p_out ^ q_out {
            return true;
        }
        if p == q {
            return false;
        }
        let mut accepts: Vec<_> = self.accepts
            .iter()
            .map(|a| Some(*a))
            .collect();
        accepts.push(None);
        for a in accepts {
            let r = self.get_trans(p, a);
            let s = self.get_trans(q, a);
            match (r, s) {
                (Accept, Accept) | (Unaccept, Unaccept) => {}
                (Accept, _) | (_, Accept) | (Unaccept, _) | (_, Unaccept) => {
                    return true;
                }
                (Next(rc), Next(sc)) => {
                    if self.distinguishable(rc, sc) {
                        return true;
                    }
                }
            }
        }
        false
    }
```

得到了新的一组状态后，需要重建跳转表。因为多个原状态被合并为了一个新状态，所有只要求任意一个原状态的跳转就可得出新状态的跳转了。

```rust
pub fn minimize(&self) -> DFA {
        let states = self.get_nondistinguishable_states();
        let rename: HashMap<usize, usize> = states
            .iter()
            .enumerate()
            .map(|(i, x)| x.iter().map(move |tx| (*tx, i)))
            .flatten()
            .collect();
        let mut table = Vec::new();
        for s in states {
            let state_trans = self
                .accepts
                .iter()
                .map(|a| match self.get_trans(*s.first().unwrap(), Some(*a)) {
                    TransRes::Accept => unreachable!(),
                    TransRes::Next(ns) => Some(*rename.get(&ns).unwrap()),
                    TransRes::Unaccept => None,
                })
                .collect::<Vec<_>>();
            table.push(state_trans);
        }
        DFA {
            accepts: self.accepts.clone(),
            table,
            start: *rename.get(&self.start).unwrap(),
            out: {
                let mut o: Vec<_> = self.out
                    .iter()
                    .map(|x| *rename.get(x).unwrap())
                    .collect();
                o.sort_unstable();
                o.dedup();
                o
            },
        }
    }
```
