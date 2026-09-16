# terraform-localstack

Terraform infrastructure targeting [LocalStack](https://localstack.cloud/) — a local
AWS emulator — so environments can be built and torn down without touching a real
cloud account.

> **Status:** scaffold. The directory layout below is the target structure; most
> `.tf` files are currently empty placeholders.

## Getting started

### 1. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable | Purpose |
|---|---|
| `LOCALSTACK_AUTH_TOKEN` | Auth token for LocalStack Pro features. Leave blank for the free tier. |
| `DEBUG` | `1` for verbose LocalStack logs, `0` otherwise. |
| `PERSISTENCE` | `1` to persist state across restarts in `localstack/data`, `0` for a clean slate each run. |

`.env` is gitignored and must stay that way — it holds credentials.

### 2. Start LocalStack

```bash
docker compose up -d
```

### 3. Verify it is running

```bash
curl http://localhost:4566/_localstack/health
```

A JSON response listing service statuses means LocalStack is up. All AWS API calls
go through port `4566`.

### 4. Apply an environment layer

```bash
cd environments/dev/application
terraform init
terraform plan
terraform apply
```

Each layer is applied independently, from its own directory.

## Repository layout

```
terraform-localstack/
├── docker-compose.yml       # LocalStack container definition
├── localstack/data/         # Persisted LocalStack state (gitignored)
│
├── modules/                 # Reusable Terraform code
│   ├── network/
│   ├── data/
│   └── application/
│
└── environments/            # Actual deployments, per environment
    ├── dev/
    │   ├── network/
    │   ├── data/
    │   └── application/
    └── production/
        ├── network/
        ├── data/
        └── application/
```

The key distinction:

- **`modules/`** — reusable code, deploys nothing on its own.
- **`environments/<env>/`** — real deployments that call those modules with
  environment-specific values.

## The three layers

Each environment is split into three layers, applied roughly in this order.
Separating them keeps blast radius small: a change to the application layer cannot
accidentally destroy a database.

### `network/`

Infrastructure controlling how things communicate — VPCs/VNets, subnets, security
groups, private endpoints, load balancers.

### `data/`

Infrastructure that stores state — PostgreSQL, Redis, storage accounts, blob
containers, secret stores.

### `application/`

Infrastructure that runs the application — VMs and scale sets, function apps, API
gateways, application gateways.

## Terraform file conventions

Each module and environment directory follows the same four-file pattern:

| File | Purpose |
|---|---|
| `main.tf` | What to create |
| `variables.tf` | What inputs are accepted |
| `terraform.tfvars` | Actual values for those inputs |
| `outputs.tf` | What results to surface after applying |

## License

[MIT](LICENSE)
