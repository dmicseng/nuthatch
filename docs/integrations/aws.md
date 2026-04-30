# Connecting AWS to Nuthatch

Nuthatch pulls cost data from AWS using the
[Cost Explorer API](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html).
You give Nuthatch a read-only IAM access key with two permissions; nothing
else. Each Cost Explorer call is billed by AWS at $0.01, so Nuthatch issues
one call per service per day plus one during validation when you connect.

## What you need

- An AWS account with **Cost Explorer enabled**. AWS Console → Billing → Cost
  Explorer → click **Enable Cost Explorer** if you have not already. AWS may
  take up to 24 hours to make data available the first time.
- IAM permissions to create a user and attach a policy.

## 1. Create a dedicated IAM user

1. AWS Console → **IAM** → **Users** → **Create user**.
2. Username: `nuthatch-readonly` (anything you like).
3. **Do not** select "Provide user access to the AWS Management Console" — this
   user only needs programmatic access.
4. Click **Next**, skip permissions ("Attach policies directly" with no
   selections), then **Create user**.

## 2. Attach the minimum permissions

Open the user you just created → **Permissions** tab → **Add permissions** →
**Create inline policy** → switch to the **JSON** editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NuthatchReadCostAndCallerIdentity",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

Click **Next**, name the policy `nuthatch-readonly`, and **Create policy**.

That is the entire permission set. Cost Explorer does not support resource-
level scoping, so the policy must use `Resource: "*"`. The user has no other
power.

## 3. Generate an access key

User → **Security credentials** tab → **Create access key** →
**Application running outside AWS** → tick the confirmation → **Next** → leave
the description tag blank → **Create access key**.

Copy both:

- **Access key ID** — looks like `AKIA…` (20 chars)
- **Secret access key** — 40-char string, shown only once

If you miss the secret, delete the key and create a new one — the secret
cannot be retrieved later.

## 4. Connect inside Nuthatch

1. In Nuthatch, open the AWS service you want to track (Services → AWS).
2. Click **Integration** in the header.
3. Paste the Access Key ID and Secret Access Key. Region defaults to
   `us-east-1` (Cost Explorer always lives there); leave it as-is unless you
   know otherwise. Account alias is optional and only used as a label.
4. Click **Connect**. Nuthatch calls `sts:GetCallerIdentity` to confirm the
   key works and `ce:GetCostAndUsage` to confirm the policy is attached
   correctly. Both calls are read-only.

After validation succeeds:

- Nuthatch encrypts the secret with your organization's data-encryption key
  (see [security model](../security.md)).
- The first sync pulls the previous 30 days of daily cost-by-service.
- A daily sync is scheduled with a random offset to spread load.

## What Nuthatch reads

- `ce:GetCostAndUsage` with `Granularity: DAILY`, `Metrics: ['UnblendedCost']`,
  grouped by `SERVICE`.
- One Cost Explorer call per scheduled sync, regardless of date range
  (results paginate; pagination tokens cost nothing extra).

## What Nuthatch never does

- Touch any other AWS service.
- Make AWS API calls outside the IAM policy above.
- Send credentials to any third party — secrets are stored encrypted in your
  Nuthatch database and never leave your server.

## Rotating credentials

Disconnect the integration in Nuthatch, deactivate or delete the IAM key in
AWS, generate a new one, and reconnect. Old data already pulled from AWS is
preserved.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Access Key or Secret Access Key is invalid.` | Typo in the key, or the IAM user was deleted. |
| `Credentials are valid but lack ce:GetCostAndUsage permission.` | The inline policy in step 2 was not attached, or `ce:GetCostAndUsage` was misspelled. |
| `Sync error: Unable to locate credentials` | Cost Explorer has not been enabled in your AWS account, or it has been less than 24 hours since enabling. |
| The first day or two after connection show no spend | Cost Explorer data lags 24–48 hours. Usually back-fills automatically. |
