# 安卓开发记录

## Edge To Edge 关于 System Bar 和输入法遮挡的处理

对于 System Bar 的处理 Google 关于 Edge To Edge 的介绍中就已经提及，需要通过 `OnApplyWindowInsetsListener` 来处理。但是关于输入法遮挡的解决方案，网上大部分还是较早的 `android:windowSoftInputMode="adjustResize"` 方法。但是可能是因为 Google 已经将其弃用了（只在 `WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE` 那里写着），导致无法与 `CoordinatorLayout` 正常配合使用。Google 给出的替代方案也是使用 `OnApplyWindowInsetsListener` 来处理。但是有几点，我遇到的，需要注意的地方。标注有 `android:fitsSystemWindows="true"` 的视图也需要处理 `Inset`，所以如果不能直接在 `Activity` 那里就 `CONSUMED` 掉，否则有些子视图的显示就会出现异常。另外就是 `FloatingActionButton`，如果父层视图没有把 System Bar 的高度空出来，按键就会显示在 System Bar 的后面了。所以在这种情况下需要对按钮额外处理。另外如果视图原来自身就有间距值，需要把它也计算上。另外在输入框弹出的时候就不需要再空出 System Bar 的空间了。

## MediaCodec 解码 AAC 流遇到的一些问题

在 [Music For You](https://github.com/Puellaquae/MusicForYou) 项目中，我设计了一个录制手机音频，通过蓝牙传输到其他设备播放的功能。在此之中，我是用了 AAC-LC 作为传输用的编码格式。编码的时候并没有出现什么问题，但是在播放时却出现了很多问题。首先是 `0x80001001` 这个问题。而且因为这部分是原生库，它只能报一个错误代码，错误代码我也找不到什么解释。如果使用 `KEY_IS_ADTS` 配合 ADTS AAC 流则出现 `0x8000100b` 的问题。我搜了搜感觉是输入格式错误的问题。我再阅读 Google 的 MediaCodec 的文档，里面提到对于 AAC 等格式的数据需要首先出入一份格式参数的数据，或者是在 MediaFormat 的 `csd-0`，`csd-1` 等参数中设置。我设置了 `csd-0` 参数。配合裸 AAC 数据可以播放，但是会有卡顿的异常播放现象。此时我把输入的数据包上 ADTS 头播放也会此问题。如果配合 ADTS 数据，不会报错，但没有输出。因为直接将数据写入文件在播放是没有问题的，我又观察了 MediaCodec 配合 MediaExtractor 使用的代码，又搜了搜 StackOverflow，最后认定是：MediaCodec 每次输入需要需要恰好是 MediaCodec 编码是一次输出的内容，而蓝牙会将帧合并或截断，需要将接收到的数据拆分成完整的 ADTS 帧，再输入 MediaCodec。但是在拆分的时候又遇到一个问题，因为 java 和 kotlin 上的 Byte 是有符号的，转成 Int 使用位操作计算包大小的会出现错误。但是我一直没有发现，导致始终拆分不成功。而且还有一个奇怪的问题，拆分后需要将 ADTS 头去掉，同时不设 `KEY_IS_ADTS` 才可以正常播放，不知道是什么原因，可能是已经设了 `csd-0` 的原因吧。