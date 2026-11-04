# Retire the Pomogit deployment

This is an operator runbook, not a command that has been run. No teardown rehearsal
against the live deployment has been performed. For a week away, use
[pause/resume](README.md#pause-for-a-week-and-resume) instead; it retains accounts,
tasks and infrastructure. Pausing reduces usage but retained DNS, storage, logs
and incoming traffic can still cost money.

Permanent retirement removes hosting and can separately remove all account data.
An assistant must obtain explicit authorization for each destructive group below
before executing it. Documentation, a previous deployment approval or a pause
request does not authorize deletion. Do not delete an AWS/Neon account or shared
resources as part of retiring this app.

## 1. Verify ownership and preserve recovery material

Run commands from the repository root using the original private deployment
configuration and Terraform state. The last verified coordinates were AWS account
`730335441285`, profile `pomogit`, region `us-east-1`, domain `pomogit.live`.
Verify these against the intended deployment before proceeding:

```sh
aws --profile pomogit sts get-caller-identity
terraform -chdir=terraform workspace show
terraform -chdir=terraform state list
terraform -chdir=terraform output deployment_account_id
terraform -chdir=terraform output deployment_region
terraform -chdir=terraform output site_bucket_name
terraform -chdir=terraform output hosted_zone_id
```

Stop if the account, workspace or resource inventory differs from the intended
stack. Preserve the existing local state; do not initialize an unrelated empty
state or use `terraform state rm` to pretend resources have been deleted.

Before stopping the service, make a fresh database backup:

```sh
node deploy/aws/cli.mjs backup
```

Keep an encrypted off-host copy and verify restoration into a separate empty
database using the [restore drill](../README.md#backup-and-restore-drill). A
successful archive listing alone is insufficient. Preserve source/release IDs,
private config, auth settings, Terraform state/backup, rollback material and any
frontend assets you want to keep. State and plan files contain secrets; store
them privately, never in Git or a public bucket. Database dumps contain accounts,
credentials and work history; define who can access them and how long to retain
them. Browser-local profile/appearance settings are not in the database dump.

Once approved, pause the app using the existing reviewed pause/apply procedure.
Allow in-flight requests to finish, then take the final database backup after
writes have stopped. Keep readiness probes and other database clients off.

## 2. Decide what happens to DNS and the domain

The domain registration at Name.com is separate from Route 53 hosting. Choose
whether to retain it or disable renewal and allow it to expire; deleting AWS
resources does not cancel its registration or renewals.

If keeping the domain, first configure replacement DNS at the chosen provider,
including any email/verification/unrelated records, update Name.com nameservers,
and verify delegation before deleting the old hosted zone. Never leave the
registrar delegated to a deleted Route 53 zone. Remove obsolete app/API aliases
and certificate validation records when they are no longer needed.

Inspect whether the zone is Terraform-managed (`aws_route53_zone.site[0]` in
state) or externally supplied through `hostedZoneId`. A Terraform-managed zone is
included in full destruction; an externally supplied zone remains and can
continue to incur charges. Additional records can prevent managed-zone deletion.
Do not delete unrelated records to make a destroy succeed. A shared zone requires
a separate reviewed preservation/migration plan before full destruction.

## 3. Prepare the AWS destroy plan without applying it

There is no `destroy` subcommand in `deploy/aws/cli.mjs`. Use Terraform directly,
with the same inputs the CLI normally supplies. Do not use the example defaults:
the deployed environment is `showcase`, not `dev`.

In a private editor, create `terraform/retire.tfvars` with mode 0600. `*.tfvars`
is ignored by Git. Copy values privately from the original deployment files;
never paste secrets into chat or shell arguments. Supply these inputs:

| Terraform input | Original source |
| --- | --- |
| `account_id`, `aws_region`, `domain_name` | `config.json`: `accountId`, `region`, `domain` |
| `environment` | `"showcase"` for this deployment |
| `hosted_zone_id`, `budget_email` | `config.json`: `hostedZoneId` (empty if originally managed), `budgetEmail` |
| `site_paused` | Current approved pause state |
| `database_url`, `migration_database_url` | Private backend env: `DATABASE_URL`, `MIGRATION_DATABASE_URL` |
| `better_auth_secret` | Private backend env: `BETTER_AUTH_SECRET` |
| `github_client_id`, `github_client_secret` | Private backend env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| `database_ca_cert` | Private backend env: `DATABASE_CA_CERT`, or empty |
| `lambda_zip_path` | Absolute path to the existing `deploy/aws/.artifacts/api.zip` |
| `force_destroy_bucket` | `false`; keep the nonempty-bucket safeguard |

Retain any other original overrides. Preserve multiline certificate values using
valid HCL quoting; do not source a dotenv file as shell code. The URLs and auth
secret must remain the real original values to pass existing validation, even
though this is a destroy plan.

```sh
umask 077
chmod 600 terraform/retire.tfvars
AWS_PROFILE=pomogit terraform -chdir=terraform plan -destroy \
  -input=false -var-file=retire.tfvars -out=retire.tfplan
terraform -chdir=terraform show retire.tfplan
```

Review the complete [destroy plan](https://developer.hashicorp.com/terraform/cli/commands/plan).
It should remove only this deployment's managed CloudFront resources, S3 bucket,
API Gateway resources, app/migration Lambdas and alias, runtime IAM/logging,
certificates, DNS records/managed zone and budget. Check for resources outside
state separately. Do not share the saved plan: it contains sensitive values.
Generating the plan does not delete anything. Do not apply until the following
bucket/DNS preparation and explicit AWS deletion approval are complete.

## 4. Delete the AWS hosting resources after approval

The frontend bucket is versioned and has `force_destroy_bucket=false`. After
preserving needed assets and obtaining approval to erase that specific bucket's
contents, use S3 Console **Empty** on the exact bucket from Terraform outputs.
Verify all object versions and delete markers are removed; abort leftover
multipart uploads if present. `aws s3 rm --recursive` alone does not remove all
historical versions. Follow [AWS's versioned-bucket instructions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html).
Do not enable automatic bucket destruction or empty another bucket as a shortcut.

After bucket cleanup and any DNS changes, generate and review a fresh destroy
plan using the previous commands. Then, and only after explicit approval:

```sh
AWS_PROFILE=pomogit terraform -chdir=terraform apply retire.tfplan
```

Applying a saved plan begins deletion without another interactive approval.
CloudFront deletion can take time. If Terraform fails partway through, preserve
state, inspect the remaining resources, and create/review a fresh destroy plan;
do not delete state or keep applying an obsolete plan. Avoid concurrent deploys.

Verify `terraform -chdir=terraform state list` has no managed resources remaining
for a fully retired stack. Independently check the console for residual versions,
logs, buckets, distributions, APIs and any resources made outside Terraform.
An externally supplied Route 53 zone is not removed by this plan; delete it only
if dedicated to this retired app and separately approved. Follow
[AWS hosted-zone deletion guidance](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DeleteHostedZone.html).
Do not remove shared deployment identities or other apps' resources.

## 5. Retire Neon and OAuth separately

Terraform here does not manage Neon projects, GitHub OAuth Apps or Name.com.
They survive AWS destruction.

- **Database deletion is a separate destructive approval.** After confirming the
  final backup restores and no other app uses the project, delete the dedicated
  Pomogit project in Neon Console → Project settings → Delete project. Confirm
  the exact project identity, including its branches/endpoints and account data.
  Follow [Neon's project documentation](https://neon.com/docs/manage/projects).
  If keeping Neon for recovery, document its plan/storage/compute exposure and
  retain scale-to-zero; deleting AWS does not stop other clients waking it.
- Remove the dedicated GitHub OAuth App only after approval and confirming it is
  not reused elsewhere. Revoke dedicated deployment/API tokens and IAM access
  only when no longer needed for cleanup; preserve shared identities.
- Carry out the chosen Name.com renewal/DNS decision. Retaining the domain means
  retaining its renewal cost. Do not close an entire provider account.
- Once cleanup is verified and the retention window ends, securely retire local
  secret files, saved plans/state, dumps and rollback artifacts according to the
  agreed recovery policy. Preserve source and safe operational documentation.

## 6. Confirm billing and record the result

Check AWS resource inventories in the deployment region and global CloudFront,
Route 53, S3 and IAM views, plus Neon and Name.com billing. Recheck once provider
billing has caught up: delayed charges for earlier usage are possible. Record
what was removed, what intentionally remains, the final backup location and its
retention deadline. The Terraform budget is deleted with the stack; keep or create
a separate account-level alert if other AWS usage remains.

Neither a successful Terraform destroy nor an unavailable website proves that
all provider charges have ended. Document any retained zone, domain, database,
backup storage or unrelated account resources instead of claiming a zero bill.
