# New Generation of Blog

While content is more important than form for a blog, I still spend a lot of time in making a better form.

## Handicrafts Stage

At the beginning, because my extraordinary idea, I didn't choose the common way like static site generator. I had chosen the hand-writing HTML. Pure HTML and CSS. No non-essential JS has become a unwritten rule (however it's been written). It needn't spend much time to write the HTML, because most context is just plain text. And, I have the 100% control over how web page representing.

## Proto-Industrialization

Actually, I had intended automating my blog build system after Spring Festival 2021, but had been shelved until Fall 2021. I chose the markdown which to generate the web page. And the second rule has been ensuring that the rendering of markdown source text on Github is readable to a certain extent. Simplely using markdown compiler does't meet my needs, because of some interactive content in the previous blog post. So I used a bug (or feature) of markdown, that `[foo]: #(bar)` won't be rendered, and python to preprocess the source. Also I write metadata into comments to avoid being displayed. Then, I planed to add tex rendering function to my system and use katex for offline rendering. However, I found that I hava on way to call js on python in a very ekegant way. Besides, adding new functions and maintaining is not very friendly for current simple preprocessing scripts. So the plan to standardize my markdown customization and rewrite using js was put on the agenda.

## Industrial Revolution and Renaissance
