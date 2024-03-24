<!---
createDate = 2020-08-14
tags = ["CSS"]
--->

# CSS 选择器与 input 标签的联用

<!M Exclude>
**本文有交互式内容，建议前往[网面版本](https://puellaquae.github.io/page/web/css-filter.html)查看**

CSS 的选择器与 `<input>` 标签的联用可以代替 JS 实现一些简单功能，如标签筛选、可折叠菜单栏等。

## 主要想法

利用 `checkbox`、`radio` 等控件的 `:checked` 伪类，配合 CSS 的选择器切换目标的 `display` 属性实现。

```html
<style>
    .item {display: none;}
    #tagall:checked~.item, #tag1:checked~.tag1,
    #tag2:checked~.tag2, #tag3:checked~.tag3
    {display: unset;}
</style>
<input type="radio" name="filter" id="tagall" checked hidden>
<input type="radio" name="filter" id="tag1" hidden>
<input type="radio" name="filter" id="tag2" hidden>
<label for="tagall">all</label>
<label for="tag1">tag1</label>
<label for="tag2">tag2</label>
<div class="item tag1">item with tag1</div>
<div class="item tag2">item with tag2</div>
<div class="item tag1 tag2">item with tag1 tag2</div>
```

<!M Exclude>
<!--

<!M RawHtml>
```html
<div class="interact" id="interact1">
    <style>
        #interact1 .item {
            display: none;
        }

        #interact1 [for^="tag"] {
            color: black;
            border: 1px black solid;
            border-radius: 5px;
            padding: 1px 5px;
            background-color: #eee;
        }

        #interact1 #tagall:checked~[for="tagall"],
        #interact1 #tag1:checked~[for="tag1"],
        #interact1 #tag2:checked~[for="tag2"],
        #interact1 #tag3:checked~[for="tag3"] {
            color: red;
        }

        #interact1 #tagall:checked~.item,
        #interact1 #tag1:checked~.tag1,
        #interact1 #tag2:checked~.tag2,
        #interact1 #tag3:checked~.tag3 {
            display: block;
        }
    </style>
    <input type="radio" name="filter1" id="tagall" checked hidden>
    <input type="radio" name="filter1" id="tag1" hidden>
    <input type="radio" name="filter1" id="tag2" hidden>
    <input type="radio" name="filter1" id="tag3" hidden>
    <label for="tagall">all</label>
    <label for="tag1">tag1</label>
    <label for="tag2">tag2</label>
    <label for="tag3">tag3</label>
    <div class="item tag1">item with tag1</div>
    <div class="item tag2">item with tag2</div>
    <div class="item tag3">item with tag3</div>
    <div class="item tag1 tag3">item with tag1, tag3</div>
    <div class="item tag2 tag3">item with tag2, tag3</div>
    <div class="item tag1 tag2 tag3">item with tag1, tag2, tag3</div>
</div>
```

<!M Exclude>
-->

## 拓展

`<label>` 元素也可以根据 `:checked` 显示或隐藏，从而实现类似 `radio` 与 `checkbox` 相结合的效果。

<!M Exclude>
<!--

<!M RawHtml>
```html
<div class="interact" id="interact2">
    <style>
        #interact2 .item {
            display: none;
        }
        #interact2 [for^="atag"] {
            color: black;
            border: 1px black solid;
            border-radius: 5px;
            padding: 1px 5px;
            background-color: #eee;
        }
        #interact2 [switch="1"] {
            order: 1;
        }
        #interact2 [switch="2"] {
            order: 2;
        }
        #interact2 [switch="3"] {
            order: 3;
        }
        #interact2 [switch]::before {
            content: "tag"attr(switch);
        }
        #interact2 #atag0:checked~* #a0,
        #interact2 #atag1:checked~* [switch="1"][act="off"],
        #interact2 #atag2:checked~* [switch="2"][act="off"],
        #interact2 #atag3:checked~* [switch="3"][act="off"],
        #interact2 #atag12:checked~* [switch="1"][act="off"],
        #interact2 #atag12:checked~* [switch="2"][act="off"],
        #interact2 #atag13:checked~* [switch="1"][act="off"],
        #interact2 #atag13:checked~* [switch="3"][act="off"],
        #interact2 #atag23:checked~* [switch="2"][act="off"],
        #interact2 #atag23:checked~* [switch="3"][act="off"],
        #interact2 #atag123:checked~* [switch="1"][act="off"],
        #interact2 #atag123:checked~* [switch="2"][act="off"],
        #interact2 #atag123:checked~* [switch="3"][act="off"] {
            color: red;
        }
        #interact2 [id^="atag"][id*="1"]:checked~.atag1,
        #interact2 [id^="atag"][id*="2"]:checked~.atag2,
        #interact2 [id^="atag"][id*="3"]:checked~.atag3 {
            display: block;
        }
        #interact2 [for]:not(#a0) {
            display: none;
        }
        #interact2 #atag0:checked~* [id^="a0_"],
        #interact2 #atag1:checked~* [id^="a1_"],
        #interact2 #atag2:checked~* [id^="a2_"],
        #interact2 #atag3:checked~* [id^="a3_"],
        #interact2 #atag12:checked~* [id^="a12_"],
        #interact2 #atag13:checked~* [id^="a13_"],
        #interact2 #atag23:checked~* [id^="a23_"],
        #interact2 #atag123:checked~* [id^="a123_"] {
            display: unset;
        }
        #interact2 div.tags {
            display: flex;
            justify-content: center;
        }
    </style>
    <input type="radio" name="filter2" id="atag0" checked hidden>
    <input type="radio" name="filter2" id="atag1" hidden>
    <input type="radio" name="filter2" id="atag2" hidden>
    <input type="radio" name="filter2" id="atag3" hidden>
    <input type="radio" name="filter2" id="atag12" hidden>
    <input type="radio" name="filter2" id="atag13" hidden>
    <input type="radio" name="filter2" id="atag23" hidden>
    <input type="radio" name="filter2" id="atag123" hidden>
    <div class="tags">
        <label id="a0" for="atag0" style="order: 0;">none</label>
        <label id="a0_1" for="atag1" switch="1" act="on"></label>
        <label id="a0_2" for="atag2" switch="2" act="on"></label>
        <label id="a0_3" for="atag3" switch="3" act="on"></label>
        <label id="a1_0" for="atag0" switch="1" act="off"></label>
        <label id="a1_12" for="atag12" switch="2" act="on"></label>
        <label id="a1_13" for="atag13" switch="3" act="on"></label>
        <label id="a2_0" for="atag0" switch="2" act="off"></label>
        <label id="a2_12" for="atag12" switch="1" act="on"></label>
        <label id="a2_23" for="atag23" switch="3" act="on"></label>
        <label id="a3_0" for="atag0" switch="3" act="off"></label>
        <label id="a3_13" for="atag13" switch="1" act="on"></label>
        <label id="a3_23" for="atag23" switch="2" act="on"></label>
        <label id="a12_1" for="atag1" switch="2" act="off"></label>
        <label id="a12_2" for="atag2" switch="1" act="off"></label>
        <label id="a12_123" for="atag123" switch="3" act="on"></label>
        <label id="a13_1" for="atag1" switch="3" act="off"></label>
        <label id="a13_3" for="atag3" switch="1" act="off"></label>
        <label id="a13_123" for="atag123" switch="2" act="on"></label>
        <label id="a23_2" for="atag2" switch="3" act="off"></label>
        <label id="a23_3" for="atag3" switch="2" act="off"></label>
        <label id="a23_123" for="atag123" switch="1" act="on"></label>
        <label id="a123_12" for="atag12" switch="3" act="off"></label>
        <label id="a123_23" for="atag23" switch="1" act="off"></label>
        <label id="a123_13" for="atag13" switch="2" act="off"></label>
    </div>
    <div class="item atag1">item with tag1</div>
    <div class="item atag2">item with tag2</div>
    <div class="item atag3">item with tag3</div>
    <div class="item atag1 atag2">item with tag1, tag2</div>
    <div class="item atag2 atag3">item with tag2, tag3</div>
    <div class="item atag1 atag2 atag3">item with tag1, tag2, tag3</div>
</div>
```

<!M Exclude>
-->

当然，这种作法是不推荐用于实际情况的，`n` 个标签就需要 `2^n` 个 `radio` 记录状态和 `n2^n` 个label控制状态的转移。这会导致代码十分冗长，而且标签的切换需要频繁地重排页面，以及伪类选择器的大量使用（属性选择器可以预先展开为 id 选择器），都会降低页面的性能。

根据这个原理，只要是可以抽象为有限状态机模型的理论上都是可以利用用 CSS 实现的，此外利用 animation 产生时间差切换显示不同的label还可以模拟出伪随机的状态游走（效果会受限于浏览器的时间精度和刷新策略）。

<!M Exclude>
<!--

<!M RawHtml>
```html
<div class="interact" id="interact3">
    <style>
        #interact3 {
            display: flex;
            text-align: left;
            min-height: 35px;
        }
        #interact3 label::before {
            content: "点击随机切换颜色";
        }
        @keyframes switch {
            from {
                z-index: 0;
            }
            to {
                z-index: 7;
            }
        }
        #interact3 label {
            height: 35px;
            width: calc(var(--ContainWidth, 98%) - 4px);
            position: absolute;
            animation: switch 3s linear 0s infinite normal;
            background-color: inherit;
            overflow: hidden;
        }
        #lwhite {
            animation-delay: 0s !important;
        }
        #lred {
            animation-delay: 0.42s !important;
        }
        #lorange {
            animation-delay: 0.86s !important;
        }
        #lpink {
            animation-delay: 1.28s !important;
        }
        #lblueviolet {
            animation-delay: 1.71s !important;
        }
        #lblue {
            animation-delay: 2.14s !important;
        }
        #lgreen {
            animation-delay: 2.57s !important;
        }
        #white:checked~div {
            background-color: white;
        }
        #red:checked~div {
            background-color: red;
        }
        #orange:checked~div {
            background-color: orange;
        }
        #pink:checked~div {
            background-color: pink;
        }
        #blueviolet:checked~div {
            background-color: violet;
        }
        #blue:checked~div {
            background-color: lightskyblue;
        }
        #green:checked~div {
            background-color: greenyellow;
        }
    </style>
    <input type="radio" name="random" id="white" checked hidden>
    <input type="radio" name="random" id="red" hidden>
    <input type="radio" name="random" id="orange" hidden>
    <input type="radio" name="random" id="pink" hidden>
    <input type="radio" name="random" id="blueviolet" hidden>
    <input type="radio" name="random" id="blue" hidden>
    <input type="radio" name="random" id="green" hidden>
    <div>
        <label id="lwhite" for="white"></label>
        <label id="lred" for="red"></label>
        <label id="lorange" for="orange"></label>
        <label id="lpink" for="pink"></label>
        <label id="lblueviolet" for="blueviolet"></label>
        <label id="lblue" for="blue"></label>
        <label id="lgreen" for="green"></label>
    </div>
</div>
```

<!M Exclude>
-->

HTML + CSS3 是被认为图灵完备的，因为它可以实现元胞自动机 [Rule 110](https://en.wikipedia.org/wiki/Rule_110)，这里有一个[实现的例子](http://eli.fox-epste.in/rule110-full.html)。因为无论是 HTML 还是 CSS 都无法自行改变元素的属性，所以每一步计算都需要人为介入，十分繁琐。

而且这已经超出了 CSS 设计初衷的应用范围，前面的只是一些小技巧，后面的几个就是奇技淫巧了。
