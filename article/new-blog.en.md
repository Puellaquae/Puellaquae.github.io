# New Generation of Blog

While content is more important than form for a blog, I still spend a lot of time in making a better form.

## Handicrafts Stage

At the beginning, because my extraordinary idea, I did not choose the common way like static site generator. I had chosen the hand-writing HTML. Pure HTML and CSS. No non-essential JS has become an unwritten rule (however, it has been written down). It need not spend much time to write the HTML, because most context is plain text. And, I have the 100% control over how web page being.

## Proto-Industrialization

I had intended automating my blog build system after Spring Festival 2021 but had been shelved until Fall 2021. I chose the markdown which to generate the web page. And the second rule has been ensuring that the rendering of markdown source text on GitHub is readable to a certain extent. Simple using the markdown compiler does not meet my needs, because of some interactive content in the earlier blog post. So, I used a bug (or feature) of markdown, that `[foo]: #(bar)` will not be rendered, and python to preprocess the source. Also, I write metadata into comments to avoid being displayed. Then, I planned to add Tex rendering function to my system and use Katex for offline rendering. However, I have on way to call JS on python in a very elegant way. Besides, adding new functions and maintaining is not very friendly for current simple preprocessing scripts. So, the plan to standardize my markdown customization and rewrite using JS was put on the agenda.

## Industrial Revolution and Renaissance
