# Use the latest stable slim version of the Rust compiler
FROM rust:slim AS build

WORKDIR /app
COPY . .
# This will now run with a modern compiler
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/wss /usr/local/bin/server
CMD ["server"]
