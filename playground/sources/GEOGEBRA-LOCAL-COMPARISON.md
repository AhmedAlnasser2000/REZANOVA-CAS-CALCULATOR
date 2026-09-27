# GeoGebra local graphing comparison

The registered GeoGebra mirror is approved for bounded executable research, not Calcwiz product integration. Its ignored local cache contains a checksummed Temurin 21 JDK, Gradle 9.4.1, downloaded Gradle dependencies, and Gradle's Java 17 build toolchain. The web app was loaded in local Chrome on 2026-09-25; this is setup verification, not a performance or mathematical-correctness benchmark.

From the Calcwiz repository root, launch the Graphing Calculator with:

```bash
cd playground/sources/mirrors/geogebra/source/web
JAVA_HOME="$PWD/../../.research-cache/jdk" \
GRADLE_USER_HOME="$PWD/../../.research-cache/gradle-home" \
../../.research-cache/gradle-9.4.1/bin/gradle --max-workers=2 :web:run -Pgbind=127.0.0.1
```

Open `http://127.0.0.1:8888/graphing.html`. The code server uses `127.0.0.1:9876`. Stop the Gradle command after the comparison; its web task starts a Sass watcher as a child process, so check that both loopback ports and the watcher close. The repository root's README command does not resolve `:web:run` from the composite build; run it from `source/web` as above.

Keep comparison workloads, viewport size, device-pixel ratio, warmup, and capture method identical across GeoGebra, Equation.io, and Calcwiz. Record both responsiveness and visible mathematical correctness; a fast but incorrect or incomplete graph is not a win. Do not copy GeoGebra source or assets into Calcwiz.
