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