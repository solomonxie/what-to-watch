// Command collector runs the data-collection/scraping service: fetches
// title metadata, streaming availability, and scores from providers and
// writes them to Postgres for cmd/search-api to query.
package main

import "fmt"

func main() {
	// TODO: scrape title/availability/score data on a schedule and
	// persist results via internal/db (see internal/db/migrations/0001_init.sql).
	fmt.Println("what-to-watch: collector (scaffold, not yet implemented)")
}
