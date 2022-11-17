<!---
hideIndex = "md"
--->

<!M TexBlock(copycode)>
<!M GFMTexBlock>
<!M TexInline>

# Tex 公式测试

程序使用 pdfLaTex 和 dvisvgm 编译生成 svg 图片并内联至 html 内。

## 行间公式

使用 TexBlock 宏或 GFMTexBlock 宏。例子来自 [LaTeX 公式篇 - 知乎](https://zhuanlan.zhihu.com/p/110756681)。

对于 TexBlock 宏，使用方法为 tex 语言类型的代码块。

````md
```tex
0 \neq 1 \quad x \equiv x \quad 1 = 9 \bmod 2
```
````

```tex
0 \neq 1 \quad x \equiv x \quad 1 = 9 \bmod 2
```

对于 GFMTexBlock 宏，使用方法同 Github markdown 的公式，使用 `$$` 包裹行间公式。但不同于 GFM，这里要求行间公式独立成块，`$$` 独占首末行。

```md
$$
0 \neq 1 \quad x \equiv x \quad 1 = 9 \bmod 2
$$
```

$$
0 \neq 1 \quad x \equiv x \quad 1 = 9 \bmod 2
$$

以下展示使用 TexBlock 宏，两个宏的内部处理都是相同的，只是识别的模式不同。

```tex
\sqrt{x} + \sqrt{x^{2}+\sqrt{y}} = \sqrt[3]{k_{i}} - \frac{x}{m}
```

```tex
\overbrace{1+2+\cdots+n}^{n\text{个}} \qquad \underbrace{a+b+\cdots+z}_{26}
```

```tex
\lim_{x \to \infty} x^2_{22} - \int_{1}^{5}x\mathrm{d}x + \sum_{n=1}^{20} n^{2} = \prod_{j=1}^{3} y_{j}  + \lim_{x \to -2} \frac{x-2}{x}
```

```tex
\begin{bmatrix}
1 & 2 & \cdots \\
67 & 95 & \cdots \\
\vdots  & \vdots & \ddots \\
\end{bmatrix}
```

```tex
D(x) = \begin{cases}
\lim\limits_{x \to 0} \frac{a^x}{b+c}, & x<3 \\
\pi, & x=3 \\
\int_a^{3b}x_{ij}+e^2 \mathrm{d}x,& x>3 \\
\end{cases}
```

## 行内公式

同样，对于行内公式也有 TexInline 宏和 GFMTexInline 宏可选。

TexInline 依赖于行内代码，`` `$ z = \sqrt{x^2+y^2} $` `` `$ z = \sqrt{x^2+y^2} $` 首末字符为 `$` 的会被视为行内公式，`$` 和公式之间需要有一个空格。

GFMTexInline 会把被 `$` 紧密包裹的文本识别为行内公式，` $z = \sqrt{x^2+y^2}$ `$z = \sqrt{x^2+y^2}$。
