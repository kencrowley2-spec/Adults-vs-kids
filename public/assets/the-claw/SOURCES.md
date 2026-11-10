# THE CLAW artwork sources

The claw prongs, Shiba toy, and cabinet structure are adapted from **Claw Machine 3D by Necis**, MIT licensed:
https://github.com/neciszhang/claw3d

Original model files: `clawoutnew.glb`, `dogoutWithOutWebp.glb`, `boxoutnewWithOutWebp.glb` from that repository's `public/models` folder. The MIT copyright and permission notice is retained in `LICENSE-claw3d.txt`.

The teddy bear is the **Innerscene Teddy Bear**, released under CC0:
https://www.innerscene.com/tools/library/3d-parts/teddy-bear-8cc03913
Direct source download: https://www.innerscene.com/api/library/teddy-bear-8cc03913/download
CC0: https://creativecommons.org/publicdomain/zero/1.0/

The cube, basketball, tennis ball, rainbow spring, machine lighting, and upgraded winch are original Blender geometry/material work for ADULTS vs. KIDS.

All WebP files here are offline renders of the licensed 3D assets. Runtime composition animates the individual toys and claw with transparent sprites, depth ordering, shadows, glass reflections, and delivery effects. This preserves the same image quality on devices without WebGL.

Rebuild with `scripts/the-claw/render-assets.py`: set `CLAW_ASSET_SOURCE_DIR` to a directory containing a `sourced-claw3d` clone and `teddy-bear.glb`, and `CLAW_ASSET_OUTPUT_DIR` to an output directory. Run Blender in background mode, passing the jobs after `--`: `cabinet dog bear claw-open claw-closed cube basketball tennis rainbow`. Crop only transparent sprite margins and encode to WebP with alpha; keep the chamber uncropped.
