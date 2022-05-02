# 安卓开发记录

## Edge To Edge 关于 System Bar 和输入法遮挡的处理

对于 System Bar 的处理 Google 关于 Edge To Edge 的介绍中就已经提及，需要通过 `OnApplyWindowInsetsListener` 来处理。但是关于输入法遮挡的解决方案，网上大部分还是较早的 `android:windowSoftInputMode="adjustResize"` 方法。但是可能是因为 Google 已经将其弃用了（只在 `WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE` 那里写着），导致无法与 `CoordinatorLayout` 正常配合使用。Google 给出的替代方案也是使用 `OnApplyWindowInsetsListener` 来处理。但是有几点，我遇到的，需要注意的地方。标注有 `android:fitsSystemWindows="true"` 的视图也需要处理 `Inset`，所以如果不能直接在 `Activity` 那里就 `CONSUMED` 掉，否则有些子视图的显示就会出现异常。另外就是 `FloatingActionButton`，如果父层视图没有把 System Bar 的高度空出来，按键就会显示在 System Bar 的后面了。所以在这种情况下需要对按钮额外处理。另外如果视图原来自身就有间距值，需要把它也计算上。另外在输入框弹出的时候就不需要再空出 System Bar 的空间了。
