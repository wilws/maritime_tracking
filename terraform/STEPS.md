# Setup Steps

A running record of how this environment was built. Each step is something that
was actually run, with what it does and what to expect back.

---

## Concepts

**LocalStack** is a Docker container that pretends to be AWS on your laptop.
Real AWS lives at `kinesis.us-east-1.amazonaws.com`; LocalStack lives at
`localhost:4566`. Same API, same commands, same Terraform — different address.
No account, no cost, no internet.

**Terraform and the AWS CLI are independent.** Neither runs the other. Both talk
to the AWS API directly.

```
Terraform ──┐
            ├──► AWS API (LocalStack :4566)
AWS CLI ────┘
```

| Tool | Job |
|---|---|
| Terraform | **Writes** — creates, changes, destroys |
| AWS CLI | **Reads** — lets you verify what exists |

---

## 1. Check Docker is running

```bash
docker info
```

LocalStack is a container, so Docker must be up first. A wall of text means yes;
an error means open Docker Desktop and wait for the whale icon to settle.

## 2. Start LocalStack

```bash
cd terraform
docker compose up -d
```

Reads [docker-compose.yml](docker-compose.yml), pulls the image on first run,
starts it in the background. `-d` = detached, so you get your terminal back.

```
✔ Container localstack  Started
```

## 3. Health check

```bash
curl http://localhost:4566/_localstack/health
```

Asks LocalStack which AWS services it is emulating and whether each is ready.
Returns JSON listing every service. `"connection refused"` means it is still
booting — wait ten seconds and retry.

**"Started" is not the same as "ready".** Always health-check.

## 4. Verify the AWS CLI

```bash
aws --version
```

Installed via `brew install awscli` if missing.

### The one flag that matters

Every command must be pointed at LocalStack:

```bash
aws kinesis list-streams                                      # real AWS
aws kinesis list-streams --endpoint-url http://localhost:4566 # LocalStack
```

Without `--endpoint-url` it talks to real AWS, fails on credentials, and the
error is confusing.

If you get a credentials error, LocalStack ignores the values but the CLI still
demands them:

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
```

## 5. First call — the "before" picture

```bash
aws kinesis list-streams --endpoint-url http://localhost:4566
```

```json
{ "StreamNames": [], "StreamSummaries": [] }
```

An empty list is the **correct** answer — nothing has been created yet. Two
reasons to run it:

1. It proves the CLI works *before* Terraform is involved. Otherwise a later
   failure leaves you unsure which tool is broken.
2. It is the baseline. Run the same command after `terraform apply` and the
   difference proves Terraform did something real.

## 6. Verify Terraform

```bash
terraform --version
```

v1.14 is fine. An "out of date" notice can be ignored unless something needs a
newer feature.

### The three commands

| | |
|---|---|
| `terraform init` | Download providers. Once per directory. |
| `terraform plan` | Show what *would* change. Changes nothing. |
| `terraform apply` | Actually do it. |

`plan` is the safety net. Always look before applying.

## 7. Directory structure

```bash
cd terraform
mkdir -p modules/kinesis environments/dev/data
```

| Path | Role |
|---|---|
| `modules/kinesis/` | A **template**. Declares what a stream needs; creates nothing alone. |
| `environments/dev/data/` | A **deployment**. Supplies the values. `terraform apply` runs here. |

Each directory gets `main.tf`, `variables.tf`, `outputs.tf`. Only environments
get `terraform.tfvars` — a module receives values, it does not define them.

**Never run Terraform inside a module.** It has no provider and no values. The
environment pulls it in via `source = "../../../modules/kinesis"`.

## 8. The provider block

Terraform does **not** read `.env` files. Nothing does automatically. The
collector reads its `.env` only because of an explicit `dotenv.config()` call.

More importantly, **no environment variable can redirect Terraform to
LocalStack**. The `endpoints` block is the only way.

`environments/dev/data/provider.tf`:

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  endpoints {
    kinesis = "http://localhost:4566"
  }
}
```

| | |
|---|---|
| `access_key` / `secret_key` | Fake. LocalStack ignores them; the SDK demands *something*. **Not secrets — commit them.** |
| `skip_*` | Stop Terraform phoning real AWS to validate credentials |
| `endpoints` | **The actual trick.** Redirects API calls to LocalStack |

Real AWS credentials never go in Terraform files. They come from
`~/.aws/credentials`, CI environment variables, or an IAM role.

## 9. Init, validate, plan, apply

Run from the **environment** directory, never a module.

```bash
cd environments/dev/data
terraform init      # downloads providers into .terraform/ — once per directory
terraform validate  # syntax check, touches nothing
terraform plan      # what *would* change — changes nothing
terraform apply     # do it; type the full word "yes"
```

`init` reads **every `.tf` file in the directory** at once. Filenames are
convention for humans, not meaningful to Terraform.

Two files appear after init:

- `.terraform/` — the downloaded provider (~100 MB)
- `.terraform.lock.hcl` — pins the exact version for reproducibility

Read the plan before applying. `(known after apply)` means a value AWS assigns,
such as an ARN.

## 10. Verify with a different tool

```bash
aws kinesis list-streams --endpoint-url http://localhost:4566

aws kinesis describe-stream \
  --stream-name maritime-dev-vessel-events \
  --endpoint-url http://localhost:4566
```

Terraform claiming success is not proof. A second tool confirming it is.

### Gotcha: credentials decide which account you see

**Symptom:** `list-streams` works, `describe-stream` returns
`ResourceNotFoundException ... under account 000000000000`.

**Cause:** LocalStack namespaces resources by account ID, derived from your
credentials. Terraform passes `test`/`test` explicitly, landing in account
`000000000000`. The bare CLI uses `~/.aws/credentials` — a *different* account,
where nothing exists. The error names `000000000000` regardless, which makes it
look like the right place.

**Permanent fix — an alias in `~/.zshrc`** that carries both the credentials and
the endpoint, so neither can be forgotten:

```bash
alias awsl='AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 aws --endpoint-url http://localhost:4566'
```

```bash
awsl kinesis list-streams          # no flags, no exports
```

### Why fake credentials work at all

The CLI never validates credentials. It signs the request with them and sends
it; the **server** decides whether the signature is acceptable. Real AWS checks
and rejects `test`. LocalStack does not check at all.

It needs *something* only because the signing step is mandatory — with no
credentials the SDK fails before sending.

But LocalStack does derive an **account ID** from the access key. That is the
whole cause of this error: not an auth failure, a namespace mismatch.

### The linkage is just a URL

Neither tool has any special bond with Amazon. Both are HTTP clients pointed at
an address:

| Tool | How it is pointed at LocalStack |
|---|---|
| AWS CLI | `--endpoint-url http://localhost:4566` |
| Terraform | the `endpoints` block in `provider.tf` |

Same destination, same account, no real AWS involved. Credentials must be told
to each tool separately — the CLI cannot read `.tf` files, and Terraform does
not read `.env`.

### Note on ON_DEMAND streams

ON_DEMAND mode starts with **two shards** and autoscales, so a configured
`shard_count` is ignored. In the module this is deliberate:

```hcl
shard_count = var.kinesis_stream_mode == "PROVISIONED" ? var.kinesis_shard_count : null
```

`null` omits the argument entirely — AWS rejects `shard_count` on an ON_DEMAND
stream.

## 11. Connect an application to Kinesis

```bash
cd collector
npm install @aws-sdk/client-kinesis
```

Add to the project-root `.env`:

```
KINESIS_STREAM_NAME=maritime-dev-vessel-events
```

### One port, many services

Every AWS service in LocalStack answers on `4566`. They are distinguished by
headers the SDK sets, not by address:

```http
X-Amz-Target: Kinesis_20131202.PutRecord      # this is Kinesis
X-Amz-Target: DynamoDB_20120810.PutItem       # this is DynamoDB
```

So the **client type** is the distinguisher:

```ts
new KinesisClient({  endpoint: "http://localhost:4566" })
new DynamoDBClient({ endpoint: "http://localhost:4566" })
```

Real AWS uses a different hostname per service; LocalStack collapses them onto
one port and routes by header.

### Gotcha: ESM imports are hoisted

**Symptom:** `Missing AWS/Kinesis environment variables`, even though `.env` is
correct and `dotenv.config()` is at the top of `index.ts`.

**Cause:** every `import` in a module runs *before* that module's own
statements. So `kinesis.ts` read `process.env` before `dotenv.config()` ran.

**Fix:** put the dotenv call in its own module and import it first.

```ts
import "./config.js";   // loads .env — must be first
import { sendToKinesis } from "./kinesis.js";
```

## 12. Verify records reached the stream

```bash
SHARD=$(awsl kinesis describe-stream --stream-name maritime-dev-vessel-events \
  --query 'StreamDescription.Shards[0].ShardId' --output text)

ITER=$(awsl kinesis get-shard-iterator --stream-name maritime-dev-vessel-events \
  --shard-id "$SHARD" --shard-iterator-type TRIM_HORIZON \
  --query 'ShardIterator' --output text)

awsl kinesis get-records --shard-iterator "$ITER" --limit 3
```

Reading from a shard takes two steps: get an **iterator** (a cursor into the
shard), then `get-records` with it. `TRIM_HORIZON` starts at the oldest
available record; `LATEST` starts at the newest.

Record `Data` comes back **base64-encoded**. To read it:

```bash
awsl kinesis get-records --shard-iterator "$ITER" --limit 3 \
  --query 'Records[].Data' --output text | base64 -d
```

Confirm three things in the output:

| | Why it matters |
|---|---|
| `PartitionKey` differs per vessel | Per-vessel ordering works |
| Payload is the **contract**, not AISStream's shape | Translation happens at the edge |
| Sentinels translated (`heading: -1`) | Normalisation is doing its job |

---

## Quick reference

```bash
# Start / stop LocalStack
cd terraform && docker compose up -d
cd terraform && docker compose down

# Health
curl http://localhost:4566/_localstack/health

# Inspect what exists (awsl = alias with credentials + endpoint baked in)
awsl kinesis list-streams
awsl dynamodb list-tables
awsl s3 ls

# Terraform, from an environment directory
terraform init
terraform plan
terraform apply
```
