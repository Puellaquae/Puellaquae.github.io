# HTTP 缓存策略

## Cache 类型

### Private Cache

由特定客户端进行的缓存，通常是浏览器缓存。通过 `Cache-Control: privte` 设定。如果响应包含 `Authoriztion` 头，则无法被作为私有缓存（如指定 `public` 则可作为共享缓存）

### Shared Cache

存储在客户端与服务器之间的缓存，可以被多个用户共同使用。可细分为代理缓存和托管缓存。

#### Proxy Cache

#### Managed Cache

一般包括反向代理，CDN 的缓存。通常可由 `Cache-Control` 头、服务器配置、服务器控制面板等共同控制缓存行为。而且 Managed Cache 可以无视 HTTP 头的缓存指令。目前部分 CDN 可通过私有头 `Surrogate-Control` 控制缓存行为，[`CDN-Cache-Control`](https://httpwg.org/specs/rfc9213.html) 也已处于标准化阶段。

## 启发式缓存

HTTP 被设计为尽量进行缓存，即使没有给定 `Cache-Control`。如果满足一定条件，响应也会被缓存。称为 Heuristic Caching。例如这个响应头：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024
Date: Tue, 22 Feb 2022 22:22:22 GMT
Last-Modified: Tue, 22 Feb 2021 22:22:22 GMT
```

因为内容已经一年没有更新了，所以客户端会缓存这个响应（即使没有指定 `max-age`），缓存多久依据具体实现，但是标准建议是这段时间的 10%（这个例子中就是 0.1 年）。

启发式缓存在 `Cache-Control` 被广泛支持前就出现了。一般，所有的响应都应该指定 `Cache-Control` 头。

## 缓存时限

根据 age 判断缓存是否有效（fresh）或过期（stale）。age 是从响应被生成开始计算的秒数。例如：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024
Date: Tue, 22 Feb 2022 22:22:22 GMT
Cache-Control: max-age=604800
```

就是一个有效期为一周的响应。如果这个响应被做为共享缓存，缓存方有必要告知客户端缓存已经存在了多少时间。

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024
Date: Tue, 22 Feb 2022 22:22:22 GMT
Cache-Control: max-age=604800
Age: 86400
```

那么，客户端上的缓存在 604800 - 86400 秒（即 518400 秒）后到期。

## Expires 与 max-age

在 HTTP/1.0，使用 `Expires` 头和一个绝对时间来指定到期时间。

```http
Expires: Tue, 28 Feb 2022 22:22:22 GMT
```

但是，如果客户端与服务器时间不一致就会导致错误缓存。所以，在 HTTP/1.1 的 `Cache-Control` 中引入了 `max-age`。如果 `Expires` 和 `max-age` 同时存在，优先采用 `max-age`。

## Vary

同一个响应可能会根据头的不同有不同的内容。此时可以用 `Vary` 头指定需要分开处理的头。例如：`Accept-Language: en` 和 `Accept-Language: ja` 的响应内容是不同的，为了让客户端可以分开缓存两者，可以设定 `Vary: Accept-Language`。

## 协商缓存

过期的响应不会被立刻抛弃。HTTP 有通过询问原始服务器来延长缓存有效期的机制，称为 Validation 或 Revalidation。

协商通常使用包含了 `If-Modified-Since` 或 `If-None-Match` 头的条件请求来完成。

### If-Modified-Since

例如：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024
Date: Tue, 22 Feb 2022 22:22:22 GMT
Last-Modified: Tue, 22 Feb 2022 22:00:00 GMT
Cache-Control: max-age=3600
```

可知其有效期到 23:22。过了这个时间缓存就失效了，客户端就可以发送一个包含 `If-Modified-Since` 的头询问自某个时间点起内容是否有变化。

```http
GET /index.html HTTP/1.1
Host: example.com
Accept: text/html
If-Modified-Since: Tue, 22 Feb 2022 22:00:00 GMT
```

如果服务器返回 `304 Not Modified`，那么内容变化。

```http
HTTP/1.1 304 Not Modified
Content-Type: text/html
Date: Tue, 22 Feb 2022 22:23:22 GMT
Last-Modified: Tue, 22 Feb 2022 22:00:00 GMT
Cache-Control: max-age=3600
```

缓存可以重复使用，并且又得到了一个小时的时限。虽然服务器可以使用系统提供的文件修改时间来实现这个功能，但是要解析时间通常都会很复杂。所以标准化了 `ETag` 响应头做为另一个选择。

### ETag/If-None-Match

`ETag` 响应头可以是服务器生成的任意值，但是通常是内容的 Hash 值或一个版本号。

例如这个响应：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1024
Date: Tue, 22 Feb 2022 22:22:22 GMT
ETag: "deadbeef"
Cache-Control: max-age=3600
```

当函数到期后，客户端可以发送

```http
GET /index.html HTTP/1.1
Host: example.com
Accept: text/html
If-None-Match: "deadbeef"
```

来询问内容是否有变化。

在协商缓存过程中，如果 `ETag` 和 `Last-Modified` 同时存在，优先采取 `ETag`。虽然，对于缓存而言 `Last-Modified` 是不必要的，但是 `Last-Modified` 也有其他用途，例如用于内容管理系统（content-management system）来显示最后修改时间，被爬虫用于调节抓取频率等。所以最好同时提供 `ETag` 和 `Last-Modified`。

### 强制协商

`Cache-Control: no-cache` 配合 `Last-Modified` 和 `ETag` 可以强制要求客户端每次都进行询问。作用与 `Cache-Control: max-age=0, must-revalidate` 相同。

## 阻止缓存

`no-cache` 不会阻止客户端存储响应。如果需要阻止存储需要使用 `no-store`。

然而，通常来说，`no-store` 一般应用于以下几种情况：

- 出于隐私原因，不希望响应被存储
- 想要提供时刻实时的信息
- 不知道在过时的实现上会发生什么

即使是上述情况，`no-store` 也不是最合适的指令。

### 防止信息泄露

在这种情况下，使用 `private` 可以让响应只被特定的客户端存储。而且，即使设置了 `no-store`，也应该同时设设置 `private`。

### 提供实时内容

虽然 `no-store` 阻止存储响应，但是不会删除已存储的响应。换言之，如果先前有存储旧的响应，那么即使发送了 `no-store` 也不能阻止复用旧的响应。然而，`no-cache` 可强制客户端发送协商请求。如果服务器不支持条件请求，也可以得到 `200 OK` 的最新的响应。

### 兼容过时的实现

过时的实现会忽视 `no-store`，你有时可能会看到很长的一串头：

```http
Cache-Control: no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate
```

但[建议](https://docs.microsoft.com/en-us/troubleshoot/developer/browsers/connectivity-navigation/how-to-prevent-caching)使用 `no-cache` 来处理过时的实现。如果需要，也可以加上 `private`。

## 重新加载

对于浏览器可以发送 `max-age=0` 请求来重新加载（reload）：

```http
GET / HTTP/1.1
Host: example.com
Cache-Control: max-age=0
If-None-Match: "deadbeef"
If-Modified-Since: Tue, 22 Feb 2022 20:20:20 GMT
```

对于浏览器可以发送 `no-cache` 请求来强制重新加载（force reload）：

```http
GET / HTTP/1.1
Host: example.com
Pragma: no-cache
Cache-Control: no-cache
```

### 避免协商

通过设置 `immutable` 表示内容是不会变化的来阻止重新加载时的重新协商（revalidation）。

## 删除缓存

基本上没有办法删除已经存在的缓存。标准中提到，向同一个 URL 发送 `POST` 可以删除缓存。此外标准还提供了 `Clear-Site-Data: cache`，但是不是所有的浏览器都支持，而且这个只对浏览器有效，对于其他中间件无效。所以，除非用户手动重新加载或清理，服务器基本没发控制。

## 请求打包

如果多个相同的请求到达中间件，中间件可以将请求打包为一个，并以其名义向服务器发送。请求打包发生在多个请求同时到达的情况下，即使设置了 `max-age=0` 或 `no-cache`，请求打包也会发生，除非设置了 `private`。

## 常见的实践

### 默认不缓存

使用 `no-cache`，按需配合 `private`。

### Cache Busting

不变的内容最适合缓存，可以在改变内容的同时改变 URL 避免资源更新不同步。例如：

```text
# version in filename
bundle.v123.js

# version in query
bundle.js?v=123

# hash in filename
bundle.YsAIAAAA-QG4G6kCMAMBAAAAAAAoK.js

# hash in query
bundle.js?v=YsAIAAAA-QG4G6kCMAMBAAAAAAAoK
```

如果设置了 `public`，即使有 `Authorization` 头也会存储响应。

### 协商缓存

同时设置 `Last-Modified` 和 `ETag`。设置 `immutable` 可以避免重新加载时的协商。

### 主要资源

对于不适合使用 Cache Busting 的，可以通过 `private` 和 cookies 组合拳。

## 参考

- [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)