# 播放杜比视界视频

下了一个杜比视界的电影，折腾了半天，终于正确点亮了，不像 HDR10 一样有手就行，在桌面设备上播放杜比视界的视频还真是不容易。折腾来折腾去发现其实都是编码格式问题。我在安卓、Mac 和 PC 上都折腾了下，分成三个不同的情况。

首先先来看下载下来的原始文件格式：

```txt
Format                 : Matroska
Format version         : Version 4
File size              : 18.1 GiB
Duration               : 2 h 17 min
Overall bit rate       : 18.9 Mb/s
Frame rate             : 24.000 FPS
Writing application    : mkvmerge v65.0.0 ('Too Much') 64-bit
Writing library        : libebml v1.4.2 + libmatroska v1.6.3
Muxer                  : Rainbow Island

Video
ID                     : 1
Format                 : HEVC
Format/Info            : High Efficiency Video Coding
Format profile         : Main 10@L5@Main
HDR format             : Dolby Vision, Version 1.0, Profile 5, dvhe.05.06, BL+RPU, no metadata compression
Codec ID               : V_MPEGH/ISO/HEVC
Duration               : 2 h 17 min
Bit rate               : 18.1 Mb/s
Width                  : 3 840 pixels
Height                 : 2 160 pixels
Display aspect ratio   : 16:9
Frame rate mode        : Constant
Frame rate             : 24.000 FPS
Color space            : YUV
Chroma subsampling     : 4:2:0
Bit depth              : 10 bits
Bits/(Pixel*Frame)     : 0.091
Stream size            : 17.4 GiB (96%)
Language               : Japanese
Default                : Yes
Forced                 : No
Color range            : Full
```

## 安卓手机

这个是显示设备具有杜比视界支持的（这里是 Redmi Note 12 Turbo），而且系统没有限制程序播放。这个唯一的问题就是 mkv 容器格式很多系统第一方的播放器都不支持，他就不会按照杜比视界去放，导致画面就是偏色的，网飞标播出来是紫的。但是使用 kodi 就可以直接正常播放了。

用 ffmpeg 可以把视频容器容器从 mkv 改成 mp4。不过按网上严谨说法，工作流程应该先提取原始视频流和音频流等再使用 [MP4Box](https://github.com/gpac/gpac/wiki/mp4box) 打包。

```
ffmpeg -i video.mkv -c:v copy -c:a copy -c:s mov_text -strict unofficial video.mp4
```

转换容器格式后的格式信息如下：

```txt
Format                 : MPEG-4
Format profile         : Base Media
Codec ID               : isom (isom/dby1/iso2/mp41)
Writing application    : Lavf62.0.102

Format                 : HEVC
Format/Info            : High Efficiency Video Coding
Format profile         : Main 10@L5@Main
HDR format             : Dolby Vision, Version 1.0, Profile 5, dvhe.05.06, BL+RPU, no metadata compression
Codec ID               : hev1
Codec ID/Info          : High Efficiency Video Coding
```

到这一步，已经可以被系统播放器正确识别播放了，系统相册里还会显示杜比视界的标识。

## Windows

这个情况是显示设备没有杜比视界支持。在 Windows 上同样将容器格式改成 mp4 后可以正常识别播放了，但是只有系统自带播放器可以，而且 Windows 系统播放器还会主动将画面映射到 SDR 或者是 HDR10 上，这样我的显示器即使没有杜比视界支持，但是还是可以有 HDR 播放效果。其他播放器都没有办法正常播放，我推测它们可能直接输出了杜比视界的视频流，不过我也没有支持杜比视界的显示器可以实验。

## Mac

最后是 Mac，显示设备支持杜比视界，但是系统限制只有 QuickTime Player 可以播放杜比视界。同样 QuickTime Player 也只能放 mp4，而且 mac 上还有一个限制，目前转换出来的视频 Codec ID 是 hev1，但是 apple 它只接受 dvh1。需要在 ffmpeg 转换时指定 dvh1 才可以在 Mac 设备上播放：

```
ffmpeg -i video.mkv -c:v copy -c:a copy -c:s mov_text -tag:v dvh1 -strict unofficial video.mp4
```

[杜比视界文档](https://tutorials.hybrik.com/dolby_vision/#the-vtag-parameter)对这几个的描述：

> **The `vtag` parameter**
> 
> `vtag` is how you specify to the muxer how to store the parameters for the stream. These are equavalent to `hvc1` and `hev1` for non-Dolby Vision hevc targets. The `dvh1` vtag tag muxes the metadata into the sample descriptor boxes in an mp4. Conversely, the `dvhe` vtag keeps this metadata in-band within the hevc stream.
> 
> Which one you need will depend on your playback scenario, `dvh1` [is recommended by Apple](https://developer.apple.com/documentation/http_live_streaming/hls_authoring_specification_for_apple_devices/hls_authoring_specification_for_apple_devices_appendixes#3151794) for HLS and is required for playback on apple devices.
> 
> By default, this codec tag is set to `dvhe`. The accepted values are
> 
> - `dvh1` (for Dolby Vision, Apple / HLS compatible)
> - `dvhe` (for Dolby Vision)
> - `hvc1` (for non-Dolby Vision HEVC)
> - `hev1` (for non-Dolby Vision HEVC)

