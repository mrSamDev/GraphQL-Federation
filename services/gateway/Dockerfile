FROM ghcr.io/apollographql/router:v1.58.0
COPY services/gateway/router.yaml /app/router.yaml
COPY services/gateway/supergraph.graphql /app/supergraph.graphql
EXPOSE 4000
CMD ["--config", "/app/router.yaml", "--supergraph", "/app/supergraph.graphql"]
