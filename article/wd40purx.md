<!---
useIndent = true
--->

# 西数 WD40PURX 体验

作为一名仓鼠党、宽带综合征患者，近日我又斥巨资 400 元购买了海康威视贴牌的西数 WD40PURX 4TB 硬盘。虽说是巨资，但 1 毛钱每 GB 的价格其实是相当便宜了。我大一时购买的三星贴牌的希捷 ST2000LM003 2TB 硬盘都需要 450 元。一来 2.5 寸硬盘本身就要比 3.5 寸的贵出不少，二来 3TB 4TB 一般是不同容量中单位价格最低的。原本我是选择购买西数 WD40EJRX 的，即非贴牌的那个型号。但是那个要贵出 100，而且现在只有它的升级款 WD42EJRX 可以购买了。不过近年来机械硬盘市场在不断衰退，可能之后就没有这么便宜的机械硬盘了。

那么现在算上机带的 PLEXTOR PX-128RM 128GB SSD 和 HGST HTS721010A9E630 1TB HDD，大一时购买的 SAMSUNG MZMTE128HMGR-000MV (PM851) 128GB SSD 和 ST2000LM003 HN-M201RAD 2TB HDD，在算上现在的这个 WDC WD40PURX-78AKYY0 4TB HDD。我现在存储设备容量一共是 256GB 的固态和 7TB 的机械。

这个硬盘的主要用途还是存放我下载的番剧资源，因为是 3.5 的硬盘，我没法塞进笔记本机身里，所以是最冷一级的存储设备了。其次是 2TB 的那个设备，再其次是 1TB 的那个设备，最热一级就是那两块 SSD。

目前我使用的是一条 SATA 转 USB3 的线来连接硬盘，毕竟我现在使用的是笔记本。在迁移了约 500GB 的数据后，我对硬盘测了个速。因为用的是转接线，结果可能不是硬盘的真实水平。

```text
------------------------------------------------------------------------------
CrystalDiskMark 8.0.4 Shizuku Edition x64 (C) 2007-2021 hiyohiyo
                                  Crystal Dew World: https://crystalmark.info/
------------------------------------------------------------------------------
* MB/s = 1,000,000 bytes/s [SATA/600 = 600,000,000 bytes/s]
* KB = 1000 bytes, KiB = 1024 bytes

[Read]
  SEQ    1MiB (Q=  8, T= 1):   194.805 MB/s [    185.8 IOPS] < 42830.02 us>
  SEQ    1MiB (Q=  1, T= 1):   194.911 MB/s [    185.9 IOPS] <  5373.06 us>
  RND    4KiB (Q= 32, T= 1):     0.640 MB/s [    156.2 IOPS] <199524.93 us>
  RND    4KiB (Q=  1, T= 1):     0.561 MB/s [    137.0 IOPS] <  7284.09 us>

[Write]
  SEQ    1MiB (Q=  8, T= 1):   188.484 MB/s [    179.8 IOPS] < 44115.04 us>
  SEQ    1MiB (Q=  1, T= 1):   184.839 MB/s [    176.3 IOPS] <  5663.37 us>
  RND    4KiB (Q= 32, T= 1):     2.831 MB/s [    691.2 IOPS] < 45796.02 us>
  RND    4KiB (Q=  1, T= 1):     2.452 MB/s [    598.6 IOPS] <  1664.09 us>

Profile: Default
   Test: 1 GiB (x5) [P: 14% (539/3726GiB)]
   Mode: [Admin]
   Time: Measure 5 sec / Interval 5 sec 
   Date: 2022/07/24 14:51:14
     OS: Windows 10 Professional [10.0 Build 19044] (x64)
```
