// AWS CDK app (Go) for what-to-watch.
//
// TODO: placeholder -- no real constructs yet. Once the app shape
// settles, this will likely define:
//   - an RDS Postgres instance (or Aurora Serverless) for internal/db
//   - an ECS Fargate service running cmd/search-api behind an ALB
//   - a scheduled ECS/Fargate task (or Lambda) running cmd/collector
//   - S3 buckets for the ETL raw/staging layers etl/spark writes to
//   - MWAA (managed Airflow) or a self-hosted Airflow service for
//     etl/airflow/dags
//
// Needs: go get github.com/aws/aws-cdk-go/awscdk/v2 github.com/aws/constructs-go/constructs/v10
package main

import "fmt"

func main() {
	fmt.Println("what-to-watch infra (scaffold, not yet implemented)")
}
