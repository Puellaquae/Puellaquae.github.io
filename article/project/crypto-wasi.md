# Crypto-wasi 开发记录（WIP）

因为春节假期以及准备毕设的缘故，这个项目已经搁置了有两个多月没有继续开发，考虑到之后毕设等事宜还需要花费一段时间，为了防止我忘记项目的内容，特此记录一下。

这个项目以 wasi-crypto proposal 的文档和 WasmEdge 对 wasi-crypto 的实现为参考依据。

## hash

hash 函数 WasmEdge 实现了 SHA-256、SHA-512 和 SHA-256/512 三种。wasi-crypto 的 api 调用（下文简称 wasi 调用）顺序为：

```rust
let handle = symmetric_state_open(alg, NONE_KEY, NONE_OPTS);
symmetric_state_absorb(handle, data.as_ptr(), data.len());
symmetric_state_squeeze(handle, buf.as_mut_ptr(), buf.len());
symmetric_state_close(handle);
```

## hmac

hmac 与 hash 类似，但 hmac 的结果从 `squeeze_tag` 函数中取得。wasi 调用顺序为：

```rust
let key = symmetric_key_import(alg, key.as_ptr(), key.len());
let opt = OptSymmetricKey {
    tag: OPT_SYMMETRIC_KEY_U_SOME,
    u: OptSymmetricKeyUnion { some: key },
};
let handle = symmetric_state_open(alg, opt, NONE_OPTS);
symmetric_key_close(key);
symmetric_state_absorb(handle, data.as_ptr(), data.len());
symmetric_state_squeeze_tag(handle);
let len = symmetric_tag_len(tag);
let mut out = vec![0; len];
symmetric_tag_pull(tag, out.as_mut_ptr(), out.len());
symmetric_tag_close(tag)
symmetric_state_close(handle);
```

## hkdf

hkdf 的调用方法和 hash 基本一致，但是分为 extract 和 expand 两个步骤。extract 阶段计算出一个新 key，expand 阶段通过进行多计算生成任意长度的结果。wasi 调用顺序为：

```rust
// extract 阶段
let extract_key = symmetric_key_import(extract_alg, key.as_ptr(), key.len());
let extract_handle = symmetric_state_open(
    extract_alg,
    OptSymmetricKey {
        tag: OPT_SYMMETRIC_KEY_U_SOME.raw(),
        u: OptSymmetricKeyUnion { some: extract_key },
    },
    NONE_OPTS,
);
symmetric_state_absorb(extract_handle, salt.as_ptr(), salt.len());
let expand_key = symmetric_state_squeeze_key(extract_handle, expand_alg);
symmetric_state_close(extract_handle);
symmetric_key_close(extract_key);
// expand 阶段
let expand_handle = symmetric_state_open(
    expand_alg,
    OptSymmetricKey {
        tag: OPT_SYMMETRIC_KEY_U_SOME.raw(),
        u: OptSymmetricKeyUnion { some: expand_key },
    },
    NONE_OPTS,
);
symmetric_state_absorb(expand_handle, info.as_ptr(), info.len());
symmetric_state_squeeze(expand_handle, out.as_mut_ptr(), out.len());
symmetric_state_close(expand_handle);
symmetric_key_close(expand_key);
```

其中 extract 阶段等价于使用 hmac 将 salt 做为 key 对进行 ikm 计算的新 key。由于 nodejs 要求 ikm 可以为空，而 WasmEdge 对 extrace 部分 openssl 的调用为：

```cpp
auto ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_HKDF, nullptr);
EVP_PKEY_derive_init(ctx);
EVP_PKEY_CTX_set_hkdf_md(ctx, EVP_get_digestbynid(NID_sha256));
EVP_PKEY_CTX_hkdf_mode(ctx, EVP_PKEY_HKDEF_MODE_EXTRACT_ONLY);
// fail if ikm is zero-length 
EVP_PKEY_CTX_set1_hkdf_key(ctx, ikm.data(), ikm.size()); 
EVP_PKEY_CTX_set1_hkdf_salt(ctx, salt.data(), salt.size());
std::vector<uint8_t> out(32);
size_t out_size;
EVP_PKEY_derive(ctx, out.data(), &out_ize);
```

所以对于 ikm 为零长度的情况调用 hmac 代替 extract。
