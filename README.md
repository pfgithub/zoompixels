todo: pan and zoom with mouse controls & scroll wheel
- that means consistent random so given a coordinate ([x, y, level]) we can calculate its color (but the deeper the zoom the more steps to calculate the color because it needs to know the parent color to calculate)

need to be able to refocus eyes (bright spots get brighter, so we should be able to refocus to the current scene)

```
bun a.html
bun build a.html --outdir dist
```