# Face-recognition model weights

The Face Recognition page loads pretrained model weights from this folder
(`/public/models`) in the browser. These files are **required** — without them
the page will show "Could not load the face model".

## How to get them (easiest)

The `@vladmandic/face-api` npm package already ships the weights. After you run
`npm install`, copy them here:

```powershell
# from the project root
Copy-Item "node_modules/@vladmandic/face-api/model/*" "public/models/" -Force
```

## Files you need (3 models)

At minimum, these must end up in `public/models/`:

```
tiny_face_detector_model-weights_manifest.json
tiny_face_detector_model.bin
face_landmark_68_model-weights_manifest.json
face_landmark_68_model.bin
face_recognition_model-weights_manifest.json
face_recognition_model.bin      (may be shard1/shard2 — copy all)
```

Copying the whole `model/` folder contents (the command above) covers all of
them plus extras, which is fine.

## Alternative source

If for any reason the package doesn't include them, download the same files from:
https://github.com/vladmandic/face-api/tree/master/model

## Note

These `.bin` weight files are binary and can be large, so they are typically
**git-ignored**. Each person who runs the project copies them locally with the
command above. (If you prefer, you can commit them so teammates don't have to.)
