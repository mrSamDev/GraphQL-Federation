#!/usr/bin/env bash
set -e

echo "Composing supergraph schema..."
rover supergraph compose --config supergraph.yaml --elv2-license accept > services/gateway/supergraph.graphql
echo "Done: services/gateway/supergraph.graphql updated"
