# College Campus 3D Model

Made a full 3D model of my college campus in Blender using **Claude Opus 5.5**.

Basically fed it Google Maps satellite imagery + street view photos and had it build out the entire layout procedurally with Python. Placed the academic blocks, roads, trees, and buses surprisingly accurately.

![Campus 3D Preview](preview.gif)

## Prompt

```text
this is the picture of our campus and i want you to make 3d model of this campus in blender i want you to serch on google map and see "all" street view in this campus and try to reacreat this and try to make acurate 3d modeling
```

---

## How It Was Made

The campus was procedurally built in Blender 5.2 with Claude Opus 5.5 by combining:
- **Satellite View**: High-resolution satellite imagery used to trace building footprints, road networks, bus parking yards, and tree placements.
- **Street View & Ground Photos**: 360° photo spheres and ground photos used to accurately model building facades, entrance gates, courtyards, and architectural angles.

---

## Contents

- **`campus_model.blend`**: Complete Blender 3D model with packed textures, academic blocks, hostel towers, roads, vegetation, and buses.
- **`Screen Recording 2026-10-01 at 14.00.43.mp4`**: Full 2.5K screen recording walkthrough of the 3D scene in Blender.
- **`preview.gif`**: Animated camera fly-in preview showing the top-down to 3D perspective transition.