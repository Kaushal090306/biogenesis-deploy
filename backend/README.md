---
title: BioGenesis Backend
colorFrom: teal
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# BioGenesis Backend

FastAPI backend for BioGenesis.

Deployment notes:
- This Space runs with Docker.
- Set all app secrets in the Space Settings -> Variables and secrets.
- Models are downloaded from the private model repo defined by `HF_GEN_MODEL_REPO`.
