# Maritime Tracking

Real-time vessel tracking across the South China Sea — from Singapore and the
Malacca Strait, through Hong Kong and the Taiwan Strait, up to Shanghai.

Ships broadcast their position continuously over AIS radio. This platform
ingests that live feed, maintains the current state of every vessel in the
region, builds an hourly movement history, and serves both to a map you can
watch in real time or replay over any past day.

```mermaid
flowchart LR
    SG["Singapore<br/>Malacca Strait"] --- HK["Hong Kong<br/>Pearl River Delta"]
    HK --- TW["Taiwan Strait"]
    TW --- SH["Shanghai"]

    classDef port fill:#0b3d5c,stroke:#2a7fa8,color:#ffffff
    class SG,HK,TW,SH port
```

<sub>Bounding box · 0°–32°N, 99°–127°E</sub>

## What it does

**Live** — every vessel in the region on a map, moving as it moves. Click one
for its speed, course, heading and navigational status.

**History** — each vessel's track, sampled hourly, drawn over the map.

**Replay** — pick a vessel and a date, press play, and watch it retrace the
day's journey.

**State** — vessels are more than coordinates. Positions over time resolve into
behaviour, rendered as a timeline.

```mermaid
stateDiagram-v2
    UNDER_WAY --> SLOWING: speed falling
    SLOWING --> ANCHORED: speed near zero
    ANCHORED --> UNDER_WAY: movement resumes
    SLOWING --> UNDER_WAY: speed recovers
    ANCHORED --> IN_PORT: within port geofence
    IN_PORT --> UNDER_WAY: departure
```

## Architecture

```mermaid
flowchart TD
    AIS["AISStream"] -->|persistent WebSocket| COL["Collector · EC2"]
    COL -->|"PutRecord · key = MMSI"| KIN["Kinesis Data Stream"]

    KIN --> L1["Processor Lambda"]
    KIN --> ARC["Archiver Lambda"]

    ARC --> S3[("S3 · every raw event")]
    L1 --> VS[("VesselState · latest per vessel")]
    L1 --> VH[("VesselHistory · hourly track")]

    VS -->|DynamoDB Streams| L2["Broadcast Lambda<br/>batch 1s · latest per MMSI"]
    L2 --> WS["WebSocket server"]
    WS --> BR["Browsers"]

    BR -.->|history · replay| API["API Gateway REST"]
    API --> QL["Query Lambda"]
    QL --> VH
    QL --> VS

    classDef store fill:#0b3d5c,stroke:#2a7fa8,color:#ffffff
    classDef compute fill:#1f4d2e,stroke:#3d8c57,color:#ffffff
    classDef edge fill:#4a2d5c,stroke:#8a5fa8,color:#ffffff
    class S3,VS,VH store
    class COL,L1,L2,ARC,QL,WS compute
    class AIS,BR,KIN,API edge
```

### The pieces

**Collector** — holds a persistent WebSocket to AISStream, translates each
message into the platform's own event shape, and forwards it to Kinesis. It
runs on EC2 rather than Lambda because the connection is long-lived: a process
that must stay connected needs a host that stays running. Reconnects with
exponential backoff and jitter.

**Kinesis** — the streaming backbone, and the seam that decouples ingestion from
everything downstream. Partitioned by MMSI, the vessel's unique identifier, so
each ship's messages stay ordered relative to one another.

**Processor Lambda** — consumes the stream, derives movement from consecutive
positions, and writes current state and hourly history.

**Archiver Lambda** — writes every raw event to S3 under
`raw/YYYY/MM/DD/hour=HH/`. Cheap, complete, and never read by the application.

**DynamoDB** — two shapes for two access patterns. `VesselState` keyed by MMSI
holds the latest position of every vessel and powers the live map.
`VesselHistory`, keyed by MMSI and timestamp, holds hourly snapshots and powers
replay.

**Broadcast Lambda** — watches `VesselState` via DynamoDB Streams, collapses
each batch to the latest state per vessel, and pushes one update per second to
the WebSocket server. Ships report far more often than a map needs to redraw.

**API Gateway** — REST endpoints for historical queries: vessel lists, detail,
tracks, and replay data.

### Storage tiers

Three tiers, each with one job:

| | Holds | Serves |
|---|---|---|
| **S3** | Every raw message, forever | Nothing — archive and rebuild source |
| **VesselHistory** | One position per vessel per hour | Replay and route drawing |
| **VesselState** | Latest position per vessel | The live map |

The rule throughout: **ingest everything, archive everything, process what's
needed, broadcast only what the UI needs.**

## Stack

| | |
|---|---|
| Ingestion | Node.js · TypeScript · WebSocket |
| Streaming | Amazon Kinesis Data Streams |
| Processing | AWS Lambda |
| Storage | DynamoDB · S3 |
| API | API Gateway · WebSocket |
| Frontend | Next.js · TypeScript · MapLibre GL |
| Infrastructure | Terraform |
| Local environment | LocalStack |

## Getting started

Requires Docker, Node.js and Terraform, plus a free API key from
[aisstream.io](https://aisstream.io).

```bash
cp .env.example .env              # add your AISStream key
cp terraform/.env.example terraform/.env

cd terraform && docker compose up -d
curl http://localhost:4566/_localstack/health

cd ../collector && npm install && npm run dev
```

Vessel positions begin printing immediately.

## Repository layout

```
collector/            AIS ingestion service
terraform/            Infrastructure, layered per environment
  environments/       Deployments — network · data · application
  modules/            Reusable infrastructure
```

Infrastructure is split into three layers per environment — `network`, `data`
and `application` — applied independently so a change to the application cannot
disturb the data that outlives it.
