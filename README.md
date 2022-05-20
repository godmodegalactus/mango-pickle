A module on top of mango which implements options.

```
clone mango-v3 (https://github.com/blockworks-foundation/mango-v3) in parent directory

I had some issues adding mango into the submodules, it give me error on serum version which i am unable to solve.
```

Build:
install anchor-0.24.2

compile mango : cd ../mango-v3 && cargo build-bpf && cd ../mango-pickle
compile mango-pickle : anchor build
Luanch test : anchor test 

Initialize Test Validator : 
solana-test-validator --bpf-program 5vQp48Wx55Ft1PUAx8qWbsioNaLeXWVkyCq2XpQSv34M mango-pickle/deps/mango.so --bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin mango-pickle/deps/serum_dex.so --bpf-program 37kmCqYKw41NJxMFVDT5HanZGhwKBQTQJD5hfiYBML7Z mango-pickle/deps/writer_utils.so